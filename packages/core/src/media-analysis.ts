import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { createReadStream } from 'node:fs';
import { mkdir, rm, stat, writeFile } from 'node:fs/promises';
import path from 'node:path';
import sharp from 'sharp';
import type { OverlayOptions } from 'sharp';

export interface AnalysisScene { id: string; startSeconds: number; endSeconds: number }
export interface MediaAnalysisOptions { label?: string; scenes?: AnalysisScene[] }
export interface AnalysisFinding { severity: 'error' | 'warning' | 'info'; code: string; message: string; value?: number; threshold?: number }

const SAMPLE_RATE = 48000;
const FFT_SIZE = 4096;
const FFT_HOP = 2048;
const LEVEL_WINDOW = 0.05;
const LEVEL_HOP = 0.025;
const ZONE_WIDTH = 384;
const ZONE_HEIGHT = 216;
const ZONE_FPS = 5;
const BANDS = [['sub', 20, 80], ['low', 80, 300], ['speech', 300, 3400], ['presence', 3400, 8000], ['air', 8000, 16000], ['ultra', 16000, 24000]] as const;
// Layout zones of a 16:9 explainer frame; activity and detail are measured per zone to separate layer behavior.
const ZONES = [
  { id: 'header', x0: 0, x1: 1, y0: 0, y1: 0.08 },
  { id: 'headline', x0: 0, x1: 1, y0: 0.08, y1: 0.3 },
  { id: 'narrative', x0: 0, x1: 0.4, y0: 0.3, y1: 0.78 },
  { id: 'visual', x0: 0.4, x1: 1, y0: 0.3, y1: 0.78 },
  { id: 'caption', x0: 0, x1: 1, y0: 0.78, y1: 0.93 },
  { id: 'footer', x0: 0, x1: 1, y0: 0.93, y1: 1 }
] as const;
export const ANALYSIS_THRESHOLDS = {
  loudnessTargetLufs: -16,
  loudnessToleranceLu: 4,
  maxTruePeakDbtp: -1,
  maxPauseNoiseFloorDbfs: -55,
  minPauseSnrDb: 40,
  maxPauseHissShare: 0.3,
  maxHumProminenceDb: 12,
  maxDcOffset: 0.002,
  maxSpeechHighFrequencyRatio8k: 0.03,
  maxSpeechFlatness: 0.02,
  maxPauseSeconds: 2.5,
  minSpeechRatio: 0.6,
  maxBlackSeconds: 0.5,
  maxStaticHoldSeconds: 8
} as const;

function tool(name: 'ffmpeg' | 'ffprobe'): string {
  return (name === 'ffmpeg' ? process.env.FFMPEG_PATH : process.env.FFPROBE_PATH) || name;
}

function run(command: string, args: string[], label: string): { stdout: Buffer; stderr: string } {
  const result = spawnSync(command, args, { encoding: null, maxBuffer: 1024 * 1024 * 1024, windowsHide: true, timeout: 30 * 60 * 1000 });
  if (result.error) throw new Error(`${label}_failed: ${result.error.message}`);
  const stderr = result.stderr?.toString('utf8') ?? '';
  if (result.status !== 0) throw new Error(`${label}_failed: ${stderr.trim().slice(-2000)}`);
  return { stdout: result.stdout, stderr };
}

async function sha256File(file: string): Promise<string> {
  const hash = createHash('sha256');
  for await (const chunk of createReadStream(file)) hash.update(chunk);
  return hash.digest('hex');
}

const round = (value: number, places = 3) => Number.isFinite(value) ? Number(value.toFixed(places)) : value;
const toDb = (power: number) => 10 * Math.log10(Math.max(power, 1e-24));
const ampDb = (amplitude: number) => 20 * Math.log10(Math.max(amplitude, 1e-12));

function ratio(value: string | undefined): number | null {
  const [n, d] = String(value ?? '').split('/').map(Number);
  return Number.isFinite(n) && Number.isFinite(d) && d ? n / d : null;
}

export function probeMedia(input: string) {
  const data = JSON.parse(run(tool('ffprobe'), ['-v', 'error', '-show_streams', '-show_format', '-of', 'json', input], 'ffprobe').stdout.toString('utf8'));
  const video = data.streams?.find((stream: { codec_type?: string }) => stream.codec_type === 'video');
  const audio = data.streams?.find((stream: { codec_type?: string }) => stream.codec_type === 'audio');
  const durationSeconds = Number(data.format?.duration);
  if (!Number.isFinite(durationSeconds) || durationSeconds <= 0) throw new Error('media_duration_unavailable');
  return {
    container: String(data.format?.format_name ?? ''),
    durationSeconds: round(durationSeconds, 3),
    bitRate: Number(data.format?.bit_rate) || null,
    video: video ? { codec: video.codec_name, profile: video.profile ?? null, width: video.width, height: video.height,
      fps: round(ratio(video.avg_frame_rate) ?? 0, 3), pixelFormat: video.pix_fmt ?? null, bitRate: Number(video.bit_rate) || null,
      frames: Number(video.nb_frames) || null } : null,
    audio: audio ? { codec: audio.codec_name, sampleRate: Number(audio.sample_rate), channels: Number(audio.channels),
      bitRate: Number(audio.bit_rate) || null } : null
  };
}

