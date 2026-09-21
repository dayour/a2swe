
export const clamp01 = (v: number) => Math.min(1, Math.max(0, v));


export const slideIn = (n: number, N = 22, p = 2.5) => 1 - Math.pow(1 - clamp01(n / N), p);

export const powOutRemain = (n: number, N = 22, p = 2.5) => Math.pow(1 - clamp01(n / N), p);

export const expOut = (k: number) => (n: number) => (n <= 0 ? 0 : 1 - Math.pow(k, n));

export const powIn = (p: number) => (t: number) => Math.pow(clamp01(t), p);

export const easeInOutPow = (p = 2.5) => (t: number) => {
  t = clamp01(t);
  return t < 0.5 ? 0.5 * Math.pow(2 * t, p) : 1 - 0.5 * Math.pow(2 - 2 * t, p);
};
export const easeOutCubic = (t: number) => 1 - Math.pow(1 - clamp01(t), 3);
export const easeInOutCubic = easeInOutPow(3);
export const easeOutQuad = (t: number) => 1 - Math.pow(1 - clamp01(t), 2);


export const cubicBezier = (x1: number, y1: number, x2: number, y2: number) => {
  const A = (a1: number, a2: number) => 1 - 3 * a2 + 3 * a1;
  const B = (a1: number, a2: number) => 3 * a2 - 6 * a1;
  const C = (a1: number) => 3 * a1;
  const calc = (u: number, a1: number, a2: number) => ((A(a1, a2) * u + B(a1, a2)) * u + C(a1)) * u;
  const slope = (u: number, a1: number, a2: number) => 3 * A(a1, a2) * u * u + 2 * B(a1, a2) * u + C(a1);
  return (t: number) => {
    t = clamp01(t);
    if (t === 0 || t === 1) return t;
    let u = t;
    for (let i = 0; i < 8; i++) {
      const s = slope(u, x1, x2);
      if (Math.abs(s) < 1e-6) break;
      u -= (calc(u, x1, x2) - t) / s;
    }
    if (u < 0 || u > 1 || Math.abs(calc(u, x1, x2) - t) > 1e-4) {
      let lo = 0, hi = 1;
      for (let i = 0; i < 40; i++) {
        u = (lo + hi) / 2;
        if (calc(u, x1, x2) < t) lo = u; else hi = u;
      }
    }
    return calc(u, y1, y2);
  };
};

export const BEZ_SCALE_IN = cubicBezier(0.1, 0.1, 0.35, 1);


export const emphasisPulse = (
  n: number,
  {peak = 1.11, up = 13, hold = 4, down = 13, ease = easeInOutPow(2.5)}: {peak?: number; up?: number; hold?: number; down?: number; ease?: (t: number) => number} = {},
) => {
  if (n <= 0) return 1;
  if (n < up) return 1 + (peak - 1) * ease(n / up);
  if (n < up + hold) return peak;
  if (n < up + hold + down) return peak - (peak - 1) * ease((n - up - hold) / down);
  return 1;
};


export const kf = (t: number, pairs: Array<[number, number]>, ease: (u: number) => number = (u) => u) => {
  if (pairs.length === 0) return 0;
  if (t <= pairs[0][0]) return pairs[0][1];
  for (let i = 1; i < pairs.length; i++) {
    const [t0, v0] = pairs[i - 1];
    const [t1, v1] = pairs[i];
    if (t <= t1) return t1 === t0 ? v1 : v0 + (v1 - v0) * ease((t - t0) / (t1 - t0));
  }
  return pairs[pairs.length - 1][1];
};

export const stepKf = (t: number, pairs: Array<[number, number]>) => {
  if (pairs.length === 0) return 0;
  if (t < pairs[0][0]) return pairs[0][1];
  for (let i = pairs.length - 1; i >= 0; i--) if (t >= pairs[i][0]) return pairs[i][1];
  return pairs[0][1];
};

export const rnd = (...seeds: number[]) => {
  let h = 2166136261;
  for (const s of seeds) {
    h ^= Math.floor(s * 1000003) & 0xffffffff;
    h = Math.imul(h, 16777619);
  }
  h ^= h >>> 13;
  h = Math.imul(h, 0x5bd1e995);
  h ^= h >>> 15;
  return ((h >>> 0) % 100000) / 100000;
};
