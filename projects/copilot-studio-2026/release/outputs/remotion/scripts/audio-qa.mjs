import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

const root = process.cwd();
const input = process.argv[2] || 'dist/render.mp4';
const reportPath = process.argv[3] || 'qc/audio-qa.json';
const spectrogramPath = process.argv[4] || 'qc/audio-spectrogram.svg';
const verifyOnly = process.argv.includes('--verify-only');
const plan = JSON.parse(readFileSync(path.join(root, 'render-plan.json'), 'utf8'));
const timeline = JSON.parse(readFileSync(path.join(root, 'timeline.json'), 'utf8'));
const manifest = JSON.parse(readFileSync(path.join(root, 'asset-manifest.json'), 'utf8'));
const metadata = JSON.parse(readFileSync(path.join(root, manifest.audio.metadataPath), 'utf8'));
const ffmpeg = process.env.FFMPEG_PATH || 'ffmpeg';
const sampleRate = Number(timeline.sampleRate);

function fail(message) {
  throw new Error('A2SWE_MP4_AUDIO_QA_FAILED: ' + message);
}

function run(command, args, label, options = {}) {
  const result = spawnSync(command, args, { cwd: root, encoding: null, maxBuffer: 96 * 1024 * 1024, windowsHide: true, ...options });
  if (result.error) fail(label + ' executable failed to start: ' + result.error.message);
  if (result.status !== 0) {
    const detail = Buffer.concat([result.stdout || Buffer.alloc(0), result.stderr || Buffer.alloc(0)]).toString('utf8').trim().slice(-4000);
    fail(label + ' exited with ' + result.status + ': ' + detail);
  }
  return result.stdout;
}

function sha256File(relativeOrAbsolute) {
  const absolute = path.isAbsolute(relativeOrAbsolute) ? relativeOrAbsolute : path.join(root, relativeOrAbsolute);
  return createHash('sha256').update(readFileSync(absolute)).digest('hex');
}

function decodeAudio(relativeOrAbsolute) {
  const absolute = path.isAbsolute(relativeOrAbsolute) ? relativeOrAbsolute : path.join(root, relativeOrAbsolute);
  if (!existsSync(absolute)) fail('audio input not found: ' + relativeOrAbsolute);
  const bytes = run(ffmpeg, ['-hide_banner', '-loglevel', 'error', '-i', absolute, '-vn', '-af', 'pan=mono|c0=0.5*c0+0.5*c1', '-ar', String(sampleRate), '-f', 'f32le', 'pipe:1'], 'ffmpeg audio decode');
  if (bytes.length === 0 || bytes.length % 4 !== 0) fail('decoded audio is empty or malformed');
  const samples = new Float32Array(bytes.length / 4);
  for (let index = 0; index < samples.length; index += 1) samples[index] = bytes.readFloatLE(index * 4);
  return samples;
}

function rmsDbfs(samples) {
  if (!samples.length) return -240;
  let sum = 0;
  for (const value of samples) sum += value * value;
  return 20 * Math.log10(Math.max(Math.sqrt(sum / samples.length), 1e-12));
}

function peakDbfs(samples) {
  let peak = 0;
  for (const value of samples) peak = Math.max(peak, Math.abs(value));
  return 20 * Math.log10(Math.max(peak, 1e-12));
}

function sliceWindow(samples, start, end) {
  const first = Math.max(0, Math.min(samples.length, Math.round(start)));
  const last = Math.max(first, Math.min(samples.length, Math.round(end)));
  return samples.subarray(first, last);
}

function concatWindows(samples, windows) {
  const total = windows.reduce((sum, item) => sum + Math.max(0, item[1] - item[0]), 0);
  const output = new Float32Array(total);
  let offset = 0;
  for (const [start, end] of windows) {
    const part = sliceWindow(samples, start, end);
    output.set(part, offset);
    offset += part.length;
  }
  return output;
}

