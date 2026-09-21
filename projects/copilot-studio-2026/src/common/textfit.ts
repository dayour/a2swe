
export const EM_HEAVY = 1;      
export const EM_WIDE = 1.18;    
export const EM_ORB = 1.2;      
export const EM_TECH = 0.92;    


export const textEm = (s: string, emScale = 1): number => {
  let em = 0;
  for (const ch of s) {
    const c = ch.codePointAt(0) ?? 32;
    if (c >= 0x2000) em += 1;                              
    else if (ch === ' ') em += 0.227;
    else if (ch >= 'A' && ch <= 'Z') em += 0.668;
    else if (ch >= '0' && ch <= '9') em += 0.59;
    else if (ch >= 'a' && ch <= 'z') em += 0.566;
    else if (c >= 0xc0 && c < 0x250) em += 0.58;           
    else em += 0.325;                                      
  }
  return em * emScale;
};


const charCount = (s: string): number => [...s].length;


export const textW = (s: string, size: number, emScale = 1, letterSpacing = 0): number => textEm(s, emScale) * size + letterSpacing * charCount(s);


export const fitSize = (s: string, maxW: number, size: number, minSize = size * 0.78, emScale = 1, letterSpacing = 0): number => {
  const em = textEm(s, emScale);
  const extra = letterSpacing * charCount(s);
  if (em * size + extra <= maxW) return size;
  return Math.max(minSize, Math.round(((maxW - extra) / Math.max(1e-6, em)) * 10) / 10);
};
