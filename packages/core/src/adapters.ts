import { digest, sha256 } from './canonical.ts';
import { validate } from './contracts.ts';
import type { ContentIR, RenderSpec } from './contracts.ts';
import { remotion } from './media-remotion.ts';
import { renderRasterOverview } from './raster-canvas.ts';
import { deflateSync, inflateSync } from 'node:zlib';

export type OutputFormat = RenderSpec['formats'][number];
export interface AdapterFile {
  format: OutputFormat;
  path: string;
  mediaType: string;
  bytes: Buffer;
  adapter: string;
}

export interface AdapterVisualImage {
  sectionId: string;
  bytes: Buffer;
}

export interface AdapterRenderOptions {
  assetEmbeds?: AdapterAssetEmbed[];
  strictAssetEmbeds?: boolean;
  // Settled PNG renders of section visuals (mermaid, excalidraw, marp), embedded as diagrams by every document format.
  visualImages?: AdapterVisualImage[];
}

type ZipFile = { name: string; bytes: Buffer };
type SupportedImageMediaType = 'image/png' | 'image/jpeg';

export interface AdapterAssetEmbed {
  assetId: string;
  mediaType: SupportedImageMediaType;
  bytes: Buffer;
}

interface ResolvedAsset {
  asset: ContentIR['assets'][number];
  mediaType?: SupportedImageMediaType;
  bytes?: Buffer;
  extension?: 'png' | 'jpg';
  filename?: string;
  dataUri?: string;
  reason?: string;
}

const REL_NS = 'http://schemas.openxmlformats.org/package/2006/relationships';
const OFFICE_REL = 'http://schemas.openxmlformats.org/officeDocument/2006/relationships';
const PPT_NS = 'http://schemas.openxmlformats.org/presentationml/2006/main';
const WORD_NS = 'http://schemas.openxmlformats.org/wordprocessingml/2006/main';
const DRAWING_NS = 'http://schemas.openxmlformats.org/drawingml/2006/main';

function text(value: string): string {
  return value.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;');
}

function attr(value: string): string {
  return text(value).replaceAll('"', '&quot;');
}

function stableJson(value: unknown): Buffer {
  return Buffer.from(`${JSON.stringify(value, null, 2)}\n`);
}

function words(value: string, limit: number): string {
  const normalized = value.replace(/\s+/g, ' ').trim();
  if (normalized.length <= limit) return normalized;
  return `${normalized.slice(0, Math.max(0, limit - 1)).replace(/\s+\S*$/, '')}…`;
}

function slug(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 80) || 'item';
}

function imageExtension(mediaType: SupportedImageMediaType): 'png' | 'jpg' {
  return mediaType === 'image/png' ? 'png' : 'jpg';
}

function assertSupportedImageBytes(mediaType: SupportedImageMediaType, bytes: Buffer, assetId: string): void {
  const png = bytes.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]));
  const jpeg = bytes[0] === 255 && bytes[1] === 216 && bytes[2] === 255;
  if ((mediaType === 'image/png' && !png) || (mediaType === 'image/jpeg' && !jpeg)) throw new Error(`asset_embed_invalid_raster: ${assetId}`);
}

function resolveAssetEmbeds(content: ContentIR, options: AdapterRenderOptions = {}): Map<string, ResolvedAsset> {
  const resolved: Map<string, ResolvedAsset> = new Map(content.assets.map((asset) =>
    [asset.assetId, { asset, reason: 'selected raster bytes were not supplied to this adapter' } satisfies ResolvedAsset]));
  const seen = new Set<string>();
  for (const embed of options.assetEmbeds ?? []) {
    const current = resolved.get(embed.assetId);
    if (!current) throw new Error(`unknown_asset_embed: ${embed.assetId}`);
    if (seen.has(embed.assetId)) throw new Error(`duplicate_asset_embed: ${embed.assetId}`);
    seen.add(embed.assetId);
    if (embed.mediaType !== 'image/png' && embed.mediaType !== 'image/jpeg') throw new Error(`unsupported_asset_embed_media_type: ${embed.assetId}`);
    if (current.asset.mediaType !== embed.mediaType) throw new Error(`asset_embed_media_type_mismatch: ${embed.assetId}`);
    assertSupportedImageBytes(embed.mediaType, embed.bytes, embed.assetId);
    if (sha256(embed.bytes) !== current.asset.digest) throw new Error(`asset_embed_digest_mismatch: ${embed.assetId}`);
    const extension = imageExtension(embed.mediaType);
    const filename = `${slug(embed.assetId)}-${current.asset.digest.slice(0, 12)}.${extension}`;
    resolved.set(embed.assetId, {
      asset: current.asset,
      mediaType: embed.mediaType,
      bytes: embed.bytes,
      extension,
      filename,
      dataUri: `data:${embed.mediaType};base64,${embed.bytes.toString('base64')}`
    });
  }
  if (options.strictAssetEmbeds) {
    for (const item of resolved.values()) {
      if (!item.bytes) throw new Error(`asset_embed_missing: ${item.asset.assetId}`);
    }
  }
  return resolved;
}

function sectionAssets(content: ContentIR, assetMap: Map<string, ResolvedAsset>, assetIds: string[]): ResolvedAsset[] {
  return assetIds.map((id) => {
    const found = assetMap.get(id);
    if (!found) throw new Error(`missing_asset: ${id}`);
    if (!content.assets.some((asset) => asset.assetId === id)) throw new Error(`missing_asset: ${id}`);
    return found;
  });
}

function allText(content: ContentIR): string[] {
  return [
    content.title, content.summary, content.audience, content.decision,
    ...content.sections.flatMap((section) => [section.title, section.body, section.speakerNotes]),
    ...content.claims.map((claim) => claim.text),
    ...content.citations.map((citation) => `${citation.sourceTitle} ${citation.canonicalUrl}`)
  ];
}

function citationFor(content: ContentIR, evidenceId: string): ContentIR['citations'][number] {
  const citation = content.citations.find((item) => item.evidenceId === evidenceId);
  if (!citation) throw new Error('missing_citation');
  return citation;
}

function claimFor(content: ContentIR, claimId: string): ContentIR['claims'][number] {
  const claim = content.claims.find((item) => item.claimId === claimId);
  if (!claim) throw new Error('missing_claim');
  return claim;
}

function theme(deck: RenderSpec['theme']): { name: string; primaryColor: string; accentColor: string; backgroundColor: string; fontFamily: string; darkMode: boolean } {
  return {
    name: deck.name,
    primaryColor: deck.accent,
    accentColor: deck.accent,
    backgroundColor: deck.background,
    fontFamily: deck.fontFamily,
    darkMode: contrast(deck.background) < 128
  };
}

function contrast(hex: string): number {
  const rgb = hex.slice(1).match(/../g)?.map((part) => Number.parseInt(part, 16)) ?? [255, 255, 255];
  return Math.round((rgb[0] * 299 + rgb[1] * 587 + rgb[2] * 114) / 1000);
}

function html(content: ContentIR, spec: RenderSpec, options: AdapterRenderOptions = {}): AdapterFile {
  const colorScheme = contrast(spec.theme.background) < 128 ? 'dark' : 'light';
  const claims = new Map(content.claims.map((claim) => [claim.claimId, claim]));
  const assetMap = resolveAssetEmbeds(content, options);
  const citations = content.citations.map((citation, index) =>
    `<li id="${attr(citation.evidenceId)}"><a href="${attr(citation.canonicalUrl)}" rel="noreferrer">${text(citation.sourceTitle)}</a><span aria-label="retrieval date"> retrieved ${text(citation.retrievedAt)}</span></li>`).join('');
  const assets = content.assets.map((asset) =>
    `<li><span class="asset-role">${text(asset.role)}</span> <code>${text(asset.assetId)}</code>: ${text(asset.alt)} <span class="digest">${text(asset.digest.slice(0, 12))}</span><span class="embed-status"> ${assetMap.get(asset.assetId)?.bytes ? 'embedded inline' : 'digest-only reference; raster bytes not supplied'}</span></li>`).join('');
  const sections = content.sections.map((section, index) => {
    const sectionClaims = section.claimIds.map((id) => {
      const claim = claims.get(id)!;
      const refs = claim.evidenceIds.map((evidenceId) => `<a href="#${attr(evidenceId)}" aria-label="Citation ${attr(evidenceId)}">[${text(evidenceId)}]</a>`).join(' ');
      return `<li>${text(claim.text)} ${refs}</li>`;
    }).join('');
    const assetRefs = section.assetIds.length
      ? `<aside class="assets" aria-label="Assets for ${attr(section.title)}"><h3>Assets</h3>${sectionAssets(content, assetMap, section.assetIds).map((item) => item.dataUri
        ? `<figure><img src="${attr(item.dataUri)}" alt="${attr(item.asset.alt)}" loading="lazy"><figcaption>${text(item.asset.alt)} <code>${text(item.asset.assetId)}</code></figcaption></figure>`
        : `<p class="asset-missing"><strong>Asset not embedded:</strong> ${text(item.asset.alt)} <code>${text(item.asset.assetId)}</code>. ${text(item.reason ?? 'Raster bytes were not supplied.')}</p>`).join('')}</aside>` : '';
    return `<section class="card" id="${attr(section.sectionId)}" aria-labelledby="${attr(section.sectionId)}-title">
      <p class="kicker">Section ${index + 1}</p>
      <h2 id="${attr(section.sectionId)}-title">${text(section.title)}</h2>
      <p>${text(section.body)}</p>
      <h3>Supported claims</h3><ul>${sectionClaims}</ul>
      ${assetRefs}
      <details><summary>Speaker notes</summary><p>${text(section.speakerNotes)}</p></details>
    </section>`;
  }).join('\n');
  const body = `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${text(content.title)}</title>
<style>
:root{color-scheme:${colorScheme};--bg:${spec.theme.background};--fg:${spec.theme.foreground};--accent:${spec.theme.accent};--card:color-mix(in srgb,var(--bg) 88%,var(--fg) 12%);font-family:${spec.theme.fontFamily},Arial,sans-serif}
*{box-sizing:border-box;min-width:0}html{scroll-behavior:smooth}body{margin:0;background:radial-gradient(circle at top left,color-mix(in srgb,var(--accent) 18%,transparent),transparent 34rem),var(--bg);color:var(--fg);line-height:1.6;overflow-x:hidden}
a{color:var(--accent)}a:focus-visible,button:focus-visible,summary:focus-visible{outline:3px solid var(--accent);outline-offset:3px}
.skip{position:absolute;left:-999px;top:1rem;background:var(--fg);color:var(--bg);padding:.75rem 1rem;border-radius:.5rem}.skip:focus{left:1rem;z-index:10}
main{max-width:1180px;margin:auto;padding:clamp(20px,4vw,64px)}.hero,.card,.manifest{border:1px solid color-mix(in srgb,var(--accent) 38%,transparent);border-radius:24px;padding:clamp(20px,3vw,40px);margin:0 0 24px;background:var(--card);box-shadow:0 18px 60px rgba(0,0,0,.18);max-width:100%;overflow-wrap:anywhere}
h1{font-size:clamp(2.1rem,7vw,5rem);line-height:.95;margin:.1em 0;overflow-wrap:anywhere;word-break:break-word;max-width:100%}h2{font-size:clamp(1.5rem,4vw,2.6rem);margin:0 0 .5em;overflow-wrap:anywhere;word-break:break-word;max-width:100%}h3{margin-top:1.25rem;overflow-wrap:anywhere;word-break:break-word}.kicker{color:var(--accent);font-weight:700;text-transform:uppercase;letter-spacing:.08em}
p,li,summary,a,code{overflow-wrap:anywhere;word-break:break-word}.grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(min(280px,100%),1fr));gap:24px}.asset-role,.digest,.embed-status{font-size:.85rem;opacity:.72}.assets figure{margin:1rem 0}.assets img{display:block;max-width:100%;height:auto;border-radius:12px;border:1px solid color-mix(in srgb,var(--accent) 26%,transparent)}.asset-missing{border-left:4px solid var(--accent);padding-left:1rem}code{background:color-mix(in srgb,var(--accent) 10%,transparent);padding:.1rem .35rem;border-radius:.35rem}
@media (prefers-reduced-motion:reduce){html{scroll-behavior:auto}*{transition:none!important;animation:none!important}}
@media print{body{background:white}.hero,.card,.manifest{break-inside:avoid;background:white;box-shadow:none}}
</style></head><body><a class="skip" href="#content">Skip to content</a><main id="content">
<article class="hero" aria-labelledby="title"><p class="kicker">${text(content.audience)}</p><h1 id="title">${text(content.title)}</h1><p>${text(content.summary)}</p><p><strong>Decision:</strong> ${text(content.decision)}</p></article>
<div class="grid">${sections}</div>
<section class="manifest" aria-labelledby="asset-heading"><h2 id="asset-heading">Assets and alt text</h2><ul>${assets || '<li>No external assets selected.</li>'}</ul></section>
<section class="manifest" aria-labelledby="citation-heading"><h2 id="citation-heading">Citations</h2><ol>${citations}</ol></section>
</main></body></html>
`;
  return { format: 'html', path: 'outputs/index.html', mediaType: 'text/html; charset=utf-8', bytes: Buffer.from(body), adapter: 'a2swe-html-accessible-2' };
}

