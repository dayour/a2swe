import { existsSync } from 'node:fs';
import { copyFile, mkdir, open, readdir, readFile, rename, rm, stat, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';
import { digest, sha256 } from './canonical.ts';
import { revisionTitle, validate } from './contracts.ts';
import type { ContentIR, RenderRevision } from './contracts.ts';
import { analyzeMedia, probeMedia } from './media-analysis.ts';
import type { AnalysisScene, MediaAnalysisReport } from './media-analysis.ts';
import { voiceProfiles } from './media-remotion.ts';
import { indexProjectQc, projectIdOf, verifyRelease, writeRelease } from './release.ts';
import { projectRunbook } from './runbook.ts';

type RevisionOutput = RenderRevision['outputs'][number];
type RevisionVoice = NonNullable<RevisionOutput['voice']>;
type Engine = 'kokoro_onnx' | 'kokoro';

const REPOSITORY_ROOT = fileURLToPath(new URL('../../../', import.meta.url));

const VIDEO_EXTENSIONS = new Set(['.mp4', '.mov', '.webm']);
const MEDIA_TYPES: Record<string, string> = { '.mp4': 'video/mp4', '.mov': 'video/quicktime', '.webm': 'video/webm', '.vtt': 'text/vtt',
  '.json': 'application/json', '.pptx': 'application/vnd.openxmlformats-officedocument.presentationml.presentation' };

const relative = (root: string, file: string) => path.relative(root, file).split(path.sep).join('/');
const instant = (time: Date) => time.toISOString();
const json = async <T>(file: string): Promise<T> => JSON.parse(await readFile(file, 'utf8')) as T;
const writeJson = async (file: string, value: unknown) => {
  await mkdir(path.dirname(file), { recursive: true });
  await writeFile(`${file}.tmp`, `${JSON.stringify(value, null, 2)}\n`);
  await rename(`${file}.tmp`, file);
};

async function fileDigest(file: string): Promise<string> {
  return sha256(await readFile(file));
}

export async function listRevisions(projectDirectory: string): Promise<RenderRevision[]> {
  const renders = path.join(path.resolve(projectDirectory), 'renders');
  if (!existsSync(renders)) return [];
  const revisions: RenderRevision[] = [];
  for (const entry of await readdir(renders, { withFileTypes: true })) {
    const manifest = path.join(renders, entry.name, 'revision.json');
    if (entry.isDirectory() && existsSync(manifest)) {
      const revision = validate('RenderRevision', await json(manifest));
      if (revision.title !== entry.name) throw new Error(`revision_folder_title_mismatch: ${entry.name}`);
      revisions.push(revision);
    }
  }
  return revisions.sort((a, b) => a.year - b.year || a.number - b.number);
}

async function saveRevision(projectDirectory: string, revision: RenderRevision): Promise<void> {
  await writeJson(path.join(projectDirectory, 'renders', revision.title, 'revision.json'), validate('RenderRevision', revision));
}

function vttTime(seconds: number): string {
  const ms = Math.max(0, Math.round(seconds * 1000));
  return `${String(Math.floor(ms / 3600000)).padStart(2, '0')}:${String(Math.floor(ms / 60000) % 60).padStart(2, '0')}:${String(Math.floor(ms / 1000) % 60).padStart(2, '0')}.${String(ms % 1000).padStart(3, '0')}`;
}

interface PackageTimeline { fps: number; scenes: { id: string; startFrame: number; durationInFrames: number }[]; subtitleCues?: { text: string; startFrame: number; endFrame: number }[] }

async function packageDetails(packageRoot: string) {
  const remotion = path.join(packageRoot, 'outputs', 'remotion');
  const timeline = existsSync(path.join(remotion, 'timeline.json')) ? await json<PackageTimeline>(path.join(remotion, 'timeline.json')) : null;
  const metadata = existsSync(path.join(remotion, 'audio', 'narration-metadata.json'))
    ? await json<{ engine?: string; voice?: { profileId?: string } }>(path.join(remotion, 'audio', 'narration-metadata.json')) : null;
  const parity = existsSync(path.join(packageRoot, 'parity-manifest.json'))
    ? await json<{ releaseDigest: string; contentDigest: string }>(path.join(packageRoot, 'parity-manifest.json')) : null;
  const scenes = timeline ? timeline.scenes.map((scene) => ({ id: scene.id, startSeconds: Number((scene.startFrame / timeline.fps).toFixed(3)),
    endSeconds: Number(((scene.startFrame + scene.durationInFrames) / timeline.fps).toFixed(3)) })) : undefined;
  const captions = timeline?.subtitleCues?.length
    ? `WEBVTT\n\n${timeline.subtitleCues.map((cue) => `${vttTime(cue.startFrame / timeline.fps)} --> ${vttTime(cue.endFrame / timeline.fps)}\n${cue.text}\n`).join('\n')}` : null;
  const profiles = voiceProfiles().profiles;
  const voice: RevisionVoice | undefined = metadata?.engine === 'kokoro_onnx' || metadata?.engine === 'kokoro'
    ? { engine: metadata.engine, ...(metadata.voice?.profileId ? { profileId: metadata.voice.profileId,
      voiceName: profiles.find((profile) => profile.id === metadata.voice?.profileId)?.name ?? metadata.voice.profileId } : {}) }
    : undefined;
  return { scenes, captions, voice, releaseDigest: parity?.releaseDigest, contentDigest: parity?.contentDigest };
}

function legacyVoice(engine: string | undefined, voice: string | undefined): RevisionVoice | undefined {
  if (!engine) return undefined;
  const mapped = engine === 'edge' ? 'edge-neural' : engine === 'sapi' ? 'windows-sapi' : engine === 'kokoro' || engine === 'kokoro_onnx' ? engine : 'unknown';
  return { engine: mapped, ...(voice ? (/^[ab][fm]_[a-z0-9_]+$/.test(voice) ? { profileId: voice } : { voiceName: voice }) : {}) };
}

interface Candidate {
  key: string;
  createdAt: Date;
  pipeline: RenderRevision['pipeline'];
  status: RenderRevision['status'];
  source: string;
  files: { file: string; role: RevisionOutput['role']; suffix: string; move: boolean }[];
  packageRoot?: string;
  notes: string[];
  voice?: RevisionVoice;
}

async function legacyCandidates(project: string, projectId: string): Promise<Candidate[]> {
  const renders = path.join(project, 'renders');
  if (!existsSync(renders)) return [];
  const groups = new Map<string, Candidate>();
  for (const entry of await readdir(renders, { withFileTypes: true })) {
    if (!entry.isFile()) continue;
    const file = path.join(renders, entry.name);
    const extension = path.extname(entry.name).toLowerCase();
    const version = /-v(\d+)(?:-raw|\.alignment)?\.[a-z0-9]+$/i.exec(entry.name)?.[1] ?? /_v(\d+)\.html$/i.exec(entry.name)?.[1];
    if (/^sheet_v\d+\.html$/i.test(entry.name)) {
      // Generated contact sheets point at deleted intermediate frame folders; the revision analysis replaces them.
      await rm(file, { force: true });
      continue;
    }
    const key = version ? `v${version}` : 'candidate';
    const group = groups.get(key) ?? { key, createdAt: new Date(8.64e15), pipeline: 'legacy-template', status: 'superseded',
      source: `renders/${entry.name}`, files: [], notes: [] };
    const role: RevisionOutput['role'] = VIDEO_EXTENSIONS.has(extension) ? (/-raw\./i.test(entry.name) ? 'video-raw' : 'video')
      : extension === '.pptx' ? 'presentation' : 'metadata';
    const suffix = role === 'video-raw' ? '-raw' : role === 'metadata' && entry.name.includes('.alignment.') ? '.alignment' : '';
    group.files.push({ file, role, suffix, move: true });
    if (role === 'video') {
      group.source = `renders/${entry.name}`;
      group.createdAt = (await stat(file)).mtime;
    }
    groups.set(key, group);
  }
  const list = [...groups.values()].filter((group) => group.files.some((file) => file.role === 'video'));
  list.sort((a, b) => Number(a.key.slice(1) || 0) - Number(b.key.slice(1) || 0) || a.createdAt.getTime() - b.createdAt.getTime());
  const timeline = existsSync(path.join(project, 'script', 'timeline.json'))
    ? await json<{ engine?: string; voice?: string }>(path.join(project, 'script', 'timeline.json')) : null;
  for (const group of list) {
    for (const file of group.files) if (file.role === 'metadata' && file.suffix === '.alignment') {
      const alignment = await json<{ input?: string; applied_offset_seconds?: number }>(file.file);
      group.notes.push(`Audio/video alignment remux of ${alignment.input ?? 'the raw render'} with ${Number(alignment.applied_offset_seconds ?? 0).toFixed(4)} s offset.`);
    }
  }
  const latest = list[list.length - 1];
  if (latest) {
    latest.voice = legacyVoice(timeline?.engine, timeline?.voice);
    if (latest.voice) latest.notes.push(`Narration voice recorded by script/timeline.json for ${projectId}'s latest legacy timeline.`);
  }
  return list;
}

async function packageCandidates(project: string): Promise<Candidate[]> {
  const list: Candidate[] = [];
  const roots: { folder: string; current: boolean }[] = [];
  for (const parent of ['qc/revisions', 'qc/releases']) {
    const directory = path.join(project, ...parent.split('/'));
    if (!existsSync(directory)) continue;
    for (const entry of await readdir(directory, { withFileTypes: true })) if (entry.isDirectory()) roots.push({ folder: `${parent}/${entry.name}`, current: false });
  }
  roots.push({ folder: 'release', current: true });
  for (const root of roots) {
    const packageRoot = path.join(project, ...root.folder.split('/'));
    const video = path.join(packageRoot, 'outputs', 'remotion', 'dist', 'render.mp4');
    if (!existsSync(video)) continue;
    const rejected = /failed|rejected/i.test(path.basename(root.folder));
    list.push({ key: root.folder, createdAt: (await stat(video)).mtime, pipeline: 'core-release', status: rejected ? 'rejected' : 'superseded',
      source: root.folder, packageRoot, files: [{ file: video, role: 'video', suffix: '', move: false }],
      notes: [rejected ? `Imported from ${root.folder}; the package was rejected during release verification.` : `Imported from ${root.folder}.`] });
  }
  return list.sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
}

/** Moves a superseded package to qc/revisions/<title>; a package held open by a viewer keeps its path until a later organize run. */
async function archivePackage(project: string, packageRoot: string, title: string): Promise<string | null> {
  const archive = path.join(project, 'qc', 'revisions', title);
  if (existsSync(archive)) return null;
  await mkdir(path.dirname(archive), { recursive: true });
  try {
    await rename(packageRoot, archive);
    return relative(project, archive);
  } catch (error) {
    if (!['EPERM', 'EACCES', 'EBUSY'].includes((error as NodeJS.ErrnoException).code ?? '')) throw error;
    return null;
  }
}

/** Imports every existing render into renders/<base>-<year>-<NN>/ with a validated RenderRevision manifest. */
export async function organizeRevisions(projectDirectory: string) {
  const project = path.resolve(projectDirectory);
  const projectId = projectIdOf(project);
  const existing = await listRevisions(project);
  for (const revision of existing) {
    if (!revision.source.startsWith('qc/releases/') || !existsSync(path.join(project, revision.source))) continue;
    const from = revision.source;
    const moved = await archivePackage(project, path.join(project, from), revision.title);
    if (!moved) continue;
    Object.assign(revision, { source: moved, outputs: revision.outputs.map((output) => (output.package === from ? { ...output, package: moved } : output)) });
    await saveRevision(project, revision);
  }
  const known = new Set(existing.flatMap((revision) => revision.outputs.filter((output) => output.role === 'video').map((output) => output.digest)));
  const knownSources = new Set(existing.map((revision) => revision.source));
  const legacy = await legacyCandidates(project, projectId);
  // Legacy version numbers define their order; core packages follow by render time.
  const candidates = [...legacy, ...(await packageCandidates(project)).sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime())];
  let number = existing.reduce((max, revision) => Math.max(max, revision.number), 0);
  const created: RenderRevision[] = [];
  const digestTitles = new Map<string, string>();
  for (const revision of existing) for (const output of revision.outputs) if (output.role === 'video') digestTitles.set(output.digest, revision.title);
  for (const candidate of candidates) {
    const video = candidate.files.find((file) => file.role === 'video')!;
    const videoDigest = await fileDigest(video.file);
    if (knownSources.has(candidate.source) || (known.has(videoDigest) && !candidate.files.some((file) => file.move))) continue;
    number += 1;
    const year = candidate.createdAt.getUTCFullYear();
    const title = revisionTitle(projectId, year, number);
    const folder = path.join(project, 'renders', title);
    await mkdir(folder, { recursive: true });
    const details = candidate.packageRoot ? await packageDetails(candidate.packageRoot) : null;
    const outputs: RevisionOutput[] = [];
    for (const item of candidate.files) {
      const extension = item.suffix === '.alignment' ? '.json' : path.extname(item.file).toLowerCase();
      const name = `${title}${item.suffix}${extension}`;
      const target = path.join(folder, name);
      if (item.move) await rename(item.file, target);
      else await copyFile(item.file, target);
      const bytes = await readFile(target);
      const output: RevisionOutput = { path: name, role: item.role, digest: sha256(bytes), byteSize: bytes.length, mediaType: MEDIA_TYPES[extension] ?? 'application/octet-stream' };
      if (item.role === 'video' || item.role === 'video-raw') {
        const probe = probeMedia(target);
        output.durationSeconds = probe.durationSeconds;
        if (probe.video) { output.width = probe.video.width; output.height = probe.video.height; }
        const voice = details?.voice ?? candidate.voice;
        if (voice) output.voice = voice;
      }
      outputs.push(output);
    }
    const primary = outputs.find((output) => output.role === 'video')!;
    if (details?.captions) {
      const captions = `${title}.vtt`;
      await writeFile(path.join(folder, captions), details.captions);
      const bytes = await readFile(path.join(folder, captions));
      outputs.push({ path: captions, role: 'captions', digest: sha256(bytes), byteSize: bytes.length, mediaType: 'text/vtt' });
      primary.captions = captions;
    }
    if (details?.scenes) primary.scenes = details.scenes;
    if (details?.releaseDigest) primary.releaseDigest = details.releaseDigest;
    let source = candidate.source;
    if (candidate.packageRoot && candidate.source !== 'release') {
      // Superseded packages stay local under qc/revisions/<title> so the archive name matches its render folder.
      source = (await archivePackage(project, candidate.packageRoot, title)) ?? source;
    }
    if (candidate.packageRoot) primary.package = source;
    const duplicate = digestTitles.get(primary.digest);
    const notes = [...candidate.notes, ...(duplicate ? [`Video bytes are identical to ${duplicate}.`] : [])];
    digestTitles.set(primary.digest, title);
    const revision: RenderRevision = validate('RenderRevision', { schemaVersion: '1.0.0', projectId, title, year, number,
      createdAt: candidate.createdAt.toISOString(), pipeline: candidate.pipeline, status: candidate.status, source,
      ...(details?.contentDigest ? { contentDigest: details.contentDigest } : {}), outputs, notes });
    await saveRevision(project, revision);
    created.push(revision);
  }
  const all = await listRevisions(project);
  // The promoted package in release/ is current; without one, the newest accepted revision is current.
  const newest = all.find((revision) => revision.source === 'release' || revision.outputs.some((output) => output.package === 'release'))
    ?? all.filter((revision) => revision.status !== 'rejected').at(-1);
  for (const revision of all) {
    const status = revision === newest ? 'current' : revision.status === 'rejected' ? 'rejected' : 'superseded';
    if (status !== revision.status) await saveRevision(project, { ...revision, status });
  }
  return { projectId, created: created.map((revision) => revision.title), revisions: (await listRevisions(project)).map((revision) => ({ title: revision.title, status: revision.status, source: revision.source })) };
}

