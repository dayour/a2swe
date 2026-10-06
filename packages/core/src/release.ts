import { mkdir, readFile, readdir, rename, rm, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { digest, sha256 } from './canonical.ts';
import { validate, validateContentAgainstDomain } from './contracts.ts';
import type { ApprovalManifest, AssetInventory, ContentIR, FormatParityManifest, ReleasePlan, RenderSpec } from './contracts.ts';
import { renderFiles } from './adapters.ts';
import type { AdapterAssetEmbed, AdapterFile, AdapterVisualImage } from './adapters.ts';
import { readRasterFile, verifyAssetBundle } from './assets.ts';
import { renderEncodedMp4, renderVisualStills, verifyEncodedMp4, visualStem } from './media-remotion.ts';

function styleDigest(spec: RenderSpec): string {
  return digest(spec.theme);
}

function voiceDigest(content: ContentIR): string {
  return digest(content.voice);
}

export async function indexProjectQc(directory: string) {
  const project = path.resolve(directory);
  const qc = path.join(project, 'qc');
  await mkdir(qc, { recursive: true });
  const entries: { path: string; digest: string; byteSize: number }[] = [];
  for (const folder of [qc, path.join(project, 'release', 'outputs', 'remotion', 'qc')]) {
    if (!existsSync(folder)) continue;
    for (const entry of await readdir(folder, { recursive: true, withFileTypes: true })) {
      if (!entry.isFile()) continue;
      const filename = path.join(entry.parentPath, entry.name);
      const relative = path.relative(project, filename).split(path.sep).join('/');
      if (relative === 'qc/index.json' || relative.startsWith('qc/revisions/') || relative.endsWith('.tmp') || relative.split('/').some((part) => part.startsWith('.'))) continue;
      const bytes = await readFile(filename);
      entries.push({ path: relative, digest: sha256(bytes), byteSize: bytes.length });
    }
  }
  const index = { schemaVersion: '1.0.0', projectId: path.basename(project),
    status: 'indexed_not_quality_approved', excludedRoots: ['qc/revisions/'],
    entries: entries.sort((a, b) => a.path.localeCompare(b.path)) };
  const staging = path.join(qc, 'index.json.tmp');
  await writeFile(staging, `${JSON.stringify(index, null, 2)}\n`);
  await rename(staging, path.join(qc, 'index.json'));
  return index;
}

export function createReleasePlan(contentInput: unknown, renderInput: unknown, approvalInput: unknown): ReleasePlan {
  const content = validate('ContentIR', contentInput);
  const renderSpec = validate('RenderSpec', renderInput);
  const approval = validate('ApprovalManifest', approvalInput);
  const contentDigest = digest(content);
  const renderSpecDigest = digest(renderSpec);
  const approvalDigest = digest(approval);
  if (renderSpec.contentDigest !== contentDigest || approval.contentDigest !== contentDigest || approval.domainDigest !== content.domainDigest) {
    throw new Error('release_input_digest_mismatch');
  }
  const draft = { schemaVersion: '1.0.0' as const, contentDigest, renderSpecDigest, approvalDigest,
    domainDigest: content.domainDigest, styleDigest: styleDigest(renderSpec), voiceDigest: voiceDigest(content), formats: renderSpec.formats };
  return validate('ReleasePlan', { ...draft, releaseDigest: digest(draft) });
}

function requireAssetApprovals(content: ContentIR, approval: ApprovalManifest): void {
  const records = new Map(approval.selectedAssets.map((asset) => [asset.assetId, asset]));
  if (records.size !== content.assets.length) throw new Error('asset_approval_scope_mismatch');
  for (const asset of content.assets) {
    const record = records.get(asset.assetId);
    if (!record || record.assetDigest !== asset.digest) throw new Error('asset_approval_missing');
    if (record.status === 'rejected') throw new Error('asset_approval_rejected');
  }
}

async function writeJson(filename: string, value: unknown): Promise<void> {
  await writeFile(filename, `${JSON.stringify(value, null, 2)}\n`, { flag: 'wx', mode: 0o600 });
}


function destination(root: string, relative: string): string {
  const resolved = path.resolve(root, ...relative.split('/'));
  const base = path.resolve(root);
  if (resolved !== base && !resolved.startsWith(`${base}${path.sep}`)) throw new Error('unsafe_release_path');
  return resolved;
}

async function loadAssetBundles(content: ContentIR, directory: string): Promise<AdapterAssetEmbed[]> {
  const embeds: AdapterAssetEmbed[] = [];
  for (const asset of content.assets) {
    const bundle = path.join(path.resolve(directory), asset.assetId);
    const record = await verifyAssetBundle(bundle);
    if (record.assetId !== asset.assetId || record.domainDigest !== content.domainDigest
      || record.artifact.digest !== asset.digest || record.artifact.mediaType !== asset.mediaType
      || record.alt !== asset.alt || record.role !== asset.role) throw new Error(`release_asset_record_mismatch: ${asset.assetId}`);
    if (record.artifact.mediaType !== 'image/png') throw new Error(`unsupported_release_asset: ${asset.assetId}`);
    embeds.push({ assetId: asset.assetId, mediaType: 'image/png', bytes: await readRasterFile(path.join(bundle, 'asset.png')) });
  }
  return embeds;
}

async function writeAssetInputs(root: string, embeds: AdapterAssetEmbed[]): Promise<void> {
  if (!embeds.length) return;
  await mkdir(path.join(root, 'asset-inputs'));
  for (const embed of embeds) {
    await writeFile(path.join(root, 'asset-inputs', `${embed.assetId}.png`), embed.bytes, { flag: 'wx', mode: 0o600 });
  }
}

function assetInventory(content: ContentIR, embeds: AdapterAssetEmbed[], stills: AdapterFile[]): AssetInventory {
  const selected = new Map(embeds.map((embed) => [embed.assetId, embed]));
  const generated = new Map(stills.map((still) => [still.path, still]));
  return validate('AssetInventory', {
    schemaVersion: '1.0.0',
    contentDigest: digest(content),
    entries: [
      ...content.assets.map((asset) => {
        const embed = selected.get(asset.assetId);
        if (!embed) throw new Error(`release_asset_missing: ${asset.assetId}`);
        return { assetId: asset.assetId, kind: 'selected', role: asset.role, sectionId: null,
          path: `asset-inputs/${asset.assetId}.png`, digest: sha256(embed.bytes), sourceDigest: asset.digest };
      }),
      ...content.sections.filter((section) => section.visual && generated.has(
        `outputs/remotion/visuals/${visualStem(content, section.sectionId)}.png`)).map((section) => {
        const path = `outputs/remotion/visuals/${visualStem(content, section.sectionId)}.png`;
        const still = generated.get(path);
        if (!still || !section.visual) throw new Error(`release_visual_missing: ${section.sectionId}`);
        return { assetId: section.sectionId, kind: 'generated_visual', role: 'diagram', sectionId: section.sectionId,
          path, digest: sha256(still.bytes), sourceDigest: digest(section.visual) };
      })
    ]
  });
}


export async function writeRelease(directory: string, contentInput: unknown, renderInput: unknown, approvalInput: unknown,
  domainInput: unknown, assetBundlesDirectory?: string): Promise<FormatParityManifest> {
  const { content, domain } = validateContentAgainstDomain(contentInput, domainInput);
  const renderSpec = validate('RenderSpec', renderInput);
  const approval = validate('ApprovalManifest', approvalInput);
  const plan = createReleasePlan(content, renderSpec, approval);
  requireAssetApprovals(content, approval);
  if (content.assets.length && !assetBundlesDirectory) throw new Error('release_asset_bundles_required');
  const embeds = assetBundlesDirectory ? await loadAssetBundles(content, assetBundlesDirectory) : [];
  const options = { assetEmbeds: embeds, strictAssetEmbeds: true };
  let files = renderFiles(content, renderSpec, options);
  const root = path.resolve(directory);
  await mkdir(root, { recursive: false, mode: 0o700 });
  try {
    await writeAssetInputs(root, embeds);
    const writeAll = async (list: AdapterFile[]) => {
      for (const file of list) {
        const target = destination(root, file.path);
        if (existsSync(target)) continue;
        await mkdir(path.dirname(target), { recursive: true });
        await writeFile(target, file.bytes, { flag: 'wx', mode: 0o600 });
      }
    };
    let stills: AdapterFile[] = [];
    const visualSections = content.sections.filter((section) => section.visual);
    if (renderSpec.formats.includes('remotion') && visualSections.length) {
      await writeAll(files.filter((file) => file.format === 'remotion'));
      stills = await renderVisualStills(root, content);
      const visualImages: AdapterVisualImage[] = visualSections.map((section, index) => ({ sectionId: section.sectionId, bytes: stills[index].bytes }));
      files = renderFiles(content, renderSpec, { ...options, visualImages });
    }
    await writeAll(files);
    if (renderSpec.formats.includes('remotion')) {
      const media = await renderEncodedMp4(root, content);
      const replacements = new Map(media.map((file) => [file.path, file]));
      files = [...files.map((file) => replacements.get(file.path) ?? file), ...stills,
        ...media.filter((file) => !files.some((existing) => existing.path === file.path))];
    }
    const inventory = assetInventory(content, embeds, stills);
    const parity = validate('FormatParityManifest', { schemaVersion: '1.0.0', contentDigest: plan.contentDigest,
      renderSpecDigest: plan.renderSpecDigest, releaseDigest: plan.releaseDigest, assetInventoryDigest: digest(inventory),
      outputs: files.map((file) => ({ format: file.format, path: file.path, digest: sha256(file.bytes), mediaType: file.mediaType,
        byteSize: file.bytes.length, contentDigest: plan.contentDigest, adapter: file.adapter })) });
    await writeJson(path.join(root, 'content-ir.json'), content);
    await writeJson(path.join(root, 'domain-pack.json'), domain);
    await writeJson(path.join(root, 'render-spec.json'), renderSpec);
    await writeJson(path.join(root, 'approval-manifest.json'), approval);
    await writeJson(path.join(root, 'release-plan.json'), plan);
    await writeJson(path.join(root, 'asset-inventory.json'), inventory);
    await writeJson(path.join(root, 'parity-manifest.json'), parity);
    if (existsSync(path.join(path.dirname(root), 'canonical', 'domain-pack.json'))) {
      await indexProjectQc(path.dirname(root));
    }
    return parity;
  } catch (error) {
    await rm(root, { recursive: true, force: true });
    throw error;
  }
}

// Planned by the adapter, then rewritten by the media render with measured durations and digests.
export const MUTABLE_MEDIA_PATHS: readonly string[] = ['outputs/remotion/render-plan.json', 'outputs/remotion/timeline.json',
  'outputs/remotion/asset-manifest.json'];

export async function verifyRelease(directory: string, options: { probeMedia?: boolean } = {}): Promise<FormatParityManifest> {
  const root = path.resolve(directory);
  const content = validate('ContentIR', JSON.parse(await readFile(path.join(root, 'content-ir.json'), 'utf8')));
  const domain = validate('DomainPack', JSON.parse(await readFile(path.join(root, 'domain-pack.json'), 'utf8')));
  validateContentAgainstDomain(content, domain);
  const renderSpec = validate('RenderSpec', JSON.parse(await readFile(path.join(root, 'render-spec.json'), 'utf8')));
  const approval = validate('ApprovalManifest', JSON.parse(await readFile(path.join(root, 'approval-manifest.json'), 'utf8')));
  const plan = validate('ReleasePlan', JSON.parse(await readFile(path.join(root, 'release-plan.json'), 'utf8')));
  const parity = validate('FormatParityManifest', JSON.parse(await readFile(path.join(root, 'parity-manifest.json'), 'utf8')));
  const inventory = validate('AssetInventory', JSON.parse(await readFile(path.join(root, 'asset-inventory.json'), 'utf8')));
  const expected = createReleasePlan(content, renderSpec, approval);
  if (digest(plan) !== digest(expected) || parity.releaseDigest !== plan.releaseDigest || parity.contentDigest !== digest(content)
    || parity.assetInventoryDigest !== digest(inventory)) throw new Error('release_manifest_mismatch');
  requireAssetApprovals(content, approval);
  const embeds: AdapterAssetEmbed[] = [];
  for (const asset of content.assets) {
    const bytes = await readRasterFile(destination(root, `asset-inputs/${asset.assetId}.png`));
    if (asset.mediaType !== 'image/png' || sha256(bytes) !== asset.digest) throw new Error(`release_asset_input_mismatch: ${asset.assetId}`);
    embeds.push({ assetId: asset.assetId, mediaType: 'image/png', bytes });
  }
  const visualSections = content.sections.filter((section) => section.visual);
  const visualPaths = visualSections.map((section) => `outputs/remotion/visuals/${visualStem(content, section.sectionId)}.png`);
  const visualImages: AdapterVisualImage[] = [];
  const stills: AdapterFile[] = [];
  if (renderSpec.formats.includes('remotion')) {
    for (const [index, section] of visualSections.entries()) {
      const bytes = await readFile(destination(root, visualPaths[index]));
      visualImages.push({ sectionId: section.sectionId, bytes });
      stills.push({ format: 'remotion', path: visualPaths[index], bytes, mediaType: 'image/png', adapter: '' });
    }
  }
  if (digest(inventory) !== digest(assetInventory(content, embeds, stills))
    || inventory.entries.length !== embeds.length + stills.length) throw new Error('release_asset_inventory_mismatch');
  const expectedFiles = renderFiles(content, renderSpec, { assetEmbeds: embeds, strictAssetEmbeds: true, visualImages });
  const mutableMediaPaths = new Set(MUTABLE_MEDIA_PATHS);
  const producedMedia = renderSpec.formats.includes('remotion') ? [
    ...visualPaths.map((visualPath) => ({ path: visualPath, mediaType: 'image/png' })),
    { path: `outputs/remotion/public/assets/${content.contentId}/audio.wav`, mediaType: 'audio/wav' },
    { path: 'outputs/remotion/audio/narration-metadata.json', mediaType: 'application/json' },
    { path: 'outputs/remotion/dist/render.mp4', mediaType: 'video/mp4' },
    { path: 'outputs/remotion/qc/render-receipt.json', mediaType: 'application/json' },
    { path: 'outputs/remotion/qc/audio-qa.json', mediaType: 'application/json' },
    { path: 'outputs/remotion/qc/audio-spectrogram.svg', mediaType: 'image/svg+xml' },
    { path: 'outputs/remotion/qc/mp4-qc.json', mediaType: 'application/json' }
  ] : [];
  if (expectedFiles.length + producedMedia.length !== parity.outputs.length || expectedFiles.some((file, index) => {
    const output = parity.outputs[index];
    return output.path !== file.path || output.format !== file.format || output.mediaType !== file.mediaType
      || output.adapter !== file.adapter || (!mutableMediaPaths.has(file.path)
        && (output.digest !== sha256(file.bytes) || output.byteSize !== file.bytes.length));
  }) || producedMedia.some((file, index) => {
    const output = parity.outputs[expectedFiles.length + index];
    return output.path !== file.path || output.format !== 'remotion' || output.mediaType !== file.mediaType
      || output.adapter !== expectedFiles.find((entry) => entry.format === 'remotion')?.adapter;
  })) throw new Error('release_output_manifest_mismatch');
  for (const output of parity.outputs) {
    const bytes = await readFile(destination(root, output.path));
    if (sha256(bytes) !== output.digest || bytes.length !== output.byteSize || output.contentDigest !== parity.contentDigest) throw new Error('release_output_mismatch');
  }
  if (renderSpec.formats.includes('remotion')) {
    if (options.probeMedia !== false) verifyEncodedMp4(root);
    const mediaRoot = path.join(root, 'outputs', 'remotion');
    const audio = JSON.parse(await readFile(path.join(mediaRoot, 'audio', 'narration-metadata.json'), 'utf8'));
    const timeline = JSON.parse(await readFile(path.join(mediaRoot, 'timeline.json'), 'utf8'));
    const mediaPlan = JSON.parse(await readFile(path.join(mediaRoot, 'render-plan.json'), 'utf8'));
    if (audio.contentDigest !== plan.contentDigest || audio.narrationSha256 !== sha256(Buffer.from(content.voice.narration))
      || mediaPlan.contentDigest !== plan.contentDigest || mediaPlan.composition.durationInFrames !== timeline.durationInFrames
      || !Number.isInteger(timeline.durationInFrames) || timeline.durationInFrames < timeline.scenes.length
      || timeline.scenes.at(-1)?.endFrame !== timeline.durationInFrames) throw new Error('mp4_timeline_mismatch');
  }
  return parity;
}
