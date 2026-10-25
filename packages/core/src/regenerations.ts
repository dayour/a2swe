import { existsSync, readFileSync } from 'node:fs';
import { lstat, mkdir, readFile, readdir, rename, stat, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { digest, sha256, sha256File } from './canonical.ts';
import { validate } from './contracts.ts';
import type { RenderRevision, RenderTheme } from './contracts.ts';
import { fingerprintVideo, compareFingerprints } from './visual-fingerprint.ts';
import type { VisualFingerprint } from './visual-fingerprint.ts';
import { reviewRegeneration } from './regeneration-review.ts';
import type { RegenerationReview } from './regeneration-review.ts';
import { designDigest, recompositionDesign, renderRecomposition, writeRecompositionStage } from './regeneration-render.ts';
import type { RegenerationStyle } from './regeneration-render.ts';

type Output = RenderRevision['outputs'][number];
export interface RegenerationOptions { id?: string; scope?: 'primary' | 'all'; onProgress?: (message: string) => void }
const ROOT = fileURLToPath(new URL('../../../', import.meta.url));
// Long-running processes keep the source identity captured when this module was
// loaded. Later disk edits must not be attributed to already-loaded generators.
const GENERATOR_SOURCES = ['regenerations.ts', 'regeneration-render.ts', 'regeneration-review.ts', 'visual-fingerprint.ts']
  .map(file => ({ file, bytes: readFileSync(path.join(ROOT, 'packages/core/src', file)) }));
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

async function generatorIdentity(project: string) {
  return Object.fromEntries(await Promise.all(GENERATOR_SOURCES.map(async ({ file, bytes }) => {
    const sha = sha256(bytes);
    const archived = path.join(project, 'qc', 'regenerations', 'runtime', sha, file);
    await mkdir(path.dirname(archived), { recursive: true });
    try { await writeFile(archived, bytes, { flag: 'wx', mode: 0o600 }); }
    catch (error) { if ((error as NodeJS.ErrnoException).code !== 'EEXIST') throw error; }
    if (await sha256File(archived) !== sha) throw new Error(`regeneration_runtime_archive_changed: ${file}`);
    return [file, sha];
  })));
}

const CACHE_EVIDENCE = ['plan.json', 'review.json', 'comparison.jpg', 'fingerprint.json', 'style-comparison.json'] as const;
interface GenerationReceipt {
  schemaVersion: string; method: string; sourcePath: string; sourceDigest: string;
  outputPath: string; outputDigest: string; designDigest: string; recipeDigest: string; reviewStatus: string;
  evidence: string[]; evidenceDigests?: Record<string, string>;
}

function cacheEvidenceFiles(folder: string) {
  return [...CACHE_EVIDENCE.map(name => [name, path.join(folder, name)] as const),
    ['reference-fingerprint.json', path.join(path.dirname(folder), 'reference-fingerprint.json')] as const];
}

async function cachedJson<Value>(file: string): Promise<Value> {
  try { return await json<Value>(file); }
  catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') throw new Error(`regeneration_cached_evidence_missing: ${path.basename(file)}`);
    throw new Error(`regeneration_cached_evidence_invalid: ${path.basename(file)}`);
  }
}

async function cachedHash(file: string): Promise<string> {
  try { return await sha256File(file); }
  catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') throw new Error(`regeneration_cached_evidence_missing: ${path.basename(file)}`);
    throw error;
  }
}

