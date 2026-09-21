import { createReadStream } from 'node:fs';
import { lstat, readFile, readdir, realpath } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import path from 'node:path';
import { parseDocument } from 'yaml';
import { digest } from './canonical.ts';
import { validate } from './contracts.ts';
import type { LibraryEntry } from './contracts.ts';

export interface SourceRoot { id: string; path: string; kind: 'repository' | 'installed' }
export interface FileRecord {
  path: string;
  disposition: 'source' | 'binary' | 'excluded' | 'quarantined';
  reason: string;
  bytes: number | null;
  contentHash: string | null;
  componentIds: string[];
}
export interface Inventory {
  schemaVersion: '1.0.0';
  sourceRoot: string;
  sourceKind: SourceRoot['kind'];
  files: FileRecord[];
  entries: LibraryEntry[];
  findings: { code: string; path: string }[];
  digest: string;
}

const excludedDirectories = new Set(['.git', 'node_modules', '.venv', '__pycache__', '.a2swe', '.docusaurus', 'build', 'build_production', 'build_test', 'renders', 'fin_frames', '.cache']);
const textExtensions = new Set(['.md', '.txt', '.json', '.yaml', '.yml', '.ts', '.tsx', '.js', '.cjs', '.mjs', '.py', '.sh', '.css', '.html', '.toml', '.cff', '.xml', '.xsd']);
const secretName = /^(?:\.env(?:\..*)?|.*\.(?:pem|key|pfx|p12)|credentials(?:\..*)?|secrets?(?:\..*)?|mcp-config\.json|auth\.json)$/i;

export function safeRelativePath(value: string): boolean {
  if (!value || value.includes('\\') || value.startsWith('/') || /[:\x00-\x1f]/.test(value)) return false;
  return value.split('/').every((part) => part !== '' && part !== '.' && part !== '..'
    && !/[. ]$/.test(part) && !/[<>"|?*]/.test(part)
    && !/^(?:con|prn|aux|nul|com[1-9]|lpt[1-9])(?:\.|$)/i.test(part));
}

async function fileHash(filePath: string): Promise<string> {
  const hash = createHash('sha256');
  for await (const chunk of createReadStream(filePath)) hash.update(chunk);
  return hash.digest('hex');
}

function normalized(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9._/-]+/g, '-').replace(/^[-/.]+|[-/.]+$/g, '') || 'root';
}