function fft(re: Float64Array, im: Float64Array): void {
  const n = re.length;
  for (let i = 1, j = 0; i < n; i += 1) {
    let bit = n >> 1;
    for (; j & bit; bit >>= 1) j ^= bit;
    j ^= bit;
    if (i < j) {
      [re[i], re[j]] = [re[j], re[i]];
      [im[i], im[j]] = [im[j], im[i]];
    }
  }
  for (let len = 2; len <= n; len <<= 1) {
    const angle = -2 * Math.PI / len;
    const stepR = Math.cos(angle);
    const stepI = Math.sin(angle);
    const half = len >> 1;
    for (let i = 0; i < n; i += len) {
      let wr = 1;
      let wi = 0;
      for (let j = 0; j < half; j += 1) {
        const a = i + j;
        const b = a + half;
        const vr = re[b] * wr - im[b] * wi;
        const vi = re[b] * wi + im[b] * wr;
        re[b] = re[a] - vr;
        im[b] = im[a] - vi;
        re[a] += vr;
        im[a] += vi;
        const next = wr * stepR - wi * stepI;
        wi = wr * stepI + wi * stepR;
        wr = next;
      }
    }
  }
}

function hann(size: number): Float64Array {
  const window = new Float64Array(size);
  for (let i = 0; i < size; i += 1) window[i] = 0.5 - 0.5 * Math.cos(2 * Math.PI * i / size);
  return window;
}

function powerSpectrum(samples: Float32Array, start: number, size: number, window: Float64Array, re: Float64Array, im: Float64Array, into: Float64Array): void {
  for (let i = 0; i < size; i += 1) {
    re[i] = (samples[start + i] ?? 0) * window[i];
    im[i] = 0;
  }
  fft(re, im);
  for (let bin = 0; bin < into.length; bin += 1) into[bin] += re[bin] * re[bin] + im[bin] * im[bin];
}

function decodeAudio(input: string): { left: Float32Array; right: Float32Array; mono: Float32Array } {
  const { stdout } = run(tool('ffmpeg'), ['-hide_banner', '-loglevel', 'error', '-i', input, '-map', '0:a:0', '-ac', '2', '-ar', String(SAMPLE_RATE), '-f', 'f32le', 'pipe:1'], 'audio_decode');
  if (!stdout.length || stdout.length % 8) throw new Error('audio_decode_malformed');
  const interleaved = new Float32Array(stdout.length / 4);
  new Uint8Array(interleaved.buffer).set(stdout);
  const count = interleaved.length / 2;
  const left = new Float32Array(count);
  const right = new Float32Array(count);
  const mono = new Float32Array(count);
  for (let i = 0; i < count; i += 1) {
    left[i] = interleaved[2 * i];
    right[i] = interleaved[2 * i + 1];
    mono[i] = 0.5 * (left[i] + right[i]);
  }
  return { left, right, mono };
}

function percentile(values: number[], fraction: number): number {
  if (!values.length) return Number.NaN;
  const sorted = [...values].sort((a, b) => a - b);
  return sorted[Math.min(sorted.length - 1, Math.max(0, Math.floor(fraction * (sorted.length - 1))))];
}

function spectralSummary(psd: Float64Array, frames: number) {
  if (!frames) return null;
  const binHz = SAMPLE_RATE / FFT_SIZE;
  let total = 0;
  let weighted = 0;
  let logSum = 0;
  let arithmetic = 0;
  let count = 0;
  let high = 0;
  const bands: Record<string, number> = Object.fromEntries(BANDS.map(([name]) => [name, 0]));
  for (let bin = 1; bin < psd.length; bin += 1) {
    const frequency = bin * binHz;
    if (frequency < 20) continue;
    const power = psd[bin] / frames;
    total += power;
    weighted += power * frequency;
    if (frequency >= 8000) high += power;
    for (const [name, low, upper] of BANDS) if (frequency >= low && frequency < upper) bands[name] += power;
    if (frequency >= 80 && frequency <= 20000) {
      logSum += Math.log(Math.max(power, 1e-30));
      arithmetic += power;
      count += 1;
    }
  }
  let cumulative = 0;
  let rolloff95Hz = 0;
  for (let bin = 1; bin < psd.length; bin += 1) {
    if (bin * binHz < 20) continue;
    cumulative += psd[bin] / frames;
    if (cumulative >= 0.95 * total) {
      rolloff95Hz = bin * binHz;
      break;
    }
  }
  return {
    frames,
    centroidHz: round(weighted / Math.max(total, 1e-30), 1),
    rolloff95Hz: round(rolloff95Hz, 1),
    flatness: round(count ? Math.exp(logSum / count) / Math.max(arithmetic / count, 1e-30) : 0, 6),
    highFrequencyRatio8k: round(high / Math.max(total, 1e-30), 6),
    bandShare: Object.fromEntries(Object.entries(bands).map(([name, value]) => [name, round(value / Math.max(total, 1e-30), 6)]))
  };
}

interface LevelTimeline { db: Float64Array; active: Uint8Array; thresholdDbfs: number }

function levelTimeline(mono: Float32Array): LevelTimeline {
  const window = Math.round(LEVEL_WINDOW * SAMPLE_RATE);
  const hop = Math.round(LEVEL_HOP * SAMPLE_RATE);
  const frames = Math.max(1, Math.floor((mono.length - window) / hop) + 1);
  const db = new Float64Array(frames);
  for (let frame = 0; frame < frames; frame += 1) {
    let sum = 0;
    const start = frame * hop;
    for (let i = start; i < Math.min(mono.length, start + window); i += 1) sum += mono[i] * mono[i];
    db[frame] = sum > 0 ? ampDb(Math.sqrt(sum / window)) : -240;
  }
  const audible = Array.from(db).filter((value) => value > -200);
  const reference = audible.length ? percentile(audible, 0.95) : -240;
  const thresholdDbfs = Math.max(-55, reference - 28);
  const active = new Uint8Array(frames);
  for (let frame = 0; frame < frames; frame += 1) active[frame] = db[frame] > thresholdDbfs ? 1 : 0;
  // Bridge sub-150 ms dips so syllable gaps are not counted as pauses.
  const bridge = Math.round(0.15 / LEVEL_HOP);
  for (let frame = 0; frame < frames;) {
    if (active[frame]) { frame += 1; continue; }
    let end = frame;
    while (end < frames && !active[end]) end += 1;
    if (frame > 0 && end < frames && end - frame <= bridge) active.fill(1, frame, end);
    frame = end;
  }
  return { db, active, thresholdDbfs };
}

