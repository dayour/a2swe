import test from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdtemp, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import { digest, sha256File } from '../../packages/core/src/canonical.ts';
import { validate } from '../../packages/core/src/contracts.ts';
import { regenerateRevisions, regenerationSources } from '../../packages/core/src/regenerations.ts';

test('archived generation preserves the original, appends two distinct reviewed videos and resumes without duplicates', { timeout: 120_000 }, async () => {
  const project = await mkdtemp(path.join(os.tmpdir(), 'a2swe-regenerate-'));
  try {
    const render = path.join(project, 'renders', 'example-2026-01');
    await mkdir(render, { recursive: true });
    const input = path.join(render, 'original.mp4');
    const result = spawnSync(process.env.FFMPEG_PATH || 'ffmpeg', ['-y', '-v', 'error', '-f', 'lavfi', '-i', 'testsrc2=s=320x180:r=12:d=1',
      '-f', 'lavfi', '-i', 'sine=frequency=440:sample_rate=48000:duration=1', '-c:v', 'libx264', '-threads', '1', '-pix_fmt', 'yuv420p', '-c:a', 'aac', '-shortest', input]);
    assert.equal(result.status, 0, result.stderr?.toString());
    const bytes = await readFile(input);
    const original = { path: 'original.mp4', role: 'video', digest: await sha256File(input), byteSize: bytes.length, mediaType: 'video/mp4', durationSeconds: 1, width: 320, height: 180 };
    const manifest = validate('RenderRevision', { schemaVersion: '1.0.0', projectId: 'example', title: 'example-2026-01', year: 2026, number: 1,
      createdAt: '2026-10-24T00:00:00.000Z', pipeline: 'legacy-template', status: 'superseded', source: 'renders/original.mp4', outputs: [original], notes: [] });
    const file = path.join(render, 'revision.json');
    await writeFile(file, JSON.stringify(manifest));
    const generated = await regenerateRevisions(project);
    assert.equal(generated.failures.length, 0, JSON.stringify(generated.failures));
    assert.equal(generated.generated, 2);
    const updated = validate('RenderRevision', JSON.parse(await readFile(file, 'utf8')));
    assert.equal(updated.status, manifest.status);
    assert.equal(updated.source, manifest.source);
    assert.deepEqual(updated.outputs[0], original);
    assert.deepEqual(await readFile(input), bytes);
    assert.equal(updated.outputs.length, 3);
    assert.equal(new Set(updated.outputs.map((item) => item.digest)).size, 3);
    assert.equal(regenerationSources(updated).length, 1);
    for (const output of updated.outputs.slice(1)) {
      assert.equal(output.visualRegeneration?.sourceDigest, original.digest);
      assert.match(path.basename(path.dirname(output.visualRegeneration!.evidencePath!)), /^[a-f0-9]{12}-[a-f0-9]{12}$/);
      const evidence = path.join(project, output.visualRegeneration!.evidencePath!, 'review.json');
      const review = JSON.parse(await readFile(evidence, 'utf8'));
      assert.equal(review.status, 'passed');
      assert.equal(review.editorialReview, 'pending');
      assert.equal(review.checks.audioParity, true);
      assert.equal(review.variant.sha256, output.digest);
    }
    const resume = await regenerateRevisions(project);
    assert.equal(resume.failures.length, 0, JSON.stringify(resume.failures));
    assert.equal(resume.generated, 0);
    assert.equal(digest(JSON.parse(await readFile(file, 'utf8'))), digest(updated));
    await writeFile(input, 'tampered');
    const failed = await regenerateRevisions(project);
    assert.equal(failed.failures.length, 1);
    assert.match(failed.failures[0].message, /source_digest_mismatch/);
    assert.equal(digest(JSON.parse(await readFile(file, 'utf8'))), digest(updated));
  } finally { await rm(project, { recursive: true, force: true }); }
});
