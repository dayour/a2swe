import { mkdir, lstat, open, readFile, writeFile, rm } from 'node:fs/promises';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import sharp from 'sharp';
import type { OverlayOptions } from 'sharp';
import { CodeXml, Package, Server, Database, ShieldCheck } from 'lucide-static';
import { digest, sha256 } from './canonical.ts';
import { validate } from './contracts.ts';
import type { AssetRecord, AssetRequest } from './contracts.ts';

export const assetLimits = { bytes: 16 * 1024 * 1024, pixels: 3840 * 2160 } as const;
const fontFile = fileURLToPath(new URL('../../../template/public/fonts/NotoSansSC.ttf', import.meta.url));
const icons = { code: CodeXml, artifact: Package, environment: Server, data: Database, review: ShieldCheck };

interface RasterQuality {
  format: 'png';
  colorSpace: 'srgb';
  alpha: 'opaque' | 'transparent';
  nonTransparentPixelRatio: number;
  luminanceRange: number;
  channelRangeMin: number;
}

interface AssetManifest {
  schemaVersion: '1.0.0';
  assetId: string;
  requestDigest: string;
  recordDigest: string;
  artifactDigest: string;
  files: { path: 'request.json' | 'asset.json' | 'asset.png'; digest: string; mediaType: string; byteSize: number }[];
  provenance: AssetRecord['origin'];
}

export async function readRasterFile(filename: string): Promise<Buffer> {
  const stat = await lstat(filename);
  if (!stat.isFile() || stat.isSymbolicLink() || stat.size > assetLimits.bytes) throw new Error('unsafe_raster_file');
  const handle = await open(filename, 'r');
  try {
    const current = await handle.stat();
    if (!current.isFile() || current.size > assetLimits.bytes || current.ino !== stat.ino) throw new Error('unsafe_raster_file');
    const bytes = Buffer.alloc(assetLimits.bytes + 1);
    let offset = 0;
    while (offset < bytes.length) {
      const result = await handle.read(bytes, offset, bytes.length - offset, null);
      if (!result.bytesRead) break;
      offset += result.bytesRead;
    }
    if (offset > assetLimits.bytes) throw new Error('asset_byte_limit');
    return bytes.subarray(0, offset);
  } finally { await handle.close(); }
}

function rasterFormat(bytes: Buffer): string {
  if (bytes.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))) return 'png';
  if (bytes[0] === 255 && bytes[1] === 216 && bytes[2] === 255) return 'jpeg';
  if (bytes.toString('ascii', 0, 4) === 'RIFF' && bytes.toString('ascii', 8, 12) === 'WEBP') return 'webp';
  throw new Error('unsupported_raster: only PNG, JPEG and WebP are accepted');
}

async function normalizeRasterWithQuality(bytes: Buffer, width: number, height: number): Promise<{ png: Buffer; quality: RasterQuality }> {
  if (!bytes.length || bytes.length > assetLimits.bytes) throw new Error('asset_byte_limit');
  const format = rasterFormat(bytes);
  const image = sharp(bytes, { limitInputPixels: assetLimits.pixels, failOn: 'warning', animated: true });
  const metadata = await image.metadata();
  if (metadata.format !== format || (metadata.pages ?? 1) !== 1) throw new Error('animated_or_mismatched_raster');
  if (metadata.width !== width || metadata.height !== height || (metadata.orientation ?? 1) !== 1) throw new Error('asset_dimension_mismatch');
  const output = await image.toColourspace('srgb').png().toBuffer();
  if (output.length > assetLimits.bytes) throw new Error('asset_byte_limit');
  const normalized = sharp(output, { limitInputPixels: assetLimits.pixels });
  const [statistics, raw] = await Promise.all([
    normalized.clone().flatten({ background: '#ffffff' }).removeAlpha().stats(),
    normalized.clone().ensureAlpha().raw().toBuffer()
  ]);
  if (!statistics.channels.some((channel) => channel.max - channel.min >= 8 && channel.stdev >= 1)) throw new Error('blank_asset');
  const channelRanges = statistics.channels.slice(0, 3).map((channel) => channel.max - channel.min);
  let opaquePixels = 0;
  let minLuminance = 255;
  let maxLuminance = 0;
  for (let offset = 0; offset < raw.length; offset += 4) {
    const alpha = raw[offset + 3];
    if (alpha > 0) opaquePixels++;
    const luminance = Math.round(raw[offset] * 0.2126 + raw[offset + 1] * 0.7152 + raw[offset + 2] * 0.0722);
    minLuminance = Math.min(minLuminance, luminance);
    maxLuminance = Math.max(maxLuminance, luminance);
  }
  return { png: output, quality: {
    format: 'png', colorSpace: 'srgb',
    alpha: opaquePixels === width * height ? 'opaque' : 'transparent',
    nonTransparentPixelRatio: Number((opaquePixels / (width * height)).toFixed(6)),
    luminanceRange: maxLuminance - minLuminance,
    channelRangeMin: Math.min(...channelRanges)
  } };
}