function activityStats(levels: LevelTimeline, startFrame = 0, endFrame = levels.db.length) {
  const pauses: number[] = [];
  let activeFrames = 0;
  const inactiveLevels: number[] = [];
  let digitalSilence = 0;
  let inactive = 0;
  for (let frame = startFrame; frame < endFrame;) {
    if (levels.active[frame]) { activeFrames += 1; frame += 1; continue; }
    let end = frame;
    while (end < endFrame && !levels.active[end]) {
      inactive += 1;
      if (levels.db[end] <= -200) digitalSilence += 1;
      else inactiveLevels.push(levels.db[end]);
      end += 1;
    }
    const seconds = (end - frame) * LEVEL_HOP;
    // Leading and trailing silence are framing, not pauses inside the narration.
    if (frame > startFrame && end < endFrame && seconds >= 0.25) pauses.push(seconds);
    frame = end;
  }
  const total = Math.max(1, endFrame - startFrame);
  return {
    speechRatio: round(activeFrames / total, 4),
    pauses: { count: pauses.length, longestSeconds: round(Math.max(0, ...pauses), 3), meanSeconds: round(pauses.length ? pauses.reduce((a, b) => a + b, 0) / pauses.length : 0, 3) },
    noiseFloorDbfs: inactiveLevels.length ? round(percentile(inactiveLevels, 0.5), 2) : null,
    digitalSilenceRatio: round(inactive ? digitalSilence / inactive : 0, 4)
  };
}

function humAnalysis(mono: Float32Array, levels: LevelTimeline) {
  const size = 32768;
  if (mono.length < size) return null;
  const window = hann(size);
  const re = new Float64Array(size);
  const im = new Float64Array(size);
  const psd = new Float64Array(size / 2 + 1);
  const quietStarts: number[] = [];
  const hop = Math.round(LEVEL_HOP * SAMPLE_RATE);
  for (let start = 0; start + size <= mono.length; start += size / 2) {
    const first = Math.floor(start / hop);
    const last = Math.min(levels.active.length, Math.ceil((start + size) / hop));
    let quiet = true;
    for (let frame = first; frame < last && quiet; frame += 1) if (levels.active[frame] || levels.db[frame] <= -200) quiet = false;
    if (quiet) quietStarts.push(start);
  }
  const starts = quietStarts.length >= 2 ? quietStarts : Array.from({ length: Math.min(40, Math.floor(mono.length / size)) }, (_, i) => i * size);
  for (const start of starts.slice(0, 60)) powerSpectrum(mono, start, size, window, re, im, psd);
  const binHz = SAMPLE_RATE / size;
  const peaks = [50, 60, 100, 120, 150, 180].map((frequency) => {
    const bin = Math.round(frequency / binHz);
    const local = Math.max(psd[bin - 1], psd[bin], psd[bin + 1]);
    const neighbors = [...Array.from(psd.subarray(bin - 30, bin - 6)), ...Array.from(psd.subarray(bin + 7, bin + 31))];
    return { frequencyHz: frequency, prominenceDb: round(toDb(local) - toDb(percentile(neighbors, 0.5)), 2) };
  });
  const strongest = peaks.reduce((a, b) => (b.prominenceDb > a.prominenceDb ? b : a));
  return { basis: quietStarts.length >= 2 ? 'pauses' : 'whole-track', windows: Math.min(60, starts.length), strongest, peaks };
}

function chunkPlan(durationSeconds: number, scenes: AnalysisScene[] | undefined, cuts: number[]): AnalysisScene[] {
  if (scenes?.length) {
    return scenes.map((scene) => ({ id: scene.id, startSeconds: Math.max(0, scene.startSeconds), endSeconds: Math.min(durationSeconds, scene.endSeconds) }))
      .filter((scene) => scene.endSeconds - scene.startSeconds > 0.2);
  }
  let boundaries = [0];
  for (const cut of cuts) if (cut - boundaries[boundaries.length - 1] >= 3 && durationSeconds - cut >= 3) boundaries.push(cut);
  if (boundaries.length < 2) boundaries = Array.from({ length: Math.ceil(durationSeconds / 10) }, (_, i) => i * 10);
  boundaries.push(durationSeconds);
  while (boundaries.length - 1 > 16) {
    let shortest = 1;
    for (let i = 2; i < boundaries.length - 1; i += 1) if (boundaries[i + 1] - boundaries[i - 1] < boundaries[shortest + 1] - boundaries[shortest - 1]) shortest = i;
    boundaries.splice(shortest, 1);
  }
  return boundaries.slice(0, -1).map((start, index) => ({ id: `chunk-${String(index + 1).padStart(2, '0')}`, startSeconds: round(start, 3), endSeconds: round(boundaries[index + 1], 3) }));
}

function parseLoudness(stderr: string) {
  const summary = stderr.slice(stderr.lastIndexOf('Summary:'));
  const value = (pattern: RegExp) => {
    const match = pattern.exec(summary);
    return match ? Number(match[1]) : null;
  };
  return { integratedLufs: value(/I:\s+(-?[\d.]+|-inf)\s+LUFS/), loudnessRangeLu: value(/LRA:\s+(-?[\d.]+)\s+LU/), truePeakDbtp: value(/Peak:\s+(-?[\d.]+|-inf)\s+dBFS/) };
}

