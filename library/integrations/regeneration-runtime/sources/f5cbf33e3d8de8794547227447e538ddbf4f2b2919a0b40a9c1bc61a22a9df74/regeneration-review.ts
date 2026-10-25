import { spawn } from 'node:child_process';
import { mkdir, stat, writeFile } from 'node:fs/promises';
import path from 'node:path';
import sharp from 'sharp';
import type { OverlayOptions } from 'sharp';
import { round, sha256, sha256File } from './canonical.ts';

interface Probe {
  durationSeconds: number;
  video: { width: number; height: number; fps: number; frameCount: number | null } | null;
  audio: { sampleRate: number; channels: number } | null;
}
interface BlackSegment { startSeconds: number; endSeconds: number }
interface Finding { severity: 'error' | 'warning'; code: string; message: string }
export interface RegenerationReview {
  schemaVersion: '1.0.0';
  reviewedAt: string;
  method: 'independent-local-media-comparison';
  source: { path: string; sha256: string; byteSize: number; probe: Probe };
  variant: { path: string; sha256: string; byteSize: number; probe: Probe };
  audio: { sourceDecodedSha256: string | null; variantDecodedSha256: string | null; encoding: 'pcm_f32le' };
  checks: { audioParity: boolean; durationParity: boolean; frameRateParity: boolean; frameCountParity: boolean | null;
    resolution: boolean; visualChanged: boolean; newInteriorBlack: boolean };
  thresholds: { durationToleranceSeconds: number; frameRateTolerance: number; maxNewInteriorBlackSeconds: number; minMeanPixelDifference: number };
  frames: { timeSeconds: number; sourcePngSha256: string; variantPngSha256: string; meanPixelDifference: number }[];
  blackSegments: { source: BlackSegment[]; variant: BlackSegment[]; newInterior: BlackSegment[] };
  evidence: { comparison: { path: string; sha256: string }; sampleSize: { width: number; height: number } };
  findings: Finding[];
  status: 'passed' | 'failed';
  editorialReview: 'pending';
}

const WIDTH = 480;
const HEIGHT = 270;
const FRAME_RATE_TOLERANCE = 0.001;
const MAX_BLACK_SECONDS = 0.5;
// An observable pixel change is not an aesthetic-quality score. This rejects identical or merely remuxed video.
const MIN_PIXEL_DIFFERENCE = 1;

function executable(name: 'ffmpeg' | 'ffprobe') {
  return (name === 'ffmpeg' ? process.env.FFMPEG_PATH : process.env.FFPROBE_PATH) || name;
}

async function run(name: 'ffmpeg' | 'ffprobe', args: string[]): Promise<{ stdout: Buffer; stderr: string }> {
  return new Promise((resolve, reject) => {
    const child = spawn(executable(name), args, { windowsHide: true, stdio: ['ignore', 'pipe', 'pipe'] });
    const stdout: Buffer[] = [];
    const stderr: Buffer[] = [];
    let bytes = 0;
    let failure: Error | undefined;
    const timer = setTimeout(() => { failure = new Error(`${name}_review_timeout`); child.kill('SIGKILL'); }, 15 * 60_000);
    child.stdout.on('data', (chunk: Buffer) => {
      bytes += chunk.length;
      if (bytes > 32 * 1024 * 1024) { failure = new Error(`${name}_review_output_limit`); child.kill('SIGKILL'); }
      else stdout.push(chunk);
    });
    child.stderr.on('data', (chunk: Buffer) => {
      stderr.push(chunk);
      if (stderr.reduce((total, part) => total + part.length, 0) > 1024 * 1024) stderr.shift();
    });
    child.on('error', (error) => { clearTimeout(timer); reject(error); });
    child.on('close', (code) => {
      clearTimeout(timer);
      const detail = Buffer.concat(stderr).toString('utf8');
      if (failure || code !== 0) reject(failure ?? new Error(`${name}_review_failed: ${detail.slice(-2000)}`));
      else resolve({ stdout: Buffer.concat(stdout), stderr: detail });
    });
  });
}