function percent(value: number | null | undefined, places = 2): string {
  return value === null || value === undefined ? 'n/a' : `${(value * 100).toFixed(places)}%`;
}

function fmt(value: number | null | undefined, places = 1, unit = ''): string {
  return value === null || value === undefined || !Number.isFinite(value) ? 'n/a' : `${value.toFixed(places)}${unit}`;
}

async function labeledStrip(image: string, label: string, width: number, height: number): Promise<Buffer> {
  const strip = 30;
  const body = await sharp(image).resize(width, height, { fit: 'fill' }).toBuffer();
  const text = Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${strip}"><rect width="100%" height="100%" fill="#0f172a"/><text x="10" y="21" fill="#f8fafc" font-family="Arial" font-size="17" font-weight="700">${label.replaceAll('&', '&amp;').replaceAll('<', '&lt;')}</text></svg>`);
  return sharp({ create: { width, height: height + strip, channels: 3, background: '#0f172a' } })
    .composite([{ input: text, left: 0, top: 0 }, { input: body, left: 0, top: strip }]).png().toBuffer();
}

async function stackImages(parts: Buffer[], target: string): Promise<void> {
  if (!parts.length) return;
  const metas = await Promise.all(parts.map((part) => sharp(part).metadata()));
  const width = Math.max(...metas.map((meta) => meta.width ?? 0));
  const height = metas.reduce((sum, meta) => sum + (meta.height ?? 0), 0);
  let top = 0;
  const composites = parts.map((input, index) => { const item = { input, left: 0, top }; top += metas[index].height ?? 0; return item; });
  await sharp({ create: { width, height, channels: 3, background: '#0b1220' } }).composite(composites).jpeg({ quality: 84, mozjpeg: true }).toFile(target);
}

