import { ImageData, GlobalFonts, createCanvas } from '@napi-rs/canvas';
import type { SKRSContext2D } from '@napi-rs/canvas';
import jpeg from 'jpeg-js';
import { PNG } from 'pngjs';
import { fileURLToPath } from 'node:url';
import { digest } from './canonical.ts';
import type { ContentIR, RenderSpec } from './contracts.ts';
import { assetLimits } from './assets.ts';

const WIDTH = 1920;
const HEIGHT = 1080;
const bodyFont = fileURLToPath(new URL('../../../template/public/fonts/NotoSansSC.ttf', import.meta.url));
const displayFont = fileURLToPath(new URL('../../../template/public/fonts/Audiowide-Regular.ttf', import.meta.url));

type RasterAsset = { bytes?: Buffer; mediaType?: 'image/png' | 'image/jpeg' };

function fonts(): void {
  if (!GlobalFonts.has('A2SWE Sans') && !GlobalFonts.registerFromPath(bodyFont, 'A2SWE Sans')) {
    throw new Error('raster_body_font_unavailable');
  }
  if (!GlobalFonts.has('A2SWE Display') && !GlobalFonts.registerFromPath(displayFont, 'A2SWE Display')) {
    throw new Error('raster_display_font_unavailable');
  }
}

function accentInk(hex: string): '#111111' | '#ffffff' {
  const rgb = [1, 3, 5].map((offset) => Number.parseInt(hex.slice(offset, offset + 2), 16) / 255);
  const channels = rgb.map((value) => value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4);
  const luminance = channels[0] * 0.2126 + channels[1] * 0.7152 + channels[2] * 0.0722;
  return luminance > 0.179 ? '#111111' : '#ffffff';
}

function setFont(ctx: SKRSContext2D, size: number, display = false): void {
  ctx.font = `${display ? '' : '500 '}${size}px "${display ? 'A2SWE Display' : 'A2SWE Sans'}"`;
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
  size: number, maxLines: number, leading = size * 1.36, display = false): boolean {
  setFont(ctx, size, display);
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
  const canvas = createCanvas(WIDTH, HEIGHT);
  const ctx = canvas.getContext('2d');
  const { background, foreground, accent } = spec.theme;
  let excerpted = false;
  ctx.fillStyle = background;
  ctx.fillRect(0, 0, WIDTH, HEIGHT);
  ctx.fillStyle = accent;
  ctx.fillRect(0, 0, WIDTH, 12);
  ctx.globalAlpha = 0.12;
  ctx.fillRect(0, 12, WIDTH, 326);
  ctx.globalAlpha = 1;
  ctx.fillStyle = foreground;
  setFont(ctx, 22, true);
  ctx.fillText('A2SWE  /  RASTER OVERVIEW', 70, 67);
  excerpted = block(ctx, content.title, 70, 89, 1780, 59, 2, 69) || excerpted;
  excerpted = block(ctx, content.summary, 70, 245, 1740, 27, 2, 39) || excerpted;

  ctx.fillStyle = accent;
  ctx.fillRect(70, 352, 1780, 74);
  ctx.fillStyle = accentInk(accent);
  excerpted = block(ctx, `DECISION  ${content.decision}`, 94, 361, 1730, 24, 2, 30, true) || excerpted;

  const cardTop = 448;
  const cardHeight = 494;
  ctx.fillStyle = foreground;
  ctx.globalAlpha = 0.065;
  ctx.fillRect(70, cardTop, 865, cardHeight);
  ctx.fillRect(965, cardTop, 885, cardHeight);
  ctx.globalAlpha = 1;
  ctx.strokeStyle = accent;
  ctx.lineWidth = 3;
  ctx.strokeRect(70, cardTop, 865, cardHeight);
  ctx.strokeRect(965, cardTop, 885, cardHeight);
  ctx.fillStyle = foreground;

  setFont(ctx, 24, true);
  ctx.fillText(`SECTIONS  /  ${Math.min(content.sections.length, 2)} OF ${content.sections.length}`, 104, 503);
  content.sections.slice(0, 2).forEach((section, index) => {
    const top = index === 0 ? 531 : 753;
    excerpted = block(ctx, `${index + 1}. ${section.title}`, 104, top, 784, 31, 2, 41) || excerpted;
    excerpted = block(ctx, section.body, 104, top + 85, 784, 23, index === 0 ? 3 : 2, 31) || excerpted;
  });
  if (content.sections.length > 2) excerpted = true;

  setFont(ctx, 24, true);
  ctx.fillText(`CLAIMS  /  ${Math.min(content.claims.length, 1)} OF ${content.claims.length}`, 999, 503);
  if (content.claims.length) {
    excerpted = block(ctx, content.claims[0].text, 999, 524, 816, 26, 3, 37) || excerpted;
  }
  if (content.claims.length > 1) excerpted = true;

  setFont(ctx, 24, true);
  ctx.fillText(`ASSETS  /  ${Math.min(content.assets.length, 1)} OF ${content.assets.length}`, 999, 692);
  if (content.assets.length) {
    const selected = content.assets[0];
    ctx.strokeStyle = accent;
    ctx.lineWidth = 2;
    ctx.strokeRect(999, 720, 349, 185);
    if (!image(ctx, assets.get(selected.assetId) ?? {}, 1004, 725, 339, 175)) {
      ctx.fillStyle = foreground;
      block(ctx, `DIGEST ONLY / ${selected.digest.slice(0, 16)}`, 1015, 754, 310, 21, 2);
    }
    ctx.fillStyle = foreground;
    excerpted = block(ctx, `${selected.assetId}: ${selected.alt}`, 1370, 730, 440, 22, 4, 33) || excerpted;
    if (content.assets.length > 1) excerpted = true;
  }

  ctx.fillStyle = foreground;
  setFont(ctx, 20);
  ctx.fillText(excerpted ? 'EXCERPTS ONLY  /  See source ContentIR for complete text and assets'
    : 'OVERVIEW  /  See source ContentIR for full content and citations', 70, 993);
  setFont(ctx, 16);
  ctx.fillText(`CONTENT ${digest(content).slice(0, 16)}  /  RENDER ${digest(spec).slice(0, 16)}  /  ${spec.renderId}`,
    70, 1030);
  return format === 'png' ? canvas.toBuffer('image/png') : canvas.toBuffer('image/jpeg');
}
