import test from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdtemp, mkdir, readFile, rm, unlink, writeFile } from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import { sha256File } from '../../packages/core/src/canonical.ts';
import { validate } from '../../packages/core/src/contracts.ts';
import { regenerateRevisions } from '../../packages/core/src/regenerations.ts';

async function fixture() {
  const root = await mkdtemp(path.join(os.tmpdir(), 'a2swe-regeneration-cache-'));
  const render = path.join(root, 'renders', 'example-2026-01');
  await mkdir(render, { recursive: true });
  const source = path.join(render, 'original.mp4');
  const result = spawnSync(process.env.FFMPEG_PATH || 'ffmpeg', ['-y', '-v', 'error', '-f', 'lavfi', '-i', 'testsrc2=s=320x180:r=12:d=1',
    '-f', 'lavfi', '-i', 'sine=frequency=440:sample_rate=48000:duration=1', '-c:v', 'libx264', '-threads', '1', '-pix_fmt', 'yuv420p',
    '-c:a', 'aac', '-shortest', source], { encoding: 'utf8', timeout: 30_000 });
  assert.equal(result.status, 0, result.stderr);
  const sourceBytes = await readFile(source);
  const original = validate('RenderRevision', { schemaVersion: '1.0.0', projectId: 'example', title: 'example-2026-01', year: 2026, number: 1,
    createdAt: '2026-10-24T00:00:00.000Z', pipeline: 'legacy-template', status: 'superseded', source: 'renders/original.mp4',
    outputs: [{ path: 'original.mp4', role: 'video', digest: await sha256File(source), byteSize: sourceBytes.length,
      mediaType: 'video/mp4', durationSeconds: 1, width: 320, height: 180 }], notes: [] });
  const manifest = path.join(render, 'revision.json');
  const originalManifest = Buffer.from(`${JSON.stringify(original, null, 2)}\n`);
  await writeFile(manifest, originalManifest);
  const initial = await regenerateRevisions(root);
  assert.equal(initial.failures.length, 0, JSON.stringify(initial.failures));
  assert.equal(initial.generated, 2);
  const completedManifest = await readFile(manifest);
  const completed = validate('RenderRevision', JSON.parse(completedManifest.toString('utf8')));
  const variants = completed.outputs.filter(output => output.visualRegeneration);
  const folder = path.join(root, variants[0].visualRegeneration!.evidencePath!);
  const assertPreserved = async (expectedManifest = completedManifest) => {
    assert.deepEqual(await readFile(source), sourceBytes);
    assert.deepEqual(await readFile(manifest), expectedManifest);
    for (const variant of variants) assert.equal(await sha256File(path.join(render, variant.path)), variant.digest);
  };
  return { root, folder, manifest, source, originalManifest, completedManifest, variants, assertPreserved };
}

test('completed cache rejects missing or drifted evidence while preserving media and revision records', { timeout: 120_000 }, async () => {
  const f = await fixture();
  try {
    const mutations: [string, (value: any) => void][] = [
      ['generation.json', value => { value.outputPath = 'other.mp4'; }],
      ['plan.json', value => { value.design.title = 'Changed after review'; }],
      ['review.json', value => { value.source.sha256 = '0'.repeat(64); }],
      ['review.json', value => { value.checks.audioParity = false; }],
      ['fingerprint.json', value => { value.input.sha256 = '0'.repeat(64); }],
      ['style-comparison.json', value => { value.visualSimilarity += 1; }]
    ];
    for (const [name, mutate] of mutations) {
      const file = path.join(f.folder, name);
      const bytes = await readFile(file);
      const value = JSON.parse(bytes.toString('utf8'));
      mutate(value);
      await writeFile(file, JSON.stringify(value));
      const resumed = await regenerateRevisions(f.root);
      assert.equal(resumed.failures.length, 1, name);
      assert.match(resumed.failures[0].message, /regeneration_cached_evidence_changed/, name);
      await f.assertPreserved();
      await writeFile(file, bytes);
    }
    for (const name of ['review.json', 'comparison.jpg']) {
      const file = path.join(f.folder, name);
      const bytes = await readFile(file);
      await unlink(file);
      const resumed = await regenerateRevisions(f.root);
      assert.equal(resumed.failures.length, 1, name);
      assert.match(resumed.failures[0].message, /regeneration_cached_evidence_missing/, name);
      await f.assertPreserved();
      await writeFile(file, bytes);
    }
    const imageFile = path.join(f.folder, 'comparison.jpg');
    const imageBytes = await readFile(imageFile);
    await writeFile(imageFile, Buffer.concat([imageBytes, Buffer.from('drift')]));
    const drifted = await regenerateRevisions(f.root);
    assert.match(drifted.failures[0].message, /regeneration_cached_evidence_changed/);
    await f.assertPreserved();
    await writeFile(imageFile, imageBytes);
    const resumed = await regenerateRevisions(f.root);
    assert.equal(resumed.failures.length, 0, JSON.stringify(resumed.failures));
    assert.equal(resumed.generated, 0);
    await f.assertPreserved();
  } finally { await rm(f.root, { recursive: true, force: true }); }
});