export async function normalizeRaster(bytes: Buffer, width: number, height: number): Promise<Buffer> {
  return (await normalizeRasterWithQuality(bytes, width, height)).png;
}

function contrast(first: string, second: string): number {
  function luminance(color: string): number {
    const channels = [1, 3, 5].map((start) => parseInt(color.slice(start, start + 2), 16) / 255)
      .map((channel) => channel <= 0.04045 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4);
    return channels[0] * 0.2126 + channels[1] * 0.7152 + channels[2] * 0.0722;
  }
  const light = luminance(first);
  const dark = luminance(second);
  return (Math.max(light, dark) + 0.05) / (Math.min(light, dark) + 0.05);
}

export async function generateDiagram(input: unknown): Promise<Buffer> {
  const request = validate('AssetRequest', input);
  if (request.method !== 'diagram') throw new Error('diagram_request_required');
  const [background, foreground, accent] = request.palette;
  if (contrast(background, foreground) < 4.5 || contrast(background, accent) < 3) throw new Error('insufficient_palette_contrast');
  const spacing = 1680 / request.nodes.length;
  const nodeWidth = Math.floor(spacing - 60);
  const layers: OverlayOptions[] = [];
  async function textLayer(text: string, size: number, width: number, top: number, center: number, maxHeight: number) {
    if (text.split(' ').some((word) => word.length > 24)) throw new Error('unbreakable_diagram_label');
    const rendered = await sharp({ text: { text: `<span foreground="${foreground}">${text}</span>`, font: `Noto Sans SC ${size}`,
      fontfile: fontFile, rgba: true, width, align: 'centre', wrap: 'word', dpi: 72 } }).png().toBuffer({ resolveWithObject: true });
    if (rendered.info.width > width || rendered.info.height > maxHeight) throw new Error('diagram_label_overflow');
    layers.push({ input: rendered.data, left: Math.round(center - rendered.info.width / 2), top });
  }
  await textLayer(request.title ?? 'Delivery workflow', 60, 1680, 125, 960, 160);
  const connectors: string[] = [];
  for (const [index, node] of request.nodes.entries()) {
    const center = 120 + spacing * (index + 0.5);
    if (index < request.nodes.length - 1) {
      connectors.push(`<path d="M ${center + 94} 465 H ${center + spacing - 98}" stroke="${accent}" stroke-width="4"/>
        <path d="M ${center + spacing - 110} 453 l 12 12 -12 12" fill="none" stroke="${accent}" stroke-width="4"/>`);
    }
    const symbol = icons[node.symbol ?? 'artifact'].replace('currentColor', accent);
    const icon = await sharp(Buffer.from(symbol)).resize(112, 112).png().toBuffer();
    layers.push({ input: icon, left: Math.round(center - 56), top: 409 });
    await textLayer(node.label, 36, nodeWidth, 594, center, 110);
    await textLayer(node.detail, 27, nodeWidth, 724, center, 120);
  }
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1920" height="1080">
    <rect width="1920" height="1080" fill="${background}"/>
    <path d="M120 312 H1800 M120 930 H1800" stroke="${accent}" stroke-opacity="0.35" stroke-width="2"/>
    ${connectors.join('')}
  </svg>`;
  const composite = await sharp(Buffer.from(svg)).composite(layers).png().toBuffer();
  const bytes = await sharp(composite).resize(request.width, request.height).png().toBuffer();
  return normalizeRaster(bytes, request.width, request.height);
}

export async function createAsset(input: unknown, bytes: Buffer, origin: AssetRecord['origin']): Promise<{ record: AssetRecord; png: Buffer }> {
  const request = validate('AssetRequest', input);
  if (origin.method !== request.method) throw new Error('asset_method_mismatch');
  if (origin.method === 'diagram' && (origin.inputDigest !== digest(request) || origin.sourceUrl !== null)) throw new Error('asset_provenance_mismatch');
  if (origin.method === 'diffusion' && origin.sourceUrl !== null) throw new Error('asset_provenance_mismatch');
  if (origin.method === 'import' && (!origin.sourceUrl || origin.inputDigest !== sha256(bytes))) throw new Error('asset_provenance_mismatch');
  const { png, quality } = await normalizeRasterWithQuality(bytes, request.width, request.height);
  const record = validate('AssetRecord', { schemaVersion: '1.0.0', assetId: request.assetId, domainDigest: request.domainDigest,
    requestDigest: digest(request), artifact: { digest: sha256(png), mediaType: 'image/png', byteSize: png.length },
    width: request.width, height: request.height, alt: request.alt, role: request.role, origin,
    rights: 'pending', review: 'pending', createdAt: new Date().toISOString(),
    checks: { decoded: 'passed', dimensions: 'passed', nonblank: 'passed' }, quality });
  return { record, png };
}

export function diagramOrigin(request: AssetRequest): AssetRecord['origin'] {
  const fontDigest = sha256(readFileSync(fontFile));
  return { method: 'diagram', provider: 'a2swe-semantic-diagram', version: `2;sharp=${sharp.versions.sharp};vips=${sharp.versions.vips};lucide=1.45.0;font=${fontDigest}`,
    inputDigest: digest(request), sourceUrl: null };
}

function assetManifest(request: AssetRequest, record: AssetRecord, png: Buffer, requestBytes: Buffer, recordBytes: Buffer): AssetManifest {
  return {
    schemaVersion: '1.0.0', assetId: request.assetId, requestDigest: digest(request), recordDigest: digest(record),
    artifactDigest: record.artifact.digest, provenance: record.origin,
    files: [
      { path: 'request.json', digest: sha256(requestBytes), mediaType: 'application/vnd.a2swe.asset-request+json', byteSize: requestBytes.length },
      { path: 'asset.json', digest: sha256(recordBytes), mediaType: 'application/vnd.a2swe.asset-record+json', byteSize: recordBytes.length },
      { path: 'asset.png', digest: sha256(png), mediaType: 'image/png', byteSize: png.length }
    ]
  };
}

function verifyAssetManifest(value: unknown, request: AssetRequest, record: AssetRecord, png: Buffer, requestBytes: Buffer, recordBytes: Buffer): void {
  const manifest = value as AssetManifest;
  if (!manifest || manifest.schemaVersion !== '1.0.0' || manifest.assetId !== request.assetId
    || manifest.requestDigest !== digest(request) || manifest.recordDigest !== digest(record)
    || manifest.artifactDigest !== record.artifact.digest || digest(manifest.provenance) !== digest(record.origin)
    || !Array.isArray(manifest.files) || manifest.files.length !== 3) throw new Error('asset_manifest_mismatch');
  const expected = assetManifest(request, record, png, requestBytes, recordBytes);
  if (digest(manifest.files) !== digest(expected.files)) throw new Error('asset_manifest_mismatch');
}

function verifyAssetQuality(record: AssetRecord, quality: RasterQuality): void {
  if (record.quality && digest(record.quality) !== digest(quality)) throw new Error('asset_quality_mismatch');
}

export async function writeAssetBundle(directory: string, request: AssetRequest, asset: { record: AssetRecord; png: Buffer }): Promise<void> {
  validate('AssetRequest', request);
  validate('AssetRecord', asset.record);
  if (digest(request) !== asset.record.requestDigest || request.domainDigest !== asset.record.domainDigest || request.assetId !== asset.record.assetId
    || request.method !== asset.record.origin.method || request.role !== asset.record.role || request.alt !== asset.record.alt
    || request.width !== asset.record.width || request.height !== asset.record.height
    || sha256(asset.png) !== asset.record.artifact.digest || asset.png.length !== asset.record.artifact.byteSize) throw new Error('asset_integrity_mismatch');
  verifyAssetQuality(asset.record, (await normalizeRasterWithQuality(asset.png, asset.record.width, asset.record.height)).quality);
  const destination = path.resolve(directory);
  let ancestor = path.dirname(destination);
  while (true) {
    const stat = await lstat(ancestor);
    if (stat.isSymbolicLink() || !stat.isDirectory()) throw new Error('unsafe_asset_destination');
    const parent = path.dirname(ancestor);
    if (parent === ancestor) break;
    ancestor = parent;
  }
  await mkdir(destination, { recursive: false, mode: 0o700 });
  try {
    const requestBytes = Buffer.from(`${JSON.stringify(request, null, 2)}\n`);
    const recordBytes = Buffer.from(`${JSON.stringify(asset.record, null, 2)}\n`);
    const manifest = assetManifest(request, asset.record, asset.png, requestBytes, recordBytes);
    await writeFile(path.join(destination, 'asset.png'), asset.png, { flag: 'wx' });
    await writeFile(path.join(destination, 'request.json'), requestBytes, { flag: 'wx' });
    await writeFile(path.join(destination, 'asset.json'), recordBytes, { flag: 'wx' });
    await writeFile(path.join(destination, 'manifest.json'), `${JSON.stringify(manifest, null, 2)}\n`, { flag: 'wx' });
  } catch (error) { await rm(destination, { recursive: true, force: true }); throw error; }
}

export async function verifyAssetBundle(directory: string): Promise<AssetRecord> {
  const requestBytes = await readFile(path.join(directory, 'request.json'));
  const recordBytes = await readFile(path.join(directory, 'asset.json'));
  const request = validate('AssetRequest', JSON.parse(requestBytes.toString('utf8')));
  const record = validate('AssetRecord', JSON.parse(recordBytes.toString('utf8')));
  const png = await readRasterFile(path.join(directory, 'asset.png'));
  if (digest(request) !== record.requestDigest || request.domainDigest !== record.domainDigest || request.assetId !== record.assetId
    || request.method !== record.origin.method || request.role !== record.role || request.alt !== record.alt
    || request.width !== record.width || request.height !== record.height
    || sha256(png) !== record.artifact.digest || png.length !== record.artifact.byteSize) throw new Error('asset_integrity_mismatch');
  verifyAssetQuality(record, (await normalizeRasterWithQuality(png, record.width, record.height)).quality);
  let manifestBytes: Buffer;
  try { manifestBytes = await readFile(path.join(directory, 'manifest.json')); }
  catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') throw new Error('asset_manifest_missing');
    throw error;
  }
  verifyAssetManifest(JSON.parse(manifestBytes.toString('utf8')), request, record, png, requestBytes, recordBytes);
  return record;
}