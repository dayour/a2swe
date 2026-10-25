import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { sha256 } from '../../packages/core/src/canonical.ts';
import { compareFingerprints, fingerprintPixels, fingerprintVideo, histogramWasserstein, VISUAL_FINGERPRINT_METHOD } from '../../packages/core/src/visual-fingerprint.ts';
import type { VisualFingerprint } from '../../packages/core/src/visual-fingerprint.ts';

function pixels(color: [number, number, number], count = 32): Uint8Array {
  return Uint8Array.from(Array.from({ length: count }, () => color).flat());
}

function film(rgb: Uint8Array): VisualFingerprint {
  const measured = fingerprintPixels(rgb, 8, 4);
  return { schemaVersion: '1.0.0', method: VISUAL_FINGERPRINT_METHOD, input: { sha256: sha256(rgb), bytes: rgb.length },
    durationSeconds: 1, width: 8, height: 4, fps: 1, sampleDimensions: { width: 8, height: 4 }, sampleStrategy: 'uniform-midpoints',
    samples: [{ time: 0.5, ...measured }], summary: { ...measured, sampleCount: 1, palette: measured.dominantColors } };
}

test('pixel measurements recover analytic black, white and primary colors without stochastic clustering', () => {
  const black = fingerprintPixels(pixels([0, 0, 0]), 8, 4);
  assert.equal(black.brightness, 0);
  assert.equal(black.contrast, 0);
  assert.equal(black.darkRatio, 1);
  assert.deepEqual(black.labMean, [0, 0, 0]);
  assert.deepEqual(black.dominantColors, ['#000000']);
  const white = fingerprintPixels(pixels([255, 255, 255]), 8, 4);
  assert.equal(white.brightness, 1);
  assert.equal(white.contrast, 0);
  assert.equal(white.darkRatio, 0);
  assert.ok(Math.abs(white.labMean[0] - 100) < 0.001);
  assert.deepEqual(white.dominantColors, ['#FFFFFF']);
  const red = fingerprintPixels(pixels([255, 0, 0]), 8, 4);
  assert.ok(Math.abs(red.labMean[0] - 53.2408) < 0.001);
  assert.ok(Math.abs(red.labMean[1] - 80.0925) < 0.001);
  assert.ok(Math.abs(red.labMean[2] - 67.2032) < 0.001);
  assert.deepEqual(red.dominantColors, ['#FF0000']);
  assert.deepEqual(red, fingerprintPixels(pixels([255, 0, 0]), 8, 4));
  assert.equal(fingerprintPixels(Uint8Array.from([0, 0, 255]), 1, 1).layout.length, 96);
});

test('Wasserstein has physical channel units and rejects malformed distributions', () => {
  assert.equal(histogramWasserstein([1, 0, 0, 0], [0, 0, 0, 1], 0, 100), 75);
  assert.equal(histogramWasserstein([0.5, 0.5], [0.5, 0.5], -128, 128), 0);
  assert.equal(histogramWasserstein([1, 0], [0, 1], -128, 128), 128);
  assert.throws(() => histogramWasserstein([0, 0], [1, 0], 0, 100), /invalid_fingerprint_histogram/);
  assert.throws(() => histogramWasserstein([1, 0], [NaN, 0], 0, 100), /invalid_fingerprint_histogram/);
  assert.throws(() => fingerprintPixels(Uint8Array.from([0, 0, 0]), 2, 1), /invalid_fingerprint_pixels/);
});

test('comparison distinguishes palette from placement and never labels similarity as quality', () => {
  const left = Uint8Array.from(Array.from({ length: 32 }, (_, i) => i % 8 < 4 ? [0, 0, 0] : [255, 255, 255]).flat());
  const right = Uint8Array.from(Array.from({ length: 32 }, (_, i) => i % 8 >= 4 ? [0, 0, 0] : [255, 255, 255]).flat());
  const same = compareFingerprints(film(left), film(left));
  assert.equal(same.visualSimilarity, 100);
  assert.deepEqual(same.labDistance, { L: 0, a: 0, b: 0 });
  const moved = compareFingerprints(film(left), film(right));
  assert.equal(moved.paletteSimilarity, 100);
  assert.ok(moved.layoutSimilarity < 30);
  assert.ok(moved.findings.some(finding => finding.component === 'layout'));
  assert.ok(compareFingerprints(film(pixels([0, 0, 0])), film(pixels([255, 255, 255]))).visualSimilarity < 5);
});

