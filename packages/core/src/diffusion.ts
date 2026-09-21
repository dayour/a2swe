import { randomUUID } from 'node:crypto';
import { readFile, writeFile, rename } from 'node:fs/promises';
import { digest } from './canonical.ts';
import { assetLimits, createAsset } from './assets.ts';
import { validate } from './contracts.ts';
import type { AssetRecord, AssetRequest } from './contracts.ts';

export interface DiffusionReceipt {
  schemaVersion: '1.0.0';
  endpoint: string;
  promptId: string;
  checkpoint: string;
  request: AssetRequest;
  requestDigest: string;
  workflowDigest: string;
  state: 'submitting' | 'queued' | 'outcome_unknown';
}

function endpointUrl(endpoint: string): URL {
  const url = new URL(endpoint);
  if (url.protocol !== 'http:' || url.hostname !== '127.0.0.1' || url.username || url.password || url.pathname !== '/' || url.search || url.hash) throw new Error('loopback_endpoint_required');
  return url;
}

function workflow(request: AssetRequest, checkpoint: string, promptId: string) {
  if (request.method !== 'diffusion' || request.role !== 'illustration' || request.width % 64 || request.height % 64
    || request.width > 1536 || request.height > 1536) throw new Error('invalid_diffusion_request');
  if (!/^[A-Za-z0-9][A-Za-z0-9._-]{0,150}\.safetensors$/.test(checkpoint)) throw new Error('invalid_checkpoint_name');
  return {
    '3': { class_type: 'KSampler', inputs: { cfg: 7, denoise: 1, latent_image: ['5', 0], model: ['4', 0], negative: ['7', 0],
      positive: ['6', 0], sampler_name: 'euler', scheduler: 'normal', seed: request.seed, steps: 24 } },
    '4': { class_type: 'CheckpointLoaderSimple', inputs: { ckpt_name: checkpoint } },
    '5': { class_type: 'EmptyLatentImage', inputs: { batch_size: 1, height: request.height, width: request.width } },
    '6': { class_type: 'CLIPTextEncode', inputs: { clip: ['4', 1], text: request.prompt } },
    '7': { class_type: 'CLIPTextEncode', inputs: { clip: ['4', 1], text: 'text, watermark, logo, trademark, low resolution, blurry' } },
    '8': { class_type: 'VAEDecode', inputs: { samples: ['3', 0], vae: ['4', 2] } },
    '9': { class_type: 'SaveImage', inputs: { filename_prefix: `a2swe_${promptId}`, images: ['8', 0] } }
  };
}

async function boundedResponse(response: Response, limit: number): Promise<Buffer> {
  if (!response.ok || !response.body) throw new Error(`diffusion_http_${response.status}`);
  if (Number(response.headers.get('content-length')) > limit) { await response.body.cancel(); throw new Error('diffusion_response_limit'); }
  const reader = response.body.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;
  try {
    while (true) {
      const next = await reader.read();
      if (next.done) break;
      total += next.value.length;
      if (total > limit) throw new Error('diffusion_response_limit');
      chunks.push(next.value);
    }
  } finally { await reader.cancel(); }
  return Buffer.concat(chunks);
}

async function call(endpoint: string, resource: string, body?: unknown, limit = 1024 * 1024): Promise<Buffer> {
  const url = new URL(resource, endpointUrl(endpoint));
  const response = await fetch(url, { method: body === undefined ? 'GET' : 'POST', redirect: 'error', signal: AbortSignal.timeout(15000),
    headers: body === undefined ? {} : { 'Content-Type': 'application/json' }, body: body === undefined ? undefined : JSON.stringify(body) });
  return boundedResponse(response, limit);
}

export async function readDiffusionReceipt(filename: string): Promise<DiffusionReceipt> {
  const receipt: DiffusionReceipt = JSON.parse(await readFile(filename, 'utf8'));
  if (receipt.schemaVersion !== '1.0.0' || !/^[a-f0-9-]{36}$/.test(receipt.promptId)
    || !['submitting', 'queued', 'outcome_unknown'].includes(receipt.state)) throw new Error('invalid_diffusion_receipt');
  endpointUrl(receipt.endpoint);
  const request = validate('AssetRequest', receipt.request);
  if (digest(request) !== receipt.requestDigest || digest(workflow(request, receipt.checkpoint, receipt.promptId)) !== receipt.workflowDigest) throw new Error('diffusion_receipt_mismatch');
  return receipt;
}

export async function submitDiffusion(input: unknown, endpoint: string, checkpoint: string, receiptFile: string): Promise<DiffusionReceipt> {
  const request = validate('AssetRequest', input);
  endpointUrl(endpoint);
  const promptId = randomUUID();
  const graph = workflow(request, checkpoint, promptId);
  const receipt: DiffusionReceipt = { schemaVersion: '1.0.0', endpoint, promptId, checkpoint, request, requestDigest: digest(request),
    workflowDigest: digest(graph), state: 'submitting' };
  await writeFile(receiptFile, `${JSON.stringify(receipt, null, 2)}\n`, { flag: 'wx', mode: 0o600 });
  try {
    const response = JSON.parse((await call(endpoint, '/prompt', { prompt: graph, client_id: promptId, prompt_id: promptId })).toString());
    if (response.prompt_id !== promptId || response.error || Object.keys(response.node_errors ?? {}).length) throw new Error('diffusion_submission_not_confirmed');
    receipt.state = 'queued';
  } catch {
    receipt.state = 'outcome_unknown';
  }
  const staging = `${receiptFile}.${randomUUID()}.tmp`;
  await writeFile(staging, `${JSON.stringify(receipt, null, 2)}\n`, { flag: 'wx', mode: 0o600 });
  await rename(staging, receiptFile);
  return receipt;
}

export async function collectDiffusion(receiptFile: string): Promise<
  { state: 'pending_or_unknown'; promptId: string } | { state: 'succeeded'; request: AssetRequest; asset: { record: AssetRecord; png: Buffer } }
> {
  const receipt = await readDiffusionReceipt(receiptFile);
  const history = JSON.parse((await call(receipt.endpoint, `/history/${receipt.promptId}`)).toString());
  const result = history[receipt.promptId];
  if (!result) return { state: 'pending_or_unknown', promptId: receipt.promptId };
  if (result.status?.status_str === 'error') throw new Error('diffusion_execution_failed');
  if (result.status?.completed !== true) return { state: 'pending_or_unknown', promptId: receipt.promptId };
  const images = result.outputs?.['9']?.images;
  if (!Array.isArray(images) || images.length !== 1) throw new Error('unexpected_diffusion_outputs');
  const image = images[0];
  if (image.type !== 'output' || image.subfolder !== '' || typeof image.filename !== 'string'
    || !new RegExp(`^a2swe_${receipt.promptId}_[0-9]+_?\\.png$`).test(image.filename)) throw new Error('unsafe_diffusion_output');
  const query = new URLSearchParams({ filename: image.filename, subfolder: '', type: 'output' });
  const bytes = await call(receipt.endpoint, `/view?${query}`, undefined, assetLimits.bytes);
  const origin: AssetRecord['origin'] = { method: 'diffusion', provider: 'comfyui-loopback',
    version: `workflow-v1;checkpoint=${receipt.checkpoint};weights-and-server-version-unverified`, inputDigest: receipt.workflowDigest, sourceUrl: null };
  const asset = await createAsset(receipt.request, bytes, origin);
  return { state: 'succeeded', request: receipt.request, asset };
}