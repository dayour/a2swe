import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {copyFileSync, existsSync, mkdirSync, readFileSync, readdirSync, statSync, unlinkSync, writeFileSync} from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {validateSlideRecipe} from '../../template/scripts/brand-plan.ts';

const docs = fileURLToPath(new URL('../', import.meta.url));
const root = path.resolve(docs, '..');
const refresh = process.argv.includes('--refresh-media');
const localKnowledge = process.env.A2SWE_INCLUDE_LOCAL_KNOWLEDGE === '1';
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
const add = (source, category, name, description, preview, symbol = null, tags = [], recipe = null, image = null) => {
  if (!existsSync(absolute(source))) throw new Error(`Missing catalog source: ${source}`);
  templates.push({
    id: `${source}${symbol ? `#${symbol}` : ''}`,
    title: name, category, description, preview, source, symbol, tags, recipe, image,
    digest: hash(readFileSync(absolute(source))),
  });
};

const isProject = (dir) => ['canonical', 'agent', 'renders', 'release'].some((name) => existsSync(path.join(dir, name)));
for (const dir of readdirSync(path.join(root, 'projects'), {withFileTypes: true})
  .filter((d) => d.isDirectory() && isProject(path.join(root, 'projects', d.name))).sort((a, b) => a.name.localeCompare(b.name))) {
  const id = dir.name;
  const prefix = `projects/${id}`;
  const notes = projectNotes[id] ?? {title: title(id), description: 'Repository project.', note: 'No curated completion record.', blockers: [], evidence: []};
  const renderDir = absolute(`${prefix}/renders`);
  // Revision manifests are the render history; the site deploys the current and previous accepted revisions to stay within Pages limits.
  const manifests = existsSync(renderDir) ? readdirSync(renderDir, {withFileTypes: true})
    .filter((entry) => entry.isDirectory() && existsSync(path.join(renderDir, entry.name, 'revision.json')))
    .map((entry) => json(path.join(renderDir, entry.name, 'revision.json'))).sort((a, b) => b.year - a.year || b.number - a.number) : [];
  const current = manifests.find((revision) => revision.status === 'current');
  const previous = manifests.find((revision) => revision !== current && revision.status === 'superseded');
  const entries = manifests.flatMap((revision) => revision.outputs.filter((output) => output.role === 'video').map((output) => ({revision, output})));
  const revisions = entries.map(({revision: manifest, output}) => {
    const file = path.join(renderDir, manifest.title, output.path);
    const source = relative(file);
    discoveredMovies.add(source);
    const name = output.path;
    const revisionId = `${id}/${name}`;
    const digest = hash(readFileSync(file));
    const bytes = statSync(file).size;
    if (digest !== output.digest) throw new Error(`Revision manifest digest mismatch: ${source}`);
    const poster = `library/posters/${id}-${name}.jpg`;
    if (refresh && (metadata[source]?.digest !== digest || metadata[source]?.bytes !== bytes
      || !existsSync(path.join(docs, 'static', poster)))) {
      const probe = JSON.parse(execFileSync(ffprobe, ['-v', 'error', '-show_streams', '-show_format', '-of', 'json', file], {encoding: 'utf8'}));
      const stream = probe.streams.find((s) => s.codec_type === 'video');
      if (!stream) throw new Error(`No video stream: ${source}`);
      const [n, d] = stream.avg_frame_rate.split('/').map(Number);
      metadata[source] = {digest, bytes, width: stream.width, height: stream.height,
        fps: n / d, duration: Number(stream.duration ?? probe.format.duration), codec: stream.codec_name};
      const posterFile = path.join(docs, 'static', poster);
      mkdirSync(path.dirname(posterFile), {recursive: true});
      execFileSync(ffmpeg, ['-y', '-v', 'error', '-ss', '2', '-i', file, '-frames:v', '1', '-vf', 'scale=640:-2', '-update', '1', posterFile]);
    }
    const data = metadata[source];
    if (!data || data.digest !== digest || data.bytes !== bytes) {
      throw new Error(`Unindexed or changed movie: ${source}. Run npm --prefix docs run library:refresh with FFMPEG and FFPROBE configured.`);
    }
    if (!existsSync(path.join(docs, 'static', poster))) throw new Error(`Missing poster: ${poster}`);
    const published = manifest === current || manifest === previous;
    let movie = null;
    if (published) {
      movie = `library/videos/${id}/${name}`;
      const destination = path.join(docs, 'static', movie);
      mkdirSync(path.dirname(destination), {recursive: true});
      copyFileSync(file, destination);
    }
    const voice = output.voice ? [output.voice.voiceName ?? output.voice.profileId, output.voice.engine].filter(Boolean).join(' / ') : null;
    const revision = name.slice(0, -path.extname(name).length);
    const stem = revision;
    const reportPath = `${prefix}/qc/analysis/${manifest.title}/${stem}/analysis.json`;
    const report = existsSync(absolute(reportPath)) ? json(absolute(reportPath)) : null;
    const reportMatches = report?.input?.sha256 === digest;
    let captions = null;
    if (published && output.captions) {
      captions = `library/captions/${id}/${output.captions}`;
      write(path.join(docs, 'static', captions), readFileSync(path.join(renderDir, manifest.title, output.captions), 'utf8'));
    }
    return {id: revisionId, projectId: id, title: `${notes.title} ${manifest.title}${voice ? ` (${voice})` : ''}`, revision, revisionTitle: manifest.title,
      voice, source, movie, poster, captions, ...data, latest: manifest === current, qc: reportMatches ? reportPath : null,
      state: manifest === current ? 'Current revision' : manifest.status === 'rejected' ? 'Rejected candidate' : 'Historical revision'};
  });
  const evidence = notes.evidence.map((p) => `${prefix}/${p}`);
  for (const source of evidence) if (!existsSync(absolute(source))) throw new Error(`Missing project evidence: ${source}`);
  projects.push({id, ...notes, evidence, revisions, state: revisions.length ? 'Generated' : 'Not rendered'});
  const storyboard = [`${prefix}/canonical/content-ir.json`, `${prefix}/brief.md`].find((p) => existsSync(absolute(p)));
  if (storyboard) add(storyboard, 'Storylines', `${notes.title} storyline`, 'Adapt the scene sequence and narrative structure. Re-research claims before reuse.', 'storyline', null, [id]);
  const agent = `${prefix}/agent/SWE_AGENT.md`;
  if (existsSync(absolute(agent))) add(agent, 'Agents', `${notes.title} companion`, 'Project companion instructions and production state. Check the recorded evidence before reuse.', 'agent', null, [id]);
}
if (refresh) {
  for (const source of Object.keys(metadata)) if (!discoveredMovies.has(source)) delete metadata[source];
  write(metadataPath, metadata);
}
const expectedMovies = new Set(projects.flatMap((project) => project.revisions.filter((video) => video.movie).map((video) => path.join(docs, 'static', video.movie))));
const generatedMovies = path.join(mediaOut, 'videos');
if (existsSync(generatedMovies)) {
  for (const file of walk(generatedMovies)) {
    if (!expectedMovies.has(file)) unlinkSync(file);
  }
  for (const [folder, field] of [['posters', 'poster'], ['captions', 'captions']]) {
    const expected = new Set(projects.flatMap((project) => project.revisions.map((video) => video[field])
      .filter(Boolean).map((file) => path.join(docs, 'static', file))));
    const directory = path.join(mediaOut, folder);
    if (existsSync(directory)) for (const file of walk(directory)) if (!expected.has(file)) unlinkSync(file);
  }

  const knowledgePath = absolute('library/assets/knowledge/catalog.json');
  const knowledgePreviews = new Set();
  if (localKnowledge && existsSync(knowledgePath)) {
    const knowledge = json(knowledgePath);
    const sourceHashes = new Map();
    for (const asset of knowledge.assets) {
      for (const source of [asset.path, asset.source.path]) {
        if (typeof source !== 'string' || source.startsWith('/') || source.includes('\\')
          || source.split('/').some((part) => part === '..' || part === '.') || !source.startsWith('library/assets/')) {
          throw new Error(`Unsafe knowledge asset path: ${source}`);
        }
      }
      const bytes = readFileSync(absolute(asset.path));
      if (!['image/png', 'image/jpeg'].includes(asset.mediaType) || hash(bytes) !== asset.digest) throw new Error(`Invalid knowledge asset: ${asset.id}`);
      if (!sourceHashes.has(asset.source.path)) sourceHashes.set(asset.source.path, hash(readFileSync(absolute(asset.source.path))));
      if (sourceHashes.get(asset.source.path) !== asset.source.digest) throw new Error(`Knowledge source changed: ${asset.source.path}`);
      const preview = `library/assets/${asset.digest}.${asset.mediaType === 'image/png' ? 'png' : 'jpg'}`;
      const target = path.join(docs, 'static', preview);
      knowledgePreviews.add(target);
      mkdirSync(path.dirname(target), {recursive: true});
      if (!existsSync(target)) writeFileSync(target, bytes);
      add(asset.path, 'Knowledge assets', asset.title, asset.description, 'image', null, asset.tags, null,
        {path: preview, width: asset.width, height: asset.height, source: asset.source.path, page: asset.source.page});
    }
  }
  const knowledgePreviewRoot = path.join(mediaOut, 'assets');
  if (existsSync(knowledgePreviewRoot)) for (const file of walk(knowledgePreviewRoot)) if (!knowledgePreviews.has(file)) unlinkSync(file);
}