function adaptiveDeck(content: ContentIR, spec: RenderSpec, options: AdapterRenderOptions): AdapterFile {
  const deckTheme = theme(spec.theme);
  const assetMap = resolveAssetEmbeds(content, options);
  const tags = ['a2swe', 'canonical'];
  const deck = {
    $schema: 'https://darbotlm.github.io/adaptive-slide/schemas/deck.schema.json',
    type: 'AdaptiveDeck',
    version: '1.0',
    metadata: {
      title: content.title,
      author: 'a2swe',
      description: content.summary,
      tags,
      contentDigest: digest(content)
    },
    theme: deckTheme,
    defaults: { layout: 'stack', transition: 'fade', padding: 'large' },
    slides: [
      {
        type: 'AdaptiveSlide',
        id: 'title',
        title: content.title,
        notes: displayNarration(content.voice.narration),
        background: { gradient: { type: 'linear', angle: 135, colors: [spec.theme.accent, spec.theme.background] } },
        layout: { mode: 'stack', horizontalAlignment: 'center', verticalAlignment: 'center', gap: 'large' },
        body: [
          { type: 'Tile.Text', text: content.title, style: 'heading', size: 'extraLarge', weight: 'bolder', color: 'light', horizontalAlignment: 'center' },
          { type: 'Tile.Text', text: content.summary, style: 'subheading', color: 'light', horizontalAlignment: 'center' },
          { type: 'Tile.Container', style: 'accent', items: [{ type: 'Tile.Text', text: `Decision: ${content.decision}`, style: 'body', weight: 'bolder', color: 'light' }] }
        ]
      },
      ...content.sections.map((section, index) => ({
        type: 'AdaptiveSlide',
        id: section.sectionId,
        title: section.title,
        notes: section.speakerNotes,
        background: { color: spec.theme.background },
        layout: { mode: 'grid', columns: 2, gap: 'large' },
        body: [
          { type: 'Tile.Container', style: 'accent', gridPosition: { column: 1, row: 1, columnSpan: 2 }, items: [
            { type: 'Tile.Text', text: section.title, style: 'heading', color: deckTheme.darkMode ? 'light' : 'dark' },
            { type: 'Tile.Text', text: section.body, style: 'body', color: deckTheme.darkMode ? 'light' : 'dark' }
          ] },
          { type: 'Tile.Container', style: 'emphasis', gridPosition: { column: 1, row: 2 }, items: [
            { type: 'Tile.Text', text: 'Claims', style: 'subheading', weight: 'bolder', color: deckTheme.darkMode ? 'light' : 'dark' },
            ...section.claimIds.map((id) => ({ type: 'Tile.Text', text: claimFor(content, id).text, style: 'body', color: deckTheme.darkMode ? 'light' : 'dark' }))
          ] },
          { type: 'Tile.Container', style: 'emphasis', gridPosition: { column: 2, row: 2 }, items: [
            { type: 'Tile.Text', text: 'Citations and notes', style: 'subheading', weight: 'bolder', color: deckTheme.darkMode ? 'light' : 'dark' },
            ...section.claimIds.flatMap((id) => claimFor(content, id).evidenceIds).map((evidenceId) => citationFor(content, evidenceId)).map((citation) =>
              ({ type: 'Tile.Text', text: `[${citation.evidenceId}] ${citation.sourceTitle}`, style: 'caption', color: deckTheme.darkMode ? 'light' : 'dark' })),
            { type: 'Tile.Text', text: section.speakerNotes, style: 'caption', color: deckTheme.darkMode ? 'light' : 'dark' }
          ] },
          ...sectionAssets(content, assetMap, section.assetIds).map((item, assetIndex) => item.dataUri
            ? { type: 'Tile.Image', url: item.dataUri, altText: item.asset.alt, caption: `${item.asset.assetId} (${item.asset.role})`, size: 'stretch', gridPosition: { column: 1, row: 3 + assetIndex, columnSpan: 2 } }
            : { type: 'Tile.Container', style: 'warning', gridPosition: { column: 1, row: 3 + assetIndex, columnSpan: 2 }, items: [
              { type: 'Tile.Text', text: `Asset not embedded: ${item.asset.assetId}`, style: 'caption', weight: 'bolder', color: deckTheme.darkMode ? 'light' : 'dark' },
              { type: 'Tile.Text', text: `${item.asset.alt}. ${item.reason}. Digest ${item.asset.digest.slice(0, 12)}.`, style: 'caption', color: deckTheme.darkMode ? 'light' : 'dark' }
            ] })
        ]
      })),
      {
        type: 'AdaptiveSlide',
        id: 'citations',
        title: 'Citations',
        notes: 'Review source links and retrieval timestamps before external distribution.',
        background: { color: spec.theme.background },
        layout: { mode: 'stack', gap: 'large' },
        body: [
          { type: 'Tile.Text', text: 'Citations', style: 'heading', color: deckTheme.darkMode ? 'light' : 'dark' },
          ...content.citations.map((citation) => ({
            type: 'Tile.Text',
            text: `[${citation.evidenceId}] ${citation.sourceTitle} - ${citation.canonicalUrl} retrieved ${citation.retrievedAt}`,
            style: 'body',
            color: deckTheme.darkMode ? 'light' : 'dark'
          }))
        ]
      }
    ]
  };
  return { format: 'adaptiveDeck', path: 'outputs/deck.deck.json', mediaType: 'application/vnd.adaptive-deck+json; charset=utf-8', bytes: stableJson(deck), adapter: 'a2swe-adaptive-deck-schema-2' };
}

