import assert from 'node:assert/strict';
import { mkdtemp, readFile, rm, unlink, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import sharp from 'sharp';
import { digest, sha256 } from '../../packages/core/src/canonical.ts';
import { createAsset, diagramOrigin, generateDiagram, normalizeRaster, verifyAssetBundle, writeAssetBundle } from '../../packages/core/src/assets.ts';
import { validate } from '../../packages/core/src/contracts.ts';

const request = () => validate('AssetRequest', { schemaVersion: '1.0.0', assetId: 'synthetic-flow', domainDigest: digest('synthetic'),
  purpose: 'evaluation', method: 'diagram', role: 'diagram', prompt: 'Synthetic diagram for renderer engineering validation',
  alt: 'Build followed by test', width: 1920, height: 1080, seed: 1, palette: ['#ffffff', '#182322', '#00786b'],
  nodes: [{ label: 'Build', detail: 'Immutable artifact' }, { label: 'Test', detail: 'Validate behavior' }] });

test('diagram generation produces deterministic nonblank pixels and verifiable bundles', async () => {
  const input = request();
  const first = await generateDiagram(input);
  assert.deepEqual(first, await generateDiagram(input));
  const metadata = await sharp(first).metadata();
  assert.equal(metadata.width, 1920);
  assert.equal(metadata.height, 1080);
  const asset = await createAsset(input, first, diagramOrigin(input));
  assert.deepEqual(asset.record.quality, {
    format: 'png',
    colorSpace: 'srgb',
    alpha: 'opaque',
    nonTransparentPixelRatio: 1,
    luminanceRange: asset.record.quality?.luminanceRange,
    channelRangeMin: asset.record.quality?.channelRangeMin
  });
  assert.ok((asset.record.quality?.luminanceRange ?? 0) >= 8);
  const root = await mkdtemp(path.join(os.tmpdir(), 'a2swe-assets-'));
  try {
    const output = path.join(root, 'proof');
    await assert.rejects(writeAssetBundle(output, input, { ...asset, record: { ...asset.record, alt: 'Misrepresented content' } }), /asset_integrity/);
    await assert.rejects(writeAssetBundle(output, input, { ...asset, record: { ...asset.record,
      quality: { ...asset.record.quality!, luminanceRange: asset.record.quality!.luminanceRange - 1 } } }), /asset_quality/);
    await writeAssetBundle(output, input, asset);
    assert.deepEqual(await verifyAssetBundle(output), asset.record);
    const manifest = JSON.parse(await readFile(path.join(output, 'manifest.json'), 'utf8'));
    assert.equal(manifest.assetId, input.assetId);
    assert.equal(manifest.artifactDigest, asset.record.artifact.digest);
    assert.deepEqual(manifest.files.map((file: { path: string }) => file.path), ['request.json', 'asset.json', 'asset.png']);
    await assert.rejects(writeAssetBundle(output, input, asset), /EEXIST/);
    assert.deepEqual(await readFile(path.join(output, 'asset.png')), first);
    await writeFile(path.join(output, 'manifest.json'), JSON.stringify({ ...manifest, artifactDigest: '0'.repeat(64) }));
    await assert.rejects(verifyAssetBundle(output), /asset_manifest/);
    await writeFile(path.join(output, 'manifest.json'), JSON.stringify(manifest));
    await unlink(path.join(output, 'manifest.json'));
    await assert.rejects(verifyAssetBundle(output), /asset_manifest_missing/);
    await writeFile(path.join(output, 'manifest.json'), JSON.stringify(manifest));
    await writeFile(path.join(output, 'asset.png'), Buffer.from('tampered'));
    await assert.rejects(verifyAssetBundle(output), /asset_integrity/);
  } finally { await rm(root, { recursive: true, force: true }); }
});

test('raster ingestion rejects active formats, blank output, wrong dimensions and bad contrast', async () => {
  await assert.rejects(normalizeRaster(Buffer.from('<svg xmlns="http://www.w3.org/2000/svg"/>'), 1920, 1080), /unsupported_raster/);
  const blank = await sharp({ create: { width: 256, height: 256, channels: 4, background: '#008877' } }).png().toBuffer();
  await assert.rejects(normalizeRaster(blank, 256, 256), /blank_asset/);
  await assert.rejects(normalizeRaster(blank, 512, 512), /dimension/);
  await assert.rejects(generateDiagram({ ...request(), palette: ['#ffffff', '#eeeeee', '#dddddd'] }), /contrast/);
  await assert.rejects(generateDiagram({ ...request(), nodes: [{ label: 'Build', detail: 'x'.repeat(30) }, { label: 'Test', detail: 'result' }] }), /unbreakable/);
  const transparent = await sharp({ create: { width: 256, height: 256, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } } }).png().toBuffer();
  await assert.rejects(normalizeRaster(transparent, 256, 256), /blank_asset/);
  const colorOnly = await sharp(Buffer.from('<svg width="256" height="256"><rect width="256" height="256" fill="red"/><rect width="128" height="256" fill="blue"/></svg>')).png().toBuffer();
  assert.ok((await normalizeRaster(colorOnly, 256, 256)).length > 0);
});

test('asset records never turn structural checks into approval or official generated marks', async () => {
  const input = request();
  const asset = await createAsset(input, await generateDiagram(input), diagramOrigin(input));
  assert.equal(asset.record.review, 'pending');
  assert.equal(asset.record.rights, 'pending');
  assert.throws(() => validate('AssetRecord', { ...asset.record, review: 'approved' }), /invalid_contract/);
  assert.throws(() => validate('AssetRecord', { ...asset.record, role: 'official_mark' }), /official_mark/);
  await assert.rejects(createAsset(input, asset.png, { ...diagramOrigin(input), method: 'import' }), /method_mismatch/);
  await assert.rejects(createAsset(input, asset.png, { ...diagramOrigin(input), inputDigest: digest('other') }), /provenance/);
  assert.throws(() => validate('AssetRecord', { ...asset.record, quality: { ...asset.record.quality, luminanceRange: 0 } }), /asset_quality/);
});

test('import assets bind provenance to the original raster bytes', async () => {
  const input = validate('AssetRequest', { ...request(), method: 'import', role: 'illustration', nodes: [] });
  const bytes = await sharp(Buffer.from('<svg width="1920" height="1080"><rect width="1920" height="1080" fill="#ffffff"/><circle cx="960" cy="540" r="260" fill="#00786b"/></svg>')).png().toBuffer();
  const origin = { method: 'import' as const, provider: 'local-raster-import', version: 'test', inputDigest: sha256(bytes), sourceUrl: 'https://example.com/source.png' };
  const asset = await createAsset(input, bytes, origin);
  assert.equal(asset.record.origin.inputDigest, sha256(bytes));
  assert.equal(asset.record.origin.sourceUrl, origin.sourceUrl);
  await assert.rejects(createAsset(input, bytes, { ...origin, inputDigest: sha256(Buffer.from('other')) }), /provenance/);
  await assert.rejects(createAsset(input, bytes, { ...origin, sourceUrl: null }), /provenance/);
});