function analyzeAudio(input: string, scenes: AnalysisScene[] | undefined, cuts: number[], durationSeconds: number) {
  const { left, right, mono } = decodeAudio(input);
  const loudness = parseLoudness(run(tool('ffmpeg'), ['-hide_banner', '-nostats', '-i', input, '-map', '0:a:0', '-af', 'ebur128=peak=true:framelog=quiet', '-f', 'null', '-'], 'loudness').stderr);
  let sum = 0;
  let sumL = 0;
  let sumR = 0;
  let cross = 0;
  let peak = 0;
  let clipped = 0;
  let mean = 0;
  for (let i = 0; i < mono.length; i += 1) {
    sum += mono[i] * mono[i];
    sumL += left[i] * left[i];
    sumR += right[i] * right[i];
    cross += left[i] * right[i];
    mean += mono[i];
    peak = Math.max(peak, Math.abs(left[i]), Math.abs(right[i]));
    if (Math.abs(left[i]) >= 0.999 || Math.abs(right[i]) >= 0.999) clipped += 1;
  }
  const levels = levelTimeline(mono);
  const window = hann(FFT_SIZE);
  const re = new Float64Array(FFT_SIZE);
  const im = new Float64Array(FFT_SIZE);
  const speechPsd = new Float64Array(FFT_SIZE / 2 + 1);
  const pausePsd = new Float64Array(FFT_SIZE / 2 + 1);
  let speechFrames = 0;
  let pauseFrames = 0;
  const stftActive: { start: number; active: boolean; audible: boolean }[] = [];
  const levelHop = Math.round(LEVEL_HOP * SAMPLE_RATE);
  for (let start = 0; start + FFT_SIZE <= mono.length; start += FFT_HOP) {
    const center = Math.min(levels.active.length - 1, Math.floor((start + FFT_SIZE / 2) / levelHop));
    let energy = 0;
    for (let i = start; i < start + FFT_SIZE; i += 1) energy += mono[i] * mono[i];
    const audible = energy > 0;
    const active = levels.active[center] === 1;
    stftActive.push({ start, active, audible });
    if (active) { powerSpectrum(mono, start, FFT_SIZE, window, re, im, speechPsd); speechFrames += 1; }
    else if (audible) { powerSpectrum(mono, start, FFT_SIZE, window, re, im, pausePsd); pauseFrames += 1; }
  }
  const chunks = chunkPlan(durationSeconds, scenes, cuts).map((chunk) => {
    const first = Math.floor(chunk.startSeconds / LEVEL_HOP);
    const last = Math.min(levels.db.length, Math.ceil(chunk.endSeconds / LEVEL_HOP));
    const psd = new Float64Array(FFT_SIZE / 2 + 1);
    let frames = 0;
    let chunkSum = 0;
    let chunkPeak = 0;
    const firstSample = Math.floor(chunk.startSeconds * SAMPLE_RATE);
    const lastSample = Math.min(mono.length, Math.ceil(chunk.endSeconds * SAMPLE_RATE));
    for (let i = firstSample; i < lastSample; i += 1) { chunkSum += mono[i] * mono[i]; chunkPeak = Math.max(chunkPeak, Math.abs(mono[i])); }
    for (const frame of stftActive) {
      if (frame.active && frame.start >= firstSample && frame.start + FFT_SIZE <= lastSample) {
        powerSpectrum(mono, frame.start, FFT_SIZE, window, re, im, psd);
        frames += 1;
      }
    }
    const spectrum = spectralSummary(psd, frames);
    return { ...chunk, rmsDbfs: round(ampDb(Math.sqrt(chunkSum / Math.max(1, lastSample - firstSample))), 2), peakDbfs: round(ampDb(chunkPeak), 2),
      ...activityStats(levels, first, last), speechCentroidHz: spectrum?.centroidHz ?? null,
      speechHighFrequencyRatio8k: spectrum?.highFrequencyRatio8k ?? null, speechFlatness: spectrum?.flatness ?? null };
  });
  const speech = spectralSummary(speechPsd, speechFrames);
  const pauses = spectralSummary(pausePsd, pauseFrames);
  const activity = activityStats(levels);
  let speechSum = 0;
  let speechCount = 0;
  for (let frame = 0; frame < levels.db.length; frame += 1) if (levels.active[frame]) { speechSum += 10 ** (levels.db[frame] / 10); speechCount += 1; }
  const speechRmsDbfs = speechCount ? toDb(speechSum / speechCount) : null;
  return {
    samples: mono.length,
    overall: { rmsDbfs: round(ampDb(Math.sqrt(sum / mono.length)), 2), peakDbfs: round(ampDb(peak), 2), dcOffset: round(mean / mono.length, 7), clippedSamples: clipped },
    loudness,
    activity: { thresholdDbfs: round(levels.thresholdDbfs, 2), speechRmsDbfs: speechRmsDbfs === null ? null : round(speechRmsDbfs, 2), ...activity,
      snrDb: speechRmsDbfs !== null && activity.noiseFloorDbfs !== null ? round(speechRmsDbfs - activity.noiseFloorDbfs, 2) : null },
    spectrum: { speech, pauses },
    hum: humAnalysis(mono, levels),
    stereo: { balanceDb: round(ampDb(Math.sqrt(sumL / mono.length)) - ampDb(Math.sqrt(sumR / mono.length)), 3),
      correlation: round(cross / Math.max(Math.sqrt(sumL * sumR), 1e-30), 5) },
    levels,
    chunks
  };
}

function parseVideoEvents(stderr: string) {
  const cuts = [...stderr.matchAll(/lavfi\.scd\.score:\s*([\d.]+),\s*lavfi\.scd\.time:\s*([\d.]+)/g)]
    .map((match) => ({ timeSeconds: round(Number(match[2]), 3), score: round(Number(match[1]), 2) }));
  const black = [...stderr.matchAll(/black_start:([\d.]+)\s+black_end:([\d.]+)\s+black_duration:([\d.]+)/g)]
    .map((match) => ({ startSeconds: round(Number(match[1]), 3), endSeconds: round(Number(match[2]), 3), durationSeconds: round(Number(match[3]), 3) }));
  const starts = [...stderr.matchAll(/freeze_start:\s*([\d.]+)/g)].map((match) => Number(match[1]));
  const durations = [...stderr.matchAll(/freeze_duration:\s*([\d.]+)/g)].map((match) => Number(match[1]));
  const freezes = starts.map((start, index) => ({ startSeconds: round(start, 3), durationSeconds: round(durations[index] ?? Number.NaN, 3) }))
    .filter((freeze) => Number.isFinite(freeze.durationSeconds));
  return { cuts, black, freezes };
}