export async function inventory(root: SourceRoot): Promise<Inventory> {
  if (!/^[a-z0-9][a-z0-9-]{0,49}$/.test(root.id)) throw new Error('invalid_source_id');
  const rootInfo = await lstat(root.path);
  if (!rootInfo.isDirectory() || rootInfo.isSymbolicLink()) throw new Error('unsafe_source_root');
  const resolvedRoot = await realpath(root.path);
  const files: FileRecord[] = [];
  const findings: Inventory['findings'] = [];
  const seen = new Set<string>();

  async function walk(directory: string, prefix: string): Promise<void> {
    const children = (await readdir(directory, { withFileTypes: true })).sort((left, right) => left.name < right.name ? -1 : left.name > right.name ? 1 : 0);
    for (const child of children) {
      const relative = prefix ? `${prefix}/${child.name}` : child.name;
      const absolute = path.join(directory, child.name);
      const info = await lstat(absolute);
      const record: FileRecord = { path: relative, disposition: 'source', reason: '', bytes: info.isFile() ? info.size : null, contentHash: null, componentIds: [] };
      const key = relative.toLowerCase();
      if (!safeRelativePath(relative) || seen.has(key) || info.isSymbolicLink()) {
        record.disposition = 'quarantined';
        record.reason = info.isSymbolicLink() ? 'link_not_followed' : seen.has(key) ? 'case_collision' : 'unsafe_path';
        findings.push({ code: record.reason, path: relative });
        files.push(record);
        continue;
      }
      seen.add(key);
      if ((info.isDirectory() && excludedDirectories.has(child.name.toLowerCase())) || secretName.test(child.name)) {
        record.disposition = 'excluded';
        record.reason = info.isDirectory() ? 'generated_or_dependency_subtree' : 'sensitive_filename';
        files.push(record);
      } else if (info.isDirectory()) {
        await walk(absolute, relative);
      } else if (info.isFile()) {
        if (info.size > 64 * 1024 * 1024) {
          record.disposition = 'excluded';
          record.reason = 'file_exceeds_inventory_budget';
        } else {
          record.contentHash = await fileHash(absolute);
          record.disposition = textExtensions.has(path.extname(child.name).toLowerCase()) ? 'source' : 'binary';
          record.reason = record.disposition === 'binary' ? 'hash_only_no_execution' : 'unreviewed_source';
        }
        files.push(record);
      } else {
        record.disposition = 'quarantined';
        record.reason = 'special_file';
        files.push(record);
      }
    }
  }
  await walk(resolvedRoot, '');

  const candidates = new Map<string, { file: FileRecord; kind: LibraryEntry['kind'] }>();
  for (const file of files) {
    if (!file.contentHash) continue;
    const name = path.posix.basename(file.path).toLowerCase();
    const parent = path.posix.dirname(file.path);
    if (name === 'skill.md') candidates.set(parent, { file, kind: 'skill' });
    else if (name.endsWith('.agent.md') || (root.kind === 'installed' && parent === '.' && name.endsWith('.md') && name.startsWith('dayour'))) {
      candidates.set(file.path, { file, kind: 'agent' });
    } else if (name.endsWith('.zip')) candidates.set(file.path, { file, kind: 'archive' });
  }
  for (const file of files) {
    if (file.contentHash && path.posix.basename(file.path).toLowerCase() === 'metadata.json') {
      const parent = path.posix.dirname(file.path);
      if (!candidates.has(parent)) candidates.set(parent, { file, kind: 'automation' });
    }
  }

  const entries: LibraryEntry[] = [];
  const ids = new Set<string>();
  for (const [componentPath, candidate] of candidates) {
    const { file, kind } = candidate;
    const componentDirectory = path.posix.dirname(file.path);
    const members = kind === 'archive' || kind === 'agent' ? [file] : files.filter((item) =>
      componentDirectory === '.' || item.path.startsWith(`${componentDirectory}/`));
    const id = `${root.id}/${normalized(componentPath)}`;
    let quarantined = kind === 'archive';
    if (ids.has(id)) {
      findings.push({ code: 'duplicate_component_id', path: file.path });
      continue;
    }
    ids.add(id);
    let displayName = path.posix.basename(componentPath);
    if (file.bytes !== null && file.bytes <= 2 * 1024 * 1024 && kind !== 'archive') {
      try {
        const text = await readFile(path.join(resolvedRoot, file.path), 'utf8');
        let metadata: unknown;
        if (file.path.endsWith('.json')) metadata = JSON.parse(text);
        else {
          const match = /^---\r?\n([\s\S]*?)\r?\n---(?:\r?\n|$)/.exec(text);
          if (!match) throw new Error('missing_frontmatter');
          const document = parseDocument(match[1], { uniqueKeys: true, customTags: [] });
          if (document.errors.length || document.warnings.length) throw new Error('invalid_frontmatter');
          metadata = document.toJS({ maxAliasCount: 50 });
        }
        if (!metadata || typeof metadata !== 'object' || Array.isArray(metadata)) throw new Error('invalid_metadata');
        const name = (metadata as Record<string, unknown>).name;
        if (typeof name === 'string' && name.trim()) displayName = name;
      } catch {
        quarantined = true;
        findings.push({ code: 'invalid_or_missing_metadata', path: file.path });
      }
    } else if (kind !== 'archive') {
      quarantined = true;
      findings.push({ code: 'entrypoint_exceeds_parse_budget', path: file.path });
    }
    const entry = validate('LibraryEntry', {
      schemaVersion: '1.0.0', id, kind, displayName, sourceRoot: root.id, entrypoint: file.path,
      contentHash: digest(members.map((member) => ({ path: member.path, hash: member.contentHash, disposition: member.disposition }))),
      dependencies: [], requiredCapabilities: [], dataClasses: ['unknown'], effects: ['unknown'],
      rights: root.kind === 'installed' ? 'reference_only' : 'unknown',
      reviewStatus: quarantined ? 'quarantined' : 'pending', enablementStatus: 'disabled', runtimeValidation: 'not_run'
    });
    entries.push(entry);
    for (const member of members) member.componentIds.push(id);
  }
  for (const file of files) {
    if (!file.componentIds.length && file.contentHash) file.reason = 'unassigned_requires_component_review';
  }
  entries.sort((left, right) => left.id < right.id ? -1 : left.id > right.id ? 1 : 0);
  const payload = { schemaVersion: '1.0.0' as const, sourceRoot: root.id, sourceKind: root.kind, files, entries, findings };
  return { ...payload, digest: digest(payload) };
}

export function resolveEntries(entries: LibraryEntry[], requested: string[], capabilities: Set<string>): LibraryEntry[] {
  const index = new Map<string, LibraryEntry>();
  for (const candidate of entries) {
    const entry = validate('LibraryEntry', candidate);
    if (index.has(entry.id)) throw new Error('duplicate_component_id');
    index.set(entry.id, entry);
  }
  const visiting = new Set<string>();
  const visited = new Set<string>();
  const resolved: LibraryEntry[] = [];
  function visit(id: string): void {
    if (visiting.has(id)) throw new Error('dependency_cycle');
    if (visited.has(id)) return;
    const entry = index.get(id);
    if (!entry) throw new Error(`missing_dependency: ${id}`);
    if (entry.reviewStatus !== 'approved' || entry.enablementStatus !== 'enabled' || entry.runtimeValidation !== 'passed') throw new Error(`component_not_ready: ${id}`);
    if (entry.rights !== 'permitted') throw new Error(`rights_unknown: ${id}`);
    if (entry.dataClasses.some((value) => value !== 'public') || entry.effects.some((value) => !['read'].includes(value))) throw new Error(`public_profile_denied: ${id}`);
    if (entry.requiredCapabilities.some((value) => !capabilities.has(value))) throw new Error(`capability_unavailable: ${id}`);
    visiting.add(id);
    for (const dependency of entry.dependencies) visit(dependency);
    visiting.delete(id);
    visited.add(id);
    resolved.push(entry);
  }
  for (const id of requested) visit(id);
  return resolved;
}