function positive(value: unknown): number | null {
  const n = Number(value);
  return Number.isFinite(n) && n > 0 ? n : null;
}

async function probe(file: string): Promise<Probe> {
  const { stdout } = await run('ffprobe', ['-v', 'error', '-show_streams', '-show_format', '-of', 'json', file]);
  const raw = JSON.parse(stdout.toString('utf8')) as {
    format?: { duration?: string };
    streams?: { codec_type?: string; width?: number; height?: number; avg_frame_rate?: string; r_frame_rate?: string;
      duration?: string; nb_frames?: string; sample_rate?: string; channels?: number }[];
  };
  const video = raw.streams?.find((stream) => stream.codec_type === 'video');
  const audio = raw.streams?.find((stream) => stream.codec_type === 'audio');
  const rate = (value: string | undefined) => {
    const [numerator, denominator = '1'] = (value ?? '0').split('/');
    return positive(Number(numerator) / Number(denominator)) ?? 0;
  };
  return {
    durationSeconds: positive(video?.duration) ?? positive(raw.format?.duration) ?? 0,
    video: video ? { width: video.width ?? 0, height: video.height ?? 0, fps: rate(video.avg_frame_rate) || rate(video.r_frame_rate),
      frameCount: positive(video.nb_frames) } : null,
    audio: audio ? { sampleRate: positive(audio.sample_rate) ?? 0, channels: audio.channels ?? 0 } : null
  };
}

async function audioHash(file: string): Promise<string> {
  const { stdout } = await run('ffmpeg', ['-hide_banner', '-loglevel', 'error', '-i', file, '-map', '0:a:0', '-vn',
    '-c:a', 'pcm_f32le', '-f', 'hash', '-hash', 'sha256', 'pipe:1']);
  const hash = /SHA256=([a-f0-9]{64})/i.exec(stdout.toString('utf8'))?.[1];
  if (!hash) throw new Error('decoded_audio_hash_missing');
  return hash.toLowerCase();
}

async function frame(file: string, time: number): Promise<Buffer> {
  const { stdout } = await run('ffmpeg', ['-hide_banner', '-loglevel', 'error', '-ss', String(time), '-i', file, '-map', '0:v:0',
    '-frames:v', '1', '-vf', `scale=${WIDTH}:${HEIGHT}:force_original_aspect_ratio=decrease,pad=${WIDTH}:${HEIGHT}:(ow-iw)/2:(oh-ih)/2`,
    '-c:v', 'png', '-f', 'image2pipe', 'pipe:1']);
  if (!stdout.length) throw new Error(`review_frame_missing: ${time}`);
  return stdout;
}

async function blackSegments(file: string, duration: number): Promise<BlackSegment[]> {
  // Only decode a small proxy for this bounded check; no spectral or full-resolution analysis is performed.
  const { stderr } = await run('ffmpeg', ['-hide_banner', '-nostats', '-loglevel', 'info', '-i', file, '-map', '0:v:0', '-an',
    '-vf', 'scale=160:90,blackdetect=d=0.5:pix_th=0.1:pic_th=0.98', '-f', 'null', '-']);
  return [...stderr.matchAll(/black_start:([\d.]+)\s+black_end:([\d.]+)\s+black_duration:([\d.]+)/g)]
    .map((match) => ({ startSeconds: Number(match[1]), endSeconds: Number(match[2]) }))
    .filter((segment) => segment.startSeconds < duration && segment.endSeconds > segment.startSeconds);
}

