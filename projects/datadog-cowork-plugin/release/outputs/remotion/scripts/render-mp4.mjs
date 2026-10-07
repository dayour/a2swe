import { createHash } from 'node:crypto';
import { closeSync, existsSync, mkdirSync, openSync, readFileSync, readSync, statSync, unlinkSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

const root = process.cwd();
const readJson = (relative) => JSON.parse(readFileSync(path.join(root, relative), 'utf8'));
const plan = readJson('render-plan.json');
const content = readJson('src/content.json');
const timeline = readJson('timeline.json');
const manifest = readJson('asset-manifest.json');

function fail(message) {
  throw new Error(`A2SWE_MP4_RENDER_FAILED: ${message}`);
}

function run(command, args, label, options = {}) {
  const result = spawnSync(command, args, { cwd: root, encoding: 'utf8', maxBuffer: 16 * 1024 * 1024, windowsHide: true, ...options });
  if (result.error) fail(`${label} executable failed to start: ${result.error.message}`);
  if (result.status !== 0) {
    const detail = (result.stderr || result.stdout || '').trim().slice(-4000);
    fail(`${label} exited with ${result.status}: ${detail}`);
  }
  return result.stdout;
}

function requireFile(relative, label) {
  const absolute = path.join(root, relative);
  if (!existsSync(absolute) || !statSync(absolute).isFile()) fail(`${label} not found: ${relative}`);
  if (statSync(absolute).size <= 0) fail(`${label} is empty: ${relative}`);
  return absolute;
}

function sha256File(absolute) {
  const hash = createHash('sha256');
  const fd = openSync(absolute, 'r');
  const buffer = Buffer.allocUnsafe(1024 * 1024);
  try {
    let length;
    while ((length = readSync(fd, buffer, 0, buffer.length, null)) !== 0) hash.update(buffer.subarray(0, length));
  } finally {
    closeSync(fd);
  }
  return hash.digest('hex');
}

function readOptionalJson(relative) {
  const absolute = path.join(root, relative);
  if (!existsSync(absolute)) return undefined;
  return JSON.parse(readFileSync(absolute, 'utf8'));
}

function probeAudioDuration(ffprobe, audioPath) {
  const probe = JSON.parse(run(ffprobe, ['-v', 'error', '-show_streams', '-show_format', '-of', 'json', audioPath], 'ffprobe audio probe'));
  const audio = probe.streams?.find((stream) => stream.codec_type === 'audio');
  if (!audio) fail('narration WAV has no audio stream');
  if (Number(audio.sample_rate) !== timeline.sampleRate) fail(`narration sample rate ${audio.sample_rate} does not match ${timeline.sampleRate}`);
  const duration = Number(audio.duration ?? probe.format?.duration);
  if (!Number.isFinite(duration) || duration <= 0) fail('narration WAV duration is missing or invalid');
  return { audio, duration };
}

function stableValue(value) {
  if (Array.isArray(value)) return value.map(stableValue);
  if (value && typeof value === 'object') return Object.fromEntries(Object.keys(value).sort().map((key) => [key, stableValue(value[key])]));
  return value;
}

function stableJson(value) {
  return JSON.stringify(stableValue(value));
}

function fileProvenance(envName, suffixes) {
  const value = process.env[envName] || '';
  if (!value || !path.isAbsolute(value) || !existsSync(value)) return null;
  const suffix = path.extname(value).toLowerCase();
  if (suffixes.length && !suffixes.includes(suffix)) return null;
  return { path: value, sha256: sha256File(value) };
}

function resolveSpeechEngineForCache() {
  const requested = process.env.A2SWE_TTS_ENGINE || process.env.TTS_ENGINE || 'auto';
  if (!['auto', 'kokoro', 'kokoro_onnx'].includes(requested)) return null;
  if (requested !== 'auto') return requested;
  const onnx = process.env.KOKORO_ONNX_MODEL && process.env.KOKORO_ONNX_VOICES;
  const kokoro = process.env.A2SWE_KOKORO_CONFIG && process.env.A2SWE_KOKORO_WEIGHTS && process.env.KOKORO_ONNX_VOICES;
  if (onnx) return 'kokoro_onnx';
  if (kokoro) return 'kokoro';
  return null;
}

function currentModelFiles(engine) {
  if (engine === 'kokoro') {
    const config = fileProvenance('A2SWE_KOKORO_CONFIG', ['.json']);
    const weights = fileProvenance('A2SWE_KOKORO_WEIGHTS', ['.pth']);
    const voices = fileProvenance('KOKORO_ONNX_VOICES', []);
    return config && weights && voices ? { config, weights, voices } : null;
  }
  if (engine === 'kokoro_onnx') {
    const weights = fileProvenance('KOKORO_ONNX_MODEL', ['.onnx']);
    const voices = fileProvenance('KOKORO_ONNX_VOICES', []);
    return weights && voices ? { weights, voices } : null;
  }
  return null;
}

function currentCleanupPolicy() {
  return {
    mode: (process.env.A2SWE_AUDIO_CLEANUP || 'auto').trim().toLowerCase(),
    lowpassHz: (process.env.A2SWE_AUDIO_CLEANUP_LOWPASS_HZ || '11500').trim()
  };
}

function audioMetadataValid(audioPath) {
  const metadata = readOptionalJson(manifest.audio.metadataPath);
  if (!metadata) return false;
  if (metadata.contentDigest !== plan.contentDigest) return false;
  if (metadata.narrationSha256 !== manifest.audio.narrationSha256) return false;
  if (metadata.audioFile !== manifest.audio.path) return false;
  if (metadata.audioSha256 !== sha256File(audioPath)) return false;
  if (Number(metadata.sampleRate) !== timeline.sampleRate) return false;
  if (Number(metadata.channels) !== 2) return false;
  if (!Number.isFinite(metadata.durationSeconds) || Number(metadata.durationSeconds) <= 0) return false;
  if (metadata.producerSha256 !== sha256File(path.join(root, 'scripts', 'synthesize-audio.py'))) return false;
  if (metadata.requirementsLockSha256 !== sha256File(path.join(root, 'requirements.lock.txt'))) return false;
  if (stableJson(metadata.voiceProfile) !== stableJson(manifest.audio.voiceProfile)) return false;
  if (stableJson(metadata.cleanupPolicy) !== stableJson(currentCleanupPolicy())) return false;
  const engine = resolveSpeechEngineForCache();
  if (!engine || metadata.engine !== engine) return false;
  const models = currentModelFiles(engine);
  if (!models || stableJson(metadata.models) !== stableJson(models)) return false;
  return true;
}

function subtitleSentences(text) {
  return Array.from(new Intl.Segmenter('en', { granularity: 'sentence' }).segment(String(text)),
    (part) => part.segment.trim()).filter(Boolean);
}

function buildSubtitleCues(segments, fps, durationFrames) {
  if (!Array.isArray(segments) || !segments.length) return [];
  const cues = [];
  let previousEnd = -1;
  for (const segment of segments) {
    const startSeconds = Number(segment?.startSeconds);
    const endSeconds = Number(segment?.endSeconds);
    const text = typeof segment?.text === 'string' ? segment.text.trim() : '';
    if (!text || !Number.isFinite(startSeconds) || !Number.isFinite(endSeconds) || endSeconds <= startSeconds) {
      fail('narration metadata contains an invalid subtitle segment');
    }
    const segmentStart = Math.max(0, Math.min(durationFrames, Math.round(startSeconds * fps)));
    const segmentEnd = Math.max(segmentStart + 1, Math.min(durationFrames, Math.round(endSeconds * fps)));
    if (segmentStart < previousEnd) fail('narration subtitle segments overlap');
    const parts = subtitleSentences(text);
    const total = parts.reduce((sum, part) => sum + part.length, 0) || 1;
    let cursor = segmentStart;
    for (const [partIndex, part] of parts.entries()) {
      const remainingParts = parts.length - partIndex;
      const weighted = partIndex === parts.length - 1 ? segmentEnd : cursor + Math.max(1, Math.round((segmentEnd - segmentStart) * part.length / total));
      const endFrame = Math.max(cursor + 1, Math.min(segmentEnd - (remainingParts - 1), weighted));
      if (cursor < previousEnd) fail('narration subtitle cues overlap');
      cues.push({
        text: part,
        startFrame: cursor,
        endFrame,
        sourceSegmentIndex: Number(segment.index ?? cues.length),
        ...(typeof segment.sceneId === 'string' && segment.sceneId.trim() ? { sceneId: segment.sceneId.trim() } : {})
      });
      previousEnd = endFrame;
      cursor = endFrame;
    }
    previousEnd = Math.max(previousEnd, segmentEnd);
  }
  return cues;
}

function sceneSpeechRangesFromMetadata(segments, fps) {
  const ranges = new Map();
  for (const segment of segments) {
    if (typeof segment?.sceneId !== 'string' || !segment.sceneId.trim()) continue;
    const start = Math.round(Number(segment.startSeconds) * fps);
    const end = Math.round(Number(segment.endSeconds) * fps);
    if (!Number.isFinite(start) || !Number.isFinite(end) || end <= start) continue;
    const current = ranges.get(segment.sceneId) || { startFrame: start, endFrame: end };
    current.startFrame = Math.min(current.startFrame, start);
    current.endFrame = Math.max(current.endFrame, end);
    ranges.set(segment.sceneId, current);
  }
  return ranges;
}

if (timeline.width !== 1920 || timeline.height !== 1080) fail(`core MP4 adapter requires 1920x1080; got ${timeline.width}x${timeline.height}`);
if (timeline.fps !== 30) fail(`core MP4 adapter requires 30fps; got ${timeline.fps}`);
if (timeline.sampleRate !== 48000) fail(`core MP4 adapter requires 48kHz audio; got ${timeline.sampleRate}`);
requireFile('render-plan.json', 'render plan');
requireFile('src/content.json', 'ContentIR projection');
const remotion = requireFile('node_modules/@remotion/cli/remotion-cli.js', 'local Remotion CLI');
const tsc = requireFile('node_modules/typescript/bin/tsc', 'local TypeScript compiler');
const ffprobe = process.env.FFPROBE_PATH || 'ffprobe';
const ffmpeg = process.env.FFMPEG_PATH || 'ffmpeg';
run(ffprobe, ['-version'], 'ffprobe');
run(ffmpeg, ['-version'], 'ffmpeg');
requireFile(manifest.audio.narrationManifestPath, 'narration manifest');
if (!existsSync(path.join(root, manifest.audio.path)) || !audioMetadataValid(path.join(root, manifest.audio.path))) {
  run(process.execPath, ['scripts/synthesize-audio.mjs'], 'local Kokoro audio synthesis');
}
const audioPath = requireFile(manifest.audio.path, 'narration WAV');
if (!audioMetadataValid(audioPath)) fail('narration metadata does not match ContentIR narration, WAV digest, sample rate, channels, and duration');
const audioProbe = probeAudioDuration(ffprobe, audioPath);
const metadata = readJson(manifest.audio.metadataPath);
if (Math.abs(audioProbe.duration - Number(metadata.durationSeconds)) > 1 / timeline.sampleRate) fail('narration metadata duration does not match WAV');
const frames = Math.max(timeline.scenes.length, Math.ceil(audioProbe.duration * timeline.fps));
const segments = Array.isArray(metadata.segments) ? metadata.segments : [];
const sceneSpeechRanges = sceneSpeechRangesFromMetadata(segments, timeline.fps);
const hasSceneTiming = sceneSpeechRanges.size > 0;
const weights = timeline.scenes.map((scene) => Math.max(1, scene.title.length + scene.body.length));
const totalWeight = weights.reduce((sum, weight) => sum + weight, 0);
const cuts = [0];
timeline.scenes.forEach((scene, index) => {
  if (index === 0) return;
  const previousRange = sceneSpeechRanges.get(timeline.scenes[index - 1].id);
  const currentRange = sceneSpeechRanges.get(scene.id);
  const seconds = previousRange && currentRange ? (previousRange.endFrame + currentRange.startFrame) / (2 * timeline.fps)
    : audioProbe.duration * weights.slice(0, index).reduce((sum, weight) => sum + weight, 0) / totalWeight;
  cuts.push(Math.min(frames - (timeline.scenes.length - index), Math.max(cuts[index - 1] + 1, Math.round(seconds * timeline.fps))));
});
cuts.push(frames);
timeline.scenes.forEach((scene, index) => {
  const range = sceneSpeechRanges.get(scene.id);
  scene.startFrame = cuts[index];
  scene.endFrame = cuts[index + 1];
  scene.durationInFrames = scene.endFrame - scene.startFrame;
  scene.speechStartFrame = range ? Math.max(scene.startFrame, range.startFrame) : scene.startFrame - 1;
  scene.speechEndFrame = range ? Math.min(scene.endFrame, range.endFrame) : scene.startFrame - 1;
});
timeline.durationInFrames = frames;
timeline.subtitleCues = buildSubtitleCues(segments, timeline.fps, frames);
timeline.narrationTimingProvenance = {
  source: manifest.audio.metadataPath,
  cueSource: 'narration-metadata.segments',
  cueMode: 'global-subtitle-cues',
  sceneTimingMode: hasSceneTiming ? 'metadata-scene-id-ranges' : 'weighted-duration-no-semantic-alignment',
  sceneIdsPresent: hasSceneTiming,
  segmentCount: segments.length,
  cueCount: timeline.subtitleCues.length
};
plan.composition.durationInFrames = frames;
manifest.audio.expectedDurationSeconds = audioProbe.duration;
writeFileSync(path.join(root, 'timeline.json'), JSON.stringify(timeline, null, 2) + '\n');
writeFileSync(path.join(root, 'render-plan.json'), JSON.stringify(plan, null, 2) + '\n');
writeFileSync(path.join(root, 'asset-manifest.json'), JSON.stringify(manifest, null, 2) + '\n');
for (const asset of manifest.assets) {
  const assetPath = requireFile(asset.path, `asset ${asset.assetId}`);
  const actual = sha256File(assetPath);
  if (actual !== asset.digest) fail(`asset digest mismatch for ${asset.assetId}: expected ${asset.digest}, got ${actual}`);
}
run(process.execPath, [tsc, '--noEmit'], 'TypeScript');
const output = path.join(root, plan.encodedMp4Path);
mkdirSync(path.dirname(output), { recursive: true });
if (existsSync(output) && process.env.A2SWE_OVERWRITE_MP4 !== '1') fail(`refusing to overwrite existing MP4: ${plan.encodedMp4Path}`);
const qcPath = path.join(root, 'qc', 'mp4-qc.json');
if (existsSync(qcPath)) unlinkSync(qcPath);
run(process.execPath, [remotion, 'render', 'src/index.tsx', content.contentId, plan.encodedMp4Path, '--codec=h264', '--crf=16', '--pixel-format=yuv420p', '--log=error', '--timeout=120000',
  ...(process.env.A2SWE_BROWSER_EXECUTABLE ? ['--browser-executable=' + process.env.A2SWE_BROWSER_EXECUTABLE] : []),
  ...(/^[0-9]+$/.test(process.env.A2SWE_REMOTION_PORT ?? '') ? ['--port=' + process.env.A2SWE_REMOTION_PORT] : [])], 'Remotion render');
const outputHash = sha256File(output);
mkdirSync(path.join(root, 'qc'), { recursive: true });
writeFileSync(path.join(root, 'qc', 'render-receipt.json'), JSON.stringify({
  schemaVersion: '1.0.0',
  adapter: 'a2swe-remotion-mp4-adapter-8',
  contentDigest: plan.contentDigest,
  output: plan.encodedMp4Path,
  outputSha256: outputHash,
  width: timeline.width,
  height: timeline.height,
  fps: timeline.fps,
  sampleRate: timeline.sampleRate,
  assets: manifest.assets.map((asset) => asset.assetId)
}, null, 2) + '\n');
run(process.execPath, ['scripts/audio-qa.mjs', plan.encodedMp4Path, 'qc/audio-qa.json', 'qc/audio-spectrogram.svg'], 'encoded audio spectrogram QA');
run(process.execPath, ['scripts/verify-mp4.mjs'], 'encoded MP4 QC');
console.log(JSON.stringify({ output: plan.encodedMp4Path, sha256: outputHash, adapter: 'a2swe-remotion-mp4-adapter-8',
  qc: 'qc/mp4-qc.json', audioQa: 'qc/audio-qa.json', audioSpectrogram: 'qc/audio-spectrogram.svg', narrationDurationSeconds: audioProbe.duration }));
