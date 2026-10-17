import { ImageData, GlobalFonts, createCanvas } from '@napi-rs/canvas';
import type { SKRSContext2D } from '@napi-rs/canvas';
import jpeg from 'jpeg-js';
import { PNG } from 'pngjs';
import { fileURLToPath } from 'node:url';
import { brandTokens, fontFamilies } from './brand.ts';
import { digest } from './canonical.ts';
import type { ContentIR, RenderSpec } from './contracts.ts';
import { assetLimits } from './assets.ts';

const WIDTH = 1920;
const HEIGHT = 1080;
const bodyFont = fileURLToPath(new URL('../../../template/public/fonts/NotoSansSC.ttf', import.meta.url));

type RasterAsset = { bytes?: Buffer; mediaType?: 'image/png' | 'image/jpeg' };
type Face = { family: string; weight: number };

function fonts(): void {
  if (!GlobalFonts.has('A2SWE Sans') && !GlobalFonts.registerFromPath(bodyFont, 'A2SWE Sans')) {
    throw new Error('raster_body_font_unavailable');
  }
}

// A brand stack resolves to its first installed family; the bundled face stays in the list as the glyph fallback.
function face(stack: string, weight: number): Face {
  const family = fontFamilies(stack).find((name) => GlobalFonts.has(name));
  return { family: family ? `"${family}", "A2SWE Sans"` : '"A2SWE Sans"', weight };
}

function setFont(ctx: SKRSContext2D, size: number, font: Face): void {
  ctx.font = `${font.weight} ${size}px ${font.family}`;
}

function roundRect(ctx: SKRSContext2D, x: number, y: number, width: number, height: number, radius: number): void {
  const r = Math.min(radius, width / 2, height / 2);
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + width, y, x + width, y + height, r);
  ctx.arcTo(x + width, y + height, x, y + height, r);
  ctx.arcTo(x, y + height, x, y, r);
  ctx.arcTo(x, y, x + width, y, r);
  ctx.closePath();
}

function splitWord(ctx: SKRSContext2D, word: string, width: number): string[] {
  const parts: string[] = [];
  let part = '';
  for (const char of word) {
    if (part && ctx.measureText(part + char).width > width) {
      parts.push(part);
      part = char;
    } else {
      part += char;
    }
  }
  if (part) parts.push(part);
  return parts;
}

function wrap(ctx: SKRSContext2D, value: string, width: number): string[] {
  const words = value.trim().split(/\s+/u).filter(Boolean);
  const lines: string[] = [];
  let line = '';
  for (const word of words) {
    for (const part of ctx.measureText(word).width > width ? splitWord(ctx, word, width) : [word]) {
      const next = line ? `${line} ${part}` : part;
      if (line && ctx.measureText(next).width > width) {
        lines.push(line);
        line = part;
      } else {
        line = next;
      }
    }
  }
  if (line) lines.push(line);
  return lines;
}

function block(ctx: SKRSContext2D, value: string, x: number, top: number, width: number,
  size: number, maxLines: number, leading: number, font: Face): boolean {
  setFont(ctx, size, font);
  const lines = wrap(ctx, value, width);
  if (lines.length > maxLines) {
    let last = lines[maxLines - 1];
    while (last && ctx.measureText(`${last}\u2026`).width > width) last = last.slice(0, -1);
    lines[maxLines - 1] = `${last}\u2026`;
  }
  lines.slice(0, maxLines).forEach((line, index) => ctx.fillText(line, x, top + size + index * leading));
  return lines.length > maxLines;
}

function image(ctx: SKRSContext2D, asset: RasterAsset, x: number, y: number, width: number, height: number): boolean {
  if (!asset.bytes) return false;
  if (asset.bytes.length > assetLimits.bytes) throw new Error('asset_byte_limit');
  if (!asset.mediaType) throw new Error('raster_asset_media_type_missing');
  if (asset.mediaType === 'image/png' && asset.bytes.length >= 24
    && asset.bytes.readUInt32BE(16) * asset.bytes.readUInt32BE(20) > assetLimits.pixels) throw new Error('asset_pixel_limit');
  const decoded = asset.mediaType === 'image/png'
    ? PNG.sync.read(asset.bytes, { checkCRC: true })
    : jpeg.decode(asset.bytes, { useTArray: true, formatAsRGBA: true, maxResolutionInMP: 8.3, maxMemoryUsageInMB: 64 });
  if (!decoded.width || !decoded.height || decoded.width * decoded.height > assetLimits.pixels) throw new Error('asset_pixel_limit');
  const source = createCanvas(decoded.width, decoded.height);
  source.getContext('2d').putImageData(new ImageData(Uint8ClampedArray.from(decoded.data), decoded.width, decoded.height), 0, 0);
  const scale = Math.min(width / source.width, height / source.height);
  ctx.drawImage(source, x + (width - source.width * scale) / 2, y + (height - source.height * scale) / 2,
    source.width * scale, source.height * scale);
  return true;
}