add('template/agent/SWE_AGENT.md', 'Agents', 'Project companion starter', 'Portable projection of agent/runbook.json for resuming a project. Populate it from the project gates and recorded evidence.', 'agent');
add('.github/agents/power-platform-swe.agent.md', 'Agents', 'Power Platform SWE (candidate)', 'Read/search-only architecture and test-planning agent. Not certified domain expertise or a media producer.', 'agent');
add('packages/core/src/cli.ts', 'Projects', 'Core-managed project scaffold', 'Initialize a draft domain and evidence-tracked Runbook with project-init; no copied runtime or empty output folders.', 'layout');
add('template/package.json', 'Projects', 'Shared Remotion runtime', 'Pinned Remotion, headless Chrome and font dependencies the core 1080p MP4 adapter uses for every release workspace.', 'layout');
for (const file of walk(path.join(root, 'library', 'agents')).filter((f) => /\.agent\.md$/i.test(f))) {
  const source = relative(file);
  const body = readFileSync(file, 'utf8');
  const name = body.match(/^name:\s*(.+)$/m)?.[1] ?? title(path.basename(file));
  const description = body.match(/^description:\s*(.+)$/m)?.[1] ?? 'Local agent profile. Read its scope and evidence boundaries.';
  add(source, 'Agents', name, description, 'agent');
}
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
  add(source, 'Skills', meta.name ?? heading, meta.description ?? 'Reusable skill instructions. Inspect the source for prerequisites and tools.',
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