/** Both completed and interrupted runs must retain the same verifiable evidence. */
async function verifyCachedRegeneration(project: string, renderDirectory: string, source: Output, output: Output): Promise<void> {
  const provenance = output.visualRegeneration;
  if (!provenance?.evidencePath) throw new Error('regeneration_cached_evidence_missing: evidencePath');
  const folder = path.join(project, provenance.evidencePath);
  const [receipt, plan, review, reference, variant, comparison] = await Promise.all([
    cachedJson<GenerationReceipt>(path.join(folder, 'generation.json')),
    cachedJson<{ design?: { sourceDigest?: string; method?: string; style?: string } }>(path.join(folder, 'plan.json')),
    cachedJson<RegenerationReview>(path.join(folder, 'review.json')),
    cachedJson<VisualFingerprint>(path.join(path.dirname(folder), 'reference-fingerprint.json')),
    cachedJson<VisualFingerprint>(path.join(folder, 'fingerprint.json')),
    cachedJson<unknown>(path.join(folder, 'style-comparison.json'))
  ]);
  const changed = (part: string): never => { throw new Error(`regeneration_cached_evidence_changed: ${part}`); };
  const outputFile = path.join(renderDirectory, output.path);
  const [sourceInfo, outputInfo, outputDigest] = await Promise.all([
    stat(path.join(renderDirectory, source.path)), stat(outputFile), cachedHash(outputFile)
  ]);
  if (outputDigest !== output.digest || outputInfo.size !== output.byteSize || sourceInfo.size !== source.byteSize) changed('media');
  const planDigest = digest(plan);
  if (receipt?.schemaVersion !== '1.0.0' || receipt.method !== 'reference-recomposition'
    || receipt.sourcePath !== source.path || receipt.sourceDigest !== source.digest
    || receipt.outputPath !== output.path || receipt.outputDigest !== output.digest
    || receipt.designDigest !== planDigest || receipt.designDigest !== provenance.designDigest
    || !plan?.design || plan.design.sourceDigest !== source.digest || plan.design.method !== 'reference-recomposition'
    || plan.design.style !== (provenance.variant === 1 ? 'editorial' : 'studio')
    || receipt.recipeDigest !== digest(plan.design) || receipt.reviewStatus !== 'passed' || !Array.isArray(receipt.evidence)
    || digest(receipt.evidence) !== digest(CACHE_EVIDENCE)) changed('generation receipt or plan');
  const checks = review?.checks;
  const requiredChecks = ['audioParity', 'durationParity', 'frameRateParity', 'resolution', 'visualChanged', 'newInteriorBlack'] as const;
  if (review?.schemaVersion !== '1.0.0' || review.method !== 'independent-local-media-comparison' || review.status !== 'passed'
    || review.source?.sha256 !== source.digest || review.variant?.sha256 !== output.digest
    || review.source.byteSize !== source.byteSize || review.variant.byteSize !== output.byteSize
    || !checks || requiredChecks.some(check => checks[check] !== true)
    || ![true, null].includes(checks.frameCountParity)
    || !Array.isArray(review.findings) || review.findings.some(finding => finding.severity === 'error')
    || review.audio?.encoding !== 'pcm_f32le'
    || !/^[a-f0-9]{64}$/.test(review.audio.sourceDecodedSha256 ?? '')
    || review.audio.sourceDecodedSha256 !== review.audio.variantDecodedSha256) changed('technical review');
  if (review.evidence?.comparison?.path !== 'comparison.jpg'
    || review.evidence.comparison.sha256 !== await cachedHash(path.join(folder, 'comparison.jpg'))) changed('comparison image');
  if (reference?.schemaVersion !== '1.0.0' || variant?.schemaVersion !== '1.0.0'
    || reference.input?.sha256 !== source.digest || reference.input.bytes !== source.byteSize
    || variant.input?.sha256 !== output.digest || variant.input.bytes !== output.byteSize
    || reference.width !== review.source.probe?.video?.width || reference.height !== review.source.probe?.video?.height
    || variant.width !== review.variant.probe?.video?.width || variant.height !== review.variant.probe?.video?.height) changed('fingerprint inputs');
  try {
    if (digest(compareFingerprints(reference, variant)) !== digest(comparison)) changed('style comparison');
  } catch (error) {
    if (error instanceof Error && error.message.startsWith('regeneration_cached_')) throw error;
    changed('fingerprint measurements');
  }
  // The original archive receipts predate evidenceDigests. Their explicit
  // cross-checks above remain supported; new receipts also bind exact file bytes.
  if (receipt.evidenceDigests !== undefined) {
    for (const [name, file] of cacheEvidenceFiles(folder)) {
      if (receipt.evidenceDigests?.[name] !== await cachedHash(file)) changed(`evidence digest: ${name}`);
    }
  }
}

async function regenerateSource(project: string, manifestFile: string, source: Output, options: RegenerationOptions) {
  const revision = validate('RenderRevision', await json(manifestFile));
  const renderDirectory = path.dirname(manifestFile);
  const input = path.join(renderDirectory, source.path);
  if (!(await lstat(input)).isFile() || (await lstat(input)).isSymbolicLink()) throw new Error(`regeneration_source_not_file: ${input}`);
  if (await sha256File(input) !== source.digest) throw new Error(`regeneration_source_digest_mismatch: ${input}`);
  const retained = revision.outputs.filter((output) => output.visualRegeneration?.sourcePath === source.path);
  if (retained.length === 2) {
    for (const output of retained) await verifyCachedRegeneration(project, renderDirectory, source, output);
    options.onProgress?.(`${revision.title}: verified original + two retained variations`);
    return { projectId: revision.projectId, revision: revision.title, source: source.path, outputs: retained.map((output) => output.path), generated: 0,
      evidence: relative(project, path.dirname(path.join(project, retained[0].visualRegeneration!.evidencePath!))), editorialReview: 'pending' };
  }
  const sourceStem = path.parse(source.path).name;
  // Keep external FFmpeg paths short on Windows; source names remain in the plan and manifest.
  const key = `${sha256(source.path).slice(0, 12)}-${source.digest.slice(0, 12)}`;
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
  const generator = await generatorIdentity(project);
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
    const reusable = previous?.designDigest === recipeDigest && existsSync(outputFile);
    if (reusable) {
      await verifyCachedRegeneration(project, renderDirectory, source, {
        path: name, role: 'video', digest: previous.outputDigest, byteSize: (await stat(outputFile)).size, mediaType: 'video/mp4',
        visualRegeneration: { variant, sourcePath: source.path, sourceDigest: source.digest, designDigest: recipeDigest,
          method: 'reference-recomposition', evidencePath: relative(project, folder) }
      });
    }
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
      const evidenceDigests = Object.fromEntries(await Promise.all(cacheEvidenceFiles(folder).map(async ([name, file]) => [name, await sha256File(file)])));
      await writeJson(setPath, { schemaVersion: '1.0.0', method: 'reference-recomposition', sourcePath: source.path, sourceDigest: source.digest,
        designDigest: recipeDigest, outputPath: name, outputDigest, recipeDigest: designDigest(design), reviewStatus: review.status,
        editorialReview: 'pending', preserved: ['original source bytes', 'decoded narration audio', 'timing', 'burned captions and source picture'],
        evidence: CACHE_EVIDENCE, evidenceDigests });
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