/** Analyzes every revision video (cached by digest) and writes qc/analysis comparison evidence. */
export async function analyzeRevisions(projectDirectory: string, options: { force?: boolean } = {}) {
  const project = path.resolve(projectDirectory);
  const projectId = projectIdOf(project);
  const revisions = await listRevisions(project);
  if (!revisions.length) throw new Error('no_revisions: run revisions-organize first');
  const analysisRoot = path.join(project, 'qc', 'analysis');
  const rows: { revision: RenderRevision; output: RevisionOutput; report: MediaAnalysisReport; directory: string }[] = [];
  for (const revision of revisions) {
    for (const output of revision.outputs.filter((item) => item.role === 'video' || item.role === 'video-raw')) {
      const stem = path.basename(output.path, path.extname(output.path));
      const directory = path.join(analysisRoot, revision.title, stem);
      const cached = existsSync(path.join(directory, 'analysis.json')) ? await json<MediaAnalysisReport>(path.join(directory, 'analysis.json')) : null;
      const report = !options.force && cached?.input.sha256 === output.digest ? cached
        : await analyzeMedia(path.join(project, 'renders', revision.title, output.path), directory,
          { label: `${revision.title} ${stem === revision.title ? '' : stem.slice(revision.title.length + 1)}`.trim(), scenes: output.scenes as AnalysisScene[] | undefined });
      rows.push({ revision, output, report, directory });
    }
  }
  const primary = rows.filter((row) => row.output.role === 'video');
  const comparison = {
    schemaVersion: '1.0.0', projectId, generatedAt: new Date().toISOString(),
    rows: rows.map(({ revision, output, report, directory }) => ({
      title: revision.title, status: revision.status, pipeline: revision.pipeline, file: output.path, role: output.role,
      analysis: relative(project, path.join(directory, 'analysis.json')), voice: output.voice ?? null,
      durationSeconds: report.probe.durationSeconds, width: report.probe.video?.width ?? null, height: report.probe.video?.height ?? null,
      integratedLufs: report.audio?.loudness.integratedLufs ?? null, truePeakDbtp: report.audio?.loudness.truePeakDbtp ?? null,
      loudnessRangeLu: report.audio?.loudness.loudnessRangeLu ?? null, speechRmsDbfs: report.audio?.activity.speechRmsDbfs ?? null,
      noiseFloorDbfs: report.audio?.activity.noiseFloorDbfs ?? null, snrDb: report.audio?.activity.snrDb ?? null,
      speechRatio: report.audio?.activity.speechRatio ?? null, longestPauseSeconds: report.audio?.activity.pauses.longestSeconds ?? null,
      speechCentroidHz: report.audio?.spectrum.speech?.centroidHz ?? null, speechHf8k: report.audio?.spectrum.speech?.highFrequencyRatio8k ?? null,
      speechFlatness: report.audio?.spectrum.speech?.flatness ?? null, humProminenceDb: report.audio?.hum?.strongest.prominenceDb ?? null,
      transitions: report.video?.transitions.length ?? 0, staticHolds: report.video?.freezes.filter((freeze) => freeze.durationSeconds > 8).length ?? 0,
      captionDetail: report.video?.layers.zones.find((zone) => zone.id === 'caption')?.meanDetail ?? null,
      findings: report.findings.map((finding) => `${finding.severity}:${finding.code}`)
    }))
  };
  await mkdir(analysisRoot, { recursive: true });
  await writeJson(path.join(analysisRoot, 'comparison.json'), comparison);
  const spectra: Buffer[] = [];
  const grids: Buffer[] = [];
  const layers: Buffer[] = [];
  for (const row of primary) {
    const label = `${row.report.label} | ${row.report.probe.video?.width}x${row.report.probe.video?.height} | ${fmt(row.report.audio?.loudness.integratedLufs, 1, ' LUFS')}`;
    if (typeof row.report.images.spectrogram === 'string') spectra.push(await labeledStrip(path.join(row.directory, row.report.images.spectrogram), label, 1600, 300));
    if (typeof row.report.images.layers === 'string') layers.push(await labeledStrip(path.join(row.directory, row.report.images.layers), row.report.label, 1600, 300));
    const proportional = row.report.video?.frames.filter((frame) => /^p\d+$/.test(frame.kind)) ?? [];
    if (proportional.length) {
      const thumbs = await Promise.all(proportional.map((frame) => sharp(path.join(row.directory, frame.path)).resize(320, 180, { fit: 'contain', background: '#000' }).toBuffer()));
      const strip = await sharp({ create: { width: 320 * thumbs.length, height: 180, channels: 3, background: '#000' } })
        .composite(thumbs.map((input, index) => ({ input, left: index * 320, top: 0 }))).png().toBuffer();
      const temporary = path.join(analysisRoot, `.grid-${row.revision.title}.png`);
      await writeFile(temporary, strip);
      grids.push(await labeledStrip(temporary, `${row.report.label}  (10% / 30% / 50% / 70% / 90%)`, 1600, 180));
      await rm(temporary, { force: true });
    }
  }
  await stackImages(spectra, path.join(analysisRoot, 'spectrogram-stack.jpg'));
  await stackImages(grids, path.join(analysisRoot, 'frames-grid.jpg'));
  await stackImages(layers, path.join(analysisRoot, 'layers-stack.jpg'));
  const lines = [
    '---', `title: ${projectId} render analysis`, `description: Measured audio, spectrogram and video-layer comparison for every ${projectId} revision.`, '---', '',
    '## Method', '',
    'Every revision video is decoded with FFmpeg and measured with the core `media-analyze` method. Spectrograms use a Hann window, logarithmic magnitude and a 120 dB range, with frequency, time and dBFS legends. Loudness uses ITU-R BS.1770 (EBU R128). Video layers are measured per layout zone as frame-to-frame motion and edge detail.',
    '', 'These are objective measurements. They do not replace listening and viewing.', '',
    '## Revisions', '',
    '| Revision | Status | Output | Voice | Size | Duration | LUFS | True peak | Pause floor | Speech HF>8k | Longest pause | Findings |',
    '| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |',
    ...comparison.rows.map((row) => `| ${row.title} | ${row.status} | ${row.file} | ${row.voice ? [row.voice.profileId ?? row.voice.voiceName, row.voice.engine].filter(Boolean).join(' / ') : 'unrecorded'} | ${row.width}x${row.height} | ${fmt(row.durationSeconds, 1, ' s')} | ${fmt(row.integratedLufs)} | ${fmt(row.truePeakDbtp)} dBTP | ${row.noiseFloorDbfs === null ? 'digital silence' : `${fmt(row.noiseFloorDbfs)} dBFS`} | ${percent(row.speechHf8k)} | ${fmt(row.longestPauseSeconds, 2, ' s')} | ${row.findings.filter((item) => !item.startsWith('info')).join(', ') || 'none'} |`),
    '', '## Findings by revision', ''
  ];
  for (const row of rows) {
    lines.push(`### ${row.revision.title} ${row.output.path}`, '');
    const list = row.report.findings.length ? row.report.findings.map((finding) => `* ${finding.severity}: ${finding.message}`) : ['* No threshold findings.'];
    lines.push(...list, '', `Evidence: [analysis](${relative(analysisRoot, path.join(row.directory, 'analysis.json'))}), [spectrogram](${relative(analysisRoot, path.join(row.directory, 'spectrogram.jpg'))}), [speech spectrogram](${relative(analysisRoot, path.join(row.directory, 'spectrogram-speech.jpg'))}), [layers](${relative(analysisRoot, path.join(row.directory, 'layers.png'))}), [frames](${relative(analysisRoot, path.join(row.directory, 'contact-sheet.jpg'))}).`, '');
  }
  lines.push('## Comparison images', '', '* [Spectrogram stack](spectrogram-stack.jpg)', '* [Frame grid](frames-grid.jpg)', '* [Layer activity stack](layers-stack.jpg)', '');
  await writeFile(path.join(analysisRoot, 'report.md'), `${lines.join('\n')}`);
  await indexProjectQc(project);
  return { projectId, analyzed: rows.length, comparison: relative(project, path.join(analysisRoot, 'comparison.json')), report: relative(project, path.join(analysisRoot, 'report.md')) };
}

