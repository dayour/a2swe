// Artifact audit only: rehash files and validate persisted measurement/lineage bindings.
// This does not decode media, rerun measurements, or grant editorial approval.
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { createReadStream } from 'node:fs';
import { lstat, mkdir, readFile, realpath, rename, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { parseArgs } from 'node:util';
import sharp from 'sharp';
import { canonicalJson, digest } from '../packages/core/src/canonical.ts';
import { validate } from '../packages/core/src/contracts.ts';
import { compareFingerprints } from '../packages/core/src/visual-fingerprint.ts';

const DEFAULT_BASE = 'ebb497dd6bd516f21afadf586a3348442dcf5446';
const { values } = parseArgs({ options: { root: { type: 'string', default: '.' }, base: { type: 'string', default: DEFAULT_BASE },
  out: { type: 'string' }, project: { type: 'string' }, help: { type: 'boolean' } } });
if (values.help) {
  console.log('node scripts/verify-regenerations.mjs --root . [--base REF] [--out REPORT.json] [--project copilot-code]\nArtifact and stored-receipt audit; no media remeasurement. Incomplete runs write a separate .incomplete.json report and exit nonzero.');
  process.exit(0);
}
const root = await realpath(path.resolve(values.root));
const canonicalOutput = path.join(root, 'docs', 'audit', 'regenerations.json');
const output = path.resolve(values.out ?? (values.project ? path.join(root, 'docs', 'audit', `regenerations.${values.project}.json`) : canonicalOutput));
if (values.project && (!/^[a-z0-9][a-z0-9-]*$/.test(values.project) || output === canonicalOutput)) throw new Error('Filtered audits require a valid project ID and a separate report path.');
const git = (...args) => execFileSync('git', args, { cwd: root, encoding: 'utf8', maxBuffer: 32 * 1024 * 1024 });
const base = git('rev-parse', '--verify', '--end-of-options', `${values.base}^{commit}`).trim();
if (git('rev-parse', '--show-object-format').trim() !== 'sha1') throw new Error('Baseline preservation proof currently requires a SHA-1 Git object repository.');
const baseBlobs = new Map(git('ls-tree', '-r', '-z', base, '--', 'projects').split('\0').filter(Boolean).flatMap((entry) => {
  const match = /^\d+ blob ([a-f0-9]{40})\t([\s\S]+)$/.exec(entry);
  return match ? [[match[2], match[1]]] : [];
}));
const allManifests = [...baseBlobs.keys()].filter((file) => /^projects\/[^/]+\/renders\/[^/]+\/revision\.json$/.test(file)).sort();
const manifests = allManifests.filter((file) => !values.project || file.split('/')[1] === values.project);
if (!manifests.length) throw new Error('No immutable baseline revision manifests matched.');
const same = (a, b) => a === undefined || b === undefined ? a === b : canonicalJson(a) === canonicalJson(b);
const hashString = (value) => typeof value === 'string' && /^[a-f0-9]{64}$/.test(value);
const json = async (file) => JSON.parse(await readFile(file, 'utf8'));
const relative = (file) => path.relative(root, file).split(path.sep).join('/');
const within = (parent, file) => { const rel = path.relative(parent, file); return !rel.startsWith(`..${path.sep}`) && rel !== '..' && !path.isAbsolute(rel); };
const errors = [];
const preExistingIntegrityFindings = [];
const rows = [];
const fileCache = new Map();
const generatorVersions = new Map();
const generatorFiles = ['regenerations.ts', 'regeneration-render.ts', 'regeneration-review.ts', 'visual-fingerprint.ts'];
const counts = { baselineRevisions: manifests.length, baselineOutputRecords: 0, originalOutputRecordsHashed: 0,
  originalOutputRecordsGitVerified: 0, originalVideoRecordsGitVerified: 0, preExistingIntegrityFindingCount: 0,
  expectedRegenerations: manifests.length * 2, auditedRegenerations: 0, technicalPassed: 0, pendingEditorialReview: 0 };

async function inspectFile(file) {
  const resolved = path.resolve(file);
  if (!within(root, resolved)) throw new Error(`artifact_outside_root: ${file}`);
  if (fileCache.has(resolved)) return fileCache.get(resolved);
  const before = await lstat(resolved);
  if (!before.isFile() || before.isSymbolicLink() || !within(root, await realpath(resolved))) throw new Error(`regular_workspace_file_required: ${file}`);
  const contentHash = createHash('sha256');
  const blobHash = createHash('sha1').update(`blob ${before.size}\0`);
  for await (const chunk of createReadStream(resolved)) { contentHash.update(chunk); blobHash.update(chunk); }
  const sha256 = contentHash.digest('hex');
  const gitBlobSha1 = blobHash.digest('hex');
  const after = await lstat(resolved);
  if (before.size !== after.size || before.mtimeMs !== after.mtimeMs) throw new Error(`artifact_changed_during_audit: ${file}`);
  const result = { path: relative(resolved), sha256, gitBlobSha1, byteSize: after.size };
  fileCache.set(resolved, result);
  return result;
}

function child(parent, rel) {
  if (typeof rel !== 'string' || !rel || path.isAbsolute(rel) || rel.includes('\\')) throw new Error(`invalid_relative_artifact_path: ${rel}`);
  const file = path.resolve(parent, rel);
  if (!within(parent, file) || file === parent) throw new Error(`artifact_path_escape: ${rel}`);
  return file;
}

for (const manifest of manifests) {
  const baselineText = git('show', `${base}:${manifest}`);
  const baseline = validate('RenderRevision', JSON.parse(baselineText));
  const projectId = manifest.split('/')[1];
  const project = path.join(root, 'projects', projectId);
  const renderDirectory = path.dirname(path.join(root, manifest));
  const row = { projectId, revision: baseline.title, manifest, originalOutputRecords: baseline.outputs.length, sources: [], variants: [], errors: [], status: 'failed' };
  rows.push(row);
  counts.baselineOutputRecords += baseline.outputs.length;
  const expect = (condition, code, message = code) => { if (!condition) row.errors.push({ code, message }); };
  try {
    const current = validate('RenderRevision', await json(path.join(root, manifest)));
    const { outputs: baseOutputs, ...baseMetadata } = baseline;
    const { outputs: currentOutputs, ...currentMetadata } = current;
    expect(same(baseMetadata, currentMetadata), 'revision-metadata-changed', 'Revision fields other than outputs differ from the immutable baseline.');
    const originals = currentOutputs.filter((item) => !item.visualRegeneration);
    expect(same(originals, baseOutputs), 'original-records-changed', 'Original output records, ordering or metadata differ from the immutable baseline.');
    for (const original of baseOutputs) {
      const info = await inspectFile(child(renderDirectory, original.path));
      const baseGitBlobSha1 = baseBlobs.get(info.path);
      const matchesBaselineGitBlob = Boolean(baseGitBlobSha1 && info.gitBlobSha1 === baseGitBlobSha1);
      const declaredDigestMatches = info.sha256 === original.digest && info.byteSize === original.byteSize;
      row.sources.push({ ...info, role: original.role, baseGitBlobSha1: baseGitBlobSha1 ?? null, matchesBaselineGitBlob, declaredDigestMatches });
      counts.originalOutputRecordsHashed++;
      expect(matchesBaselineGitBlob, 'original-bytes-changed', `${original.path}: raw Git blob ${info.gitBlobSha1} differs from immutable baseline ${baseGitBlobSha1 ?? '(file not tracked)'}.`);
      if (matchesBaselineGitBlob) {
        counts.originalOutputRecordsGitVerified++;
        if (original.role === 'video') counts.originalVideoRecordsGitVerified++;
        // Preserve historical records as well as their bytes. A stale declaration that already
        // exists in Git is reported, never repaired or treated as a change introduced by this task.
        if (!declaredDigestMatches) {
          preExistingIntegrityFindings.push({ severity: 'warning', code: 'baseline-declared-digest-mismatch', manifest,
            path: info.path, role: original.role, recordedSha256: original.digest, actualSha256: info.sha256,
            recordedByteSize: original.byteSize, actualByteSize: info.byteSize, baseGitBlobSha1, actualGitBlobSha1: info.gitBlobSha1,
            preservationProof: 'raw-bytes-match-immutable-git-baseline',
            message: 'The immutable baseline output declaration disagrees with its own tracked file. Original bytes and historical metadata remain unchanged.' });
          counts.preExistingIntegrityFindingCount++;
        }
      }
    }
    const primary = baseOutputs.find((item) => item.role === 'video');
    if (!primary) throw new Error('baseline_primary_video_missing');
    const primaryInfo = await inspectFile(child(renderDirectory, primary.path));
    const regenerated = currentOutputs.filter((item) => item.visualRegeneration);
    expect(regenerated.length === 2, 'regeneration-count', `Expected exactly two regenerated outputs, found ${regenerated.length}.`);
    expect(same(regenerated.map((item) => item.visualRegeneration.variant).sort(), [1, 2]), 'variant-identifiers');
    const variantStageHashes = [];
    for (const variant of regenerated) {
      const beforeErrors = row.errors.length;
      try {
        const lineage = variant.visualRegeneration;
        const info = await inspectFile(child(renderDirectory, variant.path));
        counts.auditedRegenerations++;
        const folder = child(project, lineage.evidencePath);
        const evidence = {};
        for (const name of ['generation.json', 'plan.json', 'review.json', 'comparison.jpg', 'stage.png', 'fingerprint.json', 'style-comparison.json']) {
          evidence[name] = await inspectFile(child(folder, name));
        }
        evidence['original-revision.json'] = await inspectFile(path.join(path.dirname(folder), 'original-revision.json'));
        evidence['reference-fingerprint.json'] = await inspectFile(path.join(path.dirname(folder), 'reference-fingerprint.json'));
        const [generation, plan, review, fingerprint, comparison, reference, snapshot] = await Promise.all([
          json(path.join(folder, 'generation.json')), json(path.join(folder, 'plan.json')), json(path.join(folder, 'review.json')),
          json(path.join(folder, 'fingerprint.json')), json(path.join(folder, 'style-comparison.json')),
          json(path.join(path.dirname(folder), 'reference-fingerprint.json')), json(path.join(path.dirname(folder), 'original-revision.json'))
        ]);
        expect(same(snapshot, baseline), 'original-snapshot-changed', variant.path);
        expect(lineage.method === 'reference-recomposition' && generation.method === lineage.method && plan.design?.method === lineage.method, 'generation-method');
        expect(lineage.sourcePath === primary.path && lineage.sourceDigest === primary.digest && generation.sourcePath === primary.path
          && generation.sourceDigest === primary.digest && plan.design?.sourceDigest === primary.digest, 'source-lineage');
        expect(variant.role === 'video' && variant.mediaType === 'video/mp4' && info.sha256 === variant.digest && info.byteSize === variant.byteSize
          && generation.outputDigest === variant.digest && generation.outputPath === variant.path, 'output-digest-size');
        expect(variant.width === 1920 && variant.height === 1080, 'output-dimensions');
        expect(variant.durationSeconds === primary.durationSeconds && same(variant.voice, primary.voice)
          && same(variant.scenes, primary.scenes) && variant.captions === primary.captions, 'historical-content-metadata');
        if (variant.captions) {
          const caption = baseOutputs.find((item) => item.path === variant.captions && item.role === 'captions');
          expect(Boolean(caption), 'caption-record-binding');
          if (caption) {
            evidence.captions = await inspectFile(child(renderDirectory, variant.captions));
            expect(evidence.captions.sha256 === caption.digest && evidence.captions.byteSize === caption.byteSize, 'caption-bytes-binding');
          }
        }
        expect(lineage.designDigest === digest(plan) && generation.designDigest === lineage.designDigest
          && generation.recipeDigest === digest(plan.design), 'design-recipe-binding');
        expect(plan.design?.revision === baseline.title && plan.design?.style === (lineage.variant === 1 ? 'editorial' : 'studio'), 'design-identity');
        expect(same(plan.design?.preservation, { originalPicture: 'contained-without-crop', audio: 'codec-copy', timing: 'unchanged' }), 'preservation-plan');
        expect(same(Object.keys(plan.generator ?? {}).sort(), generatorFiles.slice().sort()), 'generator-file-set');
        const generatorProvenance = {};
        for (const generator of generatorFiles) {
          const recordedSha256 = plan.generator?.[generator];
          expect(hashString(recordedSha256), 'generator-recorded-digest', generator);
          if (!hashString(recordedSha256)) continue;
          const currentIdentity = await inspectFile(path.join(root, 'packages/core/src', generator));
          const basis = currentIdentity.sha256 === recordedSha256 ? 'current' : 'archived';
          let identity = basis === 'current' ? currentIdentity : undefined;
          if (!identity) {
            for (const archivedFile of [
              path.join(root, 'library/integrations/regeneration-runtime/sources', recordedSha256, generator),
              path.join(project, 'qc/regenerations/runtime', recordedSha256, generator)
            ]) {
              const archived = await inspectFile(archivedFile).catch((error) => {
                if (error.code === 'ENOENT') return undefined;
                throw error;
              });
              if (archived?.sha256 === recordedSha256) { identity = archived; break; }
            }
          }
          if (!identity) throw new Error(`recorded_generator_source_unavailable: ${generator}:${recordedSha256}`);
          expect(recordedSha256 === identity.sha256, 'generator-source-binding', generator);
          generatorProvenance[generator] = { basis, ...identity };
          generatorVersions.set(`${generator}:${recordedSha256}`, { filename: generator, recordedSha256, basis, ...identity });
        }
        const font = await inspectFile(path.join(root, 'template/public/fonts/NotoSansSC.ttf'));
        expect(plan.design?.engine?.fontDigest === font.sha256, 'font-binding');
        if (plan.brandEvidence?.basis === 'installed-project-theme') {
          evidence.brandTheme = await inspectFile(child(project, plan.brandEvidence.path));
          expect(evidence.brandTheme.sha256 === plan.brandEvidence.sha256, 'brand-evidence-binding');
        }
        expect(plan.referenceMethods?.commit === 'd445b23f404dc6f577b8fdff50255fdbf85d1e97', 'reference-method-commit');
        expect(generation.reviewStatus === 'passed' && review.status === 'passed', 'technical-review-status');
        expect(generation.editorialReview === 'pending' && review.editorialReview === 'pending', 'editorial-review-must-remain-pending');
        if (generation.editorialReview === 'pending' && review.editorialReview === 'pending') counts.pendingEditorialReview++;
        expect(review.source?.sha256 === primaryInfo.sha256 && review.source?.byteSize === primaryInfo.byteSize
          && review.variant?.sha256 === info.sha256 && review.variant?.byteSize === info.byteSize, 'review-media-binding');
        expect(review.method === 'independent-local-media-comparison' && review.schemaVersion === '1.0.0', 'review-method');
        expect(review.audio?.encoding === 'pcm_f32le' && hashString(review.audio?.sourceDecodedSha256)
          && review.audio.sourceDecodedSha256 === review.audio.variantDecodedSha256, 'stored-decoded-audio-parity');
        const sourceProbe = review.source?.probe;
        const candidateProbe = review.variant?.probe;
        expect(sourceProbe?.audio?.sampleRate > 0 && same(sourceProbe.audio, candidateProbe?.audio), 'audio-probe-parity');
        const tolerance = Math.max(1 / sourceProbe?.video?.fps, 0.05);
        expect(Number.isFinite(tolerance) && Math.abs(sourceProbe.durationSeconds - candidateProbe?.durationSeconds) <= tolerance + 1e-6
          && Math.abs(sourceProbe.video.fps - candidateProbe?.video?.fps) <= 0.001
          && candidateProbe.video.width === 1920 && candidateProbe.video.height === 1080, 'stored-probe-parity');
        expect(review.thresholds?.durationToleranceSeconds <= tolerance + 1e-6 && review.thresholds?.frameRateTolerance === 0.001
          && review.thresholds?.maxNewInteriorBlackSeconds === 0.5 && review.thresholds?.minMeanPixelDifference === 1, 'measurement-thresholds');
        if (sourceProbe?.video?.frameCount !== null && candidateProbe?.video?.frameCount !== null) {
          expect(sourceProbe?.video?.frameCount === candidateProbe?.video?.frameCount, 'stored-frame-count-parity');
        }
        expect(['audioParity', 'durationParity', 'frameRateParity', 'resolution', 'visualChanged', 'newInteriorBlack']
          .every((check) => review.checks?.[check] === true) && review.checks?.frameCountParity !== false, 'stored-checks');
        expect(Array.isArray(review.findings) && !review.findings.some((finding) => finding.severity === 'error')
          && Array.isArray(review.blackSegments?.newInterior) && review.blackSegments.newInterior.length === 0, 'stored-findings');
        expect(Array.isArray(review.frames) && review.frames.length >= 1 && review.frames.length <= 6
          && review.frames.every((frame) => hashString(frame.sourcePngSha256) && hashString(frame.variantPngSha256)
            && Number.isFinite(frame.timeSeconds) && frame.timeSeconds >= 0 && frame.timeSeconds < sourceProbe.durationSeconds
            && Number.isFinite(frame.meanPixelDifference) && frame.meanPixelDifference >= 0)
          && review.frames.reduce((sum, frame) => sum + frame.meanPixelDifference, 0) / review.frames.length >= 1, 'equal-time-frame-evidence');
        expect(review.evidence?.comparison?.path === 'comparison.jpg'
          && review.evidence.comparison.sha256 === evidence['comparison.jpg'].sha256, 'comparison-image-binding');
        expect(reference.input?.sha256 === primary.digest && reference.input?.bytes === primaryInfo.byteSize
          && fingerprint.input?.sha256 === variant.digest && fingerprint.input?.bytes === info.byteSize, 'fingerprint-media-binding');
        expect(fingerprint.width === 1920 && fingerprint.height === 1080 && fingerprint.fps === reference.fps
          && Math.abs(fingerprint.durationSeconds - reference.durationSeconds) <= tolerance + 1e-6
          && same(reference.samples.map((sample) => sample.time), fingerprint.samples.map((sample) => sample.time)), 'fingerprint-sampling-binding');
        expect(same(compareFingerprints(reference, fingerprint), comparison), 'style-comparison-derived-data');
        expect(same(generation.evidence, ['plan.json', 'review.json', 'comparison.jpg', 'fingerprint.json', 'style-comparison.json']), 'generation-evidence-list');
        const [stageImage, contactSheet] = await Promise.all([sharp(path.join(folder, 'stage.png')).metadata(), sharp(path.join(folder, 'comparison.jpg')).metadata()]);
        expect(stageImage.width === 1920 && stageImage.height === 1080 && contactSheet.width === 1008
          && contactSheet.height === Math.max(128, 48 + review.frames.length * 294), 'evidence-image-dimensions');
        variantStageHashes.push(evidence['stage.png'].sha256);
        if (row.errors.length === beforeErrors) counts.technicalPassed++;
        row.variants.push({ variant: lineage.variant, output: info, designDigest: lineage.designDigest, style: plan.design.style,
          recordedTechnicalStatus: review.status, editorialReview: review.editorialReview, recordedDecodedAudioSha256: review.audio.sourceDecodedSha256,
          generatorProvenance, evidence, status: row.errors.length === beforeErrors ? 'passed' : 'failed' });
      } catch (error) {
        row.errors.push({ code: 'variant-artifact-incomplete', message: `${variant.path}: ${error.message}` });
      }
    }
    expect(regenerated.length === 2 && new Set(regenerated.map((item) => item.digest)).size === 2
      && regenerated.every((item) => item.digest !== primary.digest), 'distinct-videos');
    expect(regenerated.length === 2 && new Set(regenerated.map((item) => item.visualRegeneration.designDigest)).size === 2, 'distinct-designs');
    expect(variantStageHashes.length === 2 && new Set(variantStageHashes).size === 2, 'distinct-stage-images');
  } catch (error) { row.errors.push({ code: 'revision-artifact-incomplete', message: error.message }); }
  row.status = row.errors.length ? 'failed' : 'passed';
  errors.push(...row.errors.map((error) => ({ manifest, ...error })));
}

const complete = errors.length === 0 && counts.originalOutputRecordsGitVerified === counts.baselineOutputRecords
  && counts.auditedRegenerations === counts.expectedRegenerations
  && counts.technicalPassed === counts.expectedRegenerations;
const report = {
  schemaVersion: '1.0.0', auditedAt: new Date().toISOString(), method: 'immutable-baseline-regeneration-artifact-audit', baseCommit: base,
  scope: values.project ? { project: values.project, completeArchive: false } : { completeArchive: manifests.length === allManifests.length },
  status: complete ? 'passed' : 'incomplete', ...counts, checkedFiles: fileCache.size,
  generatorSourceVersions: [...generatorVersions.values()].sort((a, b) => a.filename.localeCompare(b.filename) || a.recordedSha256.localeCompare(b.recordedSha256)),
  projectCoverage: [...new Set(rows.map((row) => row.projectId))].sort().map((projectId) => {
    const revisions = rows.filter((row) => row.projectId === projectId);
    return { projectId, expectedRevisions: revisions.length, passedRevisions: revisions.filter((row) => row.status === 'passed').length,
      revisions: revisions.map((row) => row.revision) };
  }),
  technicalStatus: complete ? 'rehashed-artifacts-and-bound-stored-checks-passed' : 'incomplete-or-failed-bindings', editorialReview: 'pending',
  limitations: [
    'Artifact audit only: media bytes are rehashed, but decoded audio, frame extraction, black detection and probes are not remeasured.',
    'Every original output is proven byte-identical to its immutable Git blob without text filters. Baseline declarations already inconsistent with those same bytes are warnings, not waived byte changes.',
    'Decoded-audio parity is verified from stored equal hashes in review receipts bound to the rehashed source and variant MP4 bytes.',
    'This report seals current stage, plan, fingerprint, comparison, generation and review evidence digests; available internal bindings are checked.',
    'Recorded generator source versions match current source or hash-verified global/project archived copies. Archived sources are read as provenance data and are not executed.',
    'Similarity is descriptive, not an aesthetic score. Technical passage does not approve editorial quality, readability or whole-film playback.'
  ], revisions: rows, preExistingIntegrityFindings, errors
};
const destination = complete ? output : output.replace(/(?:\.json)?$/, '.incomplete.json');
await mkdir(path.dirname(destination), { recursive: true });
await writeFile(`${destination}.tmp`, `${JSON.stringify(report, null, 2)}\n`);
await rename(`${destination}.tmp`, destination);
console.log(JSON.stringify({ status: report.status, baseCommit: base, ...counts, checkedFiles: fileCache.size, errors: errors.length, report: destination }));
if (!complete) process.exitCode = 1;