function analyzeZones(input: string) {
  const { stdout } = run(tool('ffmpeg'), ['-hide_banner', '-loglevel', 'error', '-i', input, '-map', '0:v:0', '-vf',
    `fps=${ZONE_FPS},scale=${ZONE_WIDTH}:${ZONE_HEIGHT}:flags=area,format=gray`, '-f', 'rawvideo', 'pipe:1'], 'zone_decode');
  const size = ZONE_WIDTH * ZONE_HEIGHT;
  const frames = Math.floor(stdout.length / size);
  const activity = ZONES.map(() => new Float64Array(frames));
  const detail = ZONES.map(() => new Float64Array(frames));
  const luma = ZONES.map(() => new Float64Array(frames));
  const global = new Float64Array(frames);
  const bounds = ZONES.map((zone) => ({ x0: Math.round(zone.x0 * ZONE_WIDTH), x1: Math.round(zone.x1 * ZONE_WIDTH),
    y0: Math.round(zone.y0 * ZONE_HEIGHT), y1: Math.round(zone.y1 * ZONE_HEIGHT) }));
  for (let frame = 0; frame < frames; frame += 1) {
    const offset = frame * size;
    bounds.forEach((zone, index) => {
      let diff = 0;
      let edges = 0;
      let lumaSum = 0;
      let count = 0;
      for (let y = zone.y0; y < zone.y1; y += 1) {
        for (let x = zone.x0; x < zone.x1; x += 1) {
          const at = offset + y * ZONE_WIDTH + x;
          const value = stdout[at];
          lumaSum += value;
          if (frame) diff += Math.abs(value - stdout[at - size]);
          if (x + 1 < ZONE_WIDTH && y + 1 < ZONE_HEIGHT) edges += (Math.abs(value - stdout[at + 1]) + Math.abs(value - stdout[at + ZONE_WIDTH])) / 2;
          count += 1;
        }
      }
      activity[index][frame] = frame ? diff / count : 0;
      detail[index][frame] = edges / count;
      luma[index][frame] = lumaSum / count;
      global[frame] += (frame ? diff : 0) / size;
    });
  }
  // Explainer scenes usually cross-fade, which stays under scdet thresholds; whole-frame motion bursts mark the transitions.
  const transitions: { timeSeconds: number; magnitude: number }[] = [];
  for (let frame = 1; frame < frames;) {
    if (global[frame] <= 2.5) { frame += 1; continue; }
    let end = frame;
    let peak = frame;
    while (end < frames && (global[end] > 2.5 || (end + 1 < frames && global[end + 1] > 2.5) || (end + 2 < frames && global[end + 2] > 2.5))) {
      if (global[end] > global[peak]) peak = end;
      end += 1;
    }
    transitions.push({ timeSeconds: round(peak / ZONE_FPS, 3), magnitude: round(global[peak], 2) });
    frame = end + 1;
  }
  const zones = ZONES.map((zone, index) => {
    const series = Array.from(activity[index]);
    const details = Array.from(detail[index]);
    return { id: zone.id, meanActivity: round(series.reduce((a, b) => a + b, 0) / Math.max(1, frames), 3),
      activeRatio: round(series.filter((value) => value > 1.5).length / Math.max(1, frames), 4),
      transitionEvents: series.filter((value, i) => value > 10 && (i === 0 || series[i - 1] <= 10)).length,
      meanDetail: round(details.reduce((a, b) => a + b, 0) / Math.max(1, frames), 3), maxDetail: round(Math.max(0, ...details), 3),
      lumaMean: round(Array.from(luma[index]).reduce((a, b) => a + b, 0) / Math.max(1, frames), 2) };
  });
  return { sampleFps: ZONE_FPS, frames, zones, activity, detail, transitions };
}

const INFERNO: [number, number, number, number][] = [[0, 0, 0, 4], [0.25, 87, 16, 110], [0.5, 188, 55, 84], [0.75, 249, 142, 9], [1, 252, 255, 164]];
function colormap(value: number): [number, number, number] {
  const v = Math.min(1, Math.max(0, value));
  for (let i = 1; i < INFERNO.length; i += 1) {
    if (v <= INFERNO[i][0]) {
      const [p0, r0, g0, b0] = INFERNO[i - 1];
      const [p1, r1, g1, b1] = INFERNO[i];
      const t = (v - p0) / (p1 - p0);
      return [Math.round(r0 + (r1 - r0) * t), Math.round(g0 + (g1 - g0) * t), Math.round(b0 + (b1 - b0) * t)];
    }
  }
  return [252, 255, 164];
}

const escapeXml = (value: string) => value.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;');