export interface RevisionVariant { voice: string; engine: Engine }

export function parseVariants(value: string | undefined): RevisionVariant[] {
  const text = value?.trim() || 'am_michael:kokoro_onnx,af_heart:kokoro_onnx,af_bella:kokoro_onnx,am_michael:kokoro';
  const variants = text.split(',').map((item) => {
    const [voice, engine = 'kokoro_onnx'] = item.trim().split(':');
    if (engine !== 'kokoro_onnx' && engine !== 'kokoro') throw new Error(`invalid_variant_engine: ${item}`);
    return { voice, engine } as RevisionVariant;
  });
  const keys = variants.map((variant) => `${variant.voice}:${variant.engine}`);
  if (new Set(keys).size !== keys.length) throw new Error('duplicate_revision_variant');
  return variants;
}

/** Renders a new revision with one full core release per voice/engine variant, then promotes the first variant to release/. */
export async function produceRevision(projectDirectory: string, options: { variants: RevisionVariant[]; promote?: boolean; notes?: string[] }) {
  const project = path.resolve(projectDirectory);
  const projectId = projectIdOf(project);
  if (!options.variants.length) throw new Error('revision_requires_variants');
  const profiles = voiceProfiles().profiles;
  for (const variant of options.variants) if (!profiles.some((profile) => profile.id === variant.voice)) throw new Error(`unknown_voice_profile: ${variant.voice}`);
  if (options.promote !== false) await assertMovable(path.join(project, 'release'), project);
  await organizeRevisions(project);
  const canonical = path.join(project, 'canonical');
  const domain = await json(path.join(canonical, 'domain-pack.json'));
  const base = await json<ContentIR>(path.join(canonical, 'content-ir.json'));
  const render = await json<Record<string, unknown>>(path.join(canonical, 'render-spec.json'));
  const approval = await json<Record<string, unknown>>(path.join(canonical, 'approval-manifest.json'));
  const assets = base.assets.length ? path.join(canonical, 'assets') : undefined;
  const existing = await listRevisions(project);
  const now = new Date();
  const year = now.getUTCFullYear();
  const number = existing.reduce((max, revision) => Math.max(max, revision.number), 0) + 1;
  const title = revisionTitle(projectId, year, number);
  const staging = path.join(project, 'qc', 'revisions', title);
  if (existsSync(staging) || existsSync(path.join(project, 'renders', title))) throw new Error(`revision_exists: ${title}`);
  await mkdir(staging, { recursive: true });
  const folder = path.join(project, 'renders', title);
  await mkdir(folder, { recursive: true });
  const outputs: RevisionOutput[] = [];
  let contentDigest: string | undefined;
  const previousEngine = process.env.A2SWE_TTS_ENGINE;
  const stageRoot = path.join(REPOSITORY_ROOT, '.a2swe', 'stage');
  let stage = '';
  try {
    for (const variant of options.variants) {
      const slug = `${variant.voice}-${variant.engine}`;
      const content: ContentIR = { ...base, voice: { ...base.voice, profileId: variant.voice } };
      const variantDigest = digest(content);
      if (variant === options.variants[0]) contentDigest = variantDigest;
      const variantRender = { ...render, renderId: `${title}-${slug.replaceAll('_', '-')}`, contentDigest: variantDigest };
      const variantApproval = { ...approval, contentDigest: variantDigest };
      const out = path.join(staging, slug);
      // Render under a short path: deep project folders push Python, Chrome and Remotion temp files past the Windows 260-character limit.
      stage = path.join(stageRoot, sha256(`${project}|${title}|${slug}`).slice(0, 12));
      await removeTree(stage);
      await mkdir(stageRoot, { recursive: true });
      process.env.A2SWE_TTS_ENGINE = variant.engine;
      const parity = await writeRelease(stage, content, variantRender, variantApproval, domain, assets);
      await verifyRelease(stage);
      const details = await packageDetails(stage);
      if (details.voice?.engine !== variant.engine || details.voice.profileId !== variant.voice) throw new Error(`revision_voice_mismatch: ${slug}`);
      const name = `${title}-${slug}`;
      await copyFile(path.join(stage, 'outputs', 'remotion', 'dist', 'render.mp4'), path.join(folder, `${name}.mp4`));
      await moveTree(stage, out);
      stage = '';
      const video = await readFile(path.join(folder, `${name}.mp4`));
      const probe = probeMedia(path.join(folder, `${name}.mp4`));
      const output: RevisionOutput = { path: `${name}.mp4`, role: 'video', digest: sha256(video), byteSize: video.length, mediaType: 'video/mp4',
        durationSeconds: probe.durationSeconds, ...(probe.video ? { width: probe.video.width, height: probe.video.height } : {}),
        voice: details.voice, releaseDigest: parity.releaseDigest, package: relative(project, out), ...(details.scenes ? { scenes: details.scenes } : {}) };
      if (details.captions) {
        await writeFile(path.join(folder, `${name}.vtt`), details.captions);
        const captions = await readFile(path.join(folder, `${name}.vtt`));
        outputs.push({ path: `${name}.vtt`, role: 'captions', digest: sha256(captions), byteSize: captions.length, mediaType: 'text/vtt' });
        output.captions = `${name}.vtt`;
      }
      outputs.push(output);
    }
  } catch (error) {
    // A failed variant leaves no partial revision behind; cleanup problems never replace the original failure.
    await Promise.all([folder, staging, stage].filter(Boolean).map(removeTree));
    throw error;
  } finally {
    if (previousEngine === undefined) delete process.env.A2SWE_TTS_ENGINE;
    else process.env.A2SWE_TTS_ENGINE = previousEngine;
  }
  const notes = [...(options.notes ?? []), `Rendered ${options.variants.length} complete core releases from canonical inputs; each variant changes only the narration voice profile and speech engine.`];
  const revision: RenderRevision = validate('RenderRevision', { schemaVersion: '1.0.0', projectId, title, year, number, createdAt: instant(now),
    pipeline: 'core-release', status: 'current', source: relative(project, staging), ...(contentDigest ? { contentDigest } : {}), outputs, notes });
  await saveRevision(project, revision);
  for (const previous of existing) if (previous.status === 'current') await saveRevision(project, { ...previous, status: 'superseded' });
  if (options.promote !== false) return promoteRevision(project, title, `${options.variants[0].voice}-${options.variants[0].engine}`);
  await indexProjectQc(project);
  return { projectId, title, outputs: videoSummary(revision), runbook: null };
}

