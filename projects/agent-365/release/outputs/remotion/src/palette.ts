export const theme = {"name":"agent-365-brand","background":"#F4F8FC","foreground":"#071923","accent":"#0067B8","fontFamily":"'Segoe UI Variable Text', 'Segoe UI', Arial, sans-serif","headingFont":"'Segoe UI Variable Display', 'Segoe UI', Arial, sans-serif","radius":10,"palette":{"primary":"#0067B8","header":"#091F2C","deep":"#06141D","highlight":"#50E6FF","paper":"#FFFFFF","line":"#C4D5E2","muted":"#626C71","soft":"#E6F0F8","danger":"#B42318"},"source":{"kind":"site","reference":"https://www.microsoft.com/en-us/microsoft-agent-365","retrievedAt":"2026-10-16T18:25:44.675Z","basis":"Derived from 11 documents on www.microsoft.com: primary #0067B8, secondary #50E6FF, accent #043710, dark #091F2C, light #DCEEF8; fonts Segoe UI Variable Text / Segoe UI Variable Display. Inspired by the site; not an official brand asset."}};
// Resolved brand tokens from core brandTokens(); every scene, caption and visual reads these instead of re-deriving colors.
export const brand: {
  name: string; mode: 'light' | 'dark'; branded: boolean;
  canvas: string; text: string; accent: string; muted: string; primary: string; onPrimary: string;
  header: string; onHeader: string; headerMuted: string; deep: string; onDeep: string; highlight: string; onHighlight: string;
  paper: string; line: string; soft: string; danger: string; callout: string; calloutLine: string;
  printInk: string; printAccent: string; printHeader: string;
  bodyFont: string; headingFont: string; headingWeight: number; radius: number;
} = {"name":"agent-365-brand","mode":"light","branded":true,"canvas":"#F4F8FC","text":"#071923","accent":"#0067B8","muted":"#626C71","primary":"#0067B8","onPrimary":"#FFFFFF","header":"#091F2C","onHeader":"#FFFFFF","headerMuted":"#BAC0C4","deep":"#06141D","onDeep":"#FFFFFF","highlight":"#50E6FF","onHighlight":"#06141D","paper":"#FFFFFF","line":"#C4D5E2","soft":"#E6F0F8","danger":"#B42318","callout":"#E5FBFF","calloutLine":"#328F9E","printInk":"#071923","printAccent":"#0067B8","printHeader":"#091F2C","bodyFont":"'Segoe UI Variable Text', 'Segoe UI', Arial, sans-serif","headingFont":"'Segoe UI Variable Display', 'Segoe UI', Arial, sans-serif","headingWeight":800,"radius":10};

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
