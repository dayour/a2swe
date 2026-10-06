import { createHash } from 'node:crypto';
import { createReadStream, existsSync } from 'node:fs';
import { lstat, mkdir, readdir, readFile, rename, writeFile } from 'node:fs/promises';
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

const MEDIA_TYPES: Record<string, string> = {
  '.md': 'text/markdown', '.json': 'application/json', '.html': 'text/html', '.pptx': 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', '.pdf': 'application/pdf', '.png': 'image/png',
  '.jpg': 'image/jpeg', '.mp4': 'video/mp4', '.svg': 'image/svg+xml', '.vtt': 'text/vtt'
};

/**
 * Projects agent/runbook.json from the verified release, canonical inputs and current review evidence.
 * Gates pass only when their evidence exists and is bound to the current release bytes.
 */
export async function projectRunbook(rootPath: string) {
  const root = path.resolve(rootPath);
  const exists = (relative: string) => existsSync(path.join(root, ...relative.split('/')));
  const parity = JSON.parse(await readFile(path.join(root, 'release', 'parity-manifest.json'), 'utf8')) as {
    contentDigest: string; outputs: { path: string; digest: string }[] };
  const domain = JSON.parse(await readFile(path.join(root, 'release', 'domain-pack.json'), 'utf8'));
  const projectId: string = domain.domainId;
  const outputDigest = (relative: string) => parity.outputs.find((output) => output.path === relative)?.digest;
  const audio = JSON.parse(await readFile(path.join(root, 'release', 'outputs', 'remotion', 'qc', 'audio-qa.json'), 'utf8')) as { valid?: boolean };
  const office = exists('qc/native-office/native-render.json')
    ? JSON.parse(await readFile(path.join(root, 'qc', 'native-office', 'native-render.json'), 'utf8')) as { pptx?: { sha256?: string; overflow?: unknown[] }; docx?: { sha256?: string } }
    : null;
  const officeCurrent = Boolean(office && office.pptx?.sha256 === outputDigest('outputs/deck.pptx') && office.docx?.sha256 === outputDigest('outputs/document.docx')
    && Array.isArray(office.pptx?.overflow) && office.pptx.overflow.length === 0);
  const videoDigest = outputDigest('outputs/remotion/dist/render.mp4');
  let analysisPath: string | null = null;
  if (exists('qc/analysis')) {
    for (const revision of await readdir(path.join(root, 'qc', 'analysis'), { withFileTypes: true })) {
      if (!revision.isDirectory()) continue;
      for (const media of await readdir(path.join(root, 'qc', 'analysis', revision.name), { withFileTypes: true })) {
        const candidate = `qc/analysis/${revision.name}/${media.name}/analysis.json`;
        if (!media.isDirectory() || !exists(candidate)) continue;
        const report = JSON.parse(await readFile(path.join(root, ...candidate.split('/')), 'utf8')) as { input?: { sha256?: string }; findings?: { severity: string }[] };
        if (report.input?.sha256 === videoDigest && !report.findings?.some((finding) => finding.severity === 'error')) analysisPath = candidate;
      }
    }
  }
  const render = ['outputs/index.html', 'outputs/deck.deck.json', 'outputs/deck.pptx', 'outputs/document.docx', 'outputs/document.pdf',
    'outputs/raster.png', 'outputs/raster.jpg', 'outputs/remotion/dist/render.mp4'].filter((relative) => outputDigest(relative)).map((relative) => `release/${relative}`);
  const stages = [
    { name: 'scaffold', paths: ['agent/SWE_AGENT.md'] },
    { name: 'research', paths: ['canonical/domain-pack.json', 'release/domain-pack.json'] },
    { name: 'content', paths: ['canonical/content-ir.json', 'release/content-ir.json', 'release/render-spec.json'] },
    { name: 'render', paths: render },
    { name: 'qc', paths: ['release/outputs/remotion/qc/audio-qa.json', 'release/outputs/remotion/qc/audio-spectrogram.svg', 'release/parity-manifest.json',
      ...(officeCurrent ? ['qc/native-office/native-render.json'] : []), ...(analysisPath ? [analysisPath] : [])] },
    { name: 'delivery', paths: ['release/asset-inventory.json', 'release/release-plan.json'] }
  ].map((stage) => ({ ...stage, paths: stage.paths.filter(exists) }));
  const artifacts: Runbook['artifacts'] = [];
  for (const stage of stages) {
    for (const relative of stage.paths) {
      if (artifacts.some((artifact) => artifact.path === relative)) continue;
      artifacts.push({ path: relative, digest: await hashFile(path.join(root, ...relative.split('/'))),
        mediaType: MEDIA_TYPES[path.extname(relative).toLowerCase()] ?? 'application/octet-stream', stage: stage.name });
    }
  }
  const digestOf = (relative: string) => artifacts.find((artifact) => artifact.path === relative)?.digest ?? null;
  const gate = (name: string, passed: boolean, relative: string) => (passed && digestOf(relative)
    ? { name, status: 'passed' as const, evidencePath: relative, evidenceDigest: digestOf(relative) }
    : { name, status: 'pending' as const, evidencePath: null, evidenceDigest: null });
  const gates = [
    gate('domain', domain.state === 'ready', 'release/domain-pack.json'),
    gate('content', true, 'release/content-ir.json'),
    gate('audio', audio.valid === true, 'release/outputs/remotion/qc/audio-qa.json'),
    gate('native-office', officeCurrent, 'qc/native-office/native-render.json'),
    gate('media-analysis', Boolean(analysisPath), analysisPath ?? 'qc/analysis'),
    gate('release', true, 'release/parity-manifest.json')
  ];
  const blockers = gates.filter((item) => item.status !== 'passed').map((item) => `${item.name} evidence is not bound to the current release.`);
  let previous: Partial<Runbook> = {};
  if (exists('agent/runbook.json')) {
    try { previous = JSON.parse(await readFile(path.join(root, 'agent', 'runbook.json'), 'utf8')); } catch { previous = {}; }
  }
  const runbook = validate('Runbook', {
    schemaVersion: '1.0.0', runbookId: previous.runbookId ?? projectId, projectId, updatedAt: new Date().toISOString(),
    domainDigest: digest(domain), contentDigest: parity.contentDigest, stage: blockers.length ? 'qc' : 'delivery', gates,
    stages: stages.map((stage, index) => ({ name: stage.name, status: stage.paths.length ? 'complete' : 'not_started', owner: 'a2swe',
      dependencies: index ? [stages[index - 1].name] : [], evidencePaths: stage.paths }))
      .map((stage, index, all) => (stage.status === 'complete' && all.slice(0, index).some((item) => item.status !== 'complete') ? { ...stage, status: 'in_progress' as const } : stage)),
    artifacts, blockers,
    nextAction: blockers.length ? `Produce current evidence for: ${gates.filter((item) => item.status !== 'passed').map((item) => item.name).join(', ')}.`
      : 'Use the verified release and revision renders for the executive decision; publication and distribution remain outside a2swe.'
  });
  const target = path.join(root, 'agent', 'runbook.json');
  await mkdir(path.dirname(target), { recursive: true });
  await writeFile(`${target}.tmp`, `${JSON.stringify(runbook, null, 2)}\n`);
  await rename(`${target}.tmp`, target);
  return verifyRunbook(root);
}