const voiceSlug = (voice: RevisionVoice) => `${voice.profileId}-${voice.engine}`;
const ownsRelease = (revision: RenderRevision) => revision.source === 'release' || revision.outputs.some((output) => output.package === 'release');
const videoSummary = (revision: RenderRevision) => revision.outputs.filter((output) => output.role === 'video').map((output) => ({
  path: `renders/${revision.title}/${output.path}`, voice: output.voice, durationSeconds: output.durationSeconds, releaseDigest: output.releaseDigest, package: output.package }));

const LOCK_CODES = ['EBUSY', 'EPERM', 'EACCES'];

/** Fails before any move when another process holds a file inside the directory open (for example PowerPoint reviewing deck.pptx). */
async function assertMovable(directory: string, project: string): Promise<void> {
  if (!existsSync(directory)) return;
  for (const entry of (await readdir(directory, { recursive: true, withFileTypes: true })).filter((item) => item.isFile())) {
    const file = path.join(entry.parentPath, entry.name);
    const locked = await open(file, 'r+').then(async (handle) => { await handle.close(); return false; },
      (error: NodeJS.ErrnoException) => { if (LOCK_CODES.includes(error.code ?? '')) return true; throw error; });
    if (locked) throw new Error(`release_locked: ${relative(project, file)} is held open by another process (a viewer or Office app); close it and run revision-promote`);
  }
}

/**
 * Moves a directory tree, merging into existing empty folders. A folder that another process uses as its working directory cannot
 * be renamed on Windows, so its contents move individually and the emptied folder stays behind.
 */
async function moveTree(from: string, to: string): Promise<void> {
  try {
    await rename(from, to);
    return;
  } catch (error) {
    const code = (error as NodeJS.ErrnoException).code ?? '';
    if (![...LOCK_CODES, 'ENOTEMPTY', 'EEXIST'].includes(code) || !(await stat(from)).isDirectory()) throw error;
  }
  await mkdir(to, { recursive: true });
  for (const entry of await readdir(from)) await moveTree(path.join(from, entry), path.join(to, entry));
  await rm(from, { recursive: true, force: true }).catch(() => undefined);
}

/** Best-effort removal used on failure paths, where a cleanup error must not hide the original failure. */
async function removeTree(directory: string): Promise<void> {
  await rm(directory, { recursive: true, force: true, maxRetries: 5, retryDelay: 200 }).catch(() => undefined);
}

/** Moves a rendered variant package into release/, archiving the previous release under the revision that produced it. Safe to rerun. */
export async function promoteRevision(projectDirectory: string, title: string, variant?: string) {
  const project = path.resolve(projectDirectory);
  const revisions = await listRevisions(project);
  const target = revisions.find((revision) => revision.title === title);
  if (!target) throw new Error(`unknown_revision: ${title}`);
  const videos = target.outputs.filter((output) => output.role === 'video' && output.voice && output.package);
  const chosen = variant ? videos.find((output) => voiceSlug(output.voice!) === variant) : videos[0];
  if (!chosen) throw new Error(`unknown_revision_variant: ${variant ?? title}`);
  const slug = voiceSlug(chosen.voice!);
  const release = path.join(project, 'release');
  if (chosen.package !== 'release') {
    const source = path.join(project, chosen.package!);
    if (!existsSync(source)) throw new Error(`revision_package_missing: ${chosen.package}`);
    await assertMovable(release, project);
    await assertMovable(source, project);
    if (existsSync(release)) {
      const owner = revisions.find(ownsRelease);
      const current = owner?.outputs.find((output) => output.package === 'release' && output.voice);
      // A variant promoted out of a multi-variant revision returns to that revision's staging folder; a single-package revision archives under its title.
      const archive = !owner ? path.join(project, 'qc', 'revisions', `release-before-${title}`)
        : owner.source !== 'release' && current ? path.join(project, owner.source, voiceSlug(current.voice!)) : path.join(project, 'qc', 'revisions', owner.title);
      if (existsSync(archive) && (await readdir(archive, { recursive: true, withFileTypes: true })).some((entry) => entry.isFile()))
        throw new Error(`release_archive_exists: ${relative(project, archive)}`);
      await moveTree(release, archive);
      if (owner) {
        const moved = relative(project, archive);
        const archived: RenderRevision = { ...owner, ...(owner.source === 'release' ? { source: moved } : {}),
          ...(owner.title !== title && owner.status === 'current' ? { status: 'superseded' as const } : {}),
          outputs: owner.outputs.map((output) => (output.package === 'release' ? { ...output, package: moved } : output)) as RenderRevision['outputs'] };
        await saveRevision(project, archived);
        if (owner.title === title) Object.assign(target, archived);
      }
    }
    await moveTree(source, release);
    const promoted: RenderRevision = { ...target, status: 'current',
      outputs: target.outputs.map((output) => (output.package === chosen.package ? { ...output, package: 'release' } : output)) as RenderRevision['outputs'],
      notes: [...target.notes.filter((note) => !note.startsWith('Promoted ')), `Promoted ${slug} to release/; the other variant packages remain local under ${relative(project, path.dirname(source))}.`] };
    await saveRevision(project, promoted);
    for (const other of revisions) if (other.title !== title && other.status === 'current') await saveRevision(project, { ...other, status: 'superseded' });
  }
  await verifyRelease(release);
  await indexProjectQc(project);
  const runbook = await projectRunbook(project);
  const final = (await listRevisions(project)).find((revision) => revision.title === title)!;
  return { projectId: final.projectId, title, promoted: slug, outputs: videoSummary(final), runbook };
}