function crc32(bytes: Buffer): number {
  let crc = 0xffffffff;
  for (const byte of bytes) {
    crc ^= byte;
    for (let bit = 0; bit < 8; bit++) crc = (crc >>> 1) ^ (0xedb88320 & -(crc & 1));
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function dosTime(): { time: number; date: number } {
  return { time: 0, date: (1 << 5) | 1 };
}

function zip(files: ZipFile[]): Buffer {
  const local: Buffer[] = [];
  const central: Buffer[] = [];
  let offset = 0;
  const stamp = dosTime();
  for (const file of files.sort((a, b) => a.name.localeCompare(b.name))) {
    const name = Buffer.from(file.name);
    const crc = crc32(file.bytes);
    const header = Buffer.alloc(30);
    header.writeUInt32LE(0x04034b50, 0); header.writeUInt16LE(20, 4); header.writeUInt16LE(0, 6); header.writeUInt16LE(0, 8);
    header.writeUInt16LE(stamp.time, 10); header.writeUInt16LE(stamp.date, 12); header.writeUInt32LE(crc, 14);
    header.writeUInt32LE(file.bytes.length, 18); header.writeUInt32LE(file.bytes.length, 22); header.writeUInt16LE(name.length, 26);
    local.push(header, name, file.bytes);
    const record = Buffer.alloc(46);
    record.writeUInt32LE(0x02014b50, 0); record.writeUInt16LE(20, 4); record.writeUInt16LE(20, 6); record.writeUInt16LE(0, 8);
    record.writeUInt16LE(0, 10); record.writeUInt16LE(stamp.time, 12); record.writeUInt16LE(stamp.date, 14); record.writeUInt32LE(crc, 16);
    record.writeUInt32LE(file.bytes.length, 20); record.writeUInt32LE(file.bytes.length, 24); record.writeUInt16LE(name.length, 28);
    record.writeUInt32LE(offset, 42);
    central.push(record, name);
    offset += header.length + name.length + file.bytes.length;
  }
  const centralSize = central.reduce((sum, part) => sum + part.length, 0);
  const end = Buffer.alloc(22);
  end.writeUInt32LE(0x06054b50, 0); end.writeUInt16LE(files.length, 8); end.writeUInt16LE(files.length, 10);
  end.writeUInt32LE(centralSize, 12); end.writeUInt32LE(offset, 16);
  return Buffer.concat([...local, ...central, end]);
}

function rels(relationships: { id: string; type: string; target: string; targetMode?: 'External' }[]): string {
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="${REL_NS}">${relationships.map((rel) =>
    `<Relationship Id="${attr(rel.id)}" Type="${attr(rel.type)}" Target="${attr(rel.target)}"${rel.targetMode ? ` TargetMode="${rel.targetMode}"` : ''}/>`).join('')}</Relationships>`;
}

function pptRun(value: string, size = 1800, bold = false, color = '111111'): string {
  return `<a:r><a:rPr lang="en-US" sz="${size}"${bold ? ' b="1"' : ''}><a:solidFill><a:srgbClr val="${attr(color)}"/></a:solidFill></a:rPr><a:t>${text(value)}</a:t></a:r>`;
}

function pptTextbox(id: number, name: string, x: number, y: number, cx: number, cy: number, paragraphs: string[], size = 1800, boldFirst = false, color = '111111'): string {
  return `<p:sp><p:nvSpPr><p:cNvPr id="${id}" name="${attr(name)}"/><p:cNvSpPr txBox="1"/><p:nvPr/></p:nvSpPr><p:spPr><a:xfrm><a:off x="${x}" y="${y}"/><a:ext cx="${cx}" cy="${cy}"/></a:xfrm><a:prstGeom prst="rect"><a:avLst/></a:prstGeom><a:noFill/><a:ln><a:noFill/></a:ln></p:spPr><p:txBody><a:bodyPr wrap="square" anchor="t" vertOverflow="clip" horzOverflow="clip"/><a:lstStyle/>${paragraphs.map((paragraph, index) => `<a:p>${pptRun(paragraph, size, boldFirst && index === 0, color)}</a:p>`).join('')}</p:txBody></p:sp>`;
}

function pptPicture(id: number, name: string, relId: string, altText: string, x: number, y: number, cx: number, cy: number): string {
  return `<p:pic><p:nvPicPr><p:cNvPr id="${id}" name="${attr(name)}" descr="${attr(altText)}"/><p:cNvPicPr><a:picLocks noChangeAspect="1"/></p:cNvPicPr><p:nvPr/></p:nvPicPr><p:blipFill><a:blip r:embed="${attr(relId)}"/><a:stretch><a:fillRect/></a:stretch></p:blipFill><p:spPr><a:xfrm><a:off x="${x}" y="${y}"/><a:ext cx="${cx}" cy="${cy}"/></a:xfrm><a:prstGeom prst="rect"><a:avLst/></a:prstGeom><a:ln><a:solidFill><a:srgbClr val="D9D9D9"/></a:solidFill></a:ln></p:spPr></p:pic>`;
}

function pptColor(value: string): string {
  return value.replace('#', '').toUpperCase();
}

function pptMix(foreground: string, background: string, weight: number): string {
  const channel = (hex: string, offset: number) => parseInt(hex.slice(offset, offset + 2), 16);
  return [0, 2, 4].map((offset) => Math.round(channel(foreground, offset) * weight + channel(background, offset) * (1 - weight))
    .toString(16).padStart(2, '0')).join('').toUpperCase();
}

function primaryFont(fontFamily: string): string {
  return fontFamily.split(',')[0].replace(/["']/g, '').trim() || 'Arial';
}

function imageDimensions(bytes: Buffer, mediaType: string): { width: number; height: number } {
  if (mediaType === 'image/png') return { width: readUInt32BE(bytes, 16), height: readUInt32BE(bytes, 20) };
  const jpeg = jpegDimensions(bytes);
  return { width: jpeg.width, height: jpeg.height };
}

function headlineParts(title: string): [string, string] {
  const match = title.match(/^(.+?[.:!?])\s+(.+)$/);
  return match ? [match[1], match[2]] : [title, ''];
}

// PowerPoint applies autofit only after an edit, so pick a size that fits the box up front and truncate only at the minimum size.
function pptFit(value: string, widthEmu: number, heightEmu: number, maxSize: number, minSize: number): { size: number; text: string } {
  const usableWidth = (widthEmu - 365760) / 12700;
  const usableHeight = (heightEmu - 182880) / 12700;
  const capacity = (size: number) => {
    const points = size / 100;
    const charsPerLine = Math.max(8, Math.floor(usableWidth / (points * 0.55)));
    return { charsPerLine, maxLines: Math.max(1, Math.floor(usableHeight / (points * 1.3))) };
  };
  for (let size = maxSize; size >= minSize; size -= 100) {
    const { charsPerLine, maxLines } = capacity(size);
    if (Math.ceil(value.length / charsPerLine) + 1 <= maxLines) return { size, text: value };
  }
  const { charsPerLine, maxLines } = capacity(minSize);
  return { size: minSize, text: words(value, Math.max(8, (maxLines - 1) * charsPerLine)) };
}

interface PptShapeStyle { fill?: string; line?: string; geometry?: 'rect' | 'roundRect' }

function pptShape(id: number, name: string, x: number, y: number, cx: number, cy: number, paragraphs: string[], style: PptShapeStyle = {}, anchor: 't' | 'ctr' = 't'): string {
  const fill = style.fill ? `<a:solidFill><a:srgbClr val="${style.fill}"/></a:solidFill>` : '<a:noFill/>';
  const line = style.line ? `<a:ln w="12700"><a:solidFill><a:srgbClr val="${style.line}"/></a:solidFill></a:ln>` : '<a:ln><a:noFill/></a:ln>';
  const geometry = style.geometry === 'roundRect' ? '<a:prstGeom prst="roundRect"><a:avLst><a:gd name="adj" fmla="val 9000"/></a:avLst></a:prstGeom>' : '<a:prstGeom prst="rect"><a:avLst/></a:prstGeom>';
  return `<p:sp><p:nvSpPr><p:cNvPr id="${id}" name="${attr(name)}"/><p:cNvSpPr${style.fill || style.line ? '' : ' txBox="1"'}/><p:nvPr/></p:nvSpPr><p:spPr><a:xfrm><a:off x="${x}" y="${y}"/><a:ext cx="${cx}" cy="${cy}"/></a:xfrm>${geometry}${fill}${line}</p:spPr><p:txBody><a:bodyPr wrap="square" lIns="182880" tIns="91440" rIns="182880" bIns="91440" anchor="${anchor}"><a:normAutofit/></a:bodyPr><a:lstStyle/>${paragraphs.join('')}</p:txBody></p:sp>`;
}

function pptParagraph(runs: string, spaceAfter = 0): string {
  return `<a:p><a:pPr algn="l"><a:lnSpc><a:spcPct val="105000"/></a:lnSpc><a:spcAft><a:spcPts val="${spaceAfter}"/></a:spcAft></a:pPr>${runs}</a:p>`;
}

interface PptSlideInput {
  kind: 'title' | 'section' | 'citations';
  title: string;
  body: string;
  claims: string[];
  claimSources: string[];
  footer: string;
  sources: { title: string; url: string; retrievedAt: string }[];
  decision?: string;
  pictures: { relId: string; asset: ContentIR['assets'][number]; width: number; height: number }[];
}

function pptSlideXml(slide: PptSlideInput, spec: RenderSpec, index: number, total: number): string {
  const accent = pptColor(spec.theme.accent);
  const foreground = pptColor(spec.theme.foreground);
  const background = pptColor(spec.theme.background);
  const muted = pptMix(foreground, background, 0.72);
  const surface = pptMix(foreground, background, 0.08);
  const border = pptMix(foreground, background, 0.18);
  const [lead, tail] = headlineParts(slide.title);
  const headline = (box: { cx: number; cy: number }, maxSize: number, minSize: number) => {
    const fit = pptFit(slide.title, box.cx, box.cy, maxSize, minSize);
    const [fitLead, fitTail] = fit.text === slide.title ? [lead, tail] : [fit.text, ''];
    return pptParagraph(pptRun(fitLead, fit.size, true, foreground) + (fitTail ? pptRun(` ${fitTail}`, fit.size, true, accent) : ''));
  };
  const shapes: string[] = [];
  let id = 3;
  const left = 685800;
  const width = 10820400;
  if (slide.kind === 'title') {
    shapes.push(pptShape(id++, 'Title', left, 900000, width, 2000000, [headline({ cx: width, cy: 2000000 }, 5000, 3000)], {}, 'ctr'));
    const summary = pptFit(slide.body, 9600000, 1200000, 2400, 1600);
    shapes.push(pptShape(id++, 'Summary', left, 3000000, 9600000, 1200000, [pptParagraph(pptRun(summary.text, summary.size, false, muted))]));
    if (slide.decision) {
      const decision = pptFit(slide.decision, width, 1000000, 2000, 1400);
      shapes.push(pptShape(id++, 'Decision', left, 4500000, width, 1000000,
        [pptParagraph(pptRun('DECISION  ', 1400, true, accent) + pptRun(decision.text, decision.size, true, foreground))],
        { fill: pptMix(accent, background, 0.16), line: accent, geometry: 'roundRect' }, 'ctr'));
    }
  } else if (slide.kind === 'citations') {
    shapes.push(pptShape(id++, 'Title', left, 420000, width, 1000000, [headline({ cx: width, cy: 1000000 }, 4000, 2400)], {}, 'ctr'));
    const items = slide.sources.map((source) => pptParagraph(pptRun(source.title, 1800, true, foreground) + pptRun(`  retrieved ${source.retrievedAt.slice(0, 10)}`, 1200, false, muted), 0)
      + pptParagraph(pptRun(source.url, 1400, false, accent), 1400));
    shapes.push(pptShape(id++, 'Sources', left, 1700000, width, 4300000, items));
  } else {
    shapes.push(pptShape(id++, 'Title', left, 420000, width, 1150000, [headline({ cx: width, cy: 1150000 }, 4000, 2400)], {}, 'ctr'));
    const picture = slide.pictures[0];
    const bodyHeight = picture ? 1400000 : 3900000;
    const body = pptFit(slide.body, 5300000, bodyHeight, picture ? 2000 : 2600, 1400);
    shapes.push(pptShape(id++, 'Body', left, 1750000, 5300000, bodyHeight, [pptParagraph(pptRun(body.text, body.size, false, foreground))]));
    shapes.push(`<p:sp><p:nvSpPr><p:cNvPr id="${id++}" name="Accent rule"/><p:cNvSpPr/><p:nvPr/></p:nvSpPr><p:spPr><a:xfrm><a:off x="${left - 137160}" y="1800000"/><a:ext cx="45720" cy="${bodyHeight - 100000}"/></a:xfrm><a:prstGeom prst="rect"><a:avLst/></a:prstGeom><a:solidFill><a:srgbClr val="${accent}"/></a:solidFill><a:ln><a:noFill/></a:ln></p:spPr></p:sp>`);
    if (picture) {
      const maxWidth = 5300000;
      const maxHeight = 2850000;
      const scale = Math.min(maxWidth / picture.width, maxHeight / picture.height);
      shapes.push(pptPicture(id++, `Asset ${picture.asset.assetId}`, picture.relId, picture.asset.alt, left, 3300000,
        Math.round(picture.width * scale), Math.round(picture.height * scale)));
    }
    const cardHeight = slide.claims.length > 2 ? 1300000 : 1500000;
    slide.claims.slice(0, 3).forEach((claim, claimIndex) => {
      const fit = pptFit(claim, 5105000, cardHeight - 300000, slide.claims.length > 1 ? 1600 : 2000, 1200);
      const paragraphs = [pptParagraph(pptRun(fit.text, fit.size, false, foreground), 400)];
      if (slide.claimSources[claimIndex]) paragraphs.push(pptParagraph(pptRun(slide.claimSources[claimIndex], 1100, false, muted)));
      shapes.push(pptShape(id++, `Claim ${claimIndex + 1}`, 6400000, 1750000 + claimIndex * (cardHeight + 150000), 5105000, cardHeight, paragraphs,
        { fill: surface, line: border, geometry: 'roundRect' }, 'ctr'));
    });
  }
  shapes.push(pptShape(id++, 'Footer', left, 6250000, 9400000, 420000, [pptParagraph(pptRun(slide.footer, 1000, false, muted))]));
  shapes.push(pptShape(id++, 'Slide number', 10100000, 6250000, 1400000, 420000, [`<a:p><a:pPr algn="r"/>${pptRun(`${index} / ${total}`, 1000, false, muted)}</a:p>`]));
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<p:sld xmlns:a="${DRAWING_NS}" xmlns:r="${OFFICE_REL}" xmlns:p="${PPT_NS}"><p:cSld><p:bg><p:bgPr><a:solidFill><a:srgbClr val="${background}"/></a:solidFill><a:effectLst/></p:bgPr></p:bg><p:spTree>
<p:nvGrpSpPr><p:cNvPr id="1" name=""/><p:cNvGrpSpPr/><p:nvPr/></p:nvGrpSpPr><p:grpSpPr/>
<p:sp><p:nvSpPr><p:cNvPr id="2" name="Accent band"/><p:cNvSpPr/><p:nvPr/></p:nvSpPr><p:spPr><a:xfrm><a:off x="0" y="0"/><a:ext cx="12192000" cy="91440"/></a:xfrm><a:prstGeom prst="rect"><a:avLst/></a:prstGeom><a:solidFill><a:srgbClr val="${accent}"/></a:solidFill><a:ln><a:noFill/></a:ln></p:spPr></p:sp>
${shapes.join('\n')}
</p:spTree></p:cSld><p:clrMapOvr><a:masterClrMapping/></p:clrMapOvr></p:sld>`;
}
function notesXml(title: string, body: string, notes: string, citations: string[]): string {
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><p:notes xmlns:a="${DRAWING_NS}" xmlns:r="${OFFICE_REL}" xmlns:p="${PPT_NS}"><p:cSld><p:spTree><p:nvGrpSpPr><p:cNvPr id="1" name=""/><p:cNvGrpSpPr/><p:nvPr/></p:nvGrpSpPr><p:grpSpPr/>${pptTextbox(2, 'Notes', 685800, 685800, 7772400, 4572000, [title, body, notes, 'Citations', ...citations], 1400, true, '111111')}</p:spTree></p:cSld><p:clrMapOvr><a:masterClrMapping/></p:clrMapOvr></p:notes>`;
}

function pptTextStyleXml(): string {
  return '<a:lvl1pPr algn="l" defTabSz="914400" marL="0" indent="0"><a:defRPr sz="1800" kern="1200"><a:solidFill><a:schemeClr val="tx1"/></a:solidFill><a:latin typeface="+mn-lt"/><a:ea typeface="+mn-ea"/><a:cs typeface="+mn-cs"/></a:defRPr></a:lvl1pPr>';
}

function pptThemeXml(spec: RenderSpec): string {
  const name = attr(spec.theme.name);
  const accent = spec.theme.accent.slice(1).toUpperCase();
  const background = spec.theme.background.slice(1).toUpperCase();
  const foreground = spec.theme.foreground.slice(1).toUpperCase();
  const font = attr(primaryFont(spec.theme.fontFamily));
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><a:theme xmlns:a="${DRAWING_NS}" name="${name}"><a:themeElements><a:clrScheme name="${name}"><a:dk1><a:srgbClr val="${foreground}"/></a:dk1><a:lt1><a:srgbClr val="${background}"/></a:lt1><a:dk2><a:srgbClr val="1F1F1F"/></a:dk2><a:lt2><a:srgbClr val="F8F8F8"/></a:lt2><a:accent1><a:srgbClr val="${accent}"/></a:accent1><a:accent2><a:srgbClr val="5B9BD5"/></a:accent2><a:accent3><a:srgbClr val="70AD47"/></a:accent3><a:accent4><a:srgbClr val="FFC000"/></a:accent4><a:accent5><a:srgbClr val="C00000"/></a:accent5><a:accent6><a:srgbClr val="7030A0"/></a:accent6><a:hlink><a:srgbClr val="${accent}"/></a:hlink><a:folHlink><a:srgbClr val="7F7F7F"/></a:folHlink></a:clrScheme><a:fontScheme name="${name}"><a:majorFont><a:latin typeface="${font}"/><a:ea typeface=""/><a:cs typeface=""/></a:majorFont><a:minorFont><a:latin typeface="${font}"/><a:ea typeface=""/><a:cs typeface=""/></a:minorFont></a:fontScheme><a:fmtScheme name="${name}"><a:fillStyleLst><a:solidFill><a:schemeClr val="phClr"/></a:solidFill><a:gradFill rotWithShape="1"><a:gsLst><a:gs pos="0"><a:schemeClr val="phClr"><a:tint val="50000"/><a:satMod val="300000"/></a:schemeClr></a:gs><a:gs pos="100000"><a:schemeClr val="phClr"><a:tint val="37000"/><a:satMod val="300000"/></a:schemeClr></a:gs></a:gsLst><a:lin ang="16200000" scaled="1"/></a:gradFill><a:gradFill rotWithShape="1"><a:gsLst><a:gs pos="0"><a:schemeClr val="phClr"><a:shade val="51000"/><a:satMod val="130000"/></a:schemeClr></a:gs><a:gs pos="100000"><a:schemeClr val="phClr"><a:shade val="93000"/><a:satMod val="130000"/></a:schemeClr></a:gs></a:gsLst><a:lin ang="16200000" scaled="0"/></a:gradFill></a:fillStyleLst><a:lnStyleLst><a:ln w="6350" cap="flat" cmpd="sng" algn="ctr"><a:solidFill><a:schemeClr val="phClr"/></a:solidFill><a:prstDash val="solid"/><a:miter lim="800000"/></a:ln><a:ln w="12700" cap="flat" cmpd="sng" algn="ctr"><a:solidFill><a:schemeClr val="phClr"/></a:solidFill><a:prstDash val="solid"/><a:miter lim="800000"/></a:ln><a:ln w="19050" cap="flat" cmpd="sng" algn="ctr"><a:solidFill><a:schemeClr val="phClr"/></a:solidFill><a:prstDash val="solid"/><a:miter lim="800000"/></a:ln></a:lnStyleLst><a:effectStyleLst><a:effectStyle><a:effectLst/></a:effectStyle><a:effectStyle><a:effectLst/></a:effectStyle><a:effectStyle><a:effectLst><a:outerShdw blurRad="57150" dist="19050" dir="5400000" algn="ctr" rotWithShape="0"><a:srgbClr val="000000"><a:alpha val="63000"/></a:srgbClr></a:outerShdw></a:effectLst></a:effectStyle></a:effectStyleLst><a:bgFillStyleLst><a:solidFill><a:schemeClr val="phClr"/></a:solidFill><a:solidFill><a:schemeClr val="phClr"><a:tint val="95000"/><a:satMod val="170000"/></a:schemeClr></a:solidFill><a:gradFill rotWithShape="1"><a:gsLst><a:gs pos="0"><a:schemeClr val="phClr"><a:tint val="93000"/><a:satMod val="150000"/><a:shade val="98000"/></a:schemeClr></a:gs><a:gs pos="100000"><a:schemeClr val="phClr"><a:shade val="63000"/><a:satMod val="120000"/></a:schemeClr></a:gs></a:gsLst><a:lin ang="5400000" scaled="0"/></a:gradFill></a:bgFillStyleLst></a:fmtScheme></a:themeElements><a:objectDefaults/><a:extraClrSchemeLst/></a:theme>`;
}

function pptx(content: ContentIR, spec: RenderSpec, options: AdapterRenderOptions = {}): AdapterFile {
  const assetMap = resolveAssetEmbeds(content, options);
  const embeddedAssets = embeddedImageAssets(assetMap);
  const sourceLabel = (evidenceId: string) => `[${evidenceId}] ${citationFor(content, evidenceId).sourceTitle}`;
  const uniqueSources = [...new Map(content.citations.map((citation) => [citation.canonicalUrl,
    { title: citation.sourceTitle, url: citation.canonicalUrl, retrievedAt: citation.retrievedAt }])).values()];
  const slideModels = [
    { id: 'title', kind: 'title' as const, title: content.title, body: content.summary, decision: content.decision, notes: displayNarration(content.voice.narration),
      claims: content.claims.map((claim) => claim.text), claimSources: content.claims.map((claim) => sourceLabel(claim.evidenceIds[0])), assetIds: [] as string[] },
    ...content.sections.map((section) => {
      const claims = section.claimIds.map((id) => claimFor(content, id));
      return { id: section.sectionId, kind: 'section' as const, title: section.title, body: section.body, decision: undefined as string | undefined, notes: section.speakerNotes,
        claims: claims.map((claim) => claim.text), claimSources: claims.map((claim) => sourceLabel(claim.evidenceIds[0])), assetIds: section.assetIds };
    }),
    { id: 'citations', kind: 'citations' as const, title: 'Sources. Every claim traces to one.', body: '', decision: undefined as string | undefined,
      notes: 'Sources for every claim in this deck.', claims: [] as string[], claimSources: [] as string[], assetIds: [] as string[] }
  ];  const slideRelIds = slideModels.map((_, i) => `rId${i + 2}`);
  const themeRelId = `rId${slideModels.length + 2}`;
  const presPropsRelId = `rId${slideModels.length + 3}`;
  const viewPropsRelId = `rId${slideModels.length + 4}`;
  const tableStylesRelId = `rId${slideModels.length + 5}`;
  const files: ZipFile[] = [
    { name: '[Content_Types].xml', bytes: Buffer.from(`<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/>${embeddedAssets.some((asset) => asset.extension === 'png') ? '<Default Extension="png" ContentType="image/png"/>' : ''}${embeddedAssets.some((asset) => asset.extension === 'jpg') ? '<Default Extension="jpg" ContentType="image/jpeg"/>' : ''}<Override PartName="/docProps/app.xml" ContentType="application/vnd.openxmlformats-officedocument.extended-properties+xml"/><Override PartName="/docProps/core.xml" ContentType="application/vnd.openxmlformats-package.core-properties+xml"/><Override PartName="/ppt/presentation.xml" ContentType="application/vnd.openxmlformats-officedocument.presentationml.presentation.main+xml"/><Override PartName="/ppt/theme/theme1.xml" ContentType="application/vnd.openxmlformats-officedocument.theme+xml"/><Override PartName="/ppt/presProps.xml" ContentType="application/vnd.openxmlformats-officedocument.presentationml.presProps+xml"/><Override PartName="/ppt/viewProps.xml" ContentType="application/vnd.openxmlformats-officedocument.presentationml.viewProps+xml"/><Override PartName="/ppt/tableStyles.xml" ContentType="application/vnd.openxmlformats-officedocument.presentationml.tableStyles+xml"/><Override PartName="/ppt/slideMasters/slideMaster1.xml" ContentType="application/vnd.openxmlformats-officedocument.presentationml.slideMaster+xml"/><Override PartName="/ppt/slideLayouts/slideLayout1.xml" ContentType="application/vnd.openxmlformats-officedocument.presentationml.slideLayout+xml"/>${slideModels.map((_, i) => `<Override PartName="/ppt/slides/slide${i + 1}.xml" ContentType="application/vnd.openxmlformats-officedocument.presentationml.slide+xml"/><Override PartName="/ppt/notesSlides/notesSlide${i + 1}.xml" ContentType="application/vnd.openxmlformats-officedocument.presentationml.notesSlide+xml"/>`).join('')}</Types>`) },
    { name: '_rels/.rels', bytes: Buffer.from(rels([{ id: 'rId1', type: `${OFFICE_REL}/officeDocument`, target: 'ppt/presentation.xml' }, { id: 'rId2', type: 'http://schemas.openxmlformats.org/package/2006/relationships/metadata/core-properties', target: 'docProps/core.xml' }, { id: 'rId3', type: `${OFFICE_REL}/extended-properties`, target: 'docProps/app.xml' }])) },
    { name: 'docProps/core.xml', bytes: Buffer.from(`<?xml version="1.0" encoding="UTF-8" standalone="yes"?><cp:coreProperties xmlns:cp="http://schemas.openxmlformats.org/package/2006/metadata/core-properties" xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:dcterms="http://purl.org/dc/terms/" xmlns:dcmitype="http://purl.org/dc/dcmitype/" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"><dc:title>${text(content.title)}</dc:title><dc:creator>a2swe</dc:creator><cp:lastModifiedBy>a2swe</cp:lastModifiedBy><dcterms:created xsi:type="dcterms:W3CDTF">2020-01-01T00:00:00Z</dcterms:created><dcterms:modified xsi:type="dcterms:W3CDTF">2020-01-01T00:00:00Z</dcterms:modified></cp:coreProperties>`) },
    { name: 'docProps/app.xml', bytes: Buffer.from(`<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Properties xmlns="http://schemas.openxmlformats.org/officeDocument/2006/extended-properties" xmlns:vt="http://schemas.openxmlformats.org/officeDocument/2006/docPropsVTypes"><Application>a2swe</Application><Slides>${slideModels.length}</Slides><Notes>${slideModels.length}</Notes></Properties>`) },
    { name: 'ppt/theme/theme1.xml', bytes: Buffer.from(pptThemeXml(spec)) },
    { name: 'ppt/presProps.xml', bytes: Buffer.from(`<?xml version="1.0" encoding="UTF-8" standalone="yes"?><p:presentationPr xmlns:p="${PPT_NS}"><p:showPr><p:present/></p:showPr></p:presentationPr>`) },
    { name: 'ppt/viewProps.xml', bytes: Buffer.from(`<?xml version="1.0" encoding="UTF-8" standalone="yes"?><p:viewPr xmlns:a="${DRAWING_NS}" xmlns:p="${PPT_NS}"><p:normalViewPr><p:restoredLeft sz="15620"/><p:restoredTop sz="94660"/></p:normalViewPr><p:slideViewPr><p:cSldViewPr><p:cViewPr varScale="1"><p:scale><a:sx n="100" d="100"/><a:sy n="100" d="100"/></p:scale><p:origin x="0" y="0"/></p:cViewPr><p:guideLst/></p:cSldViewPr></p:slideViewPr><p:notesTextViewPr><p:cViewPr><p:scale><a:sx n="100" d="100"/><a:sy n="100" d="100"/></p:scale><p:origin x="0" y="0"/></p:cViewPr></p:notesTextViewPr><p:gridSpacing cx="78028800" cy="78028800"/></p:viewPr>`) },
    { name: 'ppt/tableStyles.xml', bytes: Buffer.from(`<?xml version="1.0" encoding="UTF-8" standalone="yes"?><a:tblStyleLst xmlns:a="${DRAWING_NS}" def="{5C22544A-7EE6-4342-B048-85BDC9FD1C3A}"/>`) },
    { name: 'ppt/slideLayouts/slideLayout1.xml', bytes: Buffer.from(`<?xml version="1.0" encoding="UTF-8" standalone="yes"?><p:sldLayout xmlns:a="${DRAWING_NS}" xmlns:r="${OFFICE_REL}" xmlns:p="${PPT_NS}" type="blank" preserve="1"><p:cSld name="Blank"><p:spTree><p:nvGrpSpPr><p:cNvPr id="1" name=""/><p:cNvGrpSpPr/><p:nvPr/></p:nvGrpSpPr><p:grpSpPr/></p:spTree></p:cSld><p:clrMapOvr><a:masterClrMapping/></p:clrMapOvr></p:sldLayout>`) },
    { name: 'ppt/slideLayouts/_rels/slideLayout1.xml.rels', bytes: Buffer.from(rels([{ id: 'rId1', type: `${OFFICE_REL}/slideMaster`, target: '../slideMasters/slideMaster1.xml' }])) },
    { name: 'ppt/slideMasters/slideMaster1.xml', bytes: Buffer.from(`<?xml version="1.0" encoding="UTF-8" standalone="yes"?><p:sldMaster xmlns:a="${DRAWING_NS}" xmlns:r="${OFFICE_REL}" xmlns:p="${PPT_NS}"><p:cSld><p:bg><p:bgRef idx="1001"><a:schemeClr val="bg1"/></p:bgRef></p:bg><p:spTree><p:nvGrpSpPr><p:cNvPr id="1" name=""/><p:cNvGrpSpPr/><p:nvPr/></p:nvGrpSpPr><p:grpSpPr/></p:spTree></p:cSld><p:clrMap bg1="lt1" tx1="dk1" bg2="lt2" tx2="dk2" accent1="accent1" accent2="accent2" accent3="accent3" accent4="accent4" accent5="accent5" accent6="accent6" hlink="hlink" folHlink="folHlink"/><p:sldLayoutIdLst><p:sldLayoutId id="2147483649" r:id="rId1"/></p:sldLayoutIdLst><p:txStyles><p:titleStyle>${pptTextStyleXml()}</p:titleStyle><p:bodyStyle>${pptTextStyleXml()}</p:bodyStyle><p:otherStyle>${pptTextStyleXml()}</p:otherStyle></p:txStyles></p:sldMaster>`) },
    { name: 'ppt/slideMasters/_rels/slideMaster1.xml.rels', bytes: Buffer.from(rels([{ id: 'rId1', type: `${OFFICE_REL}/slideLayout`, target: '../slideLayouts/slideLayout1.xml' }, { id: 'rId2', type: `${OFFICE_REL}/theme`, target: '../theme/theme1.xml' }])) }
  ];
  files.push({ name: 'ppt/_rels/presentation.xml.rels', bytes: Buffer.from(rels([
    { id: 'rId1', type: `${OFFICE_REL}/slideMaster`, target: 'slideMasters/slideMaster1.xml' },
    ...slideModels.map((_, i) => ({ id: slideRelIds[i], type: `${OFFICE_REL}/slide`, target: `slides/slide${i + 1}.xml` })),
    { id: themeRelId, type: `${OFFICE_REL}/theme`, target: 'theme/theme1.xml' },
    { id: presPropsRelId, type: `${OFFICE_REL}/presProps`, target: 'presProps.xml' },
    { id: viewPropsRelId, type: `${OFFICE_REL}/viewProps`, target: 'viewProps.xml' },
    { id: tableStylesRelId, type: `${OFFICE_REL}/tableStyles`, target: 'tableStyles.xml' }
  ])) });
  files.push({ name: 'ppt/presentation.xml', bytes: Buffer.from(`<?xml version="1.0" encoding="UTF-8" standalone="yes"?><p:presentation xmlns:a="${DRAWING_NS}" xmlns:r="${OFFICE_REL}" xmlns:p="${PPT_NS}" saveSubsetFonts="1"><p:sldMasterIdLst><p:sldMasterId id="2147483648" r:id="rId1"/></p:sldMasterIdLst><p:sldIdLst>${slideModels.map((_, i) => `<p:sldId id="${256 + i}" r:id="${slideRelIds[i]}"/>`).join('')}</p:sldIdLst><p:sldSz cx="12192000" cy="6858000" type="screen16x9"/><p:notesSz cx="6858000" cy="9144000"/><p:defaultTextStyle><a:defPPr><a:defRPr lang="en-US"/></a:defPPr></p:defaultTextStyle></p:presentation>`) });
  for (const asset of embeddedAssets) {
    files.push({ name: `ppt/media/${asset.filename}`, bytes: asset.bytes });
  }
  slideModels.forEach((slide, index) => {
    const citations = slide.kind === 'citations'
      ? content.citations.map((citation) => `${citation.sourceTitle}: ${citation.canonicalUrl}`)
      : slide.kind === 'title'
        ? content.citations.map((citation) => sourceLabel(citation.evidenceId))
        : content.sections.find((section) => section.sectionId === slide.id)?.claimIds.flatMap((id) => claimFor(content, id).evidenceIds).map((evidenceId) => {
          const citation = citationFor(content, evidenceId);
          return `[${citation.evidenceId}] ${citation.sourceTitle}: ${citation.canonicalUrl}`;
        }) ?? [];
    const slidePictures = sectionAssets(content, assetMap, slide.assetIds).filter((item): item is ResolvedAsset & { filename: string; bytes: Buffer; mediaType: SupportedImageMediaType } => Boolean(item.bytes && item.filename && item.mediaType))
      .map((item, pictureIndex) => ({ relId: `rIdImage${pictureIndex + 1}`, asset: item.asset, target: `../media/${item.filename}`, ...imageDimensions(item.bytes, item.mediaType) }));
    const footer = slide.kind === 'section' ? `Sources: ${citations.slice(0, 3).map((line) => line.split(': ')[0]).join('  ·  ')}` : spec.renderId;
    files.push({ name: `ppt/slides/slide${index + 1}.xml`, bytes: Buffer.from(pptSlideXml({ kind: slide.kind, title: slide.title, body: slide.body, claims: slide.claims,
      claimSources: slide.claimSources, footer, sources: uniqueSources, decision: slide.decision, pictures: slidePictures }, spec, index + 1, slideModels.length)) });    files.push({ name: `ppt/slides/_rels/slide${index + 1}.xml.rels`, bytes: Buffer.from(rels([{ id: 'rIdLayout', type: `${OFFICE_REL}/slideLayout`, target: '../slideLayouts/slideLayout1.xml' }, { id: 'rIdNotes', type: `${OFFICE_REL}/notesSlide`, target: `../notesSlides/notesSlide${index + 1}.xml` },
      ...slidePictures.map((picture) => ({ id: picture.relId, type: `${OFFICE_REL}/image`, target: picture.target }))])) });
    files.push({ name: `ppt/notesSlides/notesSlide${index + 1}.xml`, bytes: Buffer.from(notesXml(slide.title, slide.body || content.summary, slide.notes, citations)) });
    files.push({ name: `ppt/notesSlides/_rels/notesSlide${index + 1}.xml.rels`, bytes: Buffer.from(rels([{ id: 'rIdSlide', type: `${OFFICE_REL}/slide`, target: `../slides/slide${index + 1}.xml` }])) });
  });
  return { format: 'pptx', path: 'outputs/deck.pptx', mediaType: 'application/vnd.openxmlformats-officedocument.presentationml.presentation', bytes: zip(files), adapter: 'a2swe-pptx-ooxml-3' };
}

function wp(textValue: string, style?: string, keepNext = false): string {
  return `<w:p>${style || keepNext ? `<w:pPr>${style ? `<w:pStyle w:val="${style}"/>` : ''}${keepNext ? '<w:keepNext/>' : ''}</w:pPr>` : ''}<w:r><w:t xml:space="preserve">${text(textValue)}</w:t></w:r></w:p>`;
}

function hyperlink(textValue: string, relId: string): string {
  return `<w:p><w:hyperlink r:id="${relId}" w:history="1"><w:r><w:rPr><w:rStyle w:val="Hyperlink"/></w:rPr><w:t>${text(textValue)}</w:t></w:r></w:hyperlink></w:p>`;
}

function docxPicture(asset: ContentIR['assets'][number], relId: string, drawingId: number): string {
  return `<w:p><w:r><w:drawing><wp:inline distT="0" distB="0" distL="0" distR="0"><wp:extent cx="4572000" cy="2571750"/><wp:effectExtent l="0" t="0" r="0" b="0"/><wp:docPr id="${drawingId}" name="${attr(asset.assetId)}" descr="${attr(asset.alt)}"/><wp:cNvGraphicFramePr><a:graphicFrameLocks noChangeAspect="1"/></wp:cNvGraphicFramePr><a:graphic><a:graphicData uri="http://schemas.openxmlformats.org/drawingml/2006/picture"><pic:pic><pic:nvPicPr><pic:cNvPr id="${drawingId}" name="${attr(asset.assetId)}" descr="${attr(asset.alt)}"/><pic:cNvPicPr/></pic:nvPicPr><pic:blipFill><a:blip r:embed="${attr(relId)}"/><a:stretch><a:fillRect/></a:stretch></pic:blipFill><pic:spPr><a:xfrm><a:off x="0" y="0"/><a:ext cx="4572000" cy="2571750"/></a:xfrm><a:prstGeom prst="rect"><a:avLst/></a:prstGeom></pic:spPr></pic:pic></a:graphicData></a:graphic></wp:inline></w:drawing></w:r></w:p>`;
}

function docxStyles(spec: RenderSpec): string {
  const font = attr(primaryFont(spec.theme.fontFamily));
  const heading = pptMix(pptColor(spec.theme.accent), '111827', 0.55);
  const run = (size: number, bold = false, color = '111827') => `<w:rPr><w:rFonts w:ascii="${font}" w:hAnsi="${font}" w:cs="${font}"/>${bold ? '<w:b/>' : ''}<w:color w:val="${color}"/><w:sz w:val="${size}"/></w:rPr>`;
  const paragraph = (id: string, name: string, size: number, before: number, after: number, extra = '') =>
    `<w:style w:type="paragraph" w:styleId="${id}"><w:name w:val="${name}"/><w:basedOn w:val="Normal"/><w:next w:val="Normal"/><w:qFormat/><w:pPr><w:keepNext/><w:spacing w:before="${before}" w:after="${after}"/>${extra}</w:pPr>${run(size, true, heading)}</w:style>`;
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><w:styles xmlns:w="${WORD_NS}"><w:docDefaults><w:rPrDefault>${run(22)}</w:rPrDefault><w:pPrDefault><w:pPr><w:spacing w:after="120" w:line="288" w:lineRule="auto"/></w:pPr></w:pPrDefault></w:docDefaults>`
    + `<w:style w:type="paragraph" w:default="1" w:styleId="Normal"><w:name w:val="Normal"/><w:qFormat/></w:style>`
    + paragraph('Title', 'Title', 52, 0, 240, '<w:jc w:val="left"/>')
    + paragraph('Heading1', 'heading 1', 32, 360, 120, '<w:outlineLvl w:val="0"/>')
    + paragraph('Heading2', 'heading 2', 24, 200, 80, '<w:outlineLvl w:val="1"/>')
    + `<w:style w:type="character" w:styleId="Hyperlink"><w:name w:val="Hyperlink"/><w:rPr><w:color w:val="0563C1"/><w:u w:val="single"/></w:rPr></w:style></w:styles>`;
}

function docx(content: ContentIR, spec: RenderSpec, options: AdapterRenderOptions = {}): AdapterFile {
  const assetMap = resolveAssetEmbeds(content, options);
  const embeddedAssets = embeddedImageAssets(assetMap);
  const citationRels = content.citations.map((citation, index) => ({ id: `rId${index + 2}`, type: `${OFFICE_REL}/hyperlink`, target: citation.canonicalUrl, targetMode: 'External' as const }));
  const assetRelOffset = citationRels.length + 2;
  const assetRels = embeddedAssets.map((asset, index) => ({ id: `rId${assetRelOffset + index}`, type: `${OFFICE_REL}/image`, target: `media/${asset.filename}` }));
  // The TOC field carries a rendered result so it reads correctly before Word refreshes it.
  const tocEntries = ['Executive Summary', ...content.sections.map((section) => section.title), 'Citations'];
  const body = [
    wp(content.title, 'Title'),
    wp('Contents', 'Heading1'),
    ...tocEntries.map((entry, index) => `<w:p>${index === 0 ? '<w:r><w:fldChar w:fldCharType="begin"/></w:r><w:r><w:instrText xml:space="preserve"> TOC \\o "1-1" \\h \\z \\u </w:instrText></w:r><w:r><w:fldChar w:fldCharType="separate"/></w:r>' : ''}<w:r><w:t xml:space="preserve">${text(entry)}</w:t></w:r>${index === tocEntries.length - 1 ? '<w:r><w:fldChar w:fldCharType="end"/></w:r>' : ''}</w:p>`),
    wp('Executive Summary', 'Heading1'),
    wp(content.summary),
    wp(`Audience: ${content.audience}`),
    wp(`Decision: ${content.decision}`),
    wp('Narration', 'Heading2'),
    ...narrationParagraphs(content).map((paragraph) => wp(paragraph)),
    ...content.sections.flatMap((section) => [
      wp(section.title, 'Heading1'),
      wp(section.body),
      wp('Claims', 'Heading2'),
      ...section.claimIds.map((id) => wp(claimFor(content, id).text)),
      wp('Speaker notes', 'Heading2'),
      wp(section.speakerNotes),
      ...(section.assetIds.length ? [wp('Assets and alt text', 'Heading2'), ...sectionAssets(content, assetMap, section.assetIds).flatMap((item, assetIndex) => {
        const relIndex = embeddedAssets.findIndex((embedded) => embedded.asset.assetId === item.asset.assetId);
        return relIndex >= 0
          ? [wp(`${item.asset.assetId}: ${item.asset.alt}`, undefined, true), docxPicture(item.asset, assetRels[relIndex].id, 100 + assetIndex)]
          : [wp(`${item.asset.assetId}: ${item.asset.alt} (digest-only reference; raster bytes not supplied to DOCX adapter)`)];
      })] : [])
    ]),
    wp('Citations', 'Heading1'),
    ...content.citations.map((citation, index) => hyperlink(`${citation.sourceTitle} (${citation.retrievedAt})`, `rId${index + 2}`)),
    '<w:sectPr><w:pgSz w:w="12240" w:h="15840"/><w:pgMar w:top="1440" w:right="1440" w:bottom="1440" w:left="1440" w:header="720" w:footer="720" w:gutter="0"/></w:sectPr>'
  ].join('');
  const files: ZipFile[] = [
    { name: '[Content_Types].xml', bytes: Buffer.from(`<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/>${embeddedAssets.some((asset) => asset.extension === 'png') ? '<Default Extension="png" ContentType="image/png"/>' : ''}${embeddedAssets.some((asset) => asset.extension === 'jpg') ? '<Default Extension="jpg" ContentType="image/jpeg"/>' : ''}<Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/><Override PartName="/word/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.styles+xml"/><Override PartName="/docProps/core.xml" ContentType="application/vnd.openxmlformats-package.core-properties+xml"/></Types>`) },
    { name: '_rels/.rels', bytes: Buffer.from(rels([{ id: 'rId1', type: `${OFFICE_REL}/officeDocument`, target: 'word/document.xml' }, { id: 'rId2', type: `${OFFICE_REL}/metadata/core-properties`, target: 'docProps/core.xml' }])) },
    { name: 'docProps/core.xml', bytes: Buffer.from(`<?xml version="1.0" encoding="UTF-8" standalone="yes"?><cp:coreProperties xmlns:cp="http://schemas.openxmlformats.org/package/2006/metadata/core-properties" xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:dcterms="http://purl.org/dc/terms/" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"><dc:title>${text(content.title)}</dc:title><dc:creator>a2swe</dc:creator><dcterms:created xsi:type="dcterms:W3CDTF">2020-01-01T00:00:00Z</dcterms:created><dcterms:modified xsi:type="dcterms:W3CDTF">2020-01-01T00:00:00Z</dcterms:modified></cp:coreProperties>`) },
    { name: 'word/_rels/document.xml.rels', bytes: Buffer.from(rels([{ id: 'rId1', type: `${OFFICE_REL}/styles`, target: 'styles.xml' }, ...citationRels, ...assetRels])) },
    { name: 'word/styles.xml', bytes: Buffer.from(docxStyles(spec)) },
    { name: 'word/document.xml', bytes: Buffer.from(`<?xml version="1.0" encoding="UTF-8" standalone="yes"?><w:document xmlns:w="${WORD_NS}" xmlns:r="${OFFICE_REL}" xmlns:wp="http://schemas.openxmlformats.org/drawingml/2006/wordprocessingDrawing" xmlns:a="${DRAWING_NS}" xmlns:pic="http://schemas.openxmlformats.org/drawingml/2006/picture"><w:body>${body}</w:body></w:document>`) }
  ];
  for (const asset of embeddedAssets) {
    files.push({ name: `word/media/${asset.filename}`, bytes: asset.bytes });
  }
  return { format: 'docx', path: 'outputs/document.docx', mediaType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', bytes: zip(files), adapter: 'a2swe-docx-ooxml-3' };
}

const WIN_ANSI: Record<string, string> = {
  '•': '\x95', '–': '\x96', '—': '\x97', '…': '\x85', '‘': '\x91', '’': '\x92', '“': '\x93', '”': '\x94', '→': '->', '←': '<-', '×': '\xD7'
};

function pdfEscape(value: string): string {
  const encoded = [...value].map((character) => WIN_ANSI[character] ?? (character.charCodeAt(0) <= 255 ? character : '?')).join('');
  return encoded.replaceAll('\\', '\\\\').replaceAll('(', '\\(').replaceAll(')', '\\)').replaceAll('\r', ' ').replaceAll('\n', ' ');
}

// Narration is written for speech ("H I P A A", "O Auth"); documents show the written form.
function displayNarration(value: string): string {
  return value.replace(/\b(?:[A-Z] )+[A-Z]\b/g, (spelled) => spelled.replace(/ /g, '')).replace(/\bO Auth\b/g, 'OAuth');
}

function narrationParagraphs(content: ContentIR): string[] {
  return displayNarration(content.voice.narration).split(/\r?\n[ \t]*\r?\n/).map((part) => part.trim()).filter(Boolean);
}

type PdfLine = { text: string; font: 'F1' | 'F2'; size: number; leading: number; indent: number; gapBefore: number; keepWithNext?: boolean; image?: { name: string; width: number; height: number } };
type PositionedPdfLine = PdfLine & { y: number };
type RasterBitmap = { width: number; height: number; data: Uint8Array };
type PdfImageXObject = { width: number; height: number; colorSpace: '/DeviceRGB' | '/DeviceGray'; bitsPerComponent: 8; filter: '/FlateDecode' | '/DCTDecode'; bytes: Buffer };
type EmbeddedImage = ResolvedAsset & { bytes: Buffer; mediaType: SupportedImageMediaType; extension: 'png' | 'jpg'; filename: string };

const PDF_WIDTH = 612;
const PDF_HEIGHT = 792;
const PDF_MARGIN = 54;
const PDF_TOP = PDF_HEIGHT - PDF_MARGIN;
const PDF_BOTTOM = PDF_MARGIN;
function pdfMaxChars(size: number, indent = 0): number {
  const availableWidth = PDF_WIDTH - PDF_MARGIN * 2 - indent;
  return Math.max(24, Math.floor(availableWidth / (size * 0.52)));
}

function wrapPdfText(value: string, size: number, indent = 0): string[] {
  const maxChars = pdfMaxChars(size, indent);
  const words = value.replace(/\s+/g, ' ').trim().split(' ').filter(Boolean);
  const lines: string[] = [];
  let current = '';
  for (const word of words) {
    if (!current) {
      current = word;
    } else if (`${current} ${word}`.length <= maxChars) {
      current = `${current} ${word}`;
    } else {
      lines.push(current);
      current = word;
    }
    while (current.length > maxChars) {
      lines.push(current.slice(0, maxChars));
      current = current.slice(maxChars);
    }
  }
  if (current) lines.push(current);
  return lines.length ? lines : [''];
}

function pushPdfBlock(lines: PdfLine[], value: string, options: Partial<PdfLine> = {}): void {
  const size = options.size ?? 11;
  const indent = options.indent ?? 0;
  const wrapped = wrapPdfText(value, size, indent);
  wrapped.forEach((line, index) => lines.push({
    text: line,
    font: options.font ?? 'F1',
    size,
    leading: options.leading ?? Math.ceil(size * 1.45),
    indent,
    gapBefore: index === 0 ? options.gapBefore ?? 0 : 0
  }));
}

function paginatePdfLines(lines: PdfLine[]): PositionedPdfLine[][] {
  const pages: PositionedPdfLine[][] = [[]];
  let y = PDF_TOP;
  for (const [index, line] of lines.entries()) {
    // A run of keepWithNext lines and the line after it stay on one page.
    let requiredHeight = line.gapBefore + line.leading;
    if (line.keepWithNext && !(index > 0 && lines[index - 1].keepWithNext)) {
      for (let follow = index + 1; follow < lines.length; follow += 1) {
        requiredHeight += lines[follow].gapBefore + lines[follow].leading;
        if (!lines[follow].keepWithNext) break;
      }
    }
    if (pages.at(-1)!.length > 0 && y - requiredHeight < PDF_BOTTOM) {
      pages.push([]);
      y = PDF_TOP;
    }
    y -= line.gapBefore;
    pages.at(-1)!.push({ ...line, y });
    y -= line.leading;
  }
  return pages.filter((page) => page.length > 0);
}

function embeddedImageAssets(assetMap: Map<string, ResolvedAsset>): EmbeddedImage[] {
  return [...assetMap.values()].filter((item): item is EmbeddedImage => Boolean(item.bytes && item.mediaType && item.extension && item.filename));
}

function readUInt32BE(bytes: Buffer, offset: number): number {
  if (offset + 4 > bytes.length) throw new Error('invalid_image_dimensions');
  return bytes.readUInt32BE(offset);
}

function parsePngImage(bytes: Buffer): RasterBitmap {
  if (!bytes.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))) throw new Error('invalid_png_asset');
  let offset = 8;
  let width = 0;
  let height = 0;
  let bitDepth = 0;
  let colorType = 0;
  let interlace = 0;
  let palette: Buffer | undefined;
  const idat: Buffer[] = [];
  while (offset + 12 <= bytes.length) {
    const length = bytes.readUInt32BE(offset);
    const type = bytes.subarray(offset + 4, offset + 8).toString('ascii');
    const payload = bytes.subarray(offset + 8, offset + 8 + length);
    if (type === 'IHDR') {
      width = readUInt32BE(payload, 0);
      height = readUInt32BE(payload, 4);
      bitDepth = payload[8];
      colorType = payload[9];
      interlace = payload[12];
    } else if (type === 'PLTE') {
      palette = payload;
    } else if (type === 'IDAT') {
      idat.push(payload);
    } else if (type === 'IEND') {
      break;
    }
    offset += 12 + length;
  }
  if (!width || !height || bitDepth !== 8 || interlace !== 0) throw new Error('unsupported_png_asset');
  const channels = colorType === 0 ? 1 : colorType === 2 ? 3 : colorType === 3 ? 1 : colorType === 4 ? 2 : colorType === 6 ? 4 : 0;
  if (!channels) throw new Error('unsupported_png_asset');
  if (colorType === 3 && !palette) throw new Error('unsupported_png_asset');
  const rowLength = width * channels;
  const inflated = inflateSync(Buffer.concat(idat));
  const decoded = Buffer.alloc(rowLength * height);
  for (let row = 0; row < height; row += 1) {
    const filter = inflated[row * (rowLength + 1)];
    const inputOffset = row * (rowLength + 1) + 1;
    const outputOffset = row * rowLength;
    for (let col = 0; col < rowLength; col += 1) {
      const raw = inflated[inputOffset + col];
      const left = col >= channels ? decoded[outputOffset + col - channels] : 0;
      const up = row > 0 ? decoded[outputOffset + col - rowLength] : 0;
      const upLeft = row > 0 && col >= channels ? decoded[outputOffset + col - rowLength - channels] : 0;
      const predictor = filter === 0 ? 0
        : filter === 1 ? left
          : filter === 2 ? up
            : filter === 3 ? Math.floor((left + up) / 2)
              : (() => {
                const p = left + up - upLeft;
                const pa = Math.abs(p - left);
                const pb = Math.abs(p - up);
                const pc = Math.abs(p - upLeft);
                return pa <= pb && pa <= pc ? left : pb <= pc ? up : upLeft;
              })();
      decoded[outputOffset + col] = (raw + predictor) & 255;
    }
  }
  const rgb = new Uint8Array(width * height * 3);
  for (let pixel = 0; pixel < width * height; pixel += 1) {
    const source = pixel * channels;
    const target = pixel * 3;
    if (colorType === 0) {
      rgb[target] = decoded[source];
      rgb[target + 1] = decoded[source];
      rgb[target + 2] = decoded[source];
    } else if (colorType === 2) {
      rgb[target] = decoded[source];
      rgb[target + 1] = decoded[source + 1];
      rgb[target + 2] = decoded[source + 2];
    } else if (colorType === 3) {
      const paletteIndex = decoded[source] * 3;
      rgb[target] = palette![paletteIndex] ?? 255;
      rgb[target + 1] = palette![paletteIndex + 1] ?? 255;
      rgb[target + 2] = palette![paletteIndex + 2] ?? 255;
    } else if (colorType === 4) {
      const alpha = decoded[source + 1] / 255;
      const gray = decoded[source];
      rgb[target] = Math.round(gray * alpha + 255 * (1 - alpha));
      rgb[target + 1] = rgb[target];
      rgb[target + 2] = rgb[target];
    } else {
      const alpha = decoded[source + 3] / 255;
      rgb[target] = Math.round(decoded[source] * alpha + 255 * (1 - alpha));
      rgb[target + 1] = Math.round(decoded[source + 1] * alpha + 255 * (1 - alpha));
      rgb[target + 2] = Math.round(decoded[source + 2] * alpha + 255 * (1 - alpha));
    }
  }
  return { width, height, data: rgb };
}

