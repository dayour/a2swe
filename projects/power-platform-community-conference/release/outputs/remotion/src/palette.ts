export const theme = {"name":"power-platform-community-conference-brand","background":"#F5F9F8","foreground":"#081222","accent":"#17796A","fontFamily":"Montserrat, 'Segoe UI', Arial, sans-serif","headingFont":"Montserrat, 'Segoe UI', Arial, sans-serif","radius":10,"palette":{"primary":"#17796A","header":"#0A172A","deep":"#070F1B","highlight":"#2FFFE0","paper":"#FFFFFF","line":"#C8D8D5","muted":"#6B717A","soft":"#E8F2F0","danger":"#B42318"},"source":{"kind":"site","reference":"https://powerplatformconf.com/","retrievedAt":"2026-10-16T18:21:25.111Z","basis":"Derived from 5 documents on powerplatformconf.com: primary #2FFFE0, secondary #3A7BFF, accent #2FFFE0, dark #0A172A, light #F4F3F5; fonts Montserrat. Inspired by the site; not an official brand asset."}};
// Resolved brand tokens from core brandTokens(); every scene, caption and visual reads these instead of re-deriving colors.
export const brand: {
  name: string; mode: 'light' | 'dark'; branded: boolean;
  canvas: string; text: string; accent: string; muted: string; primary: string; onPrimary: string;
  header: string; onHeader: string; headerMuted: string; deep: string; onDeep: string; highlight: string; onHighlight: string;
  paper: string; line: string; soft: string; danger: string; callout: string; calloutLine: string;
  printInk: string; printAccent: string; printHeader: string;
  bodyFont: string; headingFont: string; headingWeight: number; radius: number;
} = {"name":"power-platform-community-conference-brand","mode":"light","branded":true,"canvas":"#F5F9F8","text":"#081222","accent":"#17796A","muted":"#6B717A","primary":"#17796A","onPrimary":"#FFFFFF","header":"#0A172A","onHeader":"#FFFFFF","headerMuted":"#BABEC3","deep":"#070F1B","onDeep":"#FFFFFF","highlight":"#2FFFE0","onHighlight":"#070F1B","paper":"#FFFFFF","line":"#C8D8D5","soft":"#E8F2F0","danger":"#B42318","callout":"#E0FFFA","calloutLine":"#1D9E8B","printInk":"#081222","printAccent":"#17796A","printHeader":"#0A172A","bodyFont":"Montserrat, 'Segoe UI', Arial, sans-serif","headingFont":"Montserrat, 'Segoe UI', Arial, sans-serif","headingWeight":800,"radius":10};

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
