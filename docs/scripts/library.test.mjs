import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {existsSync, readFileSync, readdirSync} from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import test from 'node:test';
import {parseAnnotations, validateAnnotation} from '../src/components/library/feedback.ts';

const docs = fileURLToPath(new URL('../', import.meta.url));
const root = path.resolve(docs, '..');
const catalog = JSON.parse(readFileSync(path.join(docs, 'src', 'data', 'library.json'), 'utf8'));
const videos = catalog.projects.flatMap((project) => project.revisions);
const sha = (bytes) => createHash('sha256').update(bytes).digest('hex');
const walk = (dir) => readdirSync(dir, {withFileTypes: true}).flatMap((entry) => {
  const file = path.join(dir, entry.name);
  return entry.isDirectory() ? walk(file) : [file];
});
const subjects = [{id: 'copilot/v1.mp4', digest: 'a'.repeat(64), duration: 30, fps: 30},
  {id: 'copilot/v2.mp4', digest: 'b'.repeat(64), duration: 30, fps: 30}];
const sample = () => ({schemaVersion: 1, id: 'review-1', createdAt: '2026-09-21T18:00:00Z',
  subject: {id: subjects[0].id, digest: subjects[0].digest, fromSeconds: 0, toSeconds: 30},
  comparison: null, tags: ['readability'], rating: 3, comment: 'Title is readable.',
  status: 'unadjudicated', origin: 'browser-local-human-feedback'});

test('every repository project appears, including unfinished projects', () => {
  const projects = readdirSync(path.join(root, 'projects'), {withFileTypes: true}).filter((p) => p.isDirectory()).map((p) => p.name).sort();
  assert.deepEqual(catalog.projects.map((p) => p.id).sort(), projects);
  for (const project of catalog.projects) {
    assert.equal(project.state, project.revisions.length ? 'Review candidates' : 'Not rendered');
    if (!project.revisions.length) assert.ok(project.note);
    assert.ok(project.evidence.every((p) => existsSync(path.join(root, p))));
  }
});
test('all retained movies are indexed and copied byte-for-byte for GitHub Pages', () => {
  const sources = catalog.projects.flatMap((p) => {
    const dir = path.join(root, 'projects', p.id, 'renders');
    return existsSync(dir) ? walk(dir).filter((f) => /\.(mp4|webm|mov)$/i.test(f)).map((f) => path.relative(root, f).split(path.sep).join('/')) : [];
  });
  assert.ok(videos.length > 0);
  assert.deepEqual(videos.map((v) => v.source).sort(), sources.sort());
  assert.deepEqual(walk(path.join(docs, 'static', 'library', 'videos')).sort(),
    videos.map((v) => path.join(docs, 'static', v.movie)).sort());
  assert.equal(new Set(videos.map((v) => v.id)).size, videos.length);
  for (const video of videos) {
    const source = readFileSync(path.join(root, video.source));
    const deployed = readFileSync(path.join(docs, 'static', video.movie));
    assert.equal(sha(source), video.digest);
    assert.equal(sha(deployed), video.digest);
    assert.equal(source.length, video.bytes);
    assert.ok(video.duration > 0 && video.fps > 0 && video.width > 0 && video.height > 0);
    assert.ok(existsSync(path.join(docs, 'static', video.poster)));
    assert.notEqual(video.state, 'approved');
    if (video.qc) assert.equal(JSON.parse(readFileSync(path.join(root, video.qc), 'utf8')).sha256.toLowerCase(), video.digest);
    if (video.captions) assert.match(readFileSync(path.join(docs, 'static', video.captions), 'utf8'), /^WEBVTT\n\n\d{2}:\d{2}:\d{2}\.\d{3} -->/);
  }
});
test('all skills, including nested Office skills, have source-backed template entries', () => {
  const entries = walk(path.join(root, 'library', 'skills')).filter((f) => /^skill\.md$/i.test(path.basename(f)));
  const actual = catalog.templates.filter((t) => t.category === 'Skills').map((t) => t.source).sort();
  assert.deepEqual(actual, entries.map((f) => path.relative(root, f).split(path.sep).join('/')).sort());
  assert.equal(new Set(catalog.templates.map((t) => t.id)).size, catalog.templates.length);
  for (const entry of catalog.templates) assert.equal(sha(readFileSync(path.join(root, entry.source))), entry.digest);
  for (const category of ['Agents', 'Graphics', 'Layouts', 'Storylines', 'Projects', 'Skills', 'Plugins']) {
    assert.ok(catalog.templates.some((t) => t.category === category), `Missing category: ${category}`);
  }
});
test('feedback round-trip remains local and unadjudicated', () => {
  const record = sample();
  validateAnnotation(record, subjects);
  assert.deepEqual(parseAnnotations(JSON.stringify([record]), subjects), [record]);
  assert.deepEqual(parseAnnotations(null, subjects), []);
});
test('feedback rejects invalid ranges, tags, ratings, and artifact drift', () => {
  for (const range of [[-1, 5], [10, 10], [10, 9], [0, 31], [NaN, 10]]) {
    const record = sample();
    [record.subject.fromSeconds, record.subject.toSeconds] = range;
    assert.throws(() => validateAnnotation(record, subjects), /Time range/);
  }
  for (const tags of [[], ['unknown'], ['pacing', 'pacing']]) assert.throws(() => validateAnnotation({...sample(), tags}, subjects), /tag/);
  for (const rating of [0, 6, 1.5, NaN]) assert.throws(() => validateAnnotation({...sample(), rating}, subjects), /Rating/);
  const changed = sample(); changed.subject.digest = 'c'.repeat(64);
  assert.throws(() => validateAnnotation(changed, subjects), /missing or changed movie/);
});
test('pairwise feedback requires two distinct known artifacts', () => {
  const record = {...sample(), comparison: {id: subjects[1].id, digest: subjects[1].digest, preference: 'comparison'}};
  validateAnnotation(record, subjects);
  assert.throws(() => validateAnnotation({...record, comparison: {id: subjects[0].id, digest: subjects[0].digest, preference: 'tie'}}, subjects), /different/);
  assert.throws(() => validateAnnotation({...record, comparison: {...record.comparison, preference: 'approved'}}, subjects), /preference/);
});
test('corrupt storage and duplicate IDs are surfaced rather than overwritten', () => {
  assert.throws(() => parseAnnotations('{broken', subjects));
  assert.throws(() => parseAnnotations('{}', subjects), /not an array/);
  assert.throws(() => parseAnnotations(JSON.stringify([sample(), sample()]), subjects), /duplicate/);
  assert.throws(() => validateAnnotation({...sample(), status: 'approved'}, subjects), /Invalid/);
});