async function layerHeatmap(zones: ReturnType<typeof analyzeZones>, durationSeconds: number, label: string, target: string): Promise<void> {
  const rowHeight = 34;
  const left = 150;
  const width = 1600;
  const panelHeight = ZONES.length * rowHeight;
  const height = 60 + 2 * panelHeight + 70;
  const maxDetail = Math.max(1, ...zones.detail.flatMap((series) => Array.from(series)));
  const panel = async (series: Float64Array[], normalize: (value: number) => number) => {
    const raw = Buffer.alloc(Math.max(1, zones.frames) * ZONES.length * 3);
    series.forEach((values, row) => values.forEach((value, column) => {
      const [r, g, b] = colormap(normalize(value));
      const at = (row * zones.frames + column) * 3;
      raw[at] = r; raw[at + 1] = g; raw[at + 2] = b;
    }));
    return sharp(raw, { raw: { width: Math.max(1, zones.frames), height: ZONES.length, channels: 3 } })
      .resize(width, panelHeight, { kernel: 'nearest', fit: 'fill' }).png().toBuffer();
  };
  const motion = await panel(zones.activity, (value) => Math.log1p(value) / Math.log1p(40));
  const text = await panel(zones.detail, (value) => value / maxDetail);
  const ticks: string[] = [];
  const step = durationSeconds > 60 ? 10 : 5;
  for (let second = 0; second <= durationSeconds; second += step) {
    const x = left + (second / durationSeconds) * width;
    ticks.push(`<line x1="${x}" y1="${48 + 2 * panelHeight + 18}" x2="${x}" y2="${48 + 2 * panelHeight + 26}" stroke="#cbd5e1"/><text x="${x}" y="${48 + 2 * panelHeight + 42}" fill="#cbd5e1" font-size="15" text-anchor="middle">${second}s</text>`);
  }
  const rows = (top: number) => ZONES.map((zone, row) => `<text x="${left - 10}" y="${top + row * rowHeight + 22}" fill="#e2e8f0" font-size="15" text-anchor="end">${zone.id}</text>`).join('');
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${left + width + 30}" height="${height}" font-family="Arial">
    <text x="12" y="26" fill="#f8fafc" font-size="18" font-weight="700">${escapeXml(label)} | video layer activity (top: frame-to-frame motion, bottom: edge detail / text density)</text>
    <text x="${left - 10}" y="44" fill="#94a3b8" font-size="13" text-anchor="end">motion</text>${rows(48)}
    <text x="${left - 10}" y="${48 + panelHeight + 12}" fill="#94a3b8" font-size="13" text-anchor="end">detail</text>${rows(56 + panelHeight)}
    ${ticks.join('')}</svg>`;
  await sharp({ create: { width: left + width + 30, height, channels: 3, background: '#0b1220' } })
    .composite([{ input: motion, left, top: 48 }, { input: text, left, top: 56 + panelHeight }, { input: Buffer.from(svg), left: 0, top: 0 }])
    .png().toFile(target);
}

function spectrogram(input: string, target: string, options: { start?: number; duration?: number; width: number; height: number; logFrequency?: boolean }): void {
  const temporary = `${target}.png`;
  const args = ['-hide_banner', '-loglevel', 'error', '-y'];
  if (options.start !== undefined) args.push('-ss', String(options.start));
  if (options.duration !== undefined) args.push('-t', String(options.duration));
  const scale = options.logFrequency ? 'fscale=log:start=60:stop=12000' : 'fscale=lin';
  args.push('-i', input, '-filter_complex',
    `[0:a:0]aresample=${SAMPLE_RATE},showspectrumpic=s=${options.width}x${options.height}:legend=1:mode=combined:color=intensity:scale=log:${scale}:drange=120:win_func=hann[out]`,
    '-map', '[out]', '-frames:v', '1', temporary);
  run(tool('ffmpeg'), args, 'spectrogram');
}

async function toJpeg(png: string, target: string, quality = 86): Promise<void> {
  await sharp(png).jpeg({ quality, mozjpeg: true }).toFile(target);
  await rm(png, { force: true });
}

async function contactSheet(frames: { file: string; label: string }[], target: string, columns = 4): Promise<void> {
  const width = 480;
  const height = 270;
  const labelHeight = 26;
  const rows = Math.ceil(frames.length / columns);
  const composites: OverlayOptions[] = [];
  for (const [index, frame] of frames.entries()) {
    const x = (index % columns) * width;
    const y = Math.floor(index / columns) * (height + labelHeight);
    composites.push({ input: await sharp(frame.file).resize(width, height, { fit: 'contain', background: '#000000' }).toBuffer(), left: x, top: y + labelHeight });
    composites.push({ input: Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${labelHeight}"><rect width="100%" height="100%" fill="#0f172a"/><text x="8" y="18" fill="#e2e8f0" font-family="Arial" font-size="15">${escapeXml(frame.label)}</text></svg>`), left: x, top: y });
  }
  await sharp({ create: { width: columns * width, height: Math.max(1, rows) * (height + labelHeight), channels: 3, background: '#111827' } })
    .composite(composites).jpeg({ quality: 84, mozjpeg: true }).toFile(target);
}

function extractFrame(input: string, timeSeconds: number, target: string): void {
  run(tool('ffmpeg'), ['-hide_banner', '-loglevel', 'error', '-y', '-ss', String(Math.max(0, timeSeconds)), '-i', input, '-map', '0:v:0',
    '-frames:v', '1', '-vf', 'scale=960:-2', '-q:v', '3', target], 'frame_extract');
}

