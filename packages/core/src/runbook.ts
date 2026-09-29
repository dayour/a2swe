import { createHash } from 'node:crypto';
import { createReadStream } from 'node:fs';
import { lstat, readFile } from 'node:fs/promises';
import path from 'node:path';
import { digest, safeRelativePath } from './canonical.ts';
import { validate } from './contracts.ts';
import type { Runbook } from './contracts.ts';

async function projectFile(root: string, relative: string): Promise<string> {
  if (!safeRelativePath(relative)) throw new Error('unsafe_runbook_path');
  let current = root;
  for (const segment of relative.split('/')) {
    current = path.join(current, segment);
    const info = await lstat(current);
    if (info.isSymbolicLink()) throw new Error(`runbook_link_not_allowed: ${relative}`);
  }
  if (!(await lstat(current)).isFile()) throw new Error(`runbook_not_a_file: ${relative}`);
  return current;
}

async function hashFile(filename: string): Promise<string> {
  const hash = createHash('sha256');
  for await (const chunk of createReadStream(filename)) hash.update(chunk);
  return hash.digest('hex');
}

export async function verifyRunbook(rootPath: string): Promise<{ digest: string; verifiedArtifacts: number; passedGateReferences: number }> {
  const root = path.resolve(rootPath);
  const rootInfo = await lstat(root);
  if (!rootInfo.isDirectory() || rootInfo.isSymbolicLink()) throw new Error('unsafe_project_root');
  const filename = await projectFile(root, 'agent/runbook.json');
  const runbook: Runbook = validate('Runbook', JSON.parse(await readFile(filename, 'utf8')));
  const artifacts = new Map(runbook.artifacts.map((artifact) => [artifact.path, artifact]));
  for (const artifact of runbook.artifacts) {
    if (await hashFile(await projectFile(root, artifact.path)) !== artifact.digest) throw new Error(`runbook_digest_mismatch: ${artifact.path}`);
  }
  for (const stage of runbook.stages) {
    if (stage.status === 'complete' && stage.evidencePaths.some((relative) => !artifacts.has(relative))) {
      throw new Error(`runbook_untracked_evidence: ${stage.name}`);
    }
    for (const relative of stage.evidencePaths) await projectFile(root, relative);
  }
  for (const gate of runbook.gates) {
    if (gate.status !== 'passed') continue;
    const relative = gate.evidencePath!;
    const actual = await hashFile(await projectFile(root, relative));
    if (actual !== gate.evidenceDigest) throw new Error(`runbook_gate_evidence_digest_mismatch: ${gate.name}`);
  }
  return { digest: digest(runbook), verifiedArtifacts: artifacts.size,
    passedGateReferences: runbook.gates.filter((gate) => gate.status === 'passed').length };
}
