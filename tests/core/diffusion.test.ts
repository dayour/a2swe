import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import sharp from 'sharp';
import { digest } from '../../packages/core/src/canonical.ts';
import { collectDiffusion, submitDiffusion } from '../../packages/core/src/diffusion.ts';

const request = { schemaVersion: '1.0.0', assetId: 'synthetic-image', domainDigest: digest('fixture'), purpose: 'evaluation', method: 'diffusion',
  role: 'illustration', prompt: 'Synthetic test image, not actual inference', alt: 'Synthetic quadrants', width: 512, height: 512,
  seed: 42, palette: ['#ffffff', '#111111', '#007766'], nodes: [] };

test('synthetic ComfyUI transport recovers a queued prompt without resubmitting', async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), 'a2swe-diffusion-'));
  let submissions = 0;
  let promptId = '';
  let completed = false;
  let unsafe = false;
  const bitmap = await sharp(Buffer.from('<svg width="512" height="512"><rect width="512" height="512" fill="white"/><rect width="256" height="256" fill="black"/></svg>')).png().toBuffer();
  const server = createServer(async (incoming, response) => {
    response.setHeader('Content-Type', 'application/json');
    if (incoming.url === '/prompt') {
      let text = '';
      for await (const chunk of incoming) text += chunk;
      const body = JSON.parse(text);
      promptId = body.prompt_id;
      submissions++;
      assert.equal(body.prompt['4'].class_type, 'CheckpointLoaderSimple');
      assert.equal(body.prompt['5'].inputs.batch_size, 1);
      response.end(JSON.stringify({ prompt_id: promptId, node_errors: {} }));
    } else if (incoming.url?.startsWith('/history/')) {
      response.end(JSON.stringify(completed ? { [promptId]: { status: { completed: true, status_str: 'success' }, outputs: {
        '9': { images: [{ filename: unsafe ? '../other.png' : `a2swe_${promptId}_00001_.png`, subfolder: '', type: 'output' }] }
      } } } : {}));
    } else if (incoming.url?.startsWith('/view?')) { response.end(bitmap); }
    else { response.statusCode = 404; response.end('{}'); }
  });
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
  const address = server.address() as { port: number };
  const endpoint = `http://127.0.0.1:${address.port}`;
  try {
    const file = path.join(root, 'receipt.json');
    const receipt = await submitDiffusion(request, endpoint, 'fixture.safetensors', file);
    assert.equal(receipt.state, 'queued');
    await assert.rejects(submitDiffusion(request, endpoint, 'fixture.safetensors', file), /EEXIST/);
    assert.equal((await collectDiffusion(file)).state, 'pending_or_unknown');
    completed = true;
    const result = await collectDiffusion(file);
    assert.equal(result.state, 'succeeded');
    assert.equal(submissions, 1);
    if (result.state === 'succeeded') assert.equal(result.asset.record.origin.method, 'diffusion');
    unsafe = true;
    await assert.rejects(collectDiffusion(file), /unsafe_diffusion_output/);
    const modified = JSON.parse(await readFile(file, 'utf8'));
    modified.request.seed++;
    await writeFile(file, JSON.stringify(modified));
    await assert.rejects(collectDiffusion(file), /receipt_mismatch/);
  } finally { server.closeAllConnections(); await new Promise<void>((resolve) => server.close(() => resolve())); await rm(root, { recursive: true, force: true }); }
});

test('diffusion denies cloud endpoints, arbitrary checkpoints and unsupported workflows before submission', async () => {
  await assert.rejects(submitDiffusion(request, 'https://example.com', 'model.safetensors', 'unused'), /loopback/);
  await assert.rejects(submitDiffusion(request, 'http://127.0.0.1:8188', '../model.safetensors', 'unused'), /checkpoint/);
  await assert.rejects(submitDiffusion({ ...request, role: 'official_mark' }, 'http://127.0.0.1:8188', 'model.safetensors', 'unused'), /official_mark/);
});