function fft(re, im) {
  const n = re.length;
  for (let i = 1, j = 0; i < n; i += 1) {
    let bit = n >> 1;
    for (; j & bit; bit >>= 1) j ^= bit;
    j ^= bit;
    if (i < j) {
      const tr = re[i]; re[i] = re[j]; re[j] = tr;
      const ti = im[i]; im[i] = im[j]; im[j] = ti;
    }
  }
  for (let len = 2; len <= n; len <<= 1) {
    const angle = -2 * Math.PI / len;
    const wlenR = Math.cos(angle);
    const wlenI = Math.sin(angle);
    for (let i = 0; i < n; i += len) {
      let wr = 1;
      let wi = 0;
      for (let j = 0; j < len / 2; j += 1) {
        const uR = re[i + j];
        const uI = im[i + j];
        const vR = re[i + j + len / 2] * wr - im[i + j + len / 2] * wi;
        const vI = re[i + j + len / 2] * wi + im[i + j + len / 2] * wr;
        re[i + j] = uR + vR;
        im[i + j] = uI + vI;
        re[i + j + len / 2] = uR - vR;
        im[i + j + len / 2] = uI - vI;
        const nextR = wr * wlenR - wi * wlenI;
        wi = wr * wlenI + wi * wlenR;
        wr = nextR;
      }
    }
  }
}

function fftPower(block, size) {
  const re = new Float64Array(size);
  const im = new Float64Array(size);
  for (let i = 0; i < size; i += 1) {
    const sample = i < block.length ? block[i] : 0;
    const window = 0.5 - 0.5 * Math.cos(2 * Math.PI * i / Math.max(1, size - 1));
    re[i] = sample * window;
  }
  fft(re, im);
  const bins = new Float64Array(size / 2 + 1);
  for (let i = 0; i < bins.length; i += 1) bins[i] = re[i] * re[i] + im[i] * im[i];
  return bins;
}

function spectralMetrics(samples) {
  if (samples.length < 2048) return { highFrequencyRatio8k: 0, spectralFlatness: 0 };
  const size = 2048;
  const maxBlocks = 240;
  const hop = Math.max(size, Math.floor((samples.length - size) / Math.max(1, maxBlocks - 1)));
  let total = 0;
  let high = 0;
  let logSum = 0;
  let flatCount = 0;
  let arithmetic = 0;
  for (let start = 0, count = 0; start + size <= samples.length && count < maxBlocks; start += hop, count += 1) {
    const bins = fftPower(samples.subarray(start, start + size), size);
    for (let bin = 1; bin < bins.length; bin += 1) {
      const frequency = bin * sampleRate / size;
      if (frequency < 80 || frequency > Math.min(20000, sampleRate / 2)) continue;
      const power = bins[bin];
      total += power;
      if (frequency >= 8000) high += power;
      if (power > 1e-20) {
        logSum += Math.log(power);
        arithmetic += power;
        flatCount += 1;
      }
    }
  }
  return {
    highFrequencyRatio8k: high / Math.max(total, 1e-30),
    spectralFlatness: flatCount ? Math.exp(logSum / flatCount) / Math.max(arithmetic / flatCount, 1e-30) : 0
  };
}

function buildWindows(samples) {
  const speech = [];
  const silence = [];
  let last = 0;
  for (const segment of metadata.segments || []) {
    const start = Math.round(Number(segment.startSeconds) * sampleRate);
    const end = Math.round(Number(segment.endSeconds) * sampleRate);
    if (start > last) silence.push([last, Math.min(start, samples.length)]);
    if (end > start) speech.push([Math.max(0, start), Math.min(end, samples.length)]);
    last = end;
  }
  if (last < samples.length) silence.push([Math.max(0, last), samples.length]);
  return { speech, silence };
}

function sourceBoundaryMetrics(samples, segments) {
  if (!Array.isArray(segments) || !segments.length) fail('narration metadata has no speech segments');
  const edgeSamples = Math.round(0.01 * sampleRate);
  let maxOnsetRmsDbfs = -240;
  let maxTailRmsDbfs = -240;
  let maxJump = 0;
  let previousEnd = 0;
  for (const segment of segments) {
    const startSeconds = Number(segment.startSeconds);
    const endSeconds = Number(segment.endSeconds);
    const start = Math.round(startSeconds * sampleRate);
    const end = Math.round(endSeconds * sampleRate);
    if (!Number.isFinite(startSeconds) || !Number.isFinite(endSeconds) || start <= previousEnd || end <= start || end >= samples.length) {
      fail('narration metadata contains an invalid or overlapping speech segment');
    }
    const width = Math.min(edgeSamples, Math.floor((end - start) / 4));
    if (width < 1) fail('speech segment is too short to measure its boundaries');
    maxOnsetRmsDbfs = Math.max(maxOnsetRmsDbfs, rmsDbfs(samples.subarray(start, start + width)));
    maxTailRmsDbfs = Math.max(maxTailRmsDbfs, rmsDbfs(samples.subarray(end - width, end)));
    maxJump = Math.max(maxJump, Math.abs(samples[start] - samples[start - 1]), Math.abs(samples[end] - samples[end - 1]));
    previousEnd = end;
  }
  return {
    label: 'sourceSpeechBoundaries',
    segmentsChecked: segments.length,
    edgeWindowSeconds: 0.01,
    maxOnsetRmsDbfs: rounded(maxOnsetRmsDbfs),
    maxTailRmsDbfs: rounded(maxTailRmsDbfs),
    maxJumpDbfs: rounded(20 * Math.log10(Math.max(maxJump, 1e-12)))
  };
}