test('legacy receipts remain cross-checked and missing evidence paths fail clearly', { timeout: 120_000 }, async () => {
  const f = await fixture();
  try {
    for (const variant of f.variants) {
      const file = path.join(f.root, variant.visualRegeneration!.evidencePath!, 'generation.json');
      const receipt = JSON.parse(await readFile(file, 'utf8'));
      assert.equal(Object.keys(receipt.evidenceDigests).length, 6);
      delete receipt.evidenceDigests;
      await writeFile(file, JSON.stringify(receipt));
    }
    const legacy = await regenerateRevisions(f.root);
    assert.equal(legacy.failures.length, 0, JSON.stringify(legacy.failures));
    assert.equal(legacy.generated, 0);
    await f.assertPreserved();
    const missing = JSON.parse(f.completedManifest.toString('utf8'));
    delete missing.outputs.find((output: any) => output.visualRegeneration).visualRegeneration.evidencePath;
    const missingBytes = Buffer.from(JSON.stringify(missing));
    await writeFile(f.manifest, missingBytes);
    const resumed = await regenerateRevisions(f.root);
    assert.equal(resumed.failures.length, 1);
    assert.match(resumed.failures[0].message, /^regeneration_cached_evidence_missing: evidencePath$/);
    await f.assertPreserved(missingBytes);
  } finally { await rm(f.root, { recursive: true, force: true }); }
});

test('interrupted publication retains runtime history and rejects missing review', { timeout: 120_000 }, async () => {
  const f = await fixture();
  try {
    // Recreate a crash after files/receipts were published, before revision.json
    // gained its variant records. The resumed run must perform the same checks.
    await writeFile(f.manifest, f.originalManifest);
    const plan = JSON.parse(await readFile(path.join(f.folder, 'plan.json'), 'utf8'));
    assert.deepEqual(Object.keys(plan.generator).sort(), ['regeneration-render.ts', 'regeneration-review.ts', 'regenerations.ts', 'visual-fingerprint.ts']);
    for (const [name, sha] of Object.entries(plan.generator)) {
      assert.equal(await sha256File(path.join(f.root, 'qc', 'regenerations', 'runtime', String(sha), name)), sha);
    }
    const archived = path.join(f.root, 'qc', 'regenerations', 'runtime', plan.generator['regenerations.ts'], 'regenerations.ts');
    const archivedBytes = await readFile(archived);
    await writeFile(archived, 'drifted historical source');
    const drifted = await regenerateRevisions(f.root);
    assert.equal(drifted.failures.length, 1);
    assert.match(drifted.failures[0].message, /^regeneration_runtime_archive_changed: regenerations.ts$/);
    await f.assertPreserved(f.originalManifest);
    assert.equal(await readFile(archived, 'utf8'), 'drifted historical source');
    await writeFile(archived, archivedBytes);
    const reviewFile = path.join(f.folder, 'review.json');
    const review = await readFile(reviewFile);
    await unlink(reviewFile);
    const resumed = await regenerateRevisions(f.root);
    assert.equal(resumed.failures.length, 1);
    assert.match(resumed.failures[0].message, /regeneration_cached_evidence_missing: review.json/);
    await f.assertPreserved(f.originalManifest);
    await writeFile(reviewFile, review);
    const repaired = await regenerateRevisions(f.root);
    assert.equal(repaired.failures.length, 0, JSON.stringify(repaired.failures));
    assert.equal(repaired.generated, 0);
    await f.assertPreserved();
  } finally { await rm(f.root, { recursive: true, force: true }); }
});
