import { existsSync } from 'node:fs';
import { lstat, mkdir, readFile, readdir, rename, stat, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { digest, sha256File } from './canonical.ts';
import { validate } from './contracts.ts';
import type { RenderRevision, RenderTheme } from './contracts.ts';
import { fingerprintVideo, compareFingerprints } from './visual-fingerprint.ts';
import { reviewRegeneration } from './regeneration-review.ts';
import { designDigest, recompositionDesign, renderRecomposition, writeRecompositionStage } from './regeneration-render.ts';
import type { RegenerationStyle } from './regeneration-render.ts';

type Output = RenderRevision['outputs'][number];
export interface RegenerationOptions { id?: string; scope?: 'primary' | 'all'; onProgress?: (message: string) => void }
const ROOT = fileURLToPath(new URL('../../../', import.meta.url));
const relative = (root: string, file: string) => path.relative(root, file).split(path.sep).join('/');
const json = async <T>(file: string): Promise<T> => JSON.parse(await readFile(file, 'utf8'));
async function writeJson(file: string, value: unknown) {
  await mkdir(path.dirname(file), { recursive: true });
  await writeFile(`${file}.tmp`, `${JSON.stringify(value, null, 2)}\n`);
  await rename(`${file}.tmp`, file);
}

/** Originals remain the reference. Never selects a regenerated output as the next generation's source. */
export function regenerationSources(revision: RenderRevision, scope: 'primary' | 'all' = 'primary'): Output[] {
  const originals = revision.outputs.filter((output) => output.role === 'video' && !output.visualRegeneration);
  return scope === 'all' ? originals : originals.slice(0, 1);
}

async function directory(file: string) {
  if (!existsSync(file)) return false;
  const info = await lstat(file);
  return info.isDirectory() && !info.isSymbolicLink();
}

async function projects(root: string): Promise<string[]> {
  if (await directory(path.join(root, 'renders'))) return [root];
  const collection = await directory(path.join(root, 'projects')) ? path.join(root, 'projects') : root;
  const result: string[] = [];
  for (const entry of await readdir(collection, { withFileTypes: true })) {
    if (!entry.isDirectory() || entry.isSymbolicLink() || entry.name.startsWith('.')) continue;
    const project = path.join(collection, entry.name);
    if (await directory(path.join(project, 'renders'))) result.push(project);
  }
  return result.sort();
}

async function brandEvidence(project: string, palette: string[]) {
  const file = path.join(project, 'canonical', 'render-theme.json');
  if (existsSync(file)) {
    const theme = validate('RenderTheme', await json<RenderTheme>(file));
    return { primary: theme.palette?.primary ?? theme.accent, accent: theme.palette?.highlight ?? theme.accent,
      evidence: { basis: 'installed-project-theme', path: relative(project, file), sha256: await sha256File(file), source: theme.source,
        applicability: 'Shared project brand context; historical picture and audio stay intact.' } };
  }
  const primary = palette.find((color) => {
    const values = [1, 3, 5].map((i) => parseInt(color.slice(i, i + 2), 16));
    return Math.max(...values) - Math.min(...values) > 35;
  }) ?? palette[0] ?? '#2563EB';
  return { primary, accent: palette.find((color) => color !== primary),
    evidence: { basis: 'measured-reference-palette', applicability: 'Appearance extracted from this video; official brand identity is unverified.' } };
}

async function generatorIdentity() {
  const files = ['regenerations.ts', 'regeneration-render.ts', 'regeneration-review.ts', 'visual-fingerprint.ts'];
  return Object.fromEntries(await Promise.all(files.map(async (file) => [file, await sha256File(path.join(ROOT, 'packages/core/src', file))])));
}

async function regenerateSource(project: string, manifestFile: string, source: Output, options: RegenerationOptions) {
  const revision = validate('RenderRevision', await json(manifestFile));
  const renderDirectory = path.dirname(manifestFile);
  const input = path.join(renderDirectory, source.path);
  if (!(await lstat(input)).isFile() || (await lstat(input)).isSymbolicLink()) throw new Error(`regeneration_source_not_file: ${input}`);
  if (await sha256File(input) !== source.digest) throw new Error(`regeneration_source_digest_mismatch: ${input}`);
  const retained = revision.outputs.filter((output) => output.visualRegeneration?.sourcePath === source.path);
  if (retained.length === 2) {
    for (const output of retained) {
      if (await sha256File(path.join(renderDirectory, output.path)) !== output.digest) throw new Error('regeneration_cached_output_changed');
      const directory = path.join(project, output.visualRegeneration!.evidencePath!);
      const receipt = await json<{ sourceDigest: string; outputDigest: string; designDigest: string; reviewStatus: string }>(path.join(directory, 'generation.json'));
      const plan = await json(path.join(directory, 'plan.json'));
      const review = await json<{ status: string; variant: { sha256: string } }>(path.join(directory, 'review.json'));
      if (receipt.sourceDigest !== source.digest || receipt.outputDigest !== output.digest || receipt.designDigest !== digest(plan)
        || receipt.designDigest !== output.visualRegeneration!.designDigest || receipt.reviewStatus !== 'passed'
        || review.status !== 'passed' || review.variant.sha256 !== output.digest) throw new Error('regeneration_cached_evidence_changed');
    }
    options.onProgress?.(`${revision.title}: verified original + two retained variations`);
    return { projectId: revision.projectId, revision: revision.title, source: source.path, outputs: retained.map((output) => output.path), generated: 0,
      evidence: relative(project, path.dirname(path.join(project, retained[0].visualRegeneration!.evidencePath!))), editorialReview: 'pending' };
  }
  const sourceStem = path.parse(source.path).name;
  const key = `${sourceStem.slice(0, 64)}-${source.digest.slice(0, 8)}`;
  const evidence = path.join(project, 'qc', 'regenerations', revision.title, key);
  await mkdir(evidence, { recursive: true });
  const originalRecord = path.join(evidence, 'original-revision.json');
  if (!existsSync(originalRecord)) await writeFile(originalRecord, await readFile(manifestFile), { flag: 'wx' });
  options.onProgress?.(`${revision.title}: analyzing ${source.path}`);
  const original = await fingerprintVideo(input, source.scenes?.map((scene) => (scene.startSeconds + scene.endSeconds) / 2));
  await writeJson(path.join(evidence, 'reference-fingerprint.json'), original);
  const brand = await brandEvidence(project, original.summary.palette);
  const titleFile = path.join(project, 'canonical', 'domain-pack.json');
  const title = existsSync(titleFile) ? (await json<{ canonicalName: string }>(titleFile)).canonicalName : revision.projectId.replaceAll('-', ' ');
  const generator = await generatorIdentity();
  const outputs: Output[] = [];
  const generatedFiles: string[] = [];
  for (const [index, style] of (['editorial', 'studio'] as RegenerationStyle[]).entries()) {
    const variant = (index + 1) as 1 | 2;
    const name = `${sourceStem.slice(0, 132)}-regen-${variant}.mp4`;
    const outputFile = path.join(renderDirectory, name);
    const folder = path.join(evidence, style);
    await mkdir(folder, { recursive: true });
    const stage = path.join(folder, 'stage.png');
    const design = await recompositionDesign({ style, sourceDigest: source.digest, title, revision: revision.title,
      primary: brand.primary, accent: brand.accent, fps: original.fps, duration: original.durationSeconds });
    const recipe = { design, brandEvidence: brand.evidence, generator,
      referenceMethods: { repository: 'https://github.com/edenfunf/reelmimic', commit: 'd445b23f404dc6f577b8fdff50255fdbf85d1e97',
        adopted: ['reference appearance measurement', 'explicit versioned design plan', 'render-then-measure comparison', 'same-time before/after evidence'],
        scope: 'Reference recomposition; no Motion Score/CMA-ES or learned critic is used.' } };
    const recipeDigest = digest(recipe);
    const setPath = path.join(folder, 'generation.json');
    const previous = existsSync(setPath) ? await json<{ designDigest: string; outputDigest: string; reviewStatus: string }>(setPath) : null;
    const reusable = previous?.designDigest === recipeDigest && previous.reviewStatus === 'passed'
      && existsSync(outputFile) && await sha256File(outputFile) === previous.outputDigest;
    if (!reusable) {
      if (existsSync(outputFile)) throw new Error(`regeneration_output_conflict: ${outputFile}; existing output/recipe must be reviewed before replacement`);
      await writeJson(path.join(folder, 'plan.json'), recipe);
      await writeRecompositionStage(design, stage);
      const pending = path.join(folder, 'candidate.mp4');
      options.onProgress?.(`${revision.title}: rendering ${style}`);
      await renderRecomposition(input, stage, pending, design);
      const review = await reviewRegeneration(input, pending, folder);
      if (review.status !== 'passed') throw new Error(`regeneration_review_failed: ${folder}`);
      const fingerprint = await fingerprintVideo(pending, original.samples.map((sample) => sample.time));
      const comparison = compareFingerprints(original, fingerprint);
      await writeJson(path.join(folder, 'fingerprint.json'), fingerprint);
      await writeJson(path.join(folder, 'style-comparison.json'), comparison);
      const outputDigest = await sha256File(pending);
      if (outputDigest === source.digest) throw new Error('regeneration_unchanged_video');
      await writeJson(setPath, { schemaVersion: '1.0.0', method: 'reference-recomposition', sourcePath: source.path, sourceDigest: source.digest,
        designDigest: recipeDigest, outputPath: name, outputDigest, recipeDigest: designDigest(design), reviewStatus: review.status,
        editorialReview: 'pending', preserved: ['original source bytes', 'decoded narration audio', 'timing', 'burned captions and source picture'],
        evidence: ['plan.json', 'review.json', 'comparison.jpg', 'fingerprint.json', 'style-comparison.json'] });
      await rename(pending, outputFile);
      generatedFiles.push(outputFile);
    } else options.onProgress?.(`${revision.title}: verified cached ${style}`);
    const info = await stat(outputFile);
    outputs.push({ path: name, role: 'video', digest: await sha256File(outputFile), byteSize: info.size,
      mediaType: 'video/mp4', durationSeconds: source.durationSeconds, width: 1920, height: 1080,
      ...(source.voice ? { voice: source.voice } : {}), ...(source.captions ? { captions: source.captions } : {}),
      ...(source.scenes ? { scenes: source.scenes } : {}), visualRegeneration: { variant, sourcePath: source.path, sourceDigest: source.digest,
        designDigest: recipeDigest, method: 'reference-recomposition', evidencePath: relative(project, folder) } });
  }
  if (outputs[0].digest === outputs[1].digest || outputs[0].visualRegeneration!.designDigest === outputs[1].visualRegeneration!.designDigest)
    throw new Error('regeneration_variants_not_unique');
  if (await sha256File(input) !== source.digest) throw new Error('regeneration_original_changed');
  // Read again so a completed different source in the same revision is retained. Never alter status/source/old records.
  const current = validate('RenderRevision', await json(manifestFile));
  const originalSource = current.outputs.find((output) => output.path === source.path);
  if (!originalSource || digest(originalSource) !== digest(source)) throw new Error('regeneration_manifest_source_changed');
  const keep = current.outputs.filter((output) => output.visualRegeneration?.sourcePath !== source.path);
  await writeJson(manifestFile, validate('RenderRevision', { ...current, outputs: [...keep, ...outputs] }));
  options.onProgress?.(`${revision.title}: original + Editorial + Studio ready (technical checks passed; editorial review pending)`);
  return { projectId: revision.projectId, revision: revision.title, source: source.path, outputs: outputs.map((output) => output.path), generated: generatedFiles.length,
    evidence: relative(project, evidence), editorialReview: 'pending' };
}

export async function regenerateRevisions(rootPath: string, options: RegenerationOptions = {}) {
  const scope = options.scope ?? 'primary';
  if (scope !== 'primary' && scope !== 'all') throw new Error('invalid_regeneration_scope');
  const results = []; const failures: { manifest: string; source?: string; message: string }[] = [];
  for (const project of await projects(path.resolve(rootPath))) {
    for (const entry of (await readdir(path.join(project, 'renders'), { withFileTypes: true })).sort((a, b) => a.name.localeCompare(b.name))) {
      if (!entry.isDirectory() || entry.isSymbolicLink() || options.id && entry.name !== options.id) continue;
      const file = path.join(project, 'renders', entry.name, 'revision.json');
      if (!existsSync(file)) continue;
      const revision = validate('RenderRevision', await json(file));
      for (const source of regenerationSources(revision, scope)) {
        try { results.push(await regenerateSource(project, file, source, options)); }
        catch (error) { const message = error instanceof Error ? error.message : String(error); failures.push({ manifest: file, source: source.path, message }); options.onProgress?.(`FAILED ${revision.title}: ${message}`); }
      }
    }
  }
  if (!results.length && !failures.length) throw new Error('no_matching_regeneration_sources');
  const summary = { schemaVersion: '1.0.0', scope, revisions: new Set(results.map((item) => `${item.projectId}/${item.revision}`)).size,
    sources: results.length, variations: results.length * 2, generated: results.reduce((sum, item) => sum + item.generated, 0), results, failures };
  const out = path.join(path.resolve(rootPath), '.a2swe', 'regenerations', 'batch.json');
  await writeJson(out, summary);
  return summary;
}