function jpegDimensions(bytes: Buffer): { width: number; height: number; components: number } {
  if (bytes[0] !== 255 || bytes[1] !== 216) throw new Error('invalid_jpeg_asset');
  let offset = 2;
  while (offset + 4 < bytes.length) {
    while (bytes[offset] === 255) offset += 1;
    const marker = bytes[offset];
    offset += 1;
    if (marker === 0xd9 || marker === 0xda) break;
    const length = bytes.readUInt16BE(offset);
    if ((marker >= 0xc0 && marker <= 0xc3) || (marker >= 0xc5 && marker <= 0xc7) || (marker >= 0xc9 && marker <= 0xcb) || (marker >= 0xcd && marker <= 0xcf)) {
      return { height: bytes.readUInt16BE(offset + 3), width: bytes.readUInt16BE(offset + 5), components: bytes[offset + 7] };
    }
    offset += length;
  }
  throw new Error('invalid_jpeg_dimensions');
}

function pdfImageXObject(asset: EmbeddedImage): PdfImageXObject {
  if (asset.mediaType === 'image/jpeg') {
    const dims = jpegDimensions(asset.bytes);
    return { width: dims.width, height: dims.height, colorSpace: dims.components === 1 ? '/DeviceGray' : '/DeviceRGB', bitsPerComponent: 8, filter: '/DCTDecode', bytes: asset.bytes };
  }
  const png = parsePngImage(asset.bytes);
  const raw = Buffer.from(png.data.buffer, png.data.byteOffset, png.data.byteLength);
  return { width: png.width, height: png.height, colorSpace: '/DeviceRGB', bitsPerComponent: 8, filter: '/FlateDecode', bytes: deflateSync(raw) };
}

