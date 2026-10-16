import { existsSync } from 'node:fs';
import { mkdir, readFile, rename, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { validate } from './contracts.ts';
import type { RenderTheme } from './contracts.ts';
import { fetchPublicText } from './public-raster.ts';

// Brand themes for every output format. A RenderTheme carries the brand roles of the LayeredCards card system (header band, deep,
// highlight rule, paper tiles, line, muted, soft); brandTokens() resolves the full token set every adapter and the video consume, so
// decks, documents, rasters and video share one look. Themes come from a kit theme file, an official brand site, or a manual file.

const HEX = /^#?([0-9a-f]{3}|[0-9a-f]{6})$/i;
const GENERIC_FAMILIES = new Set(['serif', 'sans-serif', 'monospace', 'cursive', 'fantasy', 'system-ui', 'ui-sans-serif', 'ui-serif', 'ui-monospace', '-apple-system', 'blinkmacsystemfont']);
const SERIF_FAMILY = /\b(georgia|times|garamond|cambria|palatino|baskerville|didot|bodoni|caslon|merriweather|playfair|lora|minion|charter|book antiqua|constantia|serif)\b/i;
const ICON_FAMILY = /icon|awesome|glyph|symbol|material|dashicons|fontello|icomoon|emoji/i;

export const KIT_BODY_FONT = "'Trebuchet MS','Segoe UI',sans-serif";
export const KIT_HEADING_FONT = "Georgia,'Times New Roman',serif";

/** Neutral executive theme installed by project-init until brand-theme replaces it with a kit, site or manual brand. */
export const DEFAULT_THEME: RenderTheme = {
  name: 'a2swe-executive', background: '#0F172A', foreground: '#F8FAFC', accent: '#5EEAD4', fontFamily: "'Segoe UI', Arial, sans-serif",
  source: { kind: 'manual', reference: 'a2swe default executive theme', basis: 'Neutral default until a kit, site or manual brand theme is installed with brand-theme.' }
};

export function normHex(value: string): string {
  const match = HEX.exec(value.trim());
  if (!match) throw new Error(`invalid_hex_color: ${value}`);
  const digits = match[1].length === 3 ? [...match[1]].map((character) => character + character).join('') : match[1];
  return `#${digits.toUpperCase()}`;
}

const channels = (hex: string) => [1, 3, 5].map((offset) => Number.parseInt(hex.slice(offset, offset + 2), 16));
const toHex = (values: number[]) => `#${values.map((value) => Math.max(0, Math.min(255, Math.round(value))).toString(16).padStart(2, '0')).join('').toUpperCase()}`;

/** Moves color a toward b by t (0 keeps a, 1 gives b), the LayeredCards kit convention. */
export function blend(a: string, b: string, t: number): string {
  const from = channels(normHex(a));
  const to = channels(normHex(b));
  return toHex(from.map((value, index) => value + (to[index] - value) * t));
}

const darken = (hex: string, t: number) => blend(hex, '#000000', t);
const lighten = (hex: string, t: number) => blend(hex, '#FFFFFF', t);

export function luminance(hex: string): number {
  const linear = channels(normHex(hex)).map((value) => {
    const unit = value / 255;
    return unit <= 0.03928 ? unit / 12.92 : ((unit + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * linear[0] + 0.7152 * linear[1] + 0.0722 * linear[2];
}

export function contrast(a: string, b: string): number {
  const [light, dark] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (light + 0.05) / (dark + 0.05);
}

function until(hex: string, ok: (color: string) => boolean, step: (color: string) => string): string {
  let color = hex;
  for (let index = 0; index < 60 && !ok(color); index++) color = step(color);
  return color;
}

function saturation(hex: string): number {
  const values = channels(normHex(hex));
  const max = Math.max(...values);
  return max ? (max - Math.min(...values)) / max : 0;
}

function hue(hex: string): number {
  const [r, g, b] = channels(normHex(hex)).map((value) => value / 255);
  const max = Math.max(r, g, b);
  const delta = max - Math.min(r, g, b);
  if (!delta) return 0;
  const raw = max === r ? ((g - b) / delta) % 6 : max === g ? (b - r) / delta + 2 : (r - g) / delta + 4;
  return (raw * 60 + 360) % 360;
}

const hueDistance = (a: string, b: string) => { const distance = Math.abs(hue(a) - hue(b)); return Math.min(distance, 360 - distance); };

/** White or near-black, whichever reads better on the fill. */
export function inkOn(fill: string): string {
  return contrast('#FFFFFF', fill) >= contrast('#111111', fill) ? '#FFFFFF' : '#111111';
}

export function fontFamilies(stack: string): string[] {
  return stack.split(',').map((family) => family.trim().replace(/^["']|["']$/g, '').trim()).filter(Boolean);
}

/** The first concrete family in a CSS stack; OOXML and PDF name one typeface. */
export function primaryFamily(stack: string): string {
  return fontFamilies(stack).find((family) => !GENERIC_FAMILIES.has(family.toLowerCase())) ?? 'Arial';
}

export function isSerifStack(stack: string): boolean {
  const families = fontFamilies(stack).map((family) => family.toLowerCase());
  const generic = families.find((family) => GENERIC_FAMILIES.has(family));
  if (generic === 'serif' || generic === 'ui-serif') return true;
  if (generic) return false;
  return SERIF_FAMILY.test(families[0] ?? '');
}

/** Normalizes a CSS font stack to the contract's safe character set and guarantees a generic fallback family. */
export function fontStack(stack: string): string {
  const families = fontFamilies(stack);
  if (!families.length || families.some((family) => !/^[A-Za-z0-9 -]{1,60}$/.test(family))) throw new Error(`unsafe_font_family: ${stack}`);
  const quoted = families.filter((family, index) => families.findIndex((other) => other.toLowerCase() === family.toLowerCase()) === index)
    .map((family) => (GENERIC_FAMILIES.has(family.toLowerCase()) || /^[A-Za-z-]+$/.test(family) ? family : `'${family}'`));
  if (!families.some((family) => GENERIC_FAMILIES.has(family.toLowerCase()))) quoted.push(isSerifStack(stack) ? 'serif' : 'sans-serif');
  const result = quoted.join(', ');
  if (result.length > 160) throw new Error('font_stack_too_long');
  return result;
}

const slug = (value: string) => value.toLowerCase().normalize('NFKD').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 48) || 'brand';

export interface BrandPalette { primary: string; secondary?: string; accent?: string; dark?: string; light?: string; danger?: string }
export interface BrandRoles { primary: string; header: string; deep: string; accent: string; paper: string; canvas: string; line: string; text: string; muted: string; soft: string; danger: string }

/** Brand palette to readable card roles; the same derivation as the LayeredCards kit (white text on header/deep/primary, accent readable on the header). */
export function paletteRoles(palette: BrandPalette): BrandRoles {
  const primary = until(normHex(palette.primary), (x) => contrast(x, '#FFFFFF') >= 4.6, (x) => darken(x, 0.08));
  const header = palette.dark && contrast(normHex(palette.dark), '#FFFFFF') >= 9 ? normHex(palette.dark)
    : until(darken(primary, 0.45), (x) => contrast(x, '#FFFFFF') >= 10, (x) => darken(x, 0.1));
  const deep = until(darken(header, 0.35), (x) => contrast(x, '#FFFFFF') >= 13, (x) => darken(x, 0.1));
  const readable = (x: string) => contrast(x, header) >= 4.5 && contrast(x, deep) >= 4.5;
  const candidates = [palette.accent, palette.secondary, palette.light].filter((value): value is string => Boolean(value)).map(normHex);
  let accent = candidates.find(readable) ?? (candidates.length ? until(candidates[0], readable, (x) => lighten(x, 0.12)) : lighten(primary, 0.78));
  if (!readable(accent)) accent = '#FFFFFF';
  // Neutral brands (for example black) take their warmth from the accent.
  const tint = saturation(primary) < 0.15 && saturation(accent) >= 0.15 ? accent : primary;
  const canvas = blend(tint, '#FFFFFF', 0.955);
  const soft = blend(tint, '#FFFFFF', 0.9);
  const line = blend(blend(tint, '#808080', 0.45), '#FFFFFF', 0.7);
  const text = until(blend(header, '#000000', 0.2), (x) => contrast(x, canvas) >= 10, (x) => darken(x, 0.15));
  const muted = until(blend(text, '#FFFFFF', 0.4), (x) => contrast(x, '#FFFFFF') >= 4.8 && contrast(x, canvas) >= 4.6, (x) => darken(x, 0.08));
  const danger = until(normHex(palette.danger ?? '#B42318'), (x) => contrast(x, '#FFFFFF') >= 4.8, (x) => darken(x, 0.08));
  return { primary, header, deep, accent, paper: '#FFFFFF', canvas, line, text, muted, soft, danger };
}

/** Builds a validated RenderTheme from card roles; accent is the brand primary darkened until it reads at 4.5:1 on the canvas. */
export function themeFromRoles(roles: BrandRoles, options: { name: string; fontFamily?: string; headingFont?: string; radius?: number; source: NonNullable<RenderTheme['source']> }): RenderTheme {
  const canvas = normHex(roles.canvas);
  const theme: RenderTheme = {
    name: options.name.slice(0, 100), background: canvas, foreground: normHex(roles.text),
    accent: until(normHex(roles.primary), (x) => contrast(x, canvas) >= 4.5, (x) => darken(x, 0.08)),
    fontFamily: fontStack(options.fontFamily ?? KIT_BODY_FONT), headingFont: fontStack(options.headingFont ?? KIT_HEADING_FONT),
    radius: options.radius ?? 10,
    palette: { primary: normHex(roles.primary), header: normHex(roles.header), deep: normHex(roles.deep), highlight: normHex(roles.accent),
      paper: normHex(roles.paper), line: normHex(roles.line), muted: normHex(roles.muted), soft: normHex(roles.soft), danger: normHex(roles.danger) },
    source: options.source
  };
  return validate('RenderTheme', theme);
}

export interface KitTheme {
  id?: string; label?: string; basis?: string; fontFamily?: string; headingFont?: string;
  colors?: Record<string, string>; palette?: Record<string, string | null | undefined>;
}

const KIT_ROLES = ['primary', 'header', 'deep', 'accent', 'paper', 'canvas', 'line', 'text', 'muted', 'soft', 'danger'] as const;

/** A LayeredCards kit theme (explicit colors, or a palette converted by the kit derivation) as a RenderTheme with kit provenance. */
export function kitBrandTheme(kit: KitTheme, name: string): RenderTheme {
  let roles: BrandRoles;
  if (kit.colors) {
    const missing = KIT_ROLES.filter((role) => !kit.colors?.[role]);
    if (missing.length) throw new Error(`kit_theme_missing_roles: ${missing.join(',')}`);
    roles = Object.fromEntries(KIT_ROLES.map((role) => [role, normHex(kit.colors![role])])) as unknown as BrandRoles;
  } else {
    const palette = kit.palette ?? {};
    if (!palette.primary) throw new Error('kit_theme_missing_palette_primary');
    const pick = (key: string) => (typeof palette[key] === 'string' && HEX.test(palette[key]!) ? palette[key]! : undefined);
    roles = paletteRoles({ primary: palette.primary, secondary: pick('secondary'), accent: pick('accent'), dark: pick('dark'), light: pick('light'), danger: pick('danger') });
  }
  return themeFromRoles(roles, { name: `${slug(name)}-brand`, fontFamily: kit.fontFamily, headingFont: kit.headingFont,
    source: { kind: 'kit', reference: `layered-cards-theme/1:${kit.id ?? slug(name)}`, basis: (kit.basis ?? kit.label ?? 'LayeredCards kit theme').slice(0, 1000) } });
}

export interface BrandTokens {
  name: string; mode: 'light' | 'dark'; branded: boolean;
  canvas: string; text: string; accent: string; muted: string;
  primary: string; onPrimary: string;
  header: string; onHeader: string; headerMuted: string; deep: string; onDeep: string;
  highlight: string; onHighlight: string;
  paper: string; line: string; soft: string; danger: string;
  callout: string; calloutLine: string;
  printInk: string; printAccent: string; printHeader: string;
  bodyFont: string; headingFont: string; headingWeight: number; radius: number;
}

/** Resolves the complete design token set for a theme. Brand themes use their palette; minimal themes derive the roles from canvas, ink and accent. */
export function brandTokens(theme: RenderTheme): BrandTokens {
  const canvas = normHex(theme.background);
  const text = normHex(theme.foreground);
  const accent = normHex(theme.accent);
  const dark = contrast(canvas, '#FFFFFF') > contrast(canvas, '#000000');
  const palette = theme.palette;
  const header = palette ? normHex(palette.header)
    : dark ? blend(canvas, text, 0.07) : until(darken(accent, 0.45), (x) => contrast(x, '#FFFFFF') >= 10, (x) => darken(x, 0.1));
  const deep = palette ? normHex(palette.deep) : dark ? blend(canvas, '#000000', 0.35) : until(darken(header, 0.35), (x) => contrast(x, '#FFFFFF') >= 13, (x) => darken(x, 0.1));
  const highlight = palette ? normHex(palette.highlight) : accent;
  const paper = palette ? normHex(palette.paper) : dark ? blend(canvas, text, 0.07) : '#FFFFFF';
  const primary = palette ? normHex(palette.primary) : accent;
  const onHeader = inkOn(header);
  const bodyFont = fontStack(theme.fontFamily);
  const headingFont = fontStack(theme.headingFont ?? theme.fontFamily);
  return {
    name: theme.name, mode: dark ? 'dark' : 'light', branded: Boolean(palette),
    canvas, text, accent,
    muted: palette ? normHex(palette.muted) : blend(text, canvas, 0.28),
    primary, onPrimary: inkOn(primary),
    header, onHeader, headerMuted: blend(onHeader, header, 0.28), deep, onDeep: inkOn(deep),
    highlight, onHighlight: contrast(deep, highlight) >= 4.5 ? deep : inkOn(highlight),
    paper, line: palette ? normHex(palette.line) : blend(canvas, text, dark ? 0.16 : 0.14),
    soft: palette ? normHex(palette.soft) : blend(canvas, accent, 0.12),
    danger: normHex(palette?.danger ?? (dark ? '#F97066' : '#B42318')),
    callout: dark ? blend(canvas, highlight, 0.14) : blend(highlight, '#FFFFFF', 0.85),
    calloutLine: dark ? highlight : until(darken(highlight, 0.38), (x) => contrast(x, '#FFFFFF') >= 3, (x) => darken(x, 0.1)),
    printInk: dark ? '#111827' : text,
    printAccent: until(dark ? accent : primary, (x) => contrast(x, '#FFFFFF') >= 4.5, (x) => darken(x, 0.1)),
    printHeader: contrast('#FFFFFF', header) >= 4.5 ? header : deep,
    bodyFont, headingFont, headingWeight: isSerifStack(headingFont) ? 700 : 800,
    radius: theme.radius ?? (palette ? 10 : 16)
  };
}

// ---------------------------------------------------------------------------------------------------------------------------------
// Site brand extraction: one official page plus its stylesheets, weighted color and font votes, recorded as QC evidence.

interface ColorVote { hex: string; weight: number }
interface FontVote { family: string; weight: number; role: 'body' | 'heading' | 'other'; serif: boolean }

export interface SiteBrand {
  url: string; finalUrl: string; retrievedAt: string; siteName: string | null; themeColor: string | null;
  documents: { url: string; mediaType?: string; digest?: string; bytes?: number; error?: string }[];
  colors: { hex: string; weight: number; saturation: number; luminance: number }[];
  fonts: { family: string; weight: number; role: string }[];
  palette: BrandPalette; fontFamily: string; headingFont: string;
}

function attributes(tag: string): Map<string, string> {
  const result = new Map<string, string>();
  for (const match of tag.matchAll(/([a-zA-Z_:][-a-zA-Z0-9_:.]*)\s*=\s*("([^"]*)"|'([^']*)'|([^\s"'>]+))/g)) {
    result.set(match[1].toLowerCase(), match[3] ?? match[4] ?? match[5] ?? '');
  }
  return result;
}

function decodeEntities(value: string): string {
  return value.replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&#39;|&apos;/g, "'").replace(/&lt;/g, '<').replace(/&gt;/g, '>');
}

function parseColors(value: string): { hex: string; share: number }[] {
  const found: { hex: string; share: number }[] = [];
  for (const match of value.matchAll(/#([0-9a-f]{8}|[0-9a-f]{6}|[0-9a-f]{3,4})\b/gi)) {
    const digits = match[1];
    if (digits.length === 8 && Number.parseInt(digits.slice(6), 16) < 230) continue;
    if (digits.length === 4 && Number.parseInt(digits[3], 16) < 14) continue;
    found.push({ hex: normHex(`#${digits.length >= 6 ? digits.slice(0, 6) : digits.slice(0, 3)}`), share: 1 });
  }
  const unit = (part: string, scale: number) => (part.endsWith('%') ? Number.parseFloat(part) * scale / 100 : Number.parseFloat(part));
  for (const match of value.matchAll(/rgba?\(\s*([\d.]+%?)[\s,]+([\d.]+%?)[\s,]+([\d.]+%?)(?:\s*[,/]\s*([\d.]+%?))?\s*\)/gi)) {
    if (match[4] !== undefined && unit(match[4], 1) < 0.9) continue;
    found.push({ hex: toHex([unit(match[1], 255), unit(match[2], 255), unit(match[3], 255)]), share: 1 });
  }
  for (const match of value.matchAll(/hsla?\(\s*([\d.]+)(?:deg)?[\s,]+([\d.]+)%[\s,]+([\d.]+)%(?:\s*[,/]\s*([\d.]+%?))?\s*\)/gi)) {
    if (match[4] !== undefined && unit(match[4], 1) < 0.9) continue;
    const h = Number.parseFloat(match[1]) % 360 / 360, s = Number.parseFloat(match[2]) / 100, l = Number.parseFloat(match[3]) / 100;
    const q = l < 0.5 ? l * (1 + s) : l + s - l * s, p = 2 * l - q;
    const component = (t: number) => { const x = (t + 1) % 1; return x < 1 / 6 ? p + (q - p) * 6 * x : x < 1 / 2 ? q : x < 2 / 3 ? p + (q - p) * (2 / 3 - x) * 6 : p; };
    found.push({ hex: toHex([component(h + 1 / 3) * 255, component(h) * 255, component(h - 1 / 3) * 255]), share: 1 });
  }
  return found;
}

function analyzeCss(css: string, colors: Map<string, ColorVote>, fonts: Map<string, FontVote>, variables: Map<string, string>): void {
  const source = css.replace(/\/\*[\s\S]*?\*\//g, '');
  const resolve = (value: string, depth = 0): string => depth > 4 ? value
    : value.replace(/var\(\s*(--[\w-]+)\s*(?:,\s*([^()]*(?:\([^()]*\))?[^()]*))?\)/g, (_all, name: string, fallback?: string) => resolve(variables.get(name) ?? fallback ?? '', depth + 1));
  // Pure magenta and cyan are debug and placeholder colors in production stylesheets, never brand evidence.
  const vote = (hex: string, weight: number) => {
    if (hex === '#FF00FF' || hex === '#00FFFF') return;
    const entry = colors.get(hex) ?? { hex, weight: 0 }; entry.weight += weight; colors.set(hex, entry);
  };
  for (const rule of source.matchAll(/([^{}]+)\{([^{}]*)\}/g)) {
    const selector = rule[1].trim().slice(-240);
    if (selector.startsWith('@font-face')) continue;
    const boost = /\b(header|nav|navbar|masthead|banner|hero|btn|button|cta|brand|logo|primary|accent)\b/i.test(selector) ? 2 : 1;
    const role: FontVote['role'] = /(^|[\s,>+~(])(html|body|:root)\b/i.test(selector) ? 'body'
      : /(^|[\s,>+~(])h[1-3]\b|\b(title|heading|headline|display)\b/i.test(selector) ? 'heading' : 'other';
    for (const declaration of rule[2].split(';')) {
      const colon = declaration.indexOf(':');
      if (colon < 1) continue;
      const property = declaration.slice(0, colon).trim().toLowerCase();
      const value = resolve(declaration.slice(colon + 1).replace(/!important/gi, '').trim());
      if (property === 'font-family' || property === 'font') {
        const families = property === 'font' ? fontFamilies(value.replace(/^.*?\b[\d.]+(?:px|pt|em|rem|%|vw|vh)(?:\/\S+)?\s+/, '')) : fontFamilies(value);
        const family = families.find((name) => !GENERIC_FAMILIES.has(name.toLowerCase()) && !ICON_FAMILY.test(name) && /^[A-Za-z0-9 -]{2,60}$/.test(name));
        if (!family || /^(inherit|initial|unset|revert)$/i.test(family)) continue;
        const key = `${role}:${family.toLowerCase()}`;
        const entry = fonts.get(key) ?? { family, weight: 0, role, serif: isSerifStack(families.join(',')) };
        entry.weight += role === 'other' ? 1 : 6;
        fonts.set(key, entry);
        continue;
      }
      const weight = property.startsWith('--') ? (/(brand|primary|accent|theme|main|key)/i.test(property) ? 6 : 1)
        : property === 'background' || property === 'background-color' ? 3
          : property === 'color' ? 2
            : /^(border(-(top|right|bottom|left))?(-color)?|outline(-color)?|fill|stroke|text-decoration-color)$/.test(property) ? 1 : 0;
      if (!weight) continue;
      for (const color of parseColors(value)) vote(color.hex, weight * boost);
    }
  }
}

function clusterColors(votes: ColorVote[]): ColorVote[] {
  const clusters: ColorVote[] = [];
  for (const vote of [...votes].sort((a, b) => b.weight - a.weight || a.hex.localeCompare(b.hex))) {
    const [r, g, b] = channels(vote.hex);
    const near = clusters.find((cluster) => { const [x, y, z] = channels(cluster.hex); return Math.hypot(r - x, g - y, b - z) < 18; });
    if (near) near.weight += vote.weight; else clusters.push({ ...vote });
  }
  return clusters.sort((a, b) => b.weight - a.weight || a.hex.localeCompare(b.hex));
}

// CSS framework defaults (Bootstrap 5 theme and gray scale) appear on many sites without being brand colors; their votes are discounted.
const FRAMEWORK_COLORS = new Set(['#0D6EFD', '#6610F2', '#6F42C1', '#D63384', '#DC3545', '#FD7E14', '#FFC107', '#198754', '#20C997', '#0DCAF0', '#6C757D',
  '#212529', '#F8F9FA', '#E9ECEF', '#DEE2E6', '#CED4DA', '#ADB5BD', '#495057', '#343A40', '#0A58CA', '#157347', '#BB2D3B']);

/** Chooses brand roles from weighted color votes: theme-color or the strongest chromatic color is primary, distinct hues follow. */
export function paletteFromVotes(votes: ColorVote[], themeColor: string | null): BrandPalette {
  const clusters = clusterColors(votes.map((vote) => (FRAMEWORK_COLORS.has(vote.hex) ? { ...vote, weight: vote.weight * 0.2 } : vote)));
  const top = clusters[0]?.weight ?? 1;
  const chromatic = clusters.filter((color) => saturation(color.hex) >= 0.25 && luminance(color.hex) > 0.015 && luminance(color.hex) < 0.8);
  const primary = (themeColor && saturation(themeColor) >= 0.25 ? themeColor : null) ?? chromatic[0]?.hex
    ?? clusters.find((color) => luminance(color.hex) < 0.2)?.hex ?? '#1F2937';
  const distinct = (color: string, from: string[]) => from.every((other) => hueDistance(color, other) >= 25 || Math.abs(luminance(color) - luminance(other)) > 0.25);
  const secondary = chromatic.find((color) => color.hex !== primary && distinct(color.hex, [primary]))?.hex;
  // A bright primary (aqua, lime, yellow) reads as a highlight on the dark header band, while paletteRoles darkens it for text on the canvas.
  const accent = luminance(primary) > 0.35 ? primary
    : chromatic.find((color) => ![primary, secondary].includes(color.hex) && distinct(color.hex, [primary, ...(secondary ? [secondary] : [])]))?.hex;
  // Prefer a brand-tinted near-black (navy, forest) over neutral black for the header band when it carries comparable weight.
  const darks = clusters.filter((color) => luminance(color.hex) < 0.03 && color.weight >= top * 0.05);
  const dark = darks.find((color) => saturation(color.hex) >= 0.2 && color.weight >= (darks[0]?.weight ?? 0) * 0.5)?.hex ?? darks[0]?.hex;
  const light = clusters.find((color) => luminance(color.hex) > 0.8 && luminance(color.hex) < 0.97 && saturation(color.hex) < 0.3 && color.weight >= top * 0.03)?.hex;
  return { primary: normHex(primary), ...(secondary ? { secondary } : {}), ...(accent ? { accent } : {}), ...(dark ? { dark } : {}), ...(light ? { light } : {}) };
}

/** Reads one official brand page and up to ten of its stylesheets and derives palette and fonts; every fetched document is digested. */
export async function extractSiteBrand(input: string): Promise<SiteBrand> {
  const signal = AbortSignal.timeout(90_000);
  const page = await fetchPublicText(input, { mediaTypes: ['text/html', 'application/xhtml+xml'], accept: 'text/html,application/xhtml+xml', maxBytes: 4_000_000, signal });
  const html = page.text;
  const documents: SiteBrand['documents'] = [{ url: page.finalUrl, mediaType: page.mediaType, digest: page.digest, bytes: Buffer.byteLength(html) }];
  let themeColor: string | null = null;
  let siteName: string | null = null;
  const stylesheets: string[] = [];
  for (const tag of html.match(/<(meta|link)\b[^>]*>/gi) ?? []) {
    const attrs = attributes(tag);
    if (/^<meta/i.test(tag)) {
      const key = (attrs.get('name') ?? attrs.get('property') ?? '').toLowerCase();
      const content = decodeEntities(attrs.get('content') ?? '').trim();
      if (!themeColor && ['theme-color', 'msapplication-tilecolor'].includes(key)) themeColor = parseColors(content)[0]?.hex ?? null;
      if (!siteName && ['og:site_name', 'application-name'].includes(key) && content) siteName = content.slice(0, 80);
    } else if ((attrs.get('rel') ?? '').toLowerCase().split(/\s+/).includes('stylesheet') && attrs.get('href')) {
      try {
        const href = new URL(decodeEntities(attrs.get('href')!), page.finalUrl);
        if (href.protocol === 'https:' && !stylesheets.includes(href.href)) stylesheets.push(href.href);
      } catch { /* unparsable href */ }
    }
  }
  siteName ??= /<title[^>]*>([^<]{1,200})<\/title>/i.exec(html)?.[1]?.split(/\s[|\u2013\u2014-]\s/)[0]?.trim().slice(0, 80) || null;
  const colors = new Map<string, ColorVote>();
  const fonts = new Map<string, FontVote>();
  const variables = new Map<string, string>();
  const inline = [...html.matchAll(/<style\b[^>]*>([\s\S]*?)<\/style>/gi)].map((match) => match[1]).join('\n');
  const sheets: string[] = [inline];
  for (const href of stylesheets.slice(0, 10)) {
    try {
      const sheet = await fetchPublicText(href, { mediaTypes: ['text/css', 'text/plain'], accept: 'text/css,*/*;q=0.1', maxBytes: 3_000_000, signal });
      documents.push({ url: sheet.finalUrl, mediaType: sheet.mediaType, digest: sheet.digest, bytes: Buffer.byteLength(sheet.text) });
      sheets.push(sheet.text);
    } catch (error) {
      documents.push({ url: href, error: error instanceof Error ? error.message : String(error) });
    }
  }
  // Variables are collected from every sheet first so cross-sheet var() references resolve.
  for (const sheet of sheets) for (const match of sheet.replace(/\/\*[\s\S]*?\*\//g, '').matchAll(/(--[\w-]+)\s*:\s*([^;{}]+)/g)) if (!variables.has(match[1])) variables.set(match[1], match[2].trim());
  for (const sheet of sheets) analyzeCss(sheet, colors, fonts, variables);
  if (!colors.size && !themeColor) throw new Error('brand_site_without_colors');
  const palette = paletteFromVotes([...colors.values()], themeColor);
  // A JavaScript shell or a page without its stylesheets yields a handful of incidental colors; installing those would misbrand every
  // output, so weak evidence fails and the caller supplies a kit or manual theme instead.
  const primaryWeight = clusterColors([...colors.values()]).find((color) => color.hex === palette.primary)?.weight ?? 0;
  if (palette.primary !== themeColor && (primaryWeight < 12 || saturation(palette.primary) < 0.25)) {
    throw new Error(`brand_site_insufficient_evidence: strongest brand color ${palette.primary} has weight ${Math.round(primaryWeight)} across ${documents.filter((document) => !document.error).length} documents; use --source KIT_THEME or --file THEME`);
  }
  const ranked = [...fonts.values()].sort((a, b) => b.weight - a.weight || a.family.localeCompare(b.family));
  const body = ranked.find((font) => font.role === 'body') ?? ranked[0];
  const heading = ranked.find((font) => font.role === 'heading' && font.family !== body?.family);
  const stack = (font: FontVote | undefined, fallbackSerif: boolean) => font
    ? fontStack(`'${font.family}', ${font.serif ? "Georgia, 'Times New Roman', serif" : "'Segoe UI', Arial, sans-serif"}`)
    : fontStack(fallbackSerif ? KIT_HEADING_FONT : "'Segoe UI', Arial, sans-serif");
  const fontFamily = stack(body, false);
  return {
    url: input, finalUrl: page.finalUrl, retrievedAt: page.retrievedAt, siteName, themeColor, documents,
    colors: clusterColors([...colors.values()]).slice(0, 24).map((color) => ({ hex: color.hex, weight: Math.round(color.weight), saturation: Number(saturation(color.hex).toFixed(3)), luminance: Number(luminance(color.hex).toFixed(4)) })),
    fonts: ranked.slice(0, 12).map((font) => ({ family: font.family, weight: font.weight, role: font.role })),
    palette, fontFamily, headingFont: heading ? stack(heading, heading.serif) : fontFamily
  };
}

export function siteBrandTheme(site: SiteBrand, name: string): RenderTheme {
  const host = new URL(site.finalUrl).hostname;
  const colors = Object.entries(site.palette).map(([role, hex]) => `${role} ${hex}`).join(', ');
  return themeFromRoles(paletteRoles(site.palette), { name: `${slug(name)}-brand`, fontFamily: site.fontFamily, headingFont: site.headingFont,
    source: { kind: 'site', reference: site.finalUrl, retrievedAt: site.retrievedAt,
      basis: `Derived from ${site.documents.filter((document) => !document.error).length} documents on ${host}${site.themeColor ? ` (theme-color ${site.themeColor})` : ''}: ${colors}; fonts ${primaryFamily(site.fontFamily)}${site.headingFont !== site.fontFamily ? ` / ${primaryFamily(site.headingFont)}` : ''}. Inspired by the site; not an official brand asset.`.slice(0, 1000) } });
}

async function writeAtomic(filename: string, value: unknown): Promise<void> {
  await mkdir(path.dirname(filename), { recursive: true });
  const staging = `${filename}.tmp`;
  await writeFile(staging, `${JSON.stringify(value, null, 2)}\n`);
  await rename(staging, filename);
}

/** Installs a validated theme as canonical/render-theme.json and records any extraction evidence under qc/brand/. */
export async function installBrandTheme(projectDirectory: string, theme: RenderTheme, evidence?: unknown): Promise<{ theme: RenderTheme; themePath: string; evidencePath: string | null }> {
  const project = path.resolve(projectDirectory);
  validate('RenderTheme', theme);
  const themePath = path.join(project, 'canonical', 'render-theme.json');
  await writeAtomic(themePath, theme);
  let evidencePath: string | null = null;
  if (evidence !== undefined) {
    evidencePath = path.join(project, 'qc', 'brand', 'brand-source.json');
    await writeAtomic(evidencePath, evidence);
  }
  return { theme, themePath, evidencePath };
}

/**
 * Regenerates theme-derived semantic diagram assets with the brand palette so embedded diagrams match every other surface. The source
 * request in canonical/asset-requests/ and the bundle in canonical/assets/ are rewritten through the core diagram generator, and the
 * ContentIR asset digest plus the approval record's asset and evidence digests follow; imported or diffusion rasters are left untouched.
 */
export async function rethemeDiagramAssets(projectDirectory: string, theme: RenderTheme): Promise<{ assetId: string; digest: string }[]> {
  const project = path.resolve(projectDirectory);
  const canonical = path.join(project, 'canonical');
  const contentFile = path.join(canonical, 'content-ir.json');
  if (!existsSync(contentFile)) return [];
  const content = JSON.parse(await readFile(contentFile, 'utf8')) as { assets: { assetId: string; digest: string }[] };
  const tokens = brandTokens(theme);
  const palette = tokens.mode === 'dark' ? [tokens.canvas, tokens.text, tokens.accent] : [tokens.paper, tokens.text, tokens.primary];
  const changed: { assetId: string; digest: string; requestDigest: string }[] = [];
  for (const asset of content.assets) {
    const bundle = path.join(canonical, 'assets', asset.assetId);
    if (!existsSync(path.join(bundle, 'request.json'))) continue;
    const request = JSON.parse(await readFile(path.join(bundle, 'request.json'), 'utf8')) as { method?: string; palette?: string[] };
    if (request.method !== 'diagram' || JSON.stringify(request.palette) === JSON.stringify(palette)) continue;
    const assets = await import('./assets.ts');
    const { digest } = await import('./canonical.ts');
    const next = validate('AssetRequest', { ...request, palette });
    const created = await assets.createAsset(next, await assets.generateDiagram(next), assets.diagramOrigin(next));
    const staging = `${bundle}.rebrand`;
    await rm(staging, { recursive: true, force: true });
    await assets.writeAssetBundle(staging, next, created);
    await rm(bundle, { recursive: true, force: true });
    await rename(staging, bundle);
    const source = path.join(canonical, 'asset-requests', `${asset.assetId}.json`);
    if (existsSync(source)) await writeAtomic(source, next);
    asset.digest = created.record.artifact.digest;
    changed.push({ assetId: asset.assetId, digest: asset.digest, requestDigest: digest(next) });
  }
  if (!changed.length) return [];
  await writeAtomic(contentFile, content);
  const approvalFile = path.join(canonical, 'approval-manifest.json');
  if (existsSync(approvalFile)) {
    const approval = JSON.parse(await readFile(approvalFile, 'utf8')) as { selectedAssets: { assetId: string; assetDigest: string; evidenceDigest: string }[] };
    for (const entry of approval.selectedAssets) {
      const update = changed.find((item) => item.assetId === entry.assetId);
      if (update) { entry.assetDigest = update.digest; entry.evidenceDigest = update.requestDigest; }
    }
    await writeAtomic(approvalFile, approval);
  }
  return changed.map(({ assetId, digest }) => ({ assetId, digest }));
}

/** brand-theme: one of a site URL, a kit theme file, or a manual RenderTheme file becomes the project's canonical brand theme. */
export async function brandThemeCommand(projectDirectory: string, options: { url?: string; kit?: string; file?: string; name?: string }) {
  const chosen = [options.url, options.kit, options.file].filter(Boolean);
  if (chosen.length !== 1) throw new Error('brand_theme_requires_one_of_url_source_file');
  const project = path.resolve(projectDirectory);
  const domainFile = path.join(project, 'canonical', 'domain-pack.json');
  const domainName = existsSync(domainFile) ? (JSON.parse(await readFile(domainFile, 'utf8')) as { name?: string }).name : undefined;
  const name = options.name ?? domainName ?? path.basename(project);
  const theme = options.url ? null : options.kit ? kitBrandTheme(JSON.parse(await readFile(options.kit, 'utf8')) as KitTheme, name)
    : validate('RenderTheme', JSON.parse(await readFile(options.file!, 'utf8')));
  const site = options.url ? await extractSiteBrand(options.url) : null;
  const installed = await installBrandTheme(project, theme ?? siteBrandTheme(site!, name), site ?? undefined);
  return { ...installed, assets: await rethemeDiagramAssets(project, installed.theme) };
}