function rounded(value) {
  return Number.isFinite(value) ? Number(value.toFixed(6)) : value;
}

function strictThreshold(name, baseline, minimum = false) {
  const raw = process.env[name];
  if (raw === undefined) return baseline;
  const value = Number(raw);
  if (!raw.trim() || !Number.isFinite(value) || (minimum ? value < baseline : value > baseline)) {
    fail(name + ' must be finite and may only tighten the baseline ' + baseline);
  }
  return value;
}

function summarize(label, samples) {
  const spectral = spectralMetrics(samples);
  return {
    label,
    durationSeconds: rounded(samples.length / sampleRate),
    rmsDbfs: rounded(rmsDbfs(samples)),
    peakDbfs: rounded(peakDbfs(samples)),
    highFrequencyRatio8k: rounded(spectral.highFrequencyRatio8k),
    spectralFlatness: rounded(spectral.spectralFlatness)
  };
}

function color(value) {
  const clamped = Math.max(0, Math.min(1, value));
  const r = Math.round(17 + clamped * 210);
  const g = Math.round(24 + Math.sin(clamped * Math.PI) * 150);
  const b = Math.round(39 + (1 - clamped) * 170);
  return 'rgb(' + r + ',' + g + ',' + b + ')';
}

function escapeXml(value) {
  return String(value).replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;');
}

function spectrogramSvg(samples, summary) {
  const columns = 120;
  const rows = 56;
  const cellW = 6;
  const cellH = 4;
  const left = 58;
  const top = 28;
  const size = 2048;
  const width = left + columns * cellW + 24;
  const height = top + rows * cellH + 94;
  const rects = [];
  for (let column = 0; column < columns; column += 1) {
    const center = Math.round((column + 0.5) * samples.length / columns);
    const start = Math.max(0, center - Math.floor(size / 2));
    const block = samples.subarray(start, Math.min(samples.length, start + size));
    const bins = fftPower(block, size);
    for (let row = 0; row < rows; row += 1) {
      const low = Math.floor(1 + row * (bins.length - 2) / rows);
      const high = Math.floor(1 + (row + 1) * (bins.length - 2) / rows);
      let energy = 0;
      for (let bin = low; bin <= high; bin += 1) energy += bins[bin] || 0;
      const db = 10 * Math.log10(Math.max(energy / Math.max(1, high - low + 1), 1e-18));
      const normalized = (db + 110) / 95;
      const y = top + (rows - row - 1) * cellH;
      rects.push('<rect x="' + (left + column * cellW) + '" y="' + y + '" width="' + cellW + '" height="' + cellH + '" fill="' + color(normalized) + '"/>');
    }
  }
  const cuts = timeline.scenes.slice(1).map((scene) => {
    const x = left + Math.round(scene.startFrame / timeline.durationInFrames * columns * cellW);
    return '<line x1="' + x + '" x2="' + x + '" y1="' + top + '" y2="' + (top + rows * cellH) + '" stroke="#fbbf24" stroke-width="1.5" stroke-dasharray="5 4"/>';
  });
  const ticks = [0, 0.25, 0.5, 0.75, 1].map((fraction) => {
    const x = left + Math.round(fraction * columns * cellW);
    return '<text x="' + x + '" y="' + (top + rows * cellH + 15) + '" text-anchor="middle" fill="#a8b3c7" font-family="Arial" font-size="10">' +
      (fraction * samples.length / sampleRate).toFixed(0) + 's</text>';
  });
  return '<svg xmlns="http://www.w3.org/2000/svg" width="' + width + '" height="' + height + '" viewBox="0 0 ' + width + ' ' + height + '" role="img" aria-labelledby="title desc">' +
    '<title id="title">Audio spectrogram QA</title><desc id="desc">Frequency energy over time for ' + escapeXml(input) + '</desc>' +
    '<rect width="100%" height="100%" fill="#0b1020"/><text x="16" y="18" fill="#e5eefc" font-family="Arial" font-size="13">a2swe audio QA: ' + escapeXml(input) + '</text>' +
    '<text x="16" y="' + (height - 43) + '" fill="#a8b3c7" font-family="Arial" font-size="11">speech ' + summary.speech.rmsDbfs + ' dBFS; whole gap ' + summary.silence.rmsDbfs + ' dBFS; interior ' + summary.interiorSilence.rmsDbfs + ' dBFS; SNR ' + summary.snrSpeechVsSilenceDb + ' dB</text>' +
    '<text x="16" y="' + (height - 21) + '" fill="#fbbf24" font-family="Arial" font-size="11">source boundary jump ' + summary.sourceBoundaries.maxJumpDbfs + ' dBFS; edge RMS ' + Math.max(summary.sourceBoundaries.maxOnsetRmsDbfs, summary.sourceBoundaries.maxTailRmsDbfs) + ' dBFS; dashed lines: scene cuts</text>' +
    '<text x="8" y="' + (top + 10) + '" fill="#a8b3c7" font-family="Arial" font-size="10">24 kHz</text><text x="12" y="' + (top + rows * cellH) + '" fill="#a8b3c7" font-family="Arial" font-size="10">0 Hz</text>' +
    rects.join('') + cuts.join('') + ticks.join('') + '</svg>\n';
}

