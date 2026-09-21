import { mkdir, writeFile } from 'node:fs/promises';
import { randomUUID } from 'node:crypto';
import { userInfo } from 'node:os';
import path from 'node:path';
import { parseArgs } from 'node:util';
import sharp from 'sharp';
import { digest } from '../packages/core/src/canonical.ts';
import { submitAssetJob, runAssetJob, exportAssetJob } from '../packages/core/src/asset-jobs.ts';
import { verifyAssetBundle } from '../packages/core/src/assets.ts';

const { values } = parseArgs({ options: { out: { type: 'string' } } });
const output = path.resolve(values.out ?? `.a2swe/asset-proof-${randomUUID()}`);
await mkdir(path.dirname(output), { recursive: true });
await mkdir(output, { recursive: false });
const domain = { schemaVersion: '1.0.0', domainId: 'renderer-fixture', kind: 'tool', canonicalName: 'Synthetic renderer engineering fixture',
  asOf: '2026-09-18', windowStart: '2025-12-18', timezone: 'UTC', state: 'draft', sources: [], evidence: [], claims: [],
  knownGaps: ['Synthetic renderer test; no subject facts, brand assets or release approvals'] };
await writeFile(path.join(output, 'domain.json'), `${JSON.stringify(domain, null, 2)}\n`, { flag: 'wx' });
const variants = [
  { assetId: 'artifact-flow', title: 'Source to release artifact', nodes: [
    { symbol: 'code', label: 'Source', detail: 'Versioned components' },
    { symbol: 'artifact', label: 'Artifact', detail: 'One immutable build' },
    { symbol: 'review', label: 'Review', detail: 'Independent checks' }
  ] },
  { assetId: 'data-flow', title: 'A separate data movement plan', nodes: [
    { symbol: 'data', label: 'Source records', detail: 'Reconciled input' },
    { symbol: 'data', label: 'Target records', detail: 'Validated relationships' }
  ] },
  { assetId: 'dense-flow', title: 'Five-node layout and typography proof', nodes: [
    { symbol: 'code', label: 'Development environment', detail: 'Versioned source components' },
    { symbol: 'artifact', label: 'Immutable artifact', detail: 'One recorded build digest' },
    { symbol: 'environment', label: 'Test environment', detail: 'Target-specific configuration' },
    { symbol: 'review', label: 'Independent review', detail: 'Evidence and behavior checks' },
    { symbol: 'environment', label: 'Production environment', detail: 'Authorized operator decision' }
  ] }
];
const records = [];
for (const variant of variants) {
  const request = { schemaVersion: '1.0.0', ...variant, domainDigest: digest(domain), purpose: 'evaluation', method: 'diagram', role: 'diagram',
    prompt: 'Synthetic engineering fixture, not a production story or factual product claim.',
    alt: variant.nodes.map((node) => `${node.label}: ${node.detail}`).join('; '), width: 1920, height: 1080, seed: 42,
    palette: ['#fbfcfd', '#182322', '#00786b'] };
  const job = submitAssetJob(path.join(output, 'state'), userInfo().username, request, domain);
  await runAssetJob(path.join(output, 'state'), userInfo().username, job.taskId);
  const directory = path.join(output, variant.assetId);
  await exportAssetJob(path.join(output, 'state'), userInfo().username, job.taskId, directory);
  records.push({ taskId: job.taskId, directory: variant.assetId, record: await verifyAssetBundle(directory) });
}
const thumbnails = [];
for (const [index, record] of records.entries()) {
  thumbnails.push({ input: await sharp(path.join(output, record.directory, 'asset.png')).resize(960, 540).png().toBuffer(), left: 0, top: index * 540 });
}
await sharp({ create: { width: 960, height: 1620, channels: 3, background: '#ffffff' } }).composite(thumbnails).png().toFile(path.join(output, 'contact-sheet.png'));
await writeFile(path.join(output, 'proof.json'), `${JSON.stringify({ schemaVersion: '1.0.0', purpose: 'synthetic_engineering_validation',
  domainDigest: digest(domain), records, liveDiffusion: 'not_run', visualApproval: 'pending', production: false }, null, 2)}\n`, { flag: 'wx' });
console.log(JSON.stringify({ output, images: records.length, contactSheet: path.join(output, 'contact-sheet.png'), purpose: 'synthetic_engineering_validation' }, null, 2));