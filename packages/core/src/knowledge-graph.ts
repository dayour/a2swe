import { readFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { parse as parseYaml } from 'yaml';
import { digest, sha256 } from './canonical.ts';
import { renderFiles } from './adapters.ts';
import type { AdapterAssetEmbed, AdapterVisualImage } from './adapters.ts';
import type { ContentIR, FormatParityManifest, RenderSpec } from './contracts.ts';
import { visualStem } from './media-remotion.ts';
import { MUTABLE_MEDIA_PATHS, verifyRelease } from './release.ts';
import { verifyRunbook } from './runbook.ts';

export type GapSeverity = 'critical' | 'high' | 'medium' | 'low';
export interface GraphNode { id: string; type: string; path: string; attributes: Record<string, unknown> }
export interface GraphEdge { from: string; relation: string; to: string }
export interface GraphGap { id: string; severity: GapSeverity; category: string; summary: string; evidence: string[] }
export interface KnowledgeGraph {
  schemaVersion: '1.0.0';
  kind: 'a2swe.knowledge-graph';
  evidencePolicy: string;
  summary: { trackedFiles: number; nodes: Record<string, number>; edges: Record<string, number>; gaps: Record<GapSeverity, number> };
  nodes: GraphNode[];
  edges: GraphEdge[];
  gaps: GraphGap[];
}

type JsonSchema = { [key: string]: unknown; $ref?: string; type?: string | string[]; enum?: unknown[]; const?: unknown;
  properties?: Record<string, JsonSchema>; required?: string[]; items?: JsonSchema; oneOf?: JsonSchema[]; anyOf?: JsonSchema[];
  additionalProperties?: boolean | JsonSchema };
interface SchemaField { pointer: string; name: string; type: string; required: boolean; depth: number }
interface TemplateBlock { start: number; end: number; startLine: number; lines: number }
interface CodeModule { file: string; role: string; language: string; source: string; masked: string; generated: boolean; test: boolean }

const SCHEMA_PATH = 'packages/core/schemas/contracts.schema.json';
const VOICE_REGISTRY_PATH = 'library/assets/speech/voice-profiles.json';
const SEVERITY_RANK: Record<GapSeverity, number> = { critical: 0, high: 1, medium: 2, low: 3 };
const CODE_EXTENSIONS = new Set(['.ts', '.tsx', '.mts', '.mjs', '.js', '.py', '.rs']);
const TEXT_EXTENSIONS = new Set([...CODE_EXTENSIONS, '.json', '.md', '.mdx', '.yml', '.yaml', '.toml', '.txt', '.ps1', '.sh', '.cmd']);
const CODE_ROOTS: ReadonlyArray<readonly [string, string]> = [
  ['packages/core/src/', 'core'], ['library/integrations/', 'integration'], ['apps/desktop/src-tauri/src/', 'desktop-native'],
  ['apps/desktop/src/', 'desktop-ui'], ['docs/scripts/', 'docs-script'], ['docs/src/', 'docs-ui'], ['scripts/', 'script'],
  ['template/scripts/', 'template-script'], ['template/src/', 'template-runtime'], ['tests/', 'test']
];
const PRODUCT_ROLES = new Set(['core', 'integration', 'desktop-ui', 'desktop-native']);
const EMBEDDED_CODE_MIN_LINES = 25;
const STREAMING_API = /\b(ReadableStream|WritableStream|TransformStream|AsyncIterable|AsyncGenerator|text\/event-stream|WebSocket)\b|async\s*\*/;
const MACHINE_PATH = /\b[A-Za-z]:(?:\\\\|\\|\/)Users(?:\\\\|\\|\/)(?!(?:user|username|name|you|example|runner)(?:\\|\/))[A-Za-z0-9._-]+|(?<![\w.])\/(?:home|Users)\/(?!(?:user|username|name|you|example|runner)\/)[A-Za-z0-9._-]+\//;
const DIGEST_BINDINGS: Record<string, string> = {
  domainDigest: 'DomainPack', contentDigest: 'ContentIR', renderSpecDigest: 'RenderSpec', releaseDigest: 'ReleasePlan',
  assetInventoryDigest: 'AssetInventory', approvalDigest: 'ApprovalManifest', voiceDigest: 'VoiceSpec', styleDigest: 'RenderSpec'
};

const byText = (left: string, right: string) => (left < right ? -1 : left > right ? 1 : 0);
const isBinary = (bytes: Buffer) => bytes.subarray(0, 8000).includes(0);
// Line endings depend on the checkout (core.autocrlf, .gitattributes); content identity must not.
const toLf = (bytes: Buffer) => (isBinary(bytes) ? bytes : Buffer.from(bytes.toString('utf8').replace(/\r\n/g, '\n')));
const toCrlf = (bytes: Buffer) => Buffer.from(bytes.toString('utf8').replace(/\r?\n/g, '\r\n'));
const eolOnlyDifference = (left: Buffer, right: Buffer) => !isBinary(left) && !isBinary(right) && sha256(toLf(left)) === sha256(toLf(right));
const posix = (value: string) => value.split(path.sep).join('/');
const unique = <T>(values: Iterable<T>) => [...new Set(values)];

class Repository {
  readonly root: string;
  readonly files: string[];
  // Paths written by this run (for example the graph itself): excluded from inputs, but real for references.
  readonly outputs: Set<string>;
  private readonly tracked: Set<string>;
  private readonly cache = new Map<string, Buffer>();
  constructor(root: string, files: string[], outputs: Set<string> = new Set()) {
    this.root = root;
    this.files = files;
    this.outputs = outputs;
    this.tracked = new Set(files);
  }
  has(file: string): boolean { return this.tracked.has(file); }
  hasDirectory(prefix: string): boolean {
    const folder = prefix.endsWith('/') ? prefix : `${prefix}/`;
    return this.files.some((file) => file.startsWith(folder));
  }
  under(prefix: string): string[] { return this.files.filter((file) => file.startsWith(prefix)); }
  async bytes(file: string): Promise<Buffer> {
    const cached = this.cache.get(file);
    if (cached) return cached;
    const bytes = await readFile(path.join(this.root, file));
    this.cache.set(file, bytes);
    return bytes;
  }
  async text(file: string): Promise<string> { return toLf(await this.bytes(file)).toString('utf8'); }
  async json<T = unknown>(file: string): Promise<T> { return JSON.parse(await this.text(file)) as T; }
  async hash(file: string): Promise<string> { return sha256(await this.bytes(file)); }
  async contentHash(file: string): Promise<string> { return sha256(toLf(await this.bytes(file))); }
}

class GraphBuilder {
  private readonly nodes = new Map<string, GraphNode>();
  private readonly edges = new Map<string, GraphEdge>();
  readonly gaps: GraphGap[] = [];
  node(id: string, type: string, nodePath: string, attributes: Record<string, unknown> = {}): string {
    const existing = this.nodes.get(id);
    if (existing) Object.assign(existing.attributes, attributes);
    else this.nodes.set(id, { id, type, path: nodePath, attributes });
    return id;
  }
  edge(from: string, relation: string, to: string): void {
    if (from !== to) this.edges.set(`${from}\u0000${relation}\u0000${to}`, { from, relation, to });
  }
  gap(id: string, severity: GapSeverity, category: string, summary: string, evidence: string[]): void {
    if (evidence.length) this.gaps.push({ id, severity, category, summary, evidence });
  }
  build(trackedFiles: number): KnowledgeGraph {
    for (const edge of this.edges.values()) {
      if (!this.nodes.has(edge.to)) {
        const [type, ...rest] = edge.to.split(':');
        this.node(edge.to, type, rest.join(':'));
      }
    }
    const nodes = [...this.nodes.values()].sort((left, right) => byText(left.id, right.id));
    const edges = [...this.edges.values()].sort((left, right) => byText(left.from, right.from) || byText(left.relation, right.relation) || byText(left.to, right.to));
    const gaps = [...this.gaps].sort((left, right) => SEVERITY_RANK[left.severity] - SEVERITY_RANK[right.severity] || byText(left.id, right.id));
    const count = <T>(values: T[], key: (value: T) => string) => Object.fromEntries(
      Object.entries(values.reduce<Record<string, number>>((totals, value) => {
        totals[key(value)] = (totals[key(value)] ?? 0) + 1;
        return totals;
      }, {})).sort(([left], [right]) => byText(left, right)));
    return {
      schemaVersion: '1.0.0',
      kind: 'a2swe.knowledge-graph',
      evidencePolicy: 'Derived from tracked file bytes, executable verifiers and lexical code queries. Markdown, runbook status and QC labels are recorded as claims, never as evidence. Gaps disappear when their predicate stops matching.',
      summary: { trackedFiles, nodes: count(nodes, (node) => node.type), edges: count(edges, (edge) => edge.relation),
        gaps: { critical: 0, high: 0, medium: 0, low: 0, ...count(gaps, (gap) => gap.severity) } as Record<GapSeverity, number> },
      nodes, edges, gaps
    };
  }
}

function trackedFiles(root: string, excluded: Set<string>): string[] {
  const result = spawnSync('git', ['-C', root, 'ls-files', '-z'], { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024, timeout: 60000, windowsHide: true });
  if (result.error || result.status !== 0) throw new Error('knowledge_graph_git_unavailable');
  return result.stdout.split('\0').filter((file) => file && !excluded.has(file) && existsSync(path.join(root, file))).sort(byText);
}

function lineOf(source: string, index: number): number {
  let line = 1;
  for (let cursor = source.indexOf('\n'); cursor !== -1 && cursor < index; cursor = source.indexOf('\n', cursor + 1)) line++;
  return line;
}

function matchingLines(file: string, source: string, pattern: RegExp, limit = 12): string[] {
  const lines = source.split(/\r?\n/);
  const result: string[] = [];
  for (const [index, line] of lines.entries()) {
    if (pattern.test(line)) result.push(`${file}:${index + 1}`);
    if (result.length >= limit) break;
  }
  return result;
}

function templateLiterals(source: string): TemplateBlock[] {
  const blocks: TemplateBlock[] = [];
  const length = source.length;
  const skipQuoted = (quote: string, from: number): number => {
    let cursor = from + 1;
    while (cursor < length && source[cursor] !== quote && source[cursor] !== '\n') cursor += source[cursor] === '\\' ? 2 : 1;
    return cursor + 1;
  };
  const skipExpression = (from: number): number => {
    let cursor = from;
    let depth = 0;
    while (cursor < length) {
      const character = source[cursor];
      if (character === '`') { cursor = skipTemplate(cursor); continue; }
      if (character === '"' || character === "'") { cursor = skipQuoted(character, cursor); continue; }
      if (character === '{') depth++;
      else if (character === '}') {
        if (depth === 0) return cursor + 1;
        depth--;
      }
      cursor++;
    }
    return length;
  };
  const skipTemplate = (from: number): number => {
    let cursor = from + 1;
    while (cursor < length) {
      const character = source[cursor];
      if (character === '\\') { cursor += 2; continue; }
      if (character === '`') return cursor + 1;
      if (character === '$' && source[cursor + 1] === '{') { cursor = skipExpression(cursor + 2); continue; }
      cursor++;
    }
    return length;
  };
  let cursor = 0;
  while (cursor < length) {
    const character = source[cursor];
    if (character === '/' && source[cursor + 1] === '/') {
      const end = source.indexOf('\n', cursor);
      cursor = end === -1 ? length : end;
    } else if (character === '/' && source[cursor + 1] === '*') {
      const end = source.indexOf('*/', cursor + 2);
      cursor = end === -1 ? length : end + 2;
    } else if (character === '"' || character === "'") {
      cursor = skipQuoted(character, cursor);
    } else if (character === '`') {
      const end = skipTemplate(cursor);
      const body = source.slice(cursor, end);
      blocks.push({ start: cursor, end, startLine: lineOf(source, cursor), lines: body.split('\n').length });
      cursor = end;
    } else cursor++;
  }
  return blocks;
}

function maskBlocks(source: string, blocks: TemplateBlock[]): string {
  let masked = '';
  let cursor = 0;
  for (const block of blocks) {
    masked += source.slice(cursor, block.start) + source.slice(block.start, block.end).replace(/[^\n]/g, ' ');
    cursor = block.end;
  }
  return masked + source.slice(cursor);
}

function embeddedLanguage(body: string): string {
  const python = (body.match(/^\s*(?:def \w+\(|import \w+|from [\w.]+ import )/gm) ?? []).length;
  if (python >= 2) return 'python';
  if (/^\s*(?:import .+ from |export |const \w+ = |function \w+\()/m.test(body)) return 'javascript';
  if (/<[A-Za-z][\w.-]*[\s>/]/.test(body)) return 'markup';
  return 'text';
}

function blockOwner(source: string, block: TemplateBlock): string {
  const lineStart = source.lastIndexOf('\n', block.start) + 1;
  const prefix = source.slice(Math.max(0, source.lastIndexOf('\n', Math.max(0, lineStart - 2)) - 200), block.start);
  const matches = [...prefix.matchAll(/(?:function\s+(\w+)|(?:const|let|var)\s+(\w+)\s*=|(\w+)\s*:)/g)];
  const last = matches.at(-1);
  return last ? (last[1] ?? last[2] ?? last[3]) : 'anonymous';
}

const ANALYZER_PATH = 'packages/core/src/knowledge-graph.ts';

function moduleRole(file: string): string | undefined {
  if (/\.test\.(?:ts|tsx|mjs|js)$|(?:^|\/)test_[^/]+\.py$/.test(file)) return 'test';
  // The analyzer's own detector patterns would otherwise satisfy or suppress product predicates.
  if (file === ANALYZER_PATH) return 'analyzer';
  return CODE_ROOTS.find(([prefix]) => file.startsWith(prefix))?.[1];
}

function resolveImport(repository: Repository, from: string, specifier: string): string | undefined {
  const base = path.posix.normalize(path.posix.join(path.posix.dirname(from), specifier));
  const candidates = [base, base.replace(/\.js$/, '.ts'), base.replace(/\.js$/, '.tsx'), `${base}.ts`, `${base}.tsx`, `${base}.js`, `${base}.mjs`, `${base}/index.ts`, `${base}/index.tsx`];
  return candidates.find((candidate) => repository.has(candidate));
}

function packageName(specifier: string): string | undefined {
  if (specifier.startsWith('node:') || specifier.startsWith('.') || specifier.startsWith('/')) return undefined;
  const parts = specifier.split('/');
  return specifier.startsWith('@') ? parts.slice(0, 2).join('/') : parts[0];
}

function describeType(schema: JsonSchema | undefined): string {
  if (!schema) return 'unknown';
  if (schema.$ref) return schema.$ref.split('/').at(-1) ?? 'ref';
  if ('const' in schema) return `const(${JSON.stringify(schema.const)})`;
  if (schema.enum) return `enum(${schema.enum.map((value) => String(value)).join('|')})`;
  const variants = schema.oneOf ?? schema.anyOf;
  if (variants) return `oneOf(${variants.map(describeType).join('|')})`;
  if (schema.type === 'array') return `array<${describeType(schema.items)}>`;
  if (Array.isArray(schema.type)) return schema.type.join('|');
  if (schema.type === 'object' && !schema.properties && schema.additionalProperties && typeof schema.additionalProperties === 'object') {
    return `map<${describeType(schema.additionalProperties)}>`;
  }
  return schema.type ?? 'any';
}

function schemaFields(schema: JsonSchema, prefix: string, depth = 1): SchemaField[] {
  const required = new Set(schema.required ?? []);
  const fields: SchemaField[] = [];
  for (const [name, property] of Object.entries(schema.properties ?? {})) {
    const pointer = `${prefix}.${name}`;
    fields.push({ pointer, name, type: describeType(property), required: required.has(name), depth });
    if (property.properties) fields.push(...schemaFields(property, pointer, depth + 1));
    if (property.type === 'array' && property.items?.properties) fields.push(...schemaFields(property.items, `${pointer}[]`, depth + 1));
  }
  return fields;
}

function schemaRefs(schema: unknown, found = new Set<string>()): Set<string> {
  if (Array.isArray(schema)) for (const value of schema) schemaRefs(value, found);
  else if (schema && typeof schema === 'object') {
    for (const [key, value] of Object.entries(schema)) {
      if (key === '$ref' && typeof value === 'string') found.add(value.split('/').at(-1) ?? value);
      else schemaRefs(value, found);
    }
  }
  return found;
}

function identifierPattern(name: string): RegExp {
  return new RegExp(`(?<![A-Za-z0-9_$])${name.replace(/[$]/g, '\\$')}(?![A-Za-z0-9_$])`);
}

// A field is touched by property access, a computed key, an object/type key or destructuring; bare words in strings do not count.
function fieldPattern(name: string): RegExp {
  const field = name.replace(/[$]/g, '\\$');
  return new RegExp(`\\??\\.${field}(?![A-Za-z0-9_$])|\\[\\s*['"\`]${field}['"\`]\\s*\\]|(?<![A-Za-z0-9_$."'=-])${field}\\??\\s*:(?!:)|[{,]\\s*${field}\\s*(?=[,}=])`);
}

function globPattern(glob: string): RegExp {
  const pattern = glob.replace(/[.+^${}()|[\]\\]/g, '\\$&').replace(/\*\*\/?/g, '\u0000').replace(/\*/g, '[^/]*').replace(/\u0000/g, '(?:.*/)?.*');
  return new RegExp(`^${pattern}$`);
}

async function codeModules(repository: Repository): Promise<CodeModule[]> {
  const modules: CodeModule[] = [];
  for (const file of repository.files) {
    const extension = path.posix.extname(file);
    const role = moduleRole(file);
    if (!role || !CODE_EXTENSIONS.has(extension) || file.includes('/node_modules/')) continue;
    const source = await repository.text(file);
    const scriptLike = ['.ts', '.tsx', '.mts', '.mjs', '.js'].includes(extension);
    const masked = scriptLike ? maskBlocks(source, templateLiterals(source)) : source;
    modules.push({ file, role, language: extension === '.py' ? 'python' : extension === '.rs' ? 'rust' : extension.startsWith('.ts') || extension === '.mts' ? 'typescript' : 'javascript',
      source, masked, generated: /\.generated\./.test(file), test: role === 'test' });
  }
  return modules;
}

async function addContracts(repository: Repository, graph: GraphBuilder, modules: CodeModule[]) {
  const schema = await repository.json<{ oneOf: Array<{ $ref: string }>; $defs: Record<string, JsonSchema> }>(SCHEMA_PATH);
  const roots = new Set(schema.oneOf.map((entry) => entry.$ref.split('/').at(-1)));
  const consumers = modules.filter((module) => PRODUCT_ROLES.has(module.role) && !module.generated && !module.file.endsWith('/contracts.ts'));
  const validators = modules.filter((module) => module.file === 'packages/core/src/contracts.ts');
  const unconsumed: string[] = [];
  const shapes = new Map<string, Set<string>>();
  for (const [name, definition] of Object.entries(schema.$defs).sort(([left], [right]) => byText(left, right))) {
    const fields = schemaFields(definition, name);
    const topLevel = fields.filter((field) => field.depth === 1);
    const patterns: string[] = [definition.properties ? (roots.has(name) ? 'root-contract' : 'sub-shape') : 'primitive'];
    if (definition.additionalProperties === false) patterns.push('closed');
    if (topLevel.some((field) => field.name === 'schemaVersion')) patterns.push('versioned');
    if (topLevel.some((field) => field.type === 'Digest')) patterns.push('digest-bound');
    if (topLevel.some((field) => field.name === 'path' || field.type === 'RelativePath') && topLevel.some((field) => field.type === 'Digest' || field.name === 'digest')) patterns.push('digested-artifact');
    if (topLevel.some((field) => ['state', 'status'].includes(field.name) && field.type.startsWith('enum('))) patterns.push('lifecycle');
    if (topLevel.some((field) => /evidence|citation|claims/i.test(field.name))) patterns.push('evidence-bearing');
    const signature = fields.map((field) => `${field.pointer.slice(name.length + 1)}${field.required ? '' : '?'}:${field.type}`).sort(byText).join(';')
      || describeType(definition);
    const typeReaders = consumers.filter((module) => identifierPattern(name).test(module.source)).map((module) => module.file);
    const fieldRecords = fields.map((field) => {
      const record: Record<string, unknown> = { pointer: field.pointer, type: field.type, required: field.required };
      if (field.depth === 1 && definition.properties) {
        const readers = consumers.filter((module) => fieldPattern(field.name).test(module.source)).length;
        const validated = validators.some((module) => fieldPattern(field.name).test(module.source));
        record.consumers = readers;
        record.validated = validated;
        if (!readers && field.type !== 'const(false)' && field.name !== 'schemaVersion') unconsumed.push(`${SCHEMA_PATH}#/$defs/${name}/properties/${field.name} (${field.type}${validated ? ', validated only' : ''})`);
      }
      return record;
    });
    graph.node(`atom:${name}`, 'atom', `${SCHEMA_PATH}#/$defs/${name}`, {
      patterns, shapeId: sha256(signature).slice(0, 16), shape: signature, fields: fieldRecords, typeConsumers: typeReaders.length
    });
    for (const reference of schemaRefs(definition)) graph.edge(`atom:${name}`, 'composes', `atom:${reference}`);
    for (const field of topLevel) {
      const target = DIGEST_BINDINGS[field.name];
      if (target && target !== name) graph.edge(`atom:${name}`, 'binds_digest_of', `atom:${target}`);
    }
    for (const module of typeReaders) graph.edge(`module:${module}`, 'uses_contract', `atom:${name}`);
    if (topLevel.length >= 3) shapes.set(name, new Set(topLevel.map((field) => field.name)));
  }
  graph.gap('schema-fields-without-consumer', 'medium', 'schema',
    'Contract fields that no product module references outside schema validation; they are accepted, digested and shipped but never drive behaviour.', unconsumed);
  const parallel: string[] = [];
  const names = [...shapes.keys()];
  for (const [index, left] of names.entries()) {
    for (const right of names.slice(index + 1)) {
      const a = shapes.get(left) ?? new Set<string>();
      const b = shapes.get(right) ?? new Set<string>();
      const shared = [...a].filter((field) => b.has(field) && field !== 'schemaVersion');
      const overlap = shared.length / new Set([...a, ...b]).size;
      if (shared.length >= 3 && overlap >= 0.5) {
        parallel.push(`${left} ~ ${right}: shared {${shared.sort(byText).join(', ')}} overlap ${overlap.toFixed(2)}`);
        graph.edge(`atom:${left}`, 'parallel_shape', `atom:${right}`);
      }
    }
  }
  graph.gap('parallel-artifact-shapes', 'low', 'schema',
    'Independently declared shapes that repeat the same field set; candidates for one shared atom.', parallel);
  const formats = (schema.$defs.RenderSpec.properties?.formats?.items?.enum ?? []).map(String);
  const visuals = (schema.$defs.SectionVisual?.properties?.kind?.enum ?? []).map(String);
  const layerTerms = /"(?:layer|layers|zIndex|zOrder|tile|tiles|liveTile|grid)"\s*:/;
  const schemaText = await repository.text(SCHEMA_PATH);
  if (!layerTerms.test(schemaText)) {
    graph.gap('no-layer-or-tile-contract', 'high', 'ui-composition',
      'ContentIR/RenderSpec have no layer, tile, grid or live-state atoms; visuals are one optional diagram per section and every adapter hard-codes its own layout.',
      [`${SCHEMA_PATH}:${lineOf(schemaText, schemaText.indexOf('"SectionVisual"'))}`]);
  }
  return { formats, visuals };
}

async function addModules(repository: Repository, graph: GraphBuilder, modules: CodeModule[]) {
  const declarations = new Map<string, string[]>();
  const embedded: string[] = [];
  const crossRoot: string[] = [];
  const environment = new Map<string, Set<string>>();
  const importsOf = new Map<string, string[]>();
  const codeFiles = new Set(modules.map((module) => module.file));
  const nodeFor = (target: string) => {
    if (codeFiles.has(target)) return `module:${target}`;
    return graph.node(`file:${target}`, 'file', target);
  };
  for (const module of modules) {
    const id = `module:${module.file}`;
    const exports = unique([...module.masked.matchAll(/^export\s+(?:default\s+)?(?:async\s+)?(?:function\s*\*?|const|let|class|interface|type|enum)\s+(\w+)/gm)].map((match) => match[1])).sort(byText);
    const blocks = module.language === 'typescript' || module.language === 'javascript' ? templateLiterals(module.source) : [];
    const scripts = blocks.filter((block) => block.lines >= EMBEDDED_CODE_MIN_LINES).map((block) => ({
      owner: blockOwner(module.source, block), line: block.startLine, lines: block.lines, language: embeddedLanguage(module.source.slice(block.start, block.end))
    }));
    for (const script of scripts) {
      if (PRODUCT_ROLES.has(module.role)) embedded.push(`${module.file}:${script.line} ${script.owner} (${script.language}, ${script.lines} lines)`);
    }
    const resolved: string[] = [];
    if (module.language !== 'python' && module.language !== 'rust') {
      const pattern = /(?:^|[\s;])(?:import|export)\s+(?:type\s+)?(?:[\w*{}\s,$]+?\s+from\s+)?['"]([^'"\n]+)['"]|import\(\s*['"]([^'"\n]+)['"]\s*\)/g;
      for (const match of module.masked.matchAll(pattern)) {
        const specifier = match[1] ?? match[2];
        if (specifier.startsWith('.')) {
          const target = resolveImport(repository, module.file, specifier);
          if (target) { graph.edge(id, module.test ? 'tests' : 'imports', nodeFor(target)); if (codeFiles.has(target)) resolved.push(target); }
        } else {
          const name = packageName(specifier);
          if (name) graph.edge(id, 'depends_on', `package:${name}`);
        }
      }
      // Relative reads through new URL(..., import.meta.url) or a helper taking a module-relative path.
      const relativeReads = [
        ...[...module.masked.matchAll(/new URL\(\s*['"]([^'"]+)['"]\s*,\s*import\.meta\.url\s*\)/g)].map((match) => ({ specifier: match[1], index: match.index ?? 0 })),
        ...[...module.masked.matchAll(/\b(?!import\b|require\b)[A-Za-z_$][\w$]*\(\s*['"](\.\.?\/[^'"\n]+)['"]\s*\)/g)].map((match) => ({ specifier: match[1], index: match.index ?? 0 }))
      ];
      for (const { specifier, index } of relativeReads) {
        const target = path.posix.normalize(path.posix.join(path.posix.dirname(module.file), specifier));
        if (!repository.has(target)) continue;
        const rootOf = (file: string) => file.split('/').slice(0, file.startsWith('packages/') || file.startsWith('library/') || file.startsWith('apps/') ? 2 : 1).join('/');
        graph.edge(id, 'reads', nodeFor(target));
        if (rootOf(target) !== rootOf(module.file) && PRODUCT_ROLES.has(module.role)) {
          crossRoot.push(`${module.file}:${lineOf(module.masked, index)} -> ${target}`);
        }
      }
      if (PRODUCT_ROLES.has(module.role)) {
        for (const location of matchingLines(module.file, module.masked, /path\.join\([^)]*['"]template['"]/)) crossRoot.push(`${location} -> template/ (path.join)`);
      }
    }
    importsOf.set(module.file, resolved);
    for (const match of module.source.matchAll(/process\.env\.([A-Z][A-Z0-9_]+)|process\.env\[['"]([A-Z][A-Z0-9_]+)['"]\]|os\.environ(?:\.get)?[([]['"]([A-Z][A-Z0-9_]+)['"]|std::env::var\("([A-Z][A-Z0-9_]+)"\)/g)) {
      const name = match[1] ?? match[2] ?? match[3] ?? match[4];
      graph.edge(id, 'reads_env', `env:${name}`);
      if (PRODUCT_ROLES.has(module.role)) environment.set(name, (environment.get(name) ?? new Set()).add(module.file));
    }
    if (module.language === 'typescript' || module.language === 'javascript') {
      for (const match of module.masked.matchAll(/^(?:export\s+)?(?:async\s+)?function\s*\*?\s*(\w+)|^(?:export\s+)?const\s+(\w+)\s*=\s*(?:async\s+)?(?:\([^)\n]*\)|\w+)\s*(?::[^=\n]+)?=>/gm)) {
        const name = match[1] ?? match[2];
        if (name !== 'main') declarations.set(name, unique([...(declarations.get(name) ?? []), module.file]));
      }
    }
    graph.node(id, 'module', module.file, {
      role: module.role, language: module.language, lines: module.source.split('\n').length, sha256: sha256(module.source),
      ...(module.generated ? { generated: true } : {}), ...(exports.length ? { exports } : {}), ...(scripts.length ? { embeddedScripts: scripts } : {})
    });
  }
  const covered = new Set<string>();
  const visit = (file: string) => {
    for (const target of importsOf.get(file) ?? []) if (!covered.has(target)) { covered.add(target); visit(target); }
  };
  const directlyTested = new Set<string>();
  for (const module of modules.filter((entry) => entry.test)) {
    for (const target of importsOf.get(module.file) ?? []) directlyTested.add(target);
    visit(module.file);
  }
  const untested: string[] = [];
  for (const module of modules.filter((entry) => PRODUCT_ROLES.has(entry.role) && !entry.test && !entry.generated && entry.language !== 'rust')) {
    const coverage = directlyTested.has(module.file) ? 'direct' : covered.has(module.file) ? 'transitive' : 'none';
    graph.node(`module:${module.file}`, 'module', module.file, { testCoverage: coverage });
    if (coverage !== 'direct' && module.role === 'core') untested.push(`${module.file} (${coverage}, ${module.source.split('\n').length} lines)`);
  }
  const duplicated = [...declarations.entries()]
    .filter(([, files]) => files.filter((file) => file.startsWith('packages/core/src/')).length >= 2)
    .map(([name, files]) => `${name}: ${files.join(', ')}`).sort(byText);
  graph.gap('duplicated-core-helpers', 'medium', 'consistency', 'Top-level helpers declared independently in more than one core module; fixes must be applied in parallel.', duplicated);
  graph.gap('code-in-string-literals', 'high', 'quality',
    `Product modules embed programs of ${EMBEDDED_CODE_MIN_LINES}+ lines in template literals; they bypass typecheck, lint and unit tests and are emitted into every release.`, embedded);
  graph.gap('core-reads-legacy-template', 'high', 'composability',
    'Core runtime loads fonts, lockfiles or node_modules from the legacy template tree; the managed pipeline cannot run without template/.',
    unique(crossRoot.filter((entry) => / -> template\//.test(entry))));
  graph.gap('core-modules-without-direct-tests', 'medium', 'quality', 'Core modules no test imports directly; transitive coverage only exercises happy paths of callers.', untested);
  const envEvidence = [...environment.entries()].sort(([left], [right]) => byText(left, right))
    .map(([name, files]) => `${name}: ${[...files].sort(byText).join(', ')}`);
  graph.gap('runtime-env-outside-contracts', 'medium', 'consistency',
    'Environment variables alter product behaviour (engine, models, thresholds, paths) without being captured in RenderSpec, VoiceSpec or the release digest.', envEvidence);
}

async function addFormatsAndAdapters(repository: Repository, graph: GraphBuilder, modules: CodeModule[], formats: string[], visuals: string[]) {
  const product = modules.filter((module) => PRODUCT_ROLES.has(module.role) && !module.generated);
  for (const format of formats) {
    graph.node(`format:${format}`, 'format', SCHEMA_PATH);
    for (const module of product) if (new RegExp(`['"]${format}['"]`).test(module.source)) graph.edge(`module:${module.file}`, 'branches_on', `format:${format}`);
  }
  for (const kind of visuals) {
    graph.node(`visual:${kind}`, 'visual', SCHEMA_PATH);
    for (const module of product) if (new RegExp(`['"]${kind}['"]`).test(module.source)) graph.edge(`module:${module.file}`, 'branches_on', `visual:${kind}`);
  }
  const adapters = 'packages/core/src/adapters.ts';
  if (repository.has(adapters)) {
    const source = await repository.text(adapters);
    const dispatch = matchingLines(adapters, source, /^\s*(?:else\s+)?if \(format === '/, 20);
    const registry = product.some((module) => /\b(?:registerAdapter|AdapterRegistry|adapterRegistry)\b/.test(module.source));
    if (dispatch.length >= 3 && !registry) {
      graph.gap('closed-format-dispatch', 'high', 'extensibility',
        `renderFiles dispatches ${dispatch.length} format branches in a fixed if/else chain; adding a format or swapping an adapter requires editing core, the schema enum, desktop UI and release verification.`, dispatch);
    }
  }
  const release = 'packages/core/src/release.ts';
  if (repository.has(release)) {
    const source = await repository.text(release);
    graph.gap('diagram-rendering-coupled-to-video', 'high', 'composability',
      'Mermaid, Excalidraw and Marp visuals are rasterised only inside the Remotion path; HTML, Office, PDF and raster outputs lose diagrams unless video is also requested.',
      matchingLines(release, source, /formats\.includes\('remotion'\) && visualSections/));
  }
  const media = 'packages/core/src/media-remotion.ts';
  if (repository.has(media)) {
    const source = await repository.text(media);
    const engines = /allowedEngines:\s*\[([^\]]+)\]/.exec(source)?.[1].match(/['"]([^'"]+)['"]/g)?.map((value) => value.slice(1, -1)) ?? [];
    for (const engine of engines) graph.edge(`module:${media}`, 'synthesizes_with', `voice-engine:${engine}`);
    if (!STREAMING_API.test(source)) {
      graph.gap('voice-batch-only', 'high', 'voice',
        'Speech synthesis runs as a blocking subprocess that writes one WAV; there is no provider interface, streaming chunk contract or incremental caption seam.',
        matchingLines(media, source, /spawnSync\(/));
    }
  }
  if (repository.has(VOICE_REGISTRY_PATH)) {
    const registry = await repository.json<{ defaultProfileId?: string; profiles?: Array<{ id: string; name: string; language: string; speed: number }> }>(VOICE_REGISTRY_PATH);
    for (const profile of registry.profiles ?? []) {
      graph.node(`voice:${profile.id}`, 'voice', VOICE_REGISTRY_PATH, { name: profile.name, language: profile.language, speed: profile.speed, default: profile.id === registry.defaultProfileId });
    }
  }
  const voiceDefaults: string[] = [];
  for (const module of modules.filter((entry) => entry.role === 'template-script' || entry.role === 'core')) {
    for (const match of module.source.matchAll(/(?:VOICE|voice|profile)\w*\s*[=:]\s*(?:os\.environ\.get\([^,]+,\s*)?['"]((?:a|b)[fm]_[a-z]+)['"]/g)) {
      voiceDefaults.push(`${module.file}:${lineOf(module.source, match.index ?? 0)} ${match[1]}`);
    }
  }
  if (unique(voiceDefaults.map((entry) => entry.split(' ').at(-1))).length > 1) {
    graph.gap('voice-defaults-diverge', 'medium', 'voice', 'Different code paths hard-code different default voices instead of resolving the shared registry default.', voiceDefaults);
  }
}

async function regenerate(repository: Repository, releaseRoot: string, content: ContentIR, renderSpec: RenderSpec) {
  const embeds: AdapterAssetEmbed[] = [];
  for (const asset of content.assets) {
    embeds.push({ assetId: asset.assetId, mediaType: 'image/png', bytes: await repository.bytes(`${releaseRoot}/asset-inputs/${asset.assetId}.png`) });
  }
  const visualImages: AdapterVisualImage[] = [];
  if (renderSpec.formats.includes('remotion')) {
    for (const section of content.sections.filter((entry) => entry.visual)) {
      visualImages.push({ sectionId: section.sectionId, bytes: await repository.bytes(`${releaseRoot}/outputs/remotion/visuals/${visualStem(content, section.sectionId)}.png`) });
    }
  }
  return renderFiles(content, renderSpec, { assetEmbeds: embeds, strictAssetEmbeds: true, visualImages });
}

async function addProjects(repository: Repository, graph: GraphBuilder) {
  const names = unique(repository.under('projects/').map((file) => file.split('/')[1])).sort(byText);
  const failures: string[] = [];
  const eolFailures: string[] = [];
  const contradictions: string[] = [];
  const staleIndexes: string[] = [];
  const crlfIndexes: string[] = [];
  const missingRequests: string[] = [];
  const forks: string[] = [];
  const historical: string[] = [];
  const unboundForks: string[] = [];
  for (const name of names) {
    const root = `projects/${name}`;
    const id = `project:${name}`;
    const files = repository.under(`${root}/`);
    const coreManaged = repository.has(`${root}/release/parity-manifest.json`);
    const templateFork = !coreManaged && repository.hasDirectory(`${root}/src`);
    const attributes: Record<string, unknown> = {
      lineage: coreManaged ? 'core-managed' : templateFork ? 'template-fork' : 'unclassified', trackedFiles: files.length,
      runbook: repository.has(`${root}/agent/runbook.json`), generationRequest: repository.has(`${root}/canonical/generation-request.json`),
      qcIndex: repository.has(`${root}/qc/index.json`)
    };
    if (templateFork) {
      const drift = { same: 0, modified: 0, added: 0, removed: 0 };
      for (const folder of ['src', 'scripts']) {
        const local = new Set(repository.under(`${root}/${folder}/`).map((file) => file.slice(root.length + 1)));
        for (const relative of local) {
          if (!repository.has(`template/${relative}`)) drift.added++;
          else if (await repository.contentHash(`${root}/${relative}`) === await repository.contentHash(`template/${relative}`)) drift.same++;
          else drift.modified++;
        }
        for (const file of repository.under(`template/${folder}/`)) if (!local.has(file.slice('template/'.length))) drift.removed++;
      }
      attributes.templateDrift = drift;
      graph.edge(id, 'forks', 'tree:template');
      forks.push(`${root}: ${drift.modified} modified, ${drift.added} added, ${drift.removed} removed, ${drift.same} identical vs template/{src,scripts}`);
      if (!repository.has(`${root}/canonical/content-ir.json`)) unboundForks.push(`${root} (${files.length} tracked files, no canonical/release digest chain)`);
    }
    if (repository.has(`${root}/agent/runbook.json`)) {
      const runbook = await repository.json<{ stage: string; gates: Array<{ name: string; status: string }> }>(`${root}/agent/runbook.json`);
      attributes.runbookClaims = { stage: runbook.stage, gates: Object.fromEntries(runbook.gates.map((gate) => [gate.name, gate.status])) };
      try {
        await verifyRunbook(path.join(repository.root, root));
        attributes.runbookVerification = 'artifact_digests_verified';
      } catch (error) { attributes.runbookVerification = (error as Error).message.split(':')[0]; }
    }
    if (repository.has(`${root}/qc/index.json`)) {
      const index = await repository.json<{ entries: Array<{ path: string; digest: string }> }>(`${root}/qc/index.json`);
      const stale: string[] = [];
      const crlfDigests: string[] = [];
      let missing = 0;
      for (const entry of index.entries) {
        const file = `${root}/${entry.path}`;
        if (!repository.has(file)) missing++;
        else if (await repository.hash(file) !== entry.digest) {
          const bytes = await repository.bytes(file);
          if (!isBinary(bytes) && sha256(toCrlf(bytes)) === entry.digest) crlfDigests.push(file);
          else stale.push(file);
        }
      }
      const indexed = new Set(index.entries.map((entry) => `${root}/${entry.path}`));
      const unindexed = files.filter((file) => file.startsWith(`${root}/qc/`) && !file.startsWith(`${root}/qc/revisions/`) && file !== `${root}/qc/index.json` && !indexed.has(file)).length;
      attributes.qcIndexEvidence = { entries: index.entries.length, stale: stale.length, crlfDigests: crlfDigests.length, missing, unindexed };
      for (const file of stale) staleIndexes.push(`${root}/qc/index.json -> ${file}`);
      if (missing) staleIndexes.push(`${root}/qc/index.json -> ${missing} indexed paths missing`);
      if (crlfDigests.length) crlfIndexes.push(`${root}/qc/index.json: ${crlfDigests.length} of ${index.entries.length} digests match CRLF renderings of committed LF bytes`);
    }
    for (const file of files.filter((entry) => /\/qc\/releases\/[^/]+\/parity-manifest\.json$/.test(entry))) historical.push(path.posix.dirname(file));
    if (coreManaged) {
      const releaseRoot = `${root}/release`;
      if (!attributes.generationRequest) missingRequests.push(`${root}/canonical/generation-request.json`);
      const content = await repository.json<ContentIR>(`${releaseRoot}/content-ir.json`);
      const renderSpec = await repository.json<RenderSpec>(`${releaseRoot}/render-spec.json`);
      const parity = await repository.json<FormatParityManifest>(`${releaseRoot}/parity-manifest.json`);
      const copies: Record<string, string> = {};
      for (const contract of ['domain-pack', 'content-ir', 'render-spec', 'approval-manifest', 'release-plan']) {
        const canonical = `${root}/canonical/${contract}.json`;
        const shipped = `${releaseRoot}/${contract}.json`;
        if (!repository.has(canonical) || !repository.has(shipped)) copies[contract] = repository.has(shipped) ? 'release_only' : 'canonical_only';
        else if (await repository.hash(canonical) === await repository.hash(shipped)) copies[contract] = 'identical';
        else copies[contract] = digest(await repository.json(canonical)) === digest(await repository.json(shipped)) ? 'same_digest_different_bytes' : 'diverged';
      }
      attributes.canonicalReleaseCopies = copies;
      attributes.content = { sections: content.sections.length, assets: content.assets.length, audience: content.audience,
        visuals: content.sections.map((section) => section.visual?.kind ?? null) };
      for (const section of content.sections) if (section.visual) graph.edge(id, 'uses_visual', `visual:${section.visual.kind}`);
      graph.edge(id, 'speaks_with', `voice:${content.voice.profileId ?? 'registry-default'}`);
      for (const adapter of unique(parity.outputs.map((output) => output.adapter))) graph.edge(id, 'shipped_by', `adapter:${adapter}`);
      try {
        await verifyRelease(path.join(repository.root, releaseRoot), { probeMedia: false });
        attributes.releaseVerification = 'verified_without_media_probe';
      } catch (error) { attributes.releaseVerification = (error as Error).message.split(':')[0]; }
      const stored = new Map(parity.outputs.map((output) => [output.path, output]));
      const drift: string[] = [];
      let contentDrift = 0;
      try {
        for (const file of await regenerate(repository, releaseRoot, content, renderSpec)) {
          graph.node(`adapter:${file.adapter}`, 'adapter', 'packages/core/src/adapters.ts', { current: true });
          graph.edge(`adapter:${file.adapter}`, 'produces', `format:${file.format}`);
          const output = stored.get(file.path);
          if (!output) { drift.push(`${file.path} (not in shipped manifest)`); contentDrift++; }
          else if (output.adapter !== file.adapter) { drift.push(`${file.path} (${output.adapter} -> ${file.adapter})`); contentDrift++; }
          else if (!MUTABLE_MEDIA_PATHS.includes(file.path) && output.digest !== sha256(file.bytes)) {
            if (eolOnlyDifference(await repository.bytes(`${releaseRoot}/${file.path}`), file.bytes)) drift.push(`${file.path} (line endings only)`);
            else { drift.push(`${file.path} (same adapter id, different bytes)`); contentDrift++; }
          }
        }
      } catch (error) { drift.push(`regeneration_failed: ${(error as Error).message.split(':')[0]}`); contentDrift++; }
      attributes.adapterDrift = drift;
      if (attributes.releaseVerification !== 'verified_without_media_probe') {
        (contentDrift || !drift.length ? failures : eolFailures).push(`${releaseRoot}: ${attributes.releaseVerification}; ${drift.length} regenerated outputs differ: ${drift.slice(0, 6).join(', ')}${drift.length > 6 ? ', ...' : ''}`);
        const claims = attributes.runbookClaims as { gates: Record<string, string> } | undefined;
        if (claims && Object.values(claims.gates).every((status) => status === 'passed')) {
          contradictions.push(`${root}/agent/runbook.json claims every gate passed; ${releaseRoot} fails current verification (${attributes.releaseVerification})`);
        }
      }
      const review = `${root}/qc/production-review.json`;
      if (repository.has(review) && attributes.releaseVerification !== 'verified_without_media_probe') {
        const claim = await repository.json<{ result?: string }>(review);
        if (claim.result) contradictions.push(`${review} result="${claim.result}" while the release fails current verification`);
      }
    }
    graph.node(id, 'project', root, attributes);
  }
  graph.gap('releases-fail-current-verification', 'critical', 'pipeline',
    'Committed releases no longer reproduce from their own canonical inputs with the current adapters; adapter ids were not bumped when generated bytes changed.', failures);
  graph.gap('releases-committed-with-checkout-line-endings', 'high', 'pipeline',
    'Releases whose only drift is line endings: outputs were generated from CRLF-converted template text, so they fail byte verification on every checkout.', eolFailures);
  graph.gap('status-claims-contradicted', 'high', 'claim-vs-evidence', 'Runbook gates or review receipts assert success that executable verification contradicts.', contradictions);
  graph.gap('qc-index-stale', 'high', 'pipeline', 'QC index digests no longer match the bytes they index; the index was not regenerated after edits.', staleIndexes);
  graph.gap('qc-index-crlf-digests', 'medium', 'portability',
    'QC index digests were computed over CRLF working-tree bytes before qc/** became -text; content matches but no checkout verifies.', crlfIndexes);
  graph.gap('generation-request-missing', 'medium', 'pipeline', 'Core-managed projects without a durable GenerationRequest cannot reconstruct intent or defaults.', missingRequests);
  graph.gap('template-forks-without-digest-chain', 'high', 'lineage',
    'Projects running private copies of the template runtime with no ContentIR/RenderSpec/release digest chain; outputs cannot be proven to derive from inputs.', unboundForks);
  graph.gap('template-fork-drift', 'medium', 'lineage', 'Per-project template runtime forks that have diverged from template/; fixes do not propagate.', forks);
  graph.gap('historical-release-trees', 'low', 'lineage', 'Complete superseded release trees kept beside the current release; consumers can pick a stale package.', historical);
}

async function addLibrary(repository: Repository, graph: GraphBuilder) {
  const skillFiles = repository.under('library/skills/').filter((file) => /(?:^|\/)skill\.md$/i.test(file));
  const skillDirectories = new Set(skillFiles.map((file) => path.posix.dirname(file)));
  const nested: string[] = [];
  const withoutFrontmatter: string[] = [];
  for (const file of skillFiles) {
    const directory = path.posix.dirname(file);
    const depth = directory.split('/').length - 2;
    const text = await repository.text(file);
    const frontmatter = /^---\r?\n/.test(text);
    graph.node(`skill:${directory.slice('library/skills/'.length)}`, 'skill', directory, {
      depth, frontmatter, metadata: repository.has(`${directory}/metadata.json`),
      files: repository.under(`${directory}/`).length, scripts: repository.under(`${directory}/scripts/`).length
    });
    if (depth > 1) nested.push(directory);
    if (!frontmatter) withoutFrontmatter.push(file);
  }
  const helpers = 'library/integrations/copilot/helpers.ts';
  if (nested.length && repository.has(helpers)) {
    const source = await repository.text(helpers);
    const listing = matchingLines(helpers, source, /listImmediateDirectories\(directory\)/);
    if (listing.length) graph.gap('nested-skills-invisible-to-copilot', 'medium', 'extensibility',
      'Copilot library discovery lists only immediate skill directories, so nested skills are visible to core inventory but not to the desktop/Copilot catalog.', [...listing, ...nested]);
  }
  const metadataOnly = repository.under('library/skills/').filter((file) => file.endsWith('/metadata.json'))
    .map((file) => path.posix.dirname(file))
    .filter((directory) => ![...skillDirectories].some((skill) => directory === skill || directory.startsWith(`${skill}/`)));
  graph.gap('metadata-only-skills', 'medium', 'extensibility', 'Skill folders with metadata.json but no SKILL.md; registry classifies them as automations or assets, not skills.', metadataOnly);
  graph.gap('skills-without-frontmatter', 'low', 'consistency', 'SKILL.md files without YAML frontmatter are quarantined by core inventory yet listed by Copilot discovery.', withoutFrontmatter);
  for (const file of repository.files.filter((entry) => entry.endsWith('.agent.md'))) {
    graph.node(`agent:${file}`, 'agent', file);
    const text = await repository.text(file);
    for (const other of repository.files.filter((entry) => entry.endsWith('.agent.md') && entry !== file)) {
      const stem = path.posix.basename(other, '.agent.md');
      if (identifierPattern(stem).test(text) && path.posix.dirname(other) === path.posix.dirname(file)) graph.edge(`agent:${file}`, 'hands_off_to', `agent:${other}`);
    }
  }
  const mirrorDrift: string[] = [];
  for (const manifest of repository.files.filter((file) => /^library\/plugins\/[^/]+\/plugin\.json$/.test(file))) {
    const pluginRoot = path.posix.dirname(manifest);
    const plugin = await repository.json<{ name?: string; agents?: string | string[]; skills?: string | string[]; assets?: string | string[] }>(manifest);
    graph.node(`plugin:${plugin.name ?? pluginRoot}`, 'plugin', pluginRoot);
    for (const file of repository.under(`${pluginRoot}/`)) {
      if (file.endsWith('.agent.md')) graph.edge(`plugin:${plugin.name ?? pluginRoot}`, 'contains', `agent:${file}`);
      const mirror = `library/${file.slice(pluginRoot.length + 1)}`;
      if (mirror === `library/${path.posix.basename(file)}` || !repository.has(mirror)) continue;
      const kind = file.endsWith('.agent.md') ? 'agent' : 'file';
      graph.edge(`${kind}:${file}`, 'mirrors', `${kind}:${mirror}`);
      if (await repository.hash(file) !== await repository.hash(mirror)) mirrorDrift.push(`${file} != ${mirror}`);
    }
  }
  graph.gap('plugin-mirror-drift', 'medium', 'consistency', 'Plugin copies of library agents, skills or assets have diverged from their library source.', mirrorDrift);
}

async function addWorkflows(repository: Repository, graph: GraphBuilder) {
  const probes = ['packages/core/src/cli.ts', 'library/skills/sample/SKILL.md', 'library/agents/sample.agent.md', 'library/plugins/a2swe/plugin.json', 'projects/sample/release/parity-manifest.json'];
  const verifies: string[] = [];
  const workflows: string[] = [];
  const triggersFor = new Map<string, string[]>();
  for (const file of repository.files.filter((entry) => /^\.github\/workflows\/[^/]+\.ya?ml$/.test(entry))) {
    workflows.push(file);
    const document = parseYaml(await repository.text(file)) as { on?: Record<string, { paths?: string[] } | null>; jobs?: Record<string, { steps?: Array<{ run?: string }> }> };
    const filters = Object.values(document.on ?? {}).flatMap((trigger) => trigger?.paths ?? []);
    const runs = Object.values(document.jobs ?? {}).flatMap((job) => (job.steps ?? []).map((step) => step.run).filter((run): run is string => typeof run === 'string'));
    const triggered = probes.filter((probe) => !filters.length || filters.some((glob) => globPattern(glob).test(probe)));
    graph.node(`workflow:${file}`, 'workflow', file, { runs: runs.map((run) => run.trim()), triggeredBy: triggered });
    for (const probe of triggered) triggersFor.set(probe, [...(triggersFor.get(probe) ?? []), file]);
    if (runs.some((run) => /release-verify|runbook-verify|qc-index|knowledge-graph/.test(run))) verifies.push(file);
  }
  if (!verifies.length) {
    graph.gap('projects-unverified-in-ci', 'high', 'pipeline',
      'No workflow runs release-verify, runbook-verify or qc-index against projects/, so stale releases, indexes and status claims merge silently.', workflows);
  }
  const extensionProbes = probes.filter((probe) => probe.startsWith('library/'));
  const core = '.github/workflows/core-validate.yml';
  const unguarded = extensionProbes.filter((probe) => !(triggersFor.get(probe) ?? []).includes(core));
  if (repository.has(core) && unguarded.length) {
    graph.gap('extension-layer-outside-core-ci', 'medium', 'extensibility',
      'Skill, agent and plugin changes do not trigger core validation; manifests, frontmatter and discovery parity are never checked.', [core, ...unguarded.map((probe) => `untriggered: ${probe}`)]);
  }
}

async function addHygiene(repository: Repository, graph: GraphBuilder) {
  const machinePaths: string[] = [];
  for (const file of repository.files) {
    if (!TEXT_EXTENSIONS.has(path.posix.extname(file)) || file.startsWith('library/skills/')) continue;
    const bytes = await repository.bytes(file);
    if (bytes.length > 2 * 1024 * 1024) continue;
    const hits = matchingLines(file, bytes.toString('utf8'), MACHINE_PATH, 1);
    machinePaths.push(...hits);
  }
  const runtime = machinePaths.filter((entry) => /^(?:packages|library\/assets|library\/integrations|apps|template\/scripts|scripts)\//.test(entry));
  graph.gap('machine-specific-paths-runtime', 'high', 'portability', 'Runtime code or manifests contain absolute user-profile paths.', runtime);
  graph.gap('machine-specific-paths-artifacts', 'low', 'portability', 'Tracked artifacts and docs contain absolute user-profile paths.', machinePaths.filter((entry) => !runtime.includes(entry)));
  const banned = unique(repository.files.map((file) => {
    const segments = file.split('/');
    const index = segments.findIndex((segment) => /final/i.test(segment));
    return index === -1 ? undefined : segments.slice(0, index + 1).join('/');
  }).filter((entry): entry is string => Boolean(entry))).sort(byText);
  graph.gap('naming-policy-final', 'medium', 'consistency', 'Tracked paths use "final", which the naming policy forbids; prefer open-ended names such as current or release.', banned);
  const missing: string[] = [];
  const docRoots = /^(?:README\.md|AGENTS\.md|SKILL\.md|docs\/(?!src\/data\/).+\.mdx?|library\/(?:agents|plugins|integrations)\/.+\.md|template\/[^/]+\.md|projects\/[^/]+\/(?:README|SWE_AGENT|agent\/SWE_AGENT)\.md|\.github\/.+\.md)$/;
  const exists = (reference: string) => repository.has(reference) || repository.hasDirectory(reference) || repository.outputs.has(reference);
  for (const file of repository.files.filter((entry) => docRoots.test(entry))) {
    const text = await repository.text(file);
    const project = /^projects\/[^/]+\//.exec(file)?.[0];
    for (const match of text.matchAll(/`((?:packages|library|apps|template|projects|docs|scripts|tests)\/[A-Za-z0-9._\/-]+)`/g)) {
      const reference = match[1].replace(/[/.]+$/, '');
      if (/[A-Z]{3,}|\bsample\b|\bexample\b|<|\*/.test(reference)) continue;
      if (exists(reference) || (project && exists(`${project}${reference}`))) continue;
      // Paths inside generated packages (for example outputs/remotion/scripts/...) are documented relative to that package.
      if (!reference.startsWith('projects/') && repository.files.some((tracked) => tracked.endsWith(`/release/outputs/remotion/${reference}`))) continue;
      missing.push(`${file}:${lineOf(text, match.index ?? 0)} -> ${reference}`);
    }
  }
  const references = unique(missing.map((entry) => entry.split(' -> ')[1]));
  const check = spawnSync('git', ['-C', repository.root, 'check-ignore', '--stdin'], { input: references.join('\n'), encoding: 'utf8', timeout: 60000, windowsHide: true });
  const ignored = new Set((check.stdout ?? '').split(/\r?\n/).filter(Boolean));
  for (const [index, entry] of missing.entries()) if (ignored.has(entry.split(' -> ')[1])) missing[index] = `${entry} (gitignored)`;
  graph.gap('docs-reference-missing-paths', 'medium', 'claim-vs-evidence', 'Documentation points at repository paths that are not tracked (gitignored, moved or never committed).', unique(missing));
}

export async function buildKnowledgeGraph(rootPath: string, options: { exclude?: string[] } = {}): Promise<KnowledgeGraph> {
  const root = path.resolve(rootPath);
  const excluded = new Set((options.exclude ?? []).map((file) => posix(path.relative(root, path.resolve(file)))));
  const repository = new Repository(root, trackedFiles(root, excluded), excluded);
  if (!repository.has(SCHEMA_PATH)) throw new Error('knowledge_graph_root_not_a2swe');
  const graph = new GraphBuilder();
  const modules = await codeModules(repository);
  const { formats, visuals } = await addContracts(repository, graph, modules);
  await addModules(repository, graph, modules);
  await addFormatsAndAdapters(repository, graph, modules, formats, visuals);
  await addProjects(repository, graph);
  await addLibrary(repository, graph);
  await addWorkflows(repository, graph);
  await addHygiene(repository, graph);
  return graph.build(repository.files.length);
}
