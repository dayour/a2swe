export const theme = {"name":"datadog-cowork-plugin-brand","background":"#F8F6FB","foreground":"#000000","accent":"#632CA6","fontFamily":"nationalweb, 'Segoe UI', Arial, sans-serif","headingFont":"'Noto Sans JP', 'Segoe UI', Arial, sans-serif","radius":10,"palette":{"primary":"#632CA6","header":"#000000","deep":"#000000","highlight":"#BEAAFF","paper":"#FFFFFF","line":"#D4CBDF","muted":"#666666","soft":"#EFEAF6","danger":"#B42318"},"source":{"kind":"site","reference":"https://www.datadoghq.com/","retrievedAt":"2026-10-16T18:25:52.900Z","basis":"Derived from 4 documents on www.datadoghq.com (theme-color #FFFFFF): primary #632CA6, secondary #FF0078, accent #BEAAFF, dark #000000, light #EEEEEE; fonts nationalweb / Noto Sans JP. Inspired by the site; not an official brand asset."}};
// Resolved brand tokens from core brandTokens(); every scene, caption and visual reads these instead of re-deriving colors.
export const brand: {
  name: string; mode: 'light' | 'dark'; branded: boolean;
  canvas: string; text: string; accent: string; muted: string; primary: string; onPrimary: string;
  header: string; onHeader: string; headerMuted: string; deep: string; onDeep: string; highlight: string; onHighlight: string;
  paper: string; line: string; soft: string; danger: string; callout: string; calloutLine: string;
  printInk: string; printAccent: string; printHeader: string;
  bodyFont: string; headingFont: string; headingWeight: number; radius: number;
} = {"name":"datadog-cowork-plugin-brand","mode":"light","branded":true,"canvas":"#F8F6FB","text":"#000000","accent":"#632CA6","muted":"#666666","primary":"#632CA6","onPrimary":"#FFFFFF","header":"#000000","onHeader":"#FFFFFF","headerMuted":"#B8B8B8","deep":"#000000","onDeep":"#FFFFFF","highlight":"#BEAAFF","onHighlight":"#000000","paper":"#FFFFFF","line":"#D4CBDF","soft":"#EFEAF6","danger":"#B42318","callout":"#F5F2FF","calloutLine":"#76699E","printInk":"#000000","printAccent":"#632CA6","printHeader":"#000000","bodyFont":"nationalweb, 'Segoe UI', Arial, sans-serif","headingFont":"'Noto Sans JP', 'Segoe UI', Arial, sans-serif","headingWeight":800,"radius":10};

export function hexToRgb(hex: string): [number, number, number] {
  const digits = hex.replace('#', '');
  const value = digits.length === 3 ? digits.split('').map((c) => c + c).join('') : digits;
  return [parseInt(value.slice(0, 2), 16) || 0, parseInt(value.slice(2, 4), 16) || 0, parseInt(value.slice(4, 6), 16) || 0];
}

export function mixHex(foreground: string, background: string, weight: number): string {
  const a = hexToRgb(foreground);
  const b = hexToRgb(background);
  return '#' + [0, 1, 2].map((i) => Math.round(a[i] * weight + b[i] * (1 - weight)).toString(16).padStart(2, '0')).join('');
}

export const alpha = (hex: string, opacity: number) => { const [r, g, b] = hexToRgb(hex); return 'rgba(' + r + ',' + g + ',' + b + ',' + opacity + ')'; };
export const dark = brand.mode === 'dark';
// Dark themes keep translucent surfaces over the animated backdrop; light brand themes use opaque paper tiles like the card system.
export const surface = dark ? alpha(brand.text, 0.07) : brand.paper;
export const line = dark ? alpha(brand.text, 0.16) : brand.line;
export const muted = dark ? alpha(brand.text, 0.72) : brand.muted;
export const panelFill = dark ? brand.canvas : brand.paper;
export const captionBackground = dark ? alpha(brand.canvas, 0.78) : alpha(brand.deep, 0.92);
export const captionInk = dark ? brand.text : brand.onDeep;
export const accentAlpha = (opacity: number) => alpha(brand.accent, opacity);
export const primaryAlpha = (opacity: number) => alpha(brand.primary, opacity);
export const primaryFont = brand.bodyFont;
export const headingFont = brand.headingFont;
export const radius = Math.round(brand.radius * 1.5);