export function renderRasterOverview(content: ContentIR, spec: RenderSpec, assets: Map<string, RasterAsset>,
  format: 'png' | 'jpeg'): Buffer {
  fonts();
  const t = brandTokens(spec.theme);
  const heading = face(t.headingFont, t.headingWeight >= 800 ? 800 : 700);
  const body = face(t.bodyFont, 400);
  const label = face(t.bodyFont, 700);
  const radius = Math.round(t.radius * 1.5);
  const canvas = createCanvas(WIDTH, HEIGHT);
  const ctx = canvas.getContext('2d');
  let excerpted = false;
  ctx.fillStyle = t.canvas;
  ctx.fillRect(0, 0, WIDTH, HEIGHT);
  ctx.fillStyle = t.header;
  ctx.fillRect(0, 0, WIDTH, 96);
  ctx.fillStyle = t.highlight;
  ctx.fillRect(0, 96, WIDTH, 8);
  ctx.fillStyle = t.onHeader;
  const kicker = (content.title.match(/^(.+?[.:!?])\s+(.+)$/)?.[1].replace(/[:.]$/, '') ?? content.title);
  excerpted = block(ctx, `${content.distribution === 'internal' ? 'Internal · ' : ''}${kicker}`.toUpperCase(), 70, 34, 1500, 24, 1, 30, label) || excerpted;
  ctx.fillStyle = t.headerMuted;
  setFont(ctx, 20, label);
  ctx.textAlign = 'right';
  ctx.fillText('OVERVIEW', 1850, 58);
  ctx.textAlign = 'left';

  ctx.fillStyle = t.text;
  excerpted = block(ctx, content.title, 70, 124, 1780, 56, 2, 66, heading) || excerpted;
  ctx.fillStyle = t.muted;
  excerpted = block(ctx, content.summary, 70, 262, 1740, 26, 2, 37, body) || excerpted;

  ctx.fillStyle = t.callout;
  roundRect(ctx, 70, 352, 1780, 74, radius / 2);
  ctx.fill();
  ctx.fillStyle = t.calloutLine;
  ctx.fillRect(70, 352, 8, 74);
  ctx.fillStyle = t.text;
  excerpted = block(ctx, `DECISION  ${content.decision}`, 104, 361, 1720, 24, 2, 30, label) || excerpted;

  const cardTop = 448;
  const cardHeight = 494;
  for (const [x, width] of [[70, 865], [965, 885]] as const) {
    ctx.fillStyle = t.paper;
    roundRect(ctx, x, cardTop, width, cardHeight, radius);
    ctx.fill();
    ctx.strokeStyle = t.line;
    ctx.lineWidth = 2;
    ctx.stroke();
  }

  ctx.fillStyle = t.muted;
  setFont(ctx, 22, label);
  ctx.fillText(`SECTIONS  /  ${Math.min(content.sections.length, 2)} OF ${content.sections.length}`, 104, 503);
  content.sections.slice(0, 2).forEach((section, index) => {
    const top = index === 0 ? 531 : 753;
    ctx.fillStyle = t.text;
    excerpted = block(ctx, `${index + 1}. ${section.title}`, 104, top, 784, 31, 2, 41, heading) || excerpted;
    excerpted = block(ctx, section.body, 104, top + 85, 784, 23, index === 0 ? 3 : 2, 31, body) || excerpted;
  });
  if (content.sections.length > 2) excerpted = true;

  ctx.fillStyle = t.muted;
  setFont(ctx, 22, label);
  ctx.fillText(`CLAIMS  /  ${Math.min(content.claims.length, 1)} OF ${content.claims.length}`, 999, 503);
  if (content.claims.length) {
    ctx.fillStyle = t.text;
    excerpted = block(ctx, content.claims[0].text, 999, 524, 816, 26, 3, 37, body) || excerpted;
  }
  if (content.claims.length > 1) excerpted = true;

  ctx.fillStyle = t.muted;
  setFont(ctx, 22, label);
  ctx.fillText(`ASSETS  /  ${Math.min(content.assets.length, 1)} OF ${content.assets.length}`, 999, 692);
  if (content.assets.length) {
    const selected = content.assets[0];
    ctx.strokeStyle = t.line;
    ctx.lineWidth = 2;
    ctx.strokeRect(999, 720, 349, 185);
    if (!image(ctx, assets.get(selected.assetId) ?? {}, 1004, 725, 339, 175)) {
      ctx.fillStyle = t.muted;
      block(ctx, `DIGEST ONLY / ${selected.digest.slice(0, 16)}`, 1015, 754, 310, 21, 2, 29, label);
    }
    ctx.fillStyle = t.text;
    excerpted = block(ctx, `${selected.assetId}: ${selected.alt}`, 1370, 730, 440, 22, 4, 33, body) || excerpted;
    if (content.assets.length > 1) excerpted = true;
  }

  ctx.fillStyle = t.muted;
  setFont(ctx, 20, body);
  ctx.fillText(excerpted ? 'EXCERPTS ONLY  /  See source ContentIR for complete text and assets'
    : 'OVERVIEW  /  See source ContentIR for full content and citations', 70, 993);
  setFont(ctx, 16, body);
  ctx.fillText(`CONTENT ${digest(content).slice(0, 16)}  /  RENDER ${digest(spec).slice(0, 16)}  /  ${spec.renderId}`,
    70, 1030);
  return format === 'png' ? canvas.toBuffer('image/png') : canvas.toBuffer('image/jpeg');
}