const ffmpeg = process.env.FFMPEG_PATH || 'ffmpeg';
const ffprobe = process.env.FFPROBE_PATH || 'ffprobe';
const mediaToolsAvailable = spawnSync(ffmpeg, ['-version']).status === 0 && spawnSync(ffprobe, ['-version']).status === 0;

test('video sampling measures actual frames, binds the full file, and fails on missing media', { skip: !mediaToolsAvailable }, async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), 'a2swe-fingerprint-'));
  try {
    const file = path.join(root, 'red-blue.mkv');
    const encoded = spawnSync(ffmpeg, ['-v', 'error', '-f', 'lavfi', '-i', 'color=c=red:s=96x54:d=1:r=8',
      '-f', 'lavfi', '-i', 'color=c=blue:s=96x54:d=1:r=8', '-filter_complex', '[0:v][1:v]concat=n=2:v=1:a=0[v]',
      '-map', '[v]', '-c:v', 'ffv1', file], { encoding: 'utf8', timeout: 30_000 });
    assert.equal(encoded.status, 0, encoded.stderr);
    const fingerprint = await fingerprintVideo(file, [0.5, 1.5]);
    assert.equal(fingerprint.input.sha256, sha256(await readFile(file)));
    assert.deepEqual(fingerprint.samples.map(sample => sample.time), [0.5, 1.5]);
    assert.equal(fingerprint.width, 96);
    assert.equal(fingerprint.height, 54);
    assert.equal(fingerprint.fps, 8);
    assert.equal(fingerprint.summary.sampleCount, 2);
    assert.ok(fingerprint.samples[0].labMean[1] > 60);
    assert.ok(fingerprint.samples[0].labMean[2] > 50);
    assert.ok(fingerprint.samples[1].labMean[2] < -80);
    assert.equal(compareFingerprints(fingerprint, fingerprint).visualSimilarity, 100);
    await assert.rejects(fingerprintVideo(file, [-1]), /invalid_visual_fingerprint_sample_times/);
    await assert.rejects(fingerprintVideo(file, [0, 0]), /invalid_visual_fingerprint_sample_times/);
    await assert.rejects(fingerprintVideo(file, Array(9).fill(0.5)), /invalid_visual_fingerprint_sample_times/);
    const corrupt = path.join(root, 'not-video');
    await writeFile(corrupt, 'not a video');
    await assert.rejects(fingerprintVideo(corrupt), /visual_fingerprint_ffprobe_failed/);
  } finally { await rm(root, { recursive: true, force: true }); }
});

test('short low-fps videos clamp final samples to the last available frame', { skip: !mediaToolsAvailable }, async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), 'a2swe-fingerprint-end-'));
  try {
    for (const fps of [2, 12]) {
      const file = path.join(root, `short-${fps}.mp4`);
      const encoded = spawnSync(ffmpeg, ['-v', 'error', '-f', 'lavfi', '-i', `testsrc2=s=96x54:d=1:r=${fps}`,
        '-c:v', 'libx264', '-threads', '1', '-pix_fmt', 'yuv420p', file], { encoding: 'utf8', timeout: 30_000 });
      assert.equal(encoded.status, 0, encoded.stderr);
      const fingerprint = await fingerprintVideo(file);
      assert.equal(fingerprint.samples.length, Math.min(8, fps));
      const expectedLastTime = Math.round((1 - 1 / fps) * 1e6) / 1e6;
      assert.equal(fingerprint.samples.at(-1)!.time, expectedLastTime);
      const explicit = await fingerprintVideo(file, [0.98, 0.99]);
      assert.deepEqual(explicit.samples.map(sample => sample.time), [expectedLastTime]);
    }
  } finally { await rm(root, { recursive: true, force: true }); }
});
