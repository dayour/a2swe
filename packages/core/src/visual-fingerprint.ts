import { spawnSync } from 'node:child_process';
import { lstat } from 'node:fs/promises';
import path from 'node:path';
import { round, sha256File } from './canonical.ts';

// Adapted measurement/comparison methods from ReelMimic's MIT-licensed perception
// tools. See THIRD_PARTY_NOTICES.md. These are visual similarity measurements, not
// semantic, accessibility, brand-ownership, or aesthetic quality assessments.
export const VISUAL_FINGERPRINT_METHOD = 'a2swe-visual-fingerprint-v1';
const BINS = 32;
const GRID_WIDTH = 8;
const GRID_HEIGHT = 4;
const MAX_SAMPLES = 8;
const CHANNEL_RANGES = [[0, 100], [-128, 128], [-128, 128]] as const;

export type LabHistograms = [number[], number[], number[]];
export interface PixelFingerprint {
  brightness: number;
  contrast: number;
  darkRatio: number;
  colorfulness: number;
  labMean: [number, number, number];
  labHistograms: LabHistograms;
  /** Row-major 8 by 4 grid of mean [L/100, a/128, b/128] values. */
  layout: number[];
  dominantColors: string[];
  dominantColorShares: number[];
}
export interface VisualFingerprint {
  schemaVersion: '1.0.0';
  method: string;
  input: { sha256: string; bytes: number };
  durationSeconds: number;
  width: number;
  height: number;
  fps: number;
  sampleDimensions: { width: number; height: number };
  sampleStrategy: 'uniform-midpoints' | 'explicit-timestamps';
  samples: (PixelFingerprint & { time: number })[];
  /** Equal weight per sampled frame; does not imply full-film or source-brand coverage. */
  summary: PixelFingerprint & { sampleCount: number; palette: string[] };
}
export interface VisualComparison {
  schemaVersion: '1.0.0';
  method: string;
  visualSimilarity: number;
  paletteSimilarity: number;
  layoutSimilarity: number;
  labDistance: { L: number; a: number; b: number };
  findings: { component: 'palette' | 'layout' | 'sampling'; severity: 'info' | 'warning'; message: string }[];
}

function average(values: number[]): number {
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function rgbToLab(r: number, g: number, b: number): [number, number, number] {
  const linear = (value: number) => {
    const channel = value / 255;
    return channel <= 0.04045 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4;
  };
  const red = linear(r), green = linear(g), blue = linear(b);
  const transform = (value: number) => value > 216 / 24389 ? Math.cbrt(value) : (24389 / 27 * value + 16) / 116;
  const x = transform((red * 0.4124564 + green * 0.3575761 + blue * 0.1804375) / 0.95047);
  const y = transform(red * 0.2126729 + green * 0.7151522 + blue * 0.072175);
  const z = transform((red * 0.0193339 + green * 0.119192 + blue * 0.9503041) / 1.08883);
  return [Math.max(0, Math.min(100, 116 * y - 16)), 500 * (x - y), 200 * (y - z)];
}

/** Pure RGB24 analysis. Color bins and tie breaks are fixed; no random k-means or model inference. */
export function fingerprintPixels(rgb: Uint8Array, width: number, height: number): PixelFingerprint {
  if (!Number.isSafeInteger(width) || !Number.isSafeInteger(height) || width < 1 || height < 1
    || width * height > 3840 * 2160 || rgb.length !== width * height * 3) throw new Error('invalid_fingerprint_pixels');
  const count = width * height;
  const histograms: LabHistograms = [Array(BINS).fill(0), Array(BINS).fill(0), Array(BINS).fill(0)];
  const labs = new Float64Array(count * 3);
  const labSums = [0, 0, 0];
  const colors = new Map<number, { count: number; r: number; g: number; b: number }>();
  let luminance = 0, luminanceSquared = 0, dark = 0;
  let redGreen = 0, redGreenSquared = 0, yellowBlue = 0, yellowBlueSquared = 0;
  for (let pixel = 0; pixel < count; pixel++) {
    const offset = pixel * 3;
    const r = rgb[offset], g = rgb[offset + 1], b = rgb[offset + 2];
    const light = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
    luminance += light;
    luminanceSquared += light * light;
    if (light < 0.08) dark++;
    const rg = r - g, yb = (r + g) / 2 - b;
    redGreen += rg; redGreenSquared += rg * rg;
    yellowBlue += yb; yellowBlueSquared += yb * yb;
    const lab = rgbToLab(r, g, b);
    for (let channel = 0; channel < 3; channel++) {
      labs[offset + channel] = lab[channel];
      labSums[channel] += lab[channel];
      const [low, high] = CHANNEL_RANGES[channel];
      const bin = Math.max(0, Math.min(BINS - 1, Math.floor((lab[channel] - low) / (high - low) * BINS)));
      histograms[channel][bin]++;
    }
    const key = (r >> 4) * 256 + (g >> 4) * 16 + (b >> 4);
    const bucket = colors.get(key) ?? { count: 0, r: 0, g: 0, b: 0 };
    bucket.count++; bucket.r += r; bucket.g += g; bucket.b += b;
    colors.set(key, bucket);
  }
  const layout: number[] = [];
  for (let cellY = 0; cellY < GRID_HEIGHT; cellY++) {
    for (let cellX = 0; cellX < GRID_WIDTH; cellX++) {
      const x0 = Math.floor(cellX * width / GRID_WIDTH), y0 = Math.floor(cellY * height / GRID_HEIGHT);
      const x1 = Math.max(x0 + 1, Math.floor((cellX + 1) * width / GRID_WIDTH));
      const y1 = Math.max(y0 + 1, Math.floor((cellY + 1) * height / GRID_HEIGHT));
      const sum = [0, 0, 0];
      for (let y = y0; y < y1; y++) for (let x = x0; x < x1; x++) {
        const offset = (y * width + x) * 3;
        for (let channel = 0; channel < 3; channel++) sum[channel] += labs[offset + channel];
      }
      const cellPixels = (x1 - x0) * (y1 - y0);
      layout.push(round(sum[0] / cellPixels / 100, 6), round(sum[1] / cellPixels / 128, 6), round(sum[2] / cellPixels / 128, 6));
    }
  }
  const rankedColors = [...colors.entries()].sort((a, b) => b[1].count - a[1].count || a[0] - b[0]).slice(0, 6);
  const channelHex = (value: number) => Math.round(value).toString(16).padStart(2, '0').toUpperCase();
  const variance = (sum: number, squared: number) => Math.max(0, squared / count - (sum / count) ** 2);
  const brightness = luminance / count;
  return {
    brightness: round(brightness, 6), contrast: round(Math.sqrt(variance(luminance, luminanceSquared)), 6),
    darkRatio: round(dark / count, 6),
    colorfulness: round((Math.sqrt(variance(redGreen, redGreenSquared) + variance(yellowBlue, yellowBlueSquared))
      + 0.3 * Math.hypot(redGreen / count, yellowBlue / count)) / 255, 6),
    labMean: labSums.map(value => round(value / count, 6)) as [number, number, number],
    labHistograms: histograms.map(channel => channel.map(value => value / count)) as LabHistograms,
    layout,
    dominantColors: rankedColors.map(([, color]) => `#${channelHex(color.r / color.count)}${channelHex(color.g / color.count)}${channelHex(color.b / color.count)}`),
    dominantColorShares: rankedColors.map(([, color]) => round(color.count / count, 6))
  };
}

/** One-dimensional Wasserstein distance for equal-width normalized histogram bins. */
export function histogramWasserstein(left: readonly number[], right: readonly number[], low: number, high: number): number {
  if (!left.length || left.length !== right.length || !Number.isFinite(low) || !Number.isFinite(high) || high <= low
    || [...left, ...right].some(value => !Number.isFinite(value) || value < 0)
    || Math.abs(left.reduce((a, b) => a + b, 0) - 1) > 1e-6
    || Math.abs(right.reduce((a, b) => a + b, 0) - 1) > 1e-6) throw new Error('invalid_fingerprint_histogram');
  let cumulative = 0, distance = 0;
  for (let bin = 0; bin < left.length; bin++) {
    cumulative += left[bin] - right[bin];
    distance += Math.abs(cumulative);
  }
  return distance * (high - low) / left.length;
}

function summarize(samples: PixelFingerprint[]): VisualFingerprint['summary'] {
  const colors = new Map<string, number>();
  for (const sample of samples) sample.dominantColors.forEach((color, index) => colors.set(color, (colors.get(color) ?? 0) + sample.dominantColorShares[index]));
  const palette = [...colors.entries()].sort((a, b) => b[1] - a[1] || (a[0] < b[0] ? -1 : a[0] > b[0] ? 1 : 0)).slice(0, 6);
  return {
    sampleCount: samples.length,
    brightness: round(average(samples.map(sample => sample.brightness)), 6),
    // Mean within-frame contrast; temporal changes in brightness are not spatial contrast.
    contrast: round(average(samples.map(sample => sample.contrast)), 6),
    darkRatio: round(average(samples.map(sample => sample.darkRatio)), 6),
    colorfulness: round(average(samples.map(sample => sample.colorfulness)), 6),
    labMean: [0, 1, 2].map(channel => round(average(samples.map(sample => sample.labMean[channel])), 6)) as [number, number, number],
    labHistograms: [0, 1, 2].map(channel => Array.from({ length: BINS }, (_, bin) => average(samples.map(sample => sample.labHistograms[channel][bin])))) as LabHistograms,
    layout: Array.from({ length: GRID_WIDTH * GRID_HEIGHT * 3 }, (_, index) => round(average(samples.map(sample => sample.layout[index])), 6)),
    dominantColors: palette.map(([color]) => color),
    dominantColorShares: palette.map(([, share]) => round(share / samples.length, 6)),
    palette: palette.map(([color]) => color)
  };
}

function tool(name: 'ffmpeg' | 'ffprobe'): string {
  return (name === 'ffmpeg' ? process.env.FFMPEG_PATH : process.env.FFPROBE_PATH) || name;
}

function execute(name: 'ffmpeg' | 'ffprobe', args: string[], maxBuffer: number): Buffer {
  const result = spawnSync(tool(name), args, { encoding: null, timeout: 60_000, maxBuffer, windowsHide: true });
  if (result.error || result.status !== 0) throw new Error(`visual_fingerprint_${name}_failed: ${result.error?.message ?? result.stderr?.toString('utf8').trim().slice(-1200) ?? 'unknown failure'}`);
  return result.stdout;
}

/** Bounded, aspect-preserving RGB24 frame extraction. Existing footage is never modified. */
export async function fingerprintVideo(file: string, sampleTimes?: number[]): Promise<VisualFingerprint> {
  const filename = path.resolve(file);
  const before = await lstat(filename);
  if (!before.isFile() || before.isSymbolicLink()) throw new Error('visual_fingerprint_regular_file_required');
  const input = { sha256: await sha256File(filename), bytes: before.size };
  const probe = JSON.parse(execute('ffprobe', ['-v', 'error', '-select_streams', 'v:0', '-show_entries',
    'stream=width,height,avg_frame_rate,r_frame_rate,duration,nb_frames:format=duration', '-of', 'json', filename], 1024 * 1024).toString('utf8'));
  const video = probe.streams?.[0];
  // Container duration can include audio that extends beyond the final picture.
  const streamDuration = Number(video?.duration);
  const durationSeconds = Number.isFinite(streamDuration) && streamDuration > 0 ? streamDuration : Number(probe.format?.duration);
  const width = Number(video?.width), height = Number(video?.height);
  const rate = (value: unknown) => {
    const [n, d = 1] = String(value ?? '').split('/').map(Number);
    return Number.isFinite(n) && Number.isFinite(d) && n > 0 && d > 0 ? n / d : null;
  };
  const fps = rate(video?.avg_frame_rate) ?? rate(video?.r_frame_rate);
  if (!Number.isFinite(durationSeconds) || durationSeconds <= 0 || !Number.isSafeInteger(width) || !Number.isSafeInteger(height)
    || width < 1 || height < 1 || !fps) throw new Error('visual_fingerprint_video_metadata_unavailable');
  const declaredFrames = Number(video?.nb_frames);
  const frameCount = Number.isSafeInteger(declaredFrames) && declaredFrames > 0 ? declaredFrames : Math.max(1, Math.floor(durationSeconds * fps));
  const lastFrameTime = Math.max(0, Math.min(durationSeconds - 1 / fps, (frameCount - 1) / fps));
  const count = Math.min(MAX_SAMPLES, frameCount);
  const times = sampleTimes === undefined ? Array.from({ length: count }, (_, index) => (index + 0.5) * durationSeconds / count) : [...sampleTimes];
  if (!times.length || times.length > MAX_SAMPLES || times.some(time => !Number.isFinite(time) || time < 0 || time >= durationSeconds)
    || new Set(times).size !== times.length) throw new Error('invalid_visual_fingerprint_sample_times');
  // The final frame's presentation timestamp precedes the duration. Seeking into
  // its remaining display interval can return no frame, especially at low fps.
  // Record the clamped seek timestamp and avoid weighting repeated final samples.
  const actualTimes = [...new Set(times.map(time => Math.min(time, lastFrameTime)))].sort((a, b) => a - b);
  const scale = 192 / Math.max(width, height);
  const sampleWidth = Math.max(1, Math.round(width * scale)), sampleHeight = Math.max(1, Math.round(height * scale));
  const samples: VisualFingerprint['samples'] = [];
  for (const time of actualTimes) {
    const rgb = execute('ffmpeg', ['-v', 'error', '-ss', String(time), '-i', filename, '-map', '0:v:0', '-an', '-sn',
      '-frames:v', '1', '-vf', `scale=${sampleWidth}:${sampleHeight}:flags=area`, '-pix_fmt', 'rgb24', '-f', 'rawvideo', 'pipe:1'], 1024 * 1024);
    if (rgb.length !== sampleWidth * sampleHeight * 3) throw new Error(`visual_fingerprint_frame_missing: ${time}`);
    samples.push({ time: round(time, 6), ...fingerprintPixels(rgb, sampleWidth, sampleHeight) });
  }
  const after = await lstat(filename);
  if (before.size !== after.size || before.mtimeMs !== after.mtimeMs || before.ino !== after.ino) throw new Error('visual_fingerprint_input_changed');
  return { schemaVersion: '1.0.0', method: VISUAL_FINGERPRINT_METHOD, input, durationSeconds, width, height, fps,
    sampleDimensions: { width: sampleWidth, height: sampleHeight }, sampleStrategy: sampleTimes === undefined ? 'uniform-midpoints' : 'explicit-timestamps',
    samples, summary: summarize(samples) };
}

export function compareFingerprints(original: VisualFingerprint, variant: VisualFingerprint): VisualComparison {
  if (original.method !== VISUAL_FINGERPRINT_METHOD || variant.method !== VISUAL_FINGERPRINT_METHOD
    || !original.samples.length || !variant.samples.length) throw new Error('incompatible_visual_fingerprints');
  const reference = original.summary, candidate = variant.summary;
  const [L, a, b] = CHANNEL_RANGES.map(([low, high], channel) => histogramWasserstein(reference.labHistograms[channel], candidate.labHistograms[channel], low, high));
  if (reference.layout.length !== GRID_WIDTH * GRID_HEIGHT * 3 || candidate.layout.length !== reference.layout.length
    || [...reference.layout, ...candidate.layout].some(value => !Number.isFinite(value))) throw new Error('invalid_visual_fingerprint_layout');
  const rmse = Math.sqrt(average(reference.layout.map((value, index) => (value - candidate.layout[index]) ** 2)));
  const paletteSimilarity = 100 * Math.exp(-(L / 12 + (a + b) / 10));
  const layoutSimilarity = 100 * Math.exp(-rmse / 0.25);
  const findings: VisualComparison['findings'] = [];
  if (L > 8) findings.push({ component: 'palette', severity: 'warning', message: `Sampled frames are ${candidate.labMean[0] > reference.labMean[0] ? 'brighter' : 'darker'} than the original (Lab lightness distance ${round(L, 2)}).` });
  if (a + b > 10) {
    const da = candidate.labMean[1] - reference.labMean[1], db = candidate.labMean[2] - reference.labMean[2];
    const direction = Math.abs(db) >= Math.abs(da) ? db > 0 ? 'warmer' : 'cooler' : da > 0 ? 'redder' : 'greener';
    findings.push({ component: 'palette', severity: 'info', message: `Sampled color distribution is ${direction} than the original (Lab chroma distance ${round(a + b, 2)}); a brand change can be intentional.` });
  }
  if (rmse > 0.15) findings.push({ component: 'layout', severity: 'info', message: `Sampled light/color placement differs from the original (8 by 4 Lab grid RMSE ${round(rmse, 3)}). This measures color placement, not text readability.` });
  const samplingMatches = original.samples.length === variant.samples.length && original.samples.every((sample, index) => Math.abs(sample.time / original.durationSeconds - variant.samples[index].time / variant.durationSeconds) < 0.001);
  if (!samplingMatches) findings.push({ component: 'sampling', severity: 'warning', message: 'Sample timestamps do not cover the same normalized positions; visual similarity may reflect sampling differences.' });
  // Hand-set descriptive scales, not calibrated preferences. Palette has 80% and
  // coarse color placement 20%; no temporal, motion, OCR, or semantic score is implied.
  return { schemaVersion: '1.0.0', method: `${VISUAL_FINGERPRINT_METHOD}:lab-wasserstein80-layout20`,
    visualSimilarity: round(0.8 * paletteSimilarity + 0.2 * layoutSimilarity, 2),
    paletteSimilarity: round(paletteSimilarity, 2), layoutSimilarity: round(layoutSimilarity, 2),
    labDistance: { L: round(L, 4), a: round(a, 4), b: round(b, 4) }, findings };
}