const samples = decodeAudio(input);
const sourceAudioSha256 = sha256File(manifest.audio.path);
if (sourceAudioSha256 !== metadata.audioSha256) fail('source WAV digest does not match narration metadata');
const sourceBoundaries = sourceBoundaryMetrics(decodeAudio(manifest.audio.path), metadata.segments);
const windows = buildWindows(samples);
const speechSamples = concatWindows(samples, windows.speech);
const silenceSamples = concatWindows(samples, windows.silence);
const gapBoundaryGuardSeconds = 0.1;
const guardSamples = Math.round(gapBoundaryGuardSeconds * sampleRate);
const interiorWindows = windows.silence
  .map(([start, end]) => [start + guardSamples, end - guardSamples])
  .filter(([start, end]) => end > start);
if (!interiorWindows.length) fail('no non-speech gap interior is available for noise measurement');
const interiorSamples = concatWindows(samples, interiorWindows);
const overall = summarize('overall', samples);
const speech = summarize('speech', speechSamples);
const silence = summarize('nonSpeechGaps', silenceSamples);
const interiorSilence = summarize('nonSpeechGapInteriors', interiorSamples);
const loudnessRun = spawnSync(ffmpeg, ['-hide_banner', '-nostats', '-i', path.isAbsolute(input) ? input : path.join(root, input), '-map', '0:a:0', '-af', 'ebur128=peak=true:framelog=quiet', '-f', 'null', '-'],
  { cwd: root, encoding: 'utf8', maxBuffer: 16 * 1024 * 1024, windowsHide: true });