function findings(report: { probe: ReturnType<typeof probeMedia>; audio: ReturnType<typeof analyzeAudio> | null; video: { black: { startSeconds: number; durationSeconds: number }[]; freezes: { startSeconds: number; durationSeconds: number }[] } | null }): AnalysisFinding[] {
  const t = ANALYSIS_THRESHOLDS;
  const list: AnalysisFinding[] = [];
  const add = (severity: AnalysisFinding['severity'], code: string, message: string, value?: number | null, threshold?: number) =>
    list.push({ severity, code, message, ...(value !== undefined && value !== null ? { value: round(value, 4) } : {}), ...(threshold !== undefined ? { threshold } : {}) });
  const { probe, audio, video } = report;
  if (probe.video && (probe.video.width < 1920 || probe.video.height < 1080)) add('info', 'below-1080p', `Video is ${probe.video.width}x${probe.video.height}.`);
  if (!probe.audio) add('error', 'no-audio', 'Media has no audio stream.');
  if (audio) {
    const lufs = audio.loudness.integratedLufs;
    if (lufs !== null && Math.abs(lufs - t.loudnessTargetLufs) > t.loudnessToleranceLu) add('warning', 'loudness-off-target', `Integrated loudness ${lufs} LUFS is outside ${t.loudnessTargetLufs} ±${t.loudnessToleranceLu} LU for online video.`, lufs, t.loudnessTargetLufs);
    if (audio.loudness.truePeakDbtp !== null && audio.loudness.truePeakDbtp > t.maxTruePeakDbtp) add('warning', 'true-peak-high', `True peak ${audio.loudness.truePeakDbtp} dBTP exceeds ${t.maxTruePeakDbtp} dBTP.`, audio.loudness.truePeakDbtp, t.maxTruePeakDbtp);
    if (audio.overall.clippedSamples > 0) add('error', 'clipping', `${audio.overall.clippedSamples} samples at or above full scale.`, audio.overall.clippedSamples, 0);
    if (Math.abs(audio.overall.dcOffset) > t.maxDcOffset) add('warning', 'dc-offset', `DC offset ${audio.overall.dcOffset}.`, audio.overall.dcOffset, t.maxDcOffset);
    const floor = audio.activity.noiseFloorDbfs;
    // Pause residue is judged against the narration level; an absolute ceiling still catches loud steady noise.
    if (floor !== null && (floor > t.maxPauseNoiseFloorDbfs || (audio.activity.snrDb !== null && audio.activity.snrDb < t.minPauseSnrDb))) {
      add('warning', 'pause-noise-floor', `Pause residue ${floor} dBFS is ${audio.activity.snrDb} dB below narration.`, audio.activity.snrDb ?? floor, t.minPauseSnrDb);
    }
    const hiss = audio.spectrum.pauses ? audio.spectrum.pauses.bandShare.air + audio.spectrum.pauses.bandShare.ultra : 0;
    if (floor !== null && floor > -75 && hiss > t.maxPauseHissShare) add('warning', 'pause-hiss', `Pause noise is high-frequency dominated (${round(hiss * 100, 1)}% above 8 kHz).`, hiss, t.maxPauseHissShare);
    if (audio.hum && audio.hum.strongest.prominenceDb > t.maxHumProminenceDb) add('warning', 'hum', `Tonal component at ${audio.hum.strongest.frequencyHz} Hz is ${audio.hum.strongest.prominenceDb} dB above neighbors.`, audio.hum.strongest.prominenceDb, t.maxHumProminenceDb);
    if (audio.spectrum.speech && audio.spectrum.speech.highFrequencyRatio8k > t.maxSpeechHighFrequencyRatio8k) add('warning', 'speech-hf-energy', `Speech energy above 8 kHz is ${round(audio.spectrum.speech.highFrequencyRatio8k * 100, 2)}%.`, audio.spectrum.speech.highFrequencyRatio8k, t.maxSpeechHighFrequencyRatio8k);
    if (audio.spectrum.speech && audio.spectrum.speech.flatness > t.maxSpeechFlatness) add('warning', 'speech-noise-like', `Speech spectral flatness ${audio.spectrum.speech.flatness} indicates broadband noise.`, audio.spectrum.speech.flatness, t.maxSpeechFlatness);
    if (audio.activity.pauses.longestSeconds > t.maxPauseSeconds) add('info', 'long-pause', `Longest interior pause is ${audio.activity.pauses.longestSeconds} s.`, audio.activity.pauses.longestSeconds, t.maxPauseSeconds);
    if (audio.activity.speechRatio < t.minSpeechRatio) add('info', 'low-speech-ratio', `Narration is active for ${round(audio.activity.speechRatio * 100, 1)}% of the track.`, audio.activity.speechRatio, t.minSpeechRatio);
    if (audio.stereo.correlation > 0.9999) add('info', 'dual-mono', 'Left and right channels carry identical mono narration.');
  }
  if (video) {
    for (const black of video.black) if (black.durationSeconds > t.maxBlackSeconds) add('warning', 'black-segment', `Black frames for ${black.durationSeconds} s at ${black.startSeconds} s.`, black.durationSeconds, t.maxBlackSeconds);
    for (const freeze of video.freezes) if (freeze.durationSeconds > t.maxStaticHoldSeconds) add('info', 'static-hold', `No visible motion for ${freeze.durationSeconds} s from ${freeze.startSeconds} s.`, freeze.durationSeconds, t.maxStaticHoldSeconds);
  }
  return list;
}