function raster(content: ContentIR, spec: RenderSpec, format: 'png' | 'jpeg', options: AdapterRenderOptions = {}): AdapterFile {
  const assetMap = resolveAssetEmbeds(content, options);
  const bytes = renderRasterOverview(content, spec, assetMap, format);
  return {
    format,
    path: `outputs/raster.${format === 'png' ? 'png' : 'jpg'}`,
    mediaType: format === 'png' ? 'image/png' : 'image/jpeg',
    bytes,
    adapter: `a2swe-${format}-raster-1080p-2`
  };
}

function pdf(content: ContentIR, options: AdapterRenderOptions = {}): AdapterFile {
  const assetMap = resolveAssetEmbeds(content, options);
  const embeddedAssets = embeddedImageAssets(assetMap);
  const imageResources: { name: string; image: PdfImageXObject }[] = [];
  const pdfImages = new Map<string, { name: string; width: number; height: number }>();
  for (const asset of embeddedAssets) {
    const image = pdfImageXObject(asset);
    const scale = Math.min((PDF_WIDTH - PDF_MARGIN * 2) / image.width, 260 / image.height, 1);
    const name = `Im${imageResources.length + 1}`;
    imageResources.push({ name, image });
    pdfImages.set(asset.asset.assetId, { name, width: image.width * scale, height: image.height * scale });
  }
  const lines: PdfLine[] = [];
  pushPdfBlock(lines, content.title, { font: 'F2', size: 18, leading: 24 });
  pushPdfBlock(lines, `Audience: ${content.audience}`, { gapBefore: 12 });
  pushPdfBlock(lines, `Decision: ${content.decision}`);
  pushPdfBlock(lines, 'Executive Summary', { font: 'F2', size: 14, leading: 19, gapBefore: 14 });
  pushPdfBlock(lines, content.summary);
  pushPdfBlock(lines, 'Narration', { font: 'F2', size: 12, leading: 17, gapBefore: 10 });
  narrationParagraphs(content).forEach((paragraph, index) => pushPdfBlock(lines, paragraph, { gapBefore: index ? 5 : 0 }));
  content.sections.forEach((section, index) => {
    pushPdfBlock(lines, `${index + 1}. ${section.title}`, { font: 'F2', size: 14, leading: 19, gapBefore: 14 });
    pushPdfBlock(lines, section.body);
    pushPdfBlock(lines, 'Claims', { font: 'F2', size: 12, leading: 17, gapBefore: 8 });
    section.claimIds.forEach((id) => pushPdfBlock(lines, `• ${claimFor(content, id).text}`, { indent: 18 }));
    if (section.assetIds.length) {
      pushPdfBlock(lines, 'Assets and alt text', { font: 'F2', size: 12, leading: 17, gapBefore: 8 });
      section.assetIds.forEach((id) => {
        const asset = content.assets.find((item) => item.assetId === id)!;
        const resolved = assetMap.get(asset.assetId);
        const status = resolved?.bytes ? 'embedded image' : 'digest-only reference; raster bytes not supplied';
        const blockStart = lines.length;
        pushPdfBlock(lines, `• ${asset.assetId}: ${asset.alt} (${status})`, { indent: 18 });
        const embedded = pdfImages.get(asset.assetId);
        if (embedded) {
          for (let keep = blockStart; keep < lines.length; keep += 1) lines[keep].keepWithNext = true;
          lines.push({ text: '', font: 'F1', size: 10, leading: embedded.height + 10, indent: 0, gapBefore: 6, image: embedded });
        }
      });
    }
    pushPdfBlock(lines, 'Speaker notes', { font: 'F2', size: 12, leading: 17, gapBefore: 8 });
    pushPdfBlock(lines, section.speakerNotes);
  });
  pushPdfBlock(lines, 'Citations', { font: 'F2', size: 14, leading: 19, gapBefore: 14 });
  content.citations.forEach((citation) => pushPdfBlock(lines,
    `[${citation.evidenceId}] ${citation.sourceTitle} ${citation.canonicalUrl} retrieved ${citation.retrievedAt}`));
  const pages = paginatePdfLines(lines).map((pageLines) => ({
    stream: pageLines.map((line) => line.image
      ? `q ${line.image.width.toFixed(3)} 0 0 ${line.image.height.toFixed(3)} ${PDF_MARGIN} ${(line.y - line.image.height).toFixed(3)} cm /${line.image.name} Do Q`
      : `BT /${line.font} ${line.size} Tf ${PDF_MARGIN + line.indent} ${line.y} Td (${pdfEscape(line.text)}) Tj ET`).join('\n'),
    xobjects: [...new Set(pageLines.flatMap((line) => line.image ? [line.image.name] : []))]
      .map((name) => imageResources.find((resource) => resource.name === name)!)
  }));  const objects: string[] = ['<< /Type /Catalog /Pages 2 0 R >>'];
  const pageObjectNumbers = pages.map((_, index) => 3 + index * 2);
  const firstImageObject = 3 + pages.length * 2;
  const regularFontObject = firstImageObject + imageResources.length;
  const boldFontObject = regularFontObject + 1;
  const imageObjectNumbers = new Map(imageResources.map((resource, index) => [resource.name, firstImageObject + index]));
  objects.push(`<< /Type /Pages /Kids [${pageObjectNumbers.map((num) => `${num} 0 R`).join(' ')}] /Count ${pages.length} >>`);
  pages.forEach((page, index) => {
    const pageNumber = 3 + index * 2;
    const contentNumber = pageNumber + 1;
    const xobjectEntries = page.xobjects.length
      ? ` /XObject << ${page.xobjects.map((resource) => `/${resource.name} ${imageObjectNumbers.get(resource.name)} 0 R`).join(' ')} >>`
      : '';
    objects.push(`<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${PDF_WIDTH} ${PDF_HEIGHT}] /Resources << /Font << /F1 ${regularFontObject} 0 R /F2 ${boldFontObject} 0 R >>${xobjectEntries} >> /Contents ${contentNumber} 0 R >>`);
    objects.push(`<< /Length ${Buffer.byteLength(page.stream, 'binary')} >>\nstream\n${page.stream}\nendstream`);
  });
  for (const resource of imageResources) {
    objects.push(`<< /Type /XObject /Subtype /Image /Width ${resource.image.width} /Height ${resource.image.height} /ColorSpace ${resource.image.colorSpace} /BitsPerComponent ${resource.image.bitsPerComponent} /Filter ${resource.image.filter} /Length ${resource.image.bytes.length} >>\nstream\n${resource.image.bytes.toString('binary')}\nendstream`);
  }
  objects.push('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>');
  objects.push('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>');
  let output = '%PDF-1.7\n%\xE2\xE3\xCF\xD3\n';
  const offsets = [0];
  for (const [index, object] of objects.entries()) {
    offsets.push(Buffer.byteLength(output, 'binary'));
    output += `${index + 1} 0 obj\n${object}\nendobj\n`;
  }
  const xref = Buffer.byteLength(output, 'binary');
  output += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n${offsets.slice(1).map((offset) => `${String(offset).padStart(10, '0')} 00000 n `).join('\n')}\n`;
  output += `trailer << /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF\n`;
  return { format: 'pdf', path: 'outputs/document.pdf', mediaType: 'application/pdf', bytes: Buffer.from(output, 'binary'), adapter: 'a2swe-pdf-searchable-3' };
}

function withVisualImages(content: ContentIR, options: AdapterRenderOptions): { content: ContentIR; options: AdapterRenderOptions } {
  const images = options.visualImages ?? [];
  if (!images.length) return { content, options };
  const embeds: AdapterAssetEmbed[] = [...(options.assetEmbeds ?? [])];
  const assets = [...content.assets];
  const sections = content.sections.map((section): ContentIR['sections'][number] => {
    const image = images.find((item) => item.sectionId === section.sectionId);
    if (!image || !section.visual) return section;
    assertSupportedImageBytes('image/png', image.bytes, section.sectionId);
    const assetId = `visual-${slug(section.sectionId)}`;
    assets.push({ assetId, digest: sha256(image.bytes), mediaType: 'image/png', role: 'diagram',
      alt: `${section.visual.caption} (${section.visual.kind} diagram)` });
    embeds.push({ assetId, mediaType: 'image/png', bytes: image.bytes });
    return { ...section, assetIds: [...section.assetIds, assetId] };
  });
  return { content: { ...content, assets, sections: sections as ContentIR['sections'] }, options: { ...options, assetEmbeds: embeds } };
}
export function renderFiles(contentInput: unknown, specInput: unknown, options: AdapterRenderOptions = {}): AdapterFile[] {
  const content = validate('ContentIR', contentInput);
  const spec = validate('RenderSpec', specInput);
  if (digest(content) !== spec.contentDigest) throw new Error('render_content_digest_mismatch');
  const files: AdapterFile[] = [];
  const documents = withVisualImages(content, options);
  for (const format of spec.formats) {
    if (format === 'html') files.push(html(documents.content, spec, documents.options));
    else if (format === 'adaptiveDeck') files.push(adaptiveDeck(documents.content, spec, documents.options));
    else if (format === 'pptx') files.push(pptx(documents.content, spec, documents.options));
    else if (format === 'docx') files.push(docx(documents.content, spec, documents.options));
    else if (format === 'pdf') files.push(pdf(documents.content, documents.options));
    else if (format === 'png' || format === 'jpeg') files.push(raster(documents.content, spec, format, documents.options));
    else if (format === 'remotion') files.push(...remotion(content, spec, options));
  }
  if (new Set(files.map((file) => file.path)).size !== files.length) throw new Error('duplicate_adapter_output');
  return files;
}
