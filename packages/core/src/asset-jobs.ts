import { randomUUID } from 'node:crypto';
import { canonicalJson, digest } from './canonical.ts';
import { validate } from './contracts.ts';
import { createAsset, diagramOrigin, generateDiagram, writeAssetBundle } from './assets.ts';
import { Store } from './store.ts';
import type { Actor, Job } from './store.ts';

const requestMediaType = 'application/vnd.a2swe.asset-request+json';
const recordMediaType = 'application/vnd.a2swe.asset-record+json';
const capabilities = new Set(['asset.diagram']);

export function submitAssetJob(root: string, principalId: string, input: unknown, domainInput: unknown): Job {
  const request = validate('AssetRequest', input);
  const domain = validate('DomainPack', domainInput);
  if (request.method !== 'diagram' || request.domainDigest !== digest(domain)) throw new Error('asset_job_scope_mismatch');
  const store = new Store(root, { principalId, role: 'coordinator', capabilities });
  try {
    const reference = store.putArtifact(Buffer.from(canonicalJson(request)), requestMediaType);
    const identifier = `asset-${digest(request)}`;
    return store.submit({ schemaVersion: '1.0.0', taskId: identifier, runId: identifier, domainId: domain.domainId,
      domainDigest: digest(domain), stage: 'evaluation', objective: 'Generate a procedural diagram evaluation asset; not approved media.',
      inputs: [reference], dependencies: [], requiredCapabilities: ['asset.diagram'], idempotencyKey: identifier });
  } finally { store.close(); }
}

export async function runAssetJob(root: string, principalId: string, taskId: string): Promise<Job> {
  const actor: Actor = { principalId, role: 'worker', workerId: randomUUID(), capabilities };
  const store = new Store(root, actor);
  try {
    const job = store.get(taskId);
    if (job.work.stage !== 'evaluation' || job.work.requiredCapabilities.length !== 1 || job.work.requiredCapabilities[0] !== 'asset.diagram'
      || job.work.inputs.length !== 1 || job.work.inputs[0].mediaType !== requestMediaType) throw new Error('unsupported_asset_job');
    const request = validate('AssetRequest', JSON.parse(store.readArtifact(job.work.inputs[0]).toString()));
    if (request.method !== 'diagram' || request.domainDigest !== job.work.domainDigest) throw new Error('asset_job_scope_mismatch');
    if (job.state === 'succeeded') {
      for (const reference of job.result!.outputs) store.readArtifact(reference);
      return job;
    }
    const leased = store.claim(taskId, job.revision, 300000);
    const running = store.start(taskId, leased.revision, leased.fence);
    try {
      const png = await generateDiagram(request);
      const asset = await createAsset(request, png, diagramOrigin(request));
      const image = store.putArtifact(asset.png, 'image/png');
      const record = store.putArtifact(Buffer.from(canonicalJson(asset.record)), recordMediaType);
      return store.complete(taskId, running.revision, running.fence, { schemaVersion: '1.0.0', taskId,
        inputDigest: running.inputDigest, status: 'succeeded', outputs: [image, record],
        checks: [{ name: 'raster.decode', status: 'passed' }, { name: 'raster.dimensions', status: 'passed' }, { name: 'raster.nonblank', status: 'passed' }],
        summary: 'Evaluation raster generated and structurally checked. Rights, visual review, and production approval remain pending.' });
    } catch (error) {
      const current = store.get(taskId);
      if (current.state === 'running' && current.fence === running.fence && current.revision === running.revision) {
        store.complete(taskId, running.revision, running.fence, { schemaVersion: '1.0.0', taskId, inputDigest: running.inputDigest,
          status: 'failed', outputs: [], checks: [{ name: 'raster.generation', status: 'failed' }],
          summary: error instanceof Error ? error.message.slice(0, 1000) : 'asset_generation_failed' });
      }
      throw error;
    }
  } finally { store.close(); }
}

export async function exportAssetJob(root: string, principalId: string, taskId: string, directory: string): Promise<void> {
  const store = new Store(root, { principalId, role: 'reader', capabilities: new Set() });
  try {
    const job = store.get(taskId);
    if (job.state !== 'succeeded' || job.work.stage !== 'evaluation' || job.work.inputs.length !== 1 || job.work.inputs[0].mediaType !== requestMediaType) throw new Error('asset_job_not_exportable');
    const request = validate('AssetRequest', JSON.parse(store.readArtifact(job.work.inputs[0]).toString()));
    const image = job.result?.outputs.find((reference) => reference.mediaType === 'image/png');
    const metadata = job.result?.outputs.find((reference) => reference.mediaType === recordMediaType);
    if (!image || !metadata || request.domainDigest !== job.work.domainDigest) throw new Error('asset_job_outputs_missing');
    const record = validate('AssetRecord', JSON.parse(store.readArtifact(metadata).toString()));
    await writeAssetBundle(directory, request, { record, png: store.readArtifact(image) });
  } finally { store.close(); }
}