export async function analyzeMedia(inputPath: string, outputDirectory: string, options: MediaAnalysisOptions = {}) {
  const input = path.resolve(inputPath);
  const out = path.resolve(outputDirectory);
  const info = await stat(input);
  if (!info.isFile() || !info.size) throw new Error('media_input_missing');
  await rm(out, { recursive: true, force: true });
  await mkdir(path.join(out, 'chunks'), { recursive: true });
  await mkdir(path.join(out, 'frames'), { recursive: true });
  const probe = probeMedia(input);
  const label = options.label ?? path.basename(input);
  const images: Record<string, string | string[]> = {};
  let videoReport: { cuts: { timeSeconds: number; score: number }[]; black: { startSeconds: number; endSeconds: number; durationSeconds: number }[]; freezes: { startSeconds: number; durationSeconds: number }[] } | null = null;
  let zones: ReturnType<typeof analyzeZones> | null = null;
  if (probe.video) {
    videoReport = parseVideoEvents(run(tool('ffmpeg'), ['-hide_banner', '-nostats', '-loglevel', 'info', '-i', input, '-map', '0:v:0', '-vf',
      'scale=640:-2,blackdetect=d=0.2:pic_th=0.98,freezedetect=n=-55dB:d=2,scdet=threshold=8', '-f', 'null', '-'], 'video_events').stderr);
    zones = analyzeZones(input);
    await layerHeatmap(zones, probe.durationSeconds, label, path.join(out, 'layers.png'));
    images.layers = 'layers.png';
  }
  const cuts = [...(videoReport?.cuts.map((cut) => cut.timeSeconds) ?? []), ...(zones?.transitions.map((transition) => transition.timeSeconds) ?? [])]
    .sort((a, b) => a - b).filter((time, index, all) => index === 0 || time - all[index - 1] > 0.5);
  const audio = probe.audio ? analyzeAudio(input, options.scenes, cuts, probe.durationSeconds) : null;
  if (probe.audio) {
    spectrogram(input, path.join(out, 'spectrogram.jpg'), { width: 1600, height: 512 });
    await toJpeg(path.join(out, 'spectrogram.jpg.png'), path.join(out, 'spectrogram.jpg'));
    spectrogram(input, path.join(out, 'spectrogram-speech.jpg'), { width: 1600, height: 512, logFrequency: true });
    await toJpeg(path.join(out, 'spectrogram-speech.jpg.png'), path.join(out, 'spectrogram-speech.jpg'));
    run(tool('ffmpeg'), ['-hide_banner', '-loglevel', 'error', '-y', '-i', input, '-filter_complex',
      '[0:a:0]showwavespic=s=1600x240:split_channels=1:colors=#38bdf8|#f472b6[out]', '-map', '[out]', '-frames:v', '1', path.join(out, 'waveform.png')], 'waveform');
    images.spectrogram = 'spectrogram.jpg';
    images.spectrogramSpeech = 'spectrogram-speech.jpg';
    images.waveform = 'waveform.png';
    const chunkImages: string[] = [];
    for (const [index, chunk] of (audio?.chunks ?? []).entries()) {
      const name = `chunks/${String(index + 1).padStart(2, '0')}-${chunk.id.replace(/[^a-z0-9-]+/gi, '-').slice(0, 40)}.jpg`;
      spectrogram(input, path.join(out, name), { start: chunk.startSeconds, duration: chunk.endSeconds - chunk.startSeconds, width: 1024, height: 320, logFrequency: true });
      await toJpeg(path.join(out, `${name}.png`), path.join(out, name), 82);
      chunkImages.push(name);
    }
    images.chunks = chunkImages;
  }
  const frameRecords: { kind: string; timeSeconds: number; path: string }[] = [];
  if (probe.video) {
    const duration = probe.durationSeconds;
    const plan: { kind: string; time: number }[] = [];
    for (const chunk of audio?.chunks ?? chunkPlan(duration, options.scenes, cuts)) plan.push({ kind: `mid ${chunk.id}`, time: (chunk.startSeconds + chunk.endSeconds) / 2 });
    for (const cut of cuts.slice(0, 6)) {
      plan.push({ kind: 'before transition', time: cut - 0.6 }, { kind: 'during transition', time: cut }, { kind: 'after transition', time: cut + 0.8 });
    }
    for (const fraction of [0.1, 0.3, 0.5, 0.7, 0.9]) plan.push({ kind: `p${Math.round(fraction * 100)}`, time: fraction * duration });
    for (const [index, item] of plan.entries()) {
      const time = round(Math.min(duration - 0.05, Math.max(0, item.time)), 3);
      const name = `frames/${String(index + 1).padStart(2, '0')}-${item.kind.replace(/[^a-z0-9]+/gi, '-').toLowerCase()}.jpg`;
      extractFrame(input, time, path.join(out, name));
      frameRecords.push({ kind: item.kind, timeSeconds: time, path: name });
    }
    await contactSheet(frameRecords.filter((frame) => !frame.kind.startsWith('p')).map((frame) => ({ file: path.join(out, frame.path), label: `${frame.timeSeconds.toFixed(2)}s  ${frame.kind}` })),
      path.join(out, 'contact-sheet.jpg'));
    images.contactSheet = 'contact-sheet.jpg';
  }
  const audioReport = audio ? { ...audio, levels: undefined } : null;
  if (audioReport) delete (audioReport as { levels?: unknown }).levels;
  const report = {
    schemaVersion: '1.0.0',
    label,
    analyzedAt: new Date().toISOString(),
    input: { file: path.basename(input), sha256: await sha256File(input), byteSize: info.size },
    probe,
    audio: audioReport,
    video: videoReport && zones ? { ...videoReport, transitions: zones.transitions,
      layers: { sampleFps: zones.sampleFps, frames: zones.frames, zones: zones.zones }, frames: frameRecords } : null,
    images,
    thresholds: ANALYSIS_THRESHOLDS,
    findings: findings({ probe, audio, video: videoReport }),
    method: {
      spectrogram: 'FFmpeg showspectrumpic, Hann window, logarithmic magnitude with 120 dB range, legend axes in Hz/seconds/dBFS; speech view uses 60 Hz-12 kHz log frequency.',
      spectrum: `Welch average, ${FFT_SIZE}-point Hann FFT, ${FFT_HOP}-sample hop at ${SAMPLE_RATE} Hz, split by narration activity.`,
      activity: `${LEVEL_WINDOW * 1000} ms RMS windows every ${LEVEL_HOP * 1000} ms; active above max(-55 dBFS, p95 - 28 dB); dips under 150 ms bridged.`,
      loudness: 'FFmpeg ebur128 integrated loudness, loudness range and true peak (ITU-R BS.1770).',
      layers: `${ZONE_WIDTH}x${ZONE_HEIGHT} luma at ${ZONE_FPS} fps; per-zone mean absolute frame difference (motion) and gradient magnitude (detail).`,
      video: 'FFmpeg scdet scene changes, blackdetect and freezedetect on a 640 px proxy.'
    }
  };
  await writeFile(path.join(out, 'analysis.json'), `${JSON.stringify(report, null, 2)}\n`);
  return report;
}

export type MediaAnalysisReport = Awaited<ReturnType<typeof analyzeMedia>>;