if (loudnessRun.error || loudnessRun.status !== 0) fail('ffmpeg loudness measurement failed: ' + (loudnessRun.error?.message || String(loudnessRun.stderr || '').slice(-2000)));
const loudnessSummary = String(loudnessRun.stderr || '');
function loudnessValue(pattern) {
  const match = pattern.exec(loudnessSummary.slice(loudnessSummary.lastIndexOf('Summary:')));
  return match ? Number(match[1]) : Number.NaN;
}
const loudness = {
  integratedLufs: loudnessValue(/I:\s+(-?[\d.]+)\s+LUFS/),
  loudnessRangeLu: loudnessValue(/LRA:\s+(-?[\d.]+)\s+LU/),
  truePeakDbtp: loudnessValue(/Peak:\s+(-?[\d.]+)\s+dBFS/)
};
const thresholds = {
  gapBoundaryGuardSeconds,
  maxSourceBoundaryJumpDbfs: strictThreshold('A2SWE_AUDIO_QA_MAX_SOURCE_JUMP_DBFS', -55),
  maxSourceEdgeRmsDbfs: strictThreshold('A2SWE_AUDIO_QA_MAX_SOURCE_EDGE_RMS_DBFS', -60),
  maxSilenceRmsDbfs: strictThreshold('A2SWE_AUDIO_QA_MAX_SILENCE_RMS_DBFS', -55),
  maxSpeechHighFrequencyRatio8k: strictThreshold('A2SWE_AUDIO_QA_MAX_SPEECH_HF_RATIO_8K', 0.03),
  minSpeechVsSilenceSnrDb: strictThreshold('A2SWE_AUDIO_QA_MIN_SNR_DB', 45, true),
  targetLufs: -16,
  maxLoudnessDeviationLu: strictThreshold('A2SWE_AUDIO_QA_MAX_LOUDNESS_DEVIATION_LU', 1),
  maxTruePeakDbtp: strictThreshold('A2SWE_AUDIO_QA_MAX_TRUE_PEAK_DBTP', -1)
};
const snr = rounded(speech.rmsDbfs - interiorSilence.rmsDbfs);
const findings = [];
if (!Number.isFinite(loudness.integratedLufs) || Math.abs(loudness.integratedLufs - thresholds.targetLufs) > thresholds.maxLoudnessDeviationLu) {
  findings.push('integrated loudness is outside the online-video target');
}
if (!Number.isFinite(loudness.truePeakDbtp) || loudness.truePeakDbtp > thresholds.maxTruePeakDbtp) findings.push('true peak exceeds the encoded-audio ceiling');
if (sourceBoundaries.maxJumpDbfs > thresholds.maxSourceBoundaryJumpDbfs ||
  Math.max(sourceBoundaries.maxOnsetRmsDbfs, sourceBoundaries.maxTailRmsDbfs) > thresholds.maxSourceEdgeRmsDbfs) {
  findings.push('source speech boundaries contain a DC step or abrupt transition');
}
if (interiorSilence.rmsDbfs > thresholds.maxSilenceRmsDbfs) findings.push('non-speech gap interior noise exceeds configured floor');
if (snr < thresholds.minSpeechVsSilenceSnrDb) findings.push('speech-to-silence SNR is below the configured minimum');
if (speech.highFrequencyRatio8k > thresholds.maxSpeechHighFrequencyRatio8k && speech.spectralFlatness > 0.01) findings.push('speech band contains broadband high-frequency hiss/static signature');
const valid = findings.length === 0;
const report = {
  schemaVersion: '1.0.0',
  adapter: 'a2swe-remotion-mp4-adapter-7',
  contentDigest: plan.contentDigest,
  input,
  inputSha256: sha256File(input),
  sourceAudioSha256,
  sampleRate,
  durationSeconds: rounded(samples.length / sampleRate),
  producer: metadata.producer,
  engine: metadata.engine,
  voice: metadata.voice,
  metrics: { overall, speech, silence, interiorSilence, sourceBoundaries, snrSpeechVsSilenceDb: snr, loudness },
  mastering: metadata.mastering ?? null,
  thresholds,
  findings,
  valid,
  spectrogram: spectrogramPath
};
if (!valid) fail('audio QA failed: ' + findings.join('; ') + '; metrics=' + JSON.stringify(report.metrics) + '; thresholds=' + JSON.stringify(thresholds));
if (verifyOnly) {
  if (!existsSync(path.join(root, reportPath))) fail('audio QA report is missing: ' + reportPath);
  const existing = JSON.parse(readFileSync(path.join(root, reportPath), 'utf8'));
  if (existing.input !== report.input || existing.inputSha256 !== report.inputSha256 || existing.sourceAudioSha256 !== report.sourceAudioSha256
    || existing.contentDigest !== report.contentDigest
    || JSON.stringify(existing.metrics) !== JSON.stringify(report.metrics)
    || JSON.stringify(existing.thresholds) !== JSON.stringify(report.thresholds) || existing.valid !== true) {
    fail('audio QA report does not match current encoded audio');
  }
} else {
  mkdirSync(path.dirname(path.join(root, reportPath)), { recursive: true });
  writeFileSync(path.join(root, reportPath), JSON.stringify(report, null, 2) + '\n');
  writeFileSync(path.join(root, spectrogramPath), spectrogramSvg(samples, { speech, silence, interiorSilence, sourceBoundaries, snrSpeechVsSilenceDb: snr }));
}
console.log(JSON.stringify({ valid, input, qa: reportPath, spectrogram: spectrogramPath, findings }));
