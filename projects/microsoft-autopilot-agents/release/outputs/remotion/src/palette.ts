export const theme = {"name":"executive-blue-teal","background":"#071B2D","foreground":"#F4FBFF","accent":"#16B8C8","fontFamily":"Arial"};

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

const [backgroundR, backgroundG, backgroundB] = hexToRgb(theme.background);
const [accentR, accentG, accentB] = hexToRgb(theme.accent);
export const dark = (0.2126 * backgroundR + 0.7152 * backgroundG + 0.0722 * backgroundB) / 255 < 0.5;
export const ink = dark ? '255,255,255' : '17,24,39';
export const surface = 'rgba(' + ink + ',' + (dark ? 0.07 : 0.05) + ')';
export const line = 'rgba(' + ink + ',' + (dark ? 0.16 : 0.14) + ')';
export const muted = 'rgba(' + ink + ',0.72)';
export const panelBackground = 'rgba(' + backgroundR + ',' + backgroundG + ',' + backgroundB + ',0.78)';
export const accentAlpha = (alpha: number) => 'rgba(' + accentR + ',' + accentG + ',' + accentB + ',' + alpha + ')';
export const primaryFont = theme.fontFamily;
