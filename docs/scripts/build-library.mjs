import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {copyFileSync, existsSync, mkdirSync, readFileSync, readdirSync, statSync, unlinkSync, writeFileSync} from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {validateSlideRecipe} from '../../template/scripts/brand-plan.ts';

const docs = fileURLToPath(new URL('../', import.meta.url));
const root = path.resolve(docs, '..');
const refresh = process.argv.includes('--refresh-media');
const relative = (file) => path.relative(root, file).split(path.sep).join('/');
const absolute = (file) => path.join(root, ...file.split('/'));
const text = (file) => readFileSync(absolute(file), 'utf8');
const hash = (bytes) => createHash('sha256').update(bytes).digest('hex');
const json = (file) => JSON.parse(readFileSync(file, 'utf8'));
const write = (file, value) => {
  mkdirSync(path.dirname(file), {recursive: true});
  writeFileSync(file, typeof value === 'string' ? value : `${JSON.stringify(value, null, 2)}\n`);
};
const walk = (dir) => readdirSync(dir, {withFileTypes: true}).flatMap((entry) => {
  if (entry.isSymbolicLink() || ['node_modules', '.git', '.venv', 'build_production'].includes(entry.name)) return [];
  const file = path.join(dir, entry.name);
  return entry.isDirectory() ? walk(file) : [file];
});
const title = (name) => name.replace(/[-_]/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
const projectNotes = json(path.join(docs, 'catalog', 'projects.json'));
const metadataPath = path.join(docs, 'catalog', 'media.json');
const metadata = existsSync(metadataPath) ? json(metadataPath) : {};
if (!refresh) {
  for (const source of Object.keys(metadata)) {
    if (!existsSync(absolute(source))) throw new Error(`Indexed movie missing: ${source}. Include the source movie in the checkout, or explicitly retire it with library:refresh.`);
  }
}
const mediaOut = path.join(docs, 'static', 'library');
const ffmpeg = process.env.FFMPEG ?? path.join(root, 'template', 'node_modules', '@remotion', 'compositor-win32-x64-msvc', 'ffmpeg.exe');
const ffprobe = process.env.FFPROBE ?? path.join(path.dirname(ffmpeg), 'ffprobe.exe');
const projects = [];
const discoveredMovies = new Set();
const templates = [];
const add = (source, category, name, description, preview, symbol = null, tags = [], recipe = null) => {
  if (!existsSync(absolute(source))) throw new Error(`Missing catalog source: ${source}`);
  templates.push({
    id: `${source}${symbol ? `#${symbol}` : ''}`,
    title: name, category, description, preview, source, symbol, tags, recipe,
    digest: hash(readFileSync(absolute(source))),
  });
};
const vttTime = (frame, fps) => {
  const ms = Math.round(frame / fps * 1000);
  return `${String(Math.floor(ms / 3600000)).padStart(2, '0')}:${String(Math.floor(ms / 60000) % 60).padStart(2, '0')}:${String(Math.floor(ms / 1000) % 60).padStart(2, '0')}.${String(ms % 1000).padStart(3, '0')}`;
};

for (const dir of readdirSync(path.join(root, 'projects'), {withFileTypes: true}).filter((d) => d.isDirectory()).sort((a, b) => a.name.localeCompare(b.name))) {
  const id = dir.name;
  const prefix = `projects/${id}`;
  const notes = projectNotes[id] ?? {title: title(id), description: 'Repository project.', note: 'No curated completion record.', blockers: [], evidence: []};
  const renderDir = absolute(`${prefix}/renders`);
  const files = existsSync(renderDir) ? walk(renderDir).filter((f) => /\.(mp4|webm|mov)$/i.test(f)).sort((a, b) => b.localeCompare(a, 'en', {numeric: true})) : [];
  const revisions = files.map((file, index) => {
    const source = relative(file);
    discoveredMovies.add(source);
    const name = path.basename(file);
    const revisionId = `${id}/${name}`;
    const digest = hash(readFileSync(file));
    if (refresh) {
      const probe = JSON.parse(execFileSync(ffprobe, ['-v', 'error', '-show_streams', '-show_format', '-of', 'json', file], {encoding: 'utf8'}));
      const stream = probe.streams.find((s) => s.codec_type === 'video');
      if (!stream) throw new Error(`No video stream: ${source}`);
      const [n, d] = stream.avg_frame_rate.split('/').map(Number);
      metadata[source] = {digest, bytes: statSync(file).size, width: stream.width, height: stream.height,
        fps: n / d, duration: Number(stream.duration ?? probe.format.duration), codec: stream.codec_name};
      const poster = path.join(mediaOut, 'posters', `${id}-${name}.jpg`);
      mkdirSync(path.dirname(poster), {recursive: true});
      execFileSync(ffmpeg, ['-y', '-v', 'error', '-ss', '2', '-i', file, '-frames:v', '1', '-vf', 'scale=640:-2', '-update', '1', poster]);
    }
    const data = metadata[source];
    if (!data || data.digest !== digest || data.bytes !== statSync(file).size) {
      throw new Error(`Unindexed or changed movie: ${source}. Run npm --prefix docs run library:refresh with FFMPEG and FFPROBE configured.`);
    }
    const poster = `library/posters/${id}-${name}.jpg`;
    if (!existsSync(path.join(docs, 'static', poster))) throw new Error(`Missing poster: ${poster}`);
    const movie = `library/videos/${id}/${name}`;
    const destination = path.join(docs, 'static', movie);
    mkdirSync(path.dirname(destination), {recursive: true});
    copyFileSync(file, destination);
    const revision = name.match(/-(v\d+)\./i)?.[1] ?? path.parse(name).name;
    const reportPath = `${prefix}/qc/media-${revision}.json`;
    const report = existsSync(absolute(reportPath)) ? json(absolute(reportPath)) : null;
    const reportMatches = report?.sha256?.toLowerCase() === digest;
    let captions = null;
    const subsPath = `${prefix}/src/common/subs.ts`;
    if (index === 0 && existsSync(absolute(subsPath))) {
      const cues = [...text(subsPath).matchAll(/\{from:\s*(\d+),\s*to:\s*(\d+),\s*text:\s*("(?:\\.|[^"\\])*")\}/g)];
      if (!cues.length) throw new Error(`Cannot parse subtitle source: ${subsPath}`);
      captions = `library/captions/${id}.vtt`;
      write(path.join(docs, 'static', captions), `WEBVTT\n\n${cues.map((m) => `${vttTime(Number(m[1]), data.fps)} --> ${vttTime(Number(m[2]) + 1, data.fps)}\n${JSON.parse(m[3])}\n`).join('\n')}`);
    }
    return {id: revisionId, projectId: id, title: `${notes.title} ${revision}`, revision, source, movie, poster, captions,
      ...data, latest: index === 0, qc: reportMatches ? reportPath : null, state: index === 0 ? 'Review candidate' : 'Historical revision'};
  });
  const evidence = notes.evidence.map((p) => `${prefix}/${p}`);
  for (const source of evidence) if (!existsSync(absolute(source))) throw new Error(`Missing project evidence: ${source}`);
  projects.push({id, ...notes, evidence, revisions, state: revisions.length ? 'Review candidates' : 'Not rendered'});
  const storyboard = [`${prefix}/storyboard.md`, `${prefix}/script/content-packet-2026-09-18/storyboard.md`, `${prefix}/brief.md`].find((p) => existsSync(absolute(p)));
  if (storyboard) add(storyboard, 'Storylines', `${notes.title} storyline`, 'Adapt the scene sequence and narrative structure. Re-research claims and obtain new narration approval.', 'storyline', null, [id]);
  const agent = `${prefix}/agent/SWE_AGENT.md`;
  if (existsSync(absolute(agent))) add(agent, 'Agents', `${notes.title} companion`, 'Project companion instructions and production state. Review pending gates before reuse.', 'agent', null, [id]);
}
if (refresh) {
  for (const source of Object.keys(metadata)) if (!discoveredMovies.has(source)) delete metadata[source];
  write(metadataPath, metadata);
}
const expectedMovies = new Set(projects.flatMap((project) => project.revisions.map((video) => path.join(docs, 'static', video.movie))));
const generatedMovies = path.join(mediaOut, 'videos');
if (existsSync(generatedMovies)) {
  for (const file of walk(generatedMovies)) {
    if (!expectedMovies.has(file)) unlinkSync(file);
  }
}

add('template/agent/SWE_AGENT.md', 'Agents', 'Production companion', 'Start a portable, evidence-led production ledger with scope, narration, voice, and pilot approval gates.', 'agent');
add('.github/agents/power-platform-swe.agent.md', 'Agents', 'Power Platform SWE (candidate)', 'Read/search-only architecture and test-planning agent. Not certified domain expertise or a media producer.', 'agent');
add('template/package.json', 'Projects', 'Remotion project scaffold', 'Create a separate editable project with locked dependencies, shared visuals, shot groups, and production scripts.', 'layout');
for (const recipe of json(absolute('template/brand-recipes.json'))) {
  validateSlideRecipe(recipe);
  add('template/brand-recipes.json', 'Slide recipes', recipe.title, recipe.description, 'slide',
    recipe.id, [recipe.intent, recipe.density, 'PPT + video', 'generic example'], recipe);
}
for (const file of walk(path.join(root, 'library', 'skills')).filter((f) => /^skill\.md$/i.test(path.basename(f)))) {
  const source = relative(file);
  const metaPath = path.join(path.dirname(file), 'metadata.json');
  const meta = existsSync(metaPath) ? json(metaPath) : {};
  const body = readFileSync(file, 'utf8');
  const heading = body.match(/^# (.+)$/m)?.[1] ?? title(path.basename(path.dirname(file)));
  add(source, 'Skills', meta.name ?? heading, meta.description ?? 'Reusable skill instructions. Inspect the source for prerequisites, tools, licensing, and approval requirements.',
    'skill', null, Array.isArray(meta.tags) ? meta.tags : []);
}
for (const file of walk(path.join(root, 'library', 'plugins')).filter((f) => /\.md$/i.test(f))) {
  add(relative(file), 'Plugins', title(path.basename(path.dirname(file))), 'Plugin integration recipe. Review host and permission requirements before applying.', 'agent');
}
for (const [source, category] of [
  ['template/src/ui.tsx', 'Graphics'], ['template/src/fx.tsx', 'Graphics'], ['template/src/overlay/Overlay.tsx', 'Layouts'],
  ...['DotFieldBg', 'StarField', 'Fog', 'Subtitle', 'ProgressBar', 'Footage', 'Glitch'].map((n) => [`template/src/common/${n}.tsx`, 'Graphics']),
]) {
  const exports = [...text(source).matchAll(/export const ([A-Z]\w*)\s*:\s*React\.FC/g)];
  for (const match of exports) add(source, category, match[1],
    `${match[1]} is a reusable frame-driven React component. Inspect its props and required assets before adapting it to your scene.`,
    category === 'Layouts' ? 'layout' : 'graphic', match[1], ['React', 'Remotion']);
}
templates.sort((a, b) => a.category.localeCompare(b.category) || a.title.localeCompare(b.title));
if (new Set(templates.map((t) => t.id)).size !== templates.length) throw new Error('Duplicate template catalog ID');
write(path.join(docs, 'src', 'data', 'library.json'), {schemaVersion: 1, projects, templates});
console.log(`Library: ${projects.length} projects, ${projects.flatMap((p) => p.revisions).length} videos, ${templates.length} reusable entries.`);
