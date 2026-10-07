import { createHash } from 'node:crypto';
import { closeSync, existsSync, mkdirSync, openSync, readFileSync, readSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

const root = process.cwd();
const plan = JSON.parse(readFileSync(path.join(root, 'render-plan.json'), 'utf8'));
const timeline = JSON.parse(readFileSync(path.join(root, 'timeline.json'), 'utf8'));
const manifest = JSON.parse(readFileSync(path.join(root, 'asset-manifest.json'), 'utf8'));
const ffprobe = process.env.FFPROBE_PATH || 'ffprobe';

function fail(message) {
  throw new Error(`A2SWE_MP4_QC_FAILED: ${message}`);
}

function run(command, args, label) {
  const result = spawnSync(command, args, { cwd: root, encoding: 'utf8', maxBuffer: 16 * 1024 * 1024, windowsHide: true });
  if (result.error) fail(`${label} executable failed to start: ${result.error.message}`);
  if (result.status !== 0) fail(`${label} exited with ${result.status}: ${(result.stderr || result.stdout || '').trim().slice(-4000)}`);
  return result.stdout;
}

function rate(value) {
  if (typeof value !== 'string') return 0;
  if (!value.includes('/')) return Number(value);
  const [num, den] = value.split('/').map(Number);
  return den ? num / den : 0;
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

const movie = path.join(root, plan.encodedMp4Path);
if (!existsSync(movie)) fail(`MP4 not found: ${plan.encodedMp4Path}`);
const receiptPath = path.join(root, 'qc', 'render-receipt.json');
if (!existsSync(receiptPath)) fail('render receipt is missing');
const receipt = JSON.parse(readFileSync(receiptPath, 'utf8'));
const outputSha256 = sha256File(movie);
if (receipt.output !== plan.encodedMp4Path || receipt.outputSha256 !== outputSha256 || receipt.contentDigest !== plan.contentDigest) {
  fail('encoded MP4 does not match its render receipt');
}
const probe = JSON.parse(run(ffprobe, ['-v', 'error', '-count_frames', '-show_streams', '-show_format', '-of', 'json', movie], 'ffprobe'));
if (!probe.format) fail('MP4 container metadata is missing');
const video = probe.streams?.find((stream) => stream.codec_type === 'video');
const audio = probe.streams?.find((stream) => stream.codec_type === 'audio');
if (!video) fail('MP4 has no video stream');
if (!audio) fail('MP4 has no audio stream');
if (video.codec_name !== 'h264') fail(`expected H.264 video, got ${video.codec_name}`);
if (Number(video.width) !== timeline.width || Number(video.height) !== timeline.height) fail(`expected ${timeline.width}x${timeline.height}, got ${video.width}x${video.height}`);
if (Math.abs(rate(video.r_frame_rate) - timeline.fps) > 0.001) fail(`expected ${timeline.fps}fps, got ${video.r_frame_rate}`);
if (video.pix_fmt !== 'yuv420p') fail(`expected yuv420p pixel format, got ${video.pix_fmt}`);
if (Number(video.nb_read_frames) !== timeline.durationInFrames) fail(`expected ${timeline.durationInFrames} decoded video frames, got ${video.nb_read_frames}`);
if (audio.codec_name !== 'aac') fail(`expected AAC audio, got ${audio.codec_name}`);
if (Number(audio.sample_rate) !== timeline.sampleRate) fail(`expected ${timeline.sampleRate}Hz audio, got ${audio.sample_rate}`);
if (Number(audio.channels) !== 2) fail(`expected stereo audio, got ${audio.channels} channels`);
const duration = Number(audio.duration ?? probe.format?.duration);
const expectedDuration = Number(manifest.audio.expectedDurationSeconds);
const durationTolerance = Number(manifest.audio.maxDurationDriftSeconds);
const videoDuration = timeline.durationInFrames / timeline.fps;
const aacPadding = 3 * 1024 / timeline.sampleRate;
if (!Number.isFinite(duration) || duration < expectedDuration - durationTolerance || duration > Math.max(expectedDuration + durationTolerance, videoDuration + aacPadding)) {
  fail(`expected narration duration ${expectedDuration}s through video duration ${videoDuration}s plus AAC padding ${aacPadding}s, got ${duration}s`);
}
run(process.execPath, ['scripts/audio-qa.mjs', plan.encodedMp4Path, 'qc/audio-qa.json', 'qc/audio-spectrogram.svg', '--verify-only'], 'encoded audio spectrogram QA');
const report = { schemaVersion: '1.0.0', adapter: 'a2swe-remotion-mp4-adapter-8', file: plan.encodedMp4Path,
  contentDigest: plan.contentDigest, outputSha256, video, audio, container: { ...probe.format, filename: plan.encodedMp4Path } };
const qcPath = path.join(root, 'qc', 'mp4-qc.json');
if (process.argv.includes('--verify-only')) {
  if (!existsSync(qcPath)) fail('MP4 QC report is missing');
  const recorded = JSON.parse(readFileSync(qcPath, 'utf8'));
  if (recorded.adapter !== report.adapter || recorded.file !== report.file ||
    recorded.contentDigest !== report.contentDigest || recorded.outputSha256 !== report.outputSha256 ||
    recorded.container?.filename !== report.file || recorded.video?.codec_name !== video.codec_name ||
    recorded.video?.nb_read_frames !== video.nb_read_frames || recorded.video?.width !== video.width ||
    recorded.video?.height !== video.height || recorded.audio?.codec_name !== audio.codec_name ||
    recorded.audio?.sample_rate !== audio.sample_rate) fail('MP4 QC report does not match the encoded media');
} else {
  mkdirSync(path.join(root, 'qc'), { recursive: true });
  writeFileSync(qcPath, JSON.stringify(report, null, 2) + '\n');
}
console.log(JSON.stringify({ valid: true, output: plan.encodedMp4Path, adapter: 'a2swe-remotion-mp4-adapter-8' }));