function newlyBlack(variant: BlackSegment[], source: BlackSegment[], duration: number, tolerance: number): BlackSegment[] {
  const result: BlackSegment[] = [];
  for (const black of variant) {
    // Ignore only the actual edge frames, rather than ignoring an entire black clip touching an edge.
    let pieces = [{ startSeconds: Math.max(tolerance, black.startSeconds), endSeconds: Math.min(duration - tolerance, black.endSeconds) }];
    for (const old of source) pieces = pieces.flatMap((piece) => {
      const start = old.startSeconds - tolerance;
      const end = old.endSeconds + tolerance;
      if (end <= piece.startSeconds || start >= piece.endSeconds) return [piece];
      return [
        { startSeconds: piece.startSeconds, endSeconds: Math.min(start, piece.endSeconds) },
        { startSeconds: Math.max(end, piece.startSeconds), endSeconds: piece.endSeconds }
      ].filter((part) => part.endSeconds > part.startSeconds);
    });
    result.push(...pieces.filter((piece) => piece.endSeconds - piece.startSeconds > MAX_BLACK_SECONDS));
  }
  return result.map((segment) => ({ startSeconds: round(segment.startSeconds, 6), endSeconds: round(segment.endSeconds, 6) }));
}

/** Rechecks a generated variant independently; machine passage never implies editorial approval. */
export async function reviewRegeneration(sourceFile: string, variantFile: string, evidenceDirectory: string): Promise<RegenerationReview> {
  const sourcePath = path.resolve(sourceFile);
  const variantPath = path.resolve(variantFile);
  const out = path.resolve(evidenceDirectory);
  const [sourceProbe, variantProbe, sourceDigest, variantDigest, sourceStat, variantStat] = await Promise.all([
    probe(sourcePath), probe(variantPath), sha256File(sourcePath), sha256File(variantPath), stat(sourcePath), stat(variantPath)
  ]);
  await mkdir(out, { recursive: true });
  const fps = sourceProbe.video?.fps ?? 0;
  const tolerance = Math.max(fps > 0 ? 1 / fps : 0, 0.05);
  const findings: Finding[] = [];
  const error = (code: string, message: string) => findings.push({ severity: 'error', code, message });
  const audio = { sourceDecodedSha256: sourceProbe.audio ? await audioHash(sourcePath) : null,
    variantDecodedSha256: variantProbe.audio ? await audioHash(variantPath) : null, encoding: 'pcm_f32le' as const };
  const checks = {
    audioParity: Boolean(sourceProbe.audio && variantProbe.audio && audio.sourceDecodedSha256 === audio.variantDecodedSha256
      && sourceProbe.audio.sampleRate === variantProbe.audio.sampleRate && sourceProbe.audio.channels === variantProbe.audio.channels),
    durationParity: sourceProbe.durationSeconds > 0 && variantProbe.durationSeconds > 0
      && Math.abs(sourceProbe.durationSeconds - variantProbe.durationSeconds) <= tolerance + 1e-6,
    frameRateParity: Boolean(fps > 0 && variantProbe.video && Math.abs(fps - variantProbe.video.fps) <= FRAME_RATE_TOLERANCE),
    frameCountParity: sourceProbe.video?.frameCount && variantProbe.video?.frameCount
      ? sourceProbe.video.frameCount === variantProbe.video.frameCount : null,
    resolution: variantProbe.video?.width === 1920 && variantProbe.video.height === 1080,
    visualChanged: false,
    newInteriorBlack: true
  };
  if (!checks.audioParity) error('audio-parity', 'Both files must contain identical decoded narration at the same sample rate and channel count.');
  if (!checks.durationParity) error('duration-parity', `Video duration differs by more than ${round(tolerance, 6)} seconds or is unavailable.`);
  if (!checks.frameRateParity) error('frame-rate-parity', 'The variant must retain the source frame rate.');
  if (checks.frameCountParity === false) error('frame-count-parity', 'The variant frame count differs from the source.');
  if (checks.frameCountParity === null) findings.push({ severity: 'warning', code: 'frame-count-unavailable', message: 'Container frame count is unavailable; duration and frame rate are checked separately.' });
  if (!checks.resolution) error('resolution', 'The regenerated variant must be 1920x1080. Legacy source resolutions may be normalized.');
  const samples: RegenerationReview['frames'] = [];
  const composites: OverlayOptions[] = [];
  let sourceBlack: BlackSegment[] = [];
  let variantBlack: BlackSegment[] = [];
  let newBlack: BlackSegment[] = [];
  if (sourceProbe.video && variantProbe.video && sourceProbe.durationSeconds > 0 && variantProbe.durationSeconds > 0) {
    const duration = Math.min(sourceProbe.durationSeconds, variantProbe.durationSeconds);
    const count = Math.min(6, Math.max(1, Math.floor(duration * Math.max(fps, 1))));
    for (let index = 0; index < count; index++) {
      const time = Math.min(Math.max(0, duration - (fps > 0 ? 1 / fps : 0.05)), duration * (index + 0.5) / count);
      const [original, variant] = await Promise.all([frame(sourcePath, time), frame(variantPath, time)]);
      const [a, b] = await Promise.all([sharp(original).removeAlpha().raw().toBuffer(), sharp(variant).removeAlpha().raw().toBuffer()]);
      let difference = 0;
      for (let offset = 0; offset < a.length; offset++) difference += Math.abs(a[offset] - b[offset]);
      samples.push({ timeSeconds: round(time, 6), sourcePngSha256: sha256(original), variantPngSha256: sha256(variant),
        meanPixelDifference: round(difference / a.length, 6) });
      composites.push({ input: original, left: 16, top: 48 + index * 294 }, { input: variant, left: 512, top: 48 + index * 294 });
    }
    checks.visualChanged = sourceDigest !== variantDigest && samples.reduce((total, sample) => total + sample.meanPixelDifference, 0) / samples.length >= MIN_PIXEL_DIFFERENCE;
    [sourceBlack, variantBlack] = await Promise.all([blackSegments(sourcePath, duration), blackSegments(variantPath, duration)]);
    newBlack = newlyBlack(variantBlack, sourceBlack, duration, tolerance);
    checks.newInteriorBlack = newBlack.length === 0;
  } else error('video-stream-missing', 'Both source and variant must have a video stream and a measurable duration.');
  if (!checks.visualChanged) error('visual-unchanged', 'Sampled visuals are identical or differ by less than one mean RGB level; recomposition is not demonstrated.');
  if (!checks.newInteriorBlack) error('new-interior-black', 'The variant introduces an interior black interval longer than 0.5 seconds that is absent in the source.');
  const sheetHeight = Math.max(128, 48 + samples.length * 294);
  const labels = samples.map((sample, index) => `<text x="16" y="${48 + index * 294 + 285}">${sample.timeSeconds}s</text>`).join('');
  const overlay = Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="1008" height="${sheetHeight}"><g fill="#ffffff" font-family="sans-serif" font-size="18"><text x="16" y="28">Original</text><text x="512" y="28">Regenerated variant</text>${labels}</g></svg>`);
  const comparisonPath = path.join(out, 'comparison.jpg');
  await sharp({ create: { width: 1008, height: sheetHeight, channels: 3, background: '#111827' } })
    .composite([...composites, { input: overlay, left: 0, top: 0 }]).jpeg({ quality: 88 }).toFile(comparisonPath);
  const receipt: RegenerationReview = {
    schemaVersion: '1.0.0', reviewedAt: new Date().toISOString(), method: 'independent-local-media-comparison',
    source: { path: sourcePath, sha256: sourceDigest, byteSize: sourceStat.size, probe: sourceProbe },
    variant: { path: variantPath, sha256: variantDigest, byteSize: variantStat.size, probe: variantProbe }, audio, checks,
    thresholds: { durationToleranceSeconds: round(tolerance, 6), frameRateTolerance: FRAME_RATE_TOLERANCE,
      maxNewInteriorBlackSeconds: MAX_BLACK_SECONDS, minMeanPixelDifference: MIN_PIXEL_DIFFERENCE },
    frames: samples, blackSegments: { source: sourceBlack, variant: variantBlack, newInterior: newBlack },
    evidence: { comparison: { path: 'comparison.jpg', sha256: await sha256File(comparisonPath) }, sampleSize: { width: WIDTH, height: HEIGHT } },
    findings, status: findings.some((finding) => finding.severity === 'error') ? 'failed' : 'passed', editorialReview: 'pending'
  };
  await writeFile(path.join(out, 'review.json'), `${JSON.stringify(receipt, null, 2)}\n`);
  return receipt;
}
