import assert from 'node:assert/strict';
import { execFileSync, spawnSync } from 'node:child_process';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { reviewRegeneration } from '../../packages/core/src/regeneration-review.ts';

const ffmpeg = process.env.FFMPEG_PATH || 'ffmpeg';
const ffprobe = process.env.FFPROBE_PATH || 'ffprobe';
const available = [ffmpeg, ffprobe].every((tool) => spawnSync(tool, ['-version'], { stdio: 'ignore' }).status === 0);

test('independent regeneration review binds media, preserves decoded audio and rejects lost audio, copied visuals and new black',
  { skip: !available, timeout: 120_000 }, async () => {
    const directory = await mkdtemp(path.join(os.tmpdir(), 'a2swe-regeneration-review-'));
    const source = path.join(directory, 'source.mp4');
    const variant = path.join(directory, 'variant.mp4');
    const silent = path.join(directory, 'silent.mp4');
    const black = path.join(directory, 'black.mp4');
    const inheritedSource = path.join(directory, 'inherited-source.mp4');
    const inheritedVariant = path.join(directory, 'inherited-variant.mp4');
    const encode = (args: string[]) => execFileSync(ffmpeg, ['-hide_banner', '-loglevel', 'error', '-y', ...args], { timeout: 30_000, stdio: 'pipe' });
    try {
      encode(['-f', 'lavfi', '-i', 'color=c=blue:s=320x180:r=10:d=1.2', '-f', 'lavfi', '-i', 'sine=frequency=440:sample_rate=48000:duration=1.2',
        '-c:v', 'libx264', '-preset', 'ultrafast', '-pix_fmt', 'yuv420p', '-c:a', 'aac', '-shortest', source]);
      encode(['-i', source, '-map', '0:v:0', '-map', '0:a:0', '-vf', 'negate,scale=1920:1080', '-c:v', 'libx264', '-preset', 'ultrafast', '-pix_fmt', 'yuv420p', '-c:a', 'copy', variant]);
      const accepted = await reviewRegeneration(source, variant, path.join(directory, 'accepted'));
      assert.equal(accepted.status, 'passed', JSON.stringify(accepted.findings));
      assert.equal(accepted.editorialReview, 'pending');
      assert.equal(accepted.audio.sourceDecodedSha256, accepted.audio.variantDecodedSha256);
      assert.equal(accepted.checks.frameCountParity, true);
      assert.equal(accepted.source.probe.video?.width, 320);
      assert.equal(accepted.variant.probe.video?.width, 1920);
      assert.equal(accepted.frames.length, 6);
      assert.match(accepted.evidence.comparison.sha256, /^[a-f0-9]{64}$/);
      const saved = JSON.parse(await readFile(path.join(directory, 'accepted', 'review.json'), 'utf8'));
      assert.deepEqual(saved, accepted);
      assert.ok((await readFile(path.join(directory, 'accepted', 'comparison.jpg'))).length > 100);

      encode(['-i', variant, '-map', '0:v:0', '-c:v', 'copy', '-an', silent]);
      const lostAudio = await reviewRegeneration(source, silent, path.join(directory, 'lost-audio'));
      assert.equal(lostAudio.status, 'failed');
      assert.equal(lostAudio.checks.audioParity, false);
      assert.ok(lostAudio.findings.some((finding) => finding.code === 'audio-parity'));

      const unchanged = await reviewRegeneration(variant, variant, path.join(directory, 'unchanged'));
      assert.equal(unchanged.status, 'failed');
      assert.equal(unchanged.checks.visualChanged, false);
      assert.ok(unchanged.findings.some((finding) => finding.code === 'visual-unchanged'));

      encode(['-i', variant, '-vf', "drawbox=x=0:y=0:w=iw:h=ih:color=black:t=fill:enable='between(t,0.2,1.0)'",
        '-c:v', 'libx264', '-preset', 'ultrafast', '-pix_fmt', 'yuv420p', '-c:a', 'copy', black]);
      const blackReview = await reviewRegeneration(source, black, path.join(directory, 'new-black'));
      assert.equal(blackReview.status, 'failed');
      assert.equal(blackReview.checks.newInteriorBlack, false);
      assert.ok(blackReview.findings.some((finding) => finding.code === 'new-interior-black'));

      encode(['-i', source, '-vf', "drawbox=x=0:y=0:w=iw:h=ih:color=black:t=fill:enable='between(t,0.2,1.0)'",
        '-c:v', 'libx264', '-preset', 'ultrafast', '-pix_fmt', 'yuv420p', '-c:a', 'copy', inheritedSource]);
      encode(['-i', inheritedSource, '-vf', "scale=1920:1080,drawbox=x=0:y=0:w=iw:h=ih:color=yellow:t=fill:enable='lt(t,0.2)+gte(t,1.1)'",
        '-c:v', 'libx264', '-preset', 'ultrafast', '-pix_fmt', 'yuv420p', '-c:a', 'copy', inheritedVariant]);
      const inherited = await reviewRegeneration(inheritedSource, inheritedVariant, path.join(directory, 'inherited-black'));
      assert.equal(inherited.status, 'passed', JSON.stringify(inherited.findings));
      assert.ok(inherited.blackSegments.source.length > 0);
      assert.equal(inherited.blackSegments.newInterior.length, 0);
    } finally {
      await rm(directory, { recursive: true, force: true });
    }
  });
