#!/usr/bin/env python3
"""See reference/production-rules.md for the pipeline contract."""
import argparse, os, re, sys
import numpy as np
from PIL import Image
from scipy import ndimage as ndi

ap = argparse.ArgumentParser()
ap.add_argument('--frames', default='fin_frames')
ap.add_argument('--storyboard', default='storyboard.md')
ap.add_argument('--shots', default='')
ap.add_argument('--step', type=int, default=4)
ap.add_argument('--out', default='')
ap.add_argument('--rail-top', type=int, default=100, help='Top of content area; use 175 for shots with a pipeline rail')
ap.add_argument('--bg', default='auto', help="Backdrop stars|dots|auto; auto reads config.ts; dots masks the background grid")
a = ap.parse_args()

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
def cfg_bg():
    try:
        m = re.search(r"bg:\s*'(stars|dots)'", open(f'{ROOT}/src/config.ts', encoding='utf-8').read())
        return m.group(1) if m else 'stars'
    except OSError:
        return 'stars'
BG = cfg_bg() if a.bg == 'auto' else a.bg

def dot_mask(W=1280, H=720, r=5):
    """See reference/production-rules.md for the pipeline contract."""
    m = np.zeros((H, W), bool)
    if BG != 'dots':
        return m
    sc = max(W / 960, H / 540); ox = (W - 960 * sc) / 2; oy = (H - 540 * sc) / 2
    yy, xx = np.ogrid[-r:r + 1, -r:r + 1]; disc = (xx * xx + yy * yy) <= r * r
    for y in range(18, 540, 36):
        for x in range(24, 960, 36):
            cx = int(round(ox + x * sc)); cy = int(round(oy + y * sc))
            y0, y1 = max(0, cy - r), min(H, cy + r + 1); x0, x1 = max(0, cx - r), min(W, cx + r + 1)
            if y1 <= y0 or x1 <= x0: continue
            m[y0:y1, x0:x1] |= disc[(y0 - cy + r):(y1 - cy + r), (x0 - cx + r):(x1 - cx + r)]
    return m
DOT_MASK = dot_mask()


SOFT_LO = 22 if BG == 'dots' else 10

def parse_shots():
    if a.shots:
        out = []
        for tok in a.shots.split(','):
            sid, rng = tok.split(':'); lo, hi = re.split(r'[–-]', rng)
            out.append((sid, int(lo), int(hi)))
        return out
    out = []
    for line in open(a.storyboard, encoding='utf-8'):
        m = re.match(r'^\|\s*(SC\d+)[^|]*\|\s*(\d+)\s*[–-]\s*(\d+)\s*\|', line)
        if m:
            out.append((m.group(1), int(m.group(2)), int(m.group(3))))
    
    seen = {}
    for s in out:
        seen.setdefault(s[0], s)
    return list(seen.values())

def frame_path(i):
    p = os.path.join(a.frames, f'f_{i:04d}.jpg')
    return p if os.path.exists(p) else os.path.join(a.frames, f'frame_{i:04d}.jpg')

Z = slice(a.rail_top, 621)

def analyze(i):
    im = Image.open(frame_path(i)).convert('RGB'); arr = np.asarray(im).astype(np.int32)
    r, g, b = arr[..., 0], arr[..., 1], arr[..., 2]
    lum = (r * 299 + g * 587 + b * 114) // 1000
    mx = arr.max(2); mn = arr.min(2); sat = np.where(mx > 0, (mx - mn) / np.maximum(mx, 1), 0)
    bright = (lum[Z] > 120) & ~DOT_MASK[Z]   
    
    obj = ndi.binary_dilation(bright, structure=np.ones((13, 41), bool))
    lab, n = ndi.label(obj)
    hero_h = 0; hero_box = None; small = 0
    if n:
        ink = ndi.sum(bright, lab, index=np.arange(1, n + 1))  
        for k, s in enumerate(ndi.find_objects(lab)):
            if s is None or ink[k] < 30: continue
            h = s[0].stop - s[0].start; w = s[1].stop - s[1].start
            if h < 60 and w < 60: small += 1
            
            size = max(h, min(w, 4 * h) / 2.5)
            if size > hero_h: hero_h = size; hero_box = s
    soft = (sat[Z] > 0.25) & (lum[Z] > SOFT_LO) & (lum[Z] < 110) & ~DOT_MASK[Z]
    glow_total = int(soft.sum())  
    glow_hero = 0
    if hero_box is not None:
        y0 = max(0, hero_box[0].start - 30); y1 = hero_box[0].stop + 30
        x0 = max(0, hero_box[1].start - 30); x1 = hero_box[1].stop + 30
        sub = soft[y0:y1, x0:x1]
        if sub.any():
            lab2, n2 = ndi.label(sub)
            glow_hero = int(np.bincount(lab2.ravel())[1:].max()) if n2 else 0
    
    purple = (b[Z] > r[Z]) & (r[Z] > g[Z]) & (sat[Z] > 0.45) & (lum[Z] > 45)
    lab3, n3 = ndi.label(ndi.binary_dilation(purple, structure=np.ones((7, 25), bool)))  
    npurple = int((np.bincount(lab3.ravel())[1:] >= 80).sum()) if n3 else 0
    return hero_h, glow_hero, npurple, small, int(bright.sum()), glow_total

def diff_series(lo, hi):
    prev = None; out = []
    for i in range(lo, hi + 1):
        im = Image.open(frame_path(i)); im.draft('L', (320, 180)); l = np.asarray(im.convert('L').resize((320, 180))).astype(np.int32)
        out.append(0 if prev is None else float(np.abs(l - prev).mean())); prev = l
    return out

shots = parse_shots()
if not shots:
    sys.exit('No shot ranges found: check --storyboard or use --shots')
lines = ['| Shot | Frames | Hero median/min px | Empty run frames | Glow hero/total median px2 | Purple fragments median | Still run frames | Flags |', '|---|---|---|---|---|---|---|---|']
flags_total = {'high': 0, 'medium': 0, 'low': 0}
for sid, lo, hi in shots:
    hh = []; gl = []; pp = []; sm = []; gt = []
    for i in range(lo, hi + 1, a.step):
        h, g, p, s, br, g_all = analyze(i)
        if br < 200: h = 0
        hh.append(h); gl.append(g); pp.append(p); sm.append(s); gt.append(g_all)
    hh = np.array(hh); gt = np.array(gt); run = 0; best = 0
    for h, g_all in zip(hh, gt):
        
        run = run + 1 if (h < 110 and g_all < 10000) else 0; best = max(best, run)
    low_run = best * a.step
    d = diff_series(lo, hi); srun = 0; sbest = 0
    for v in d[1:]:
        srun = srun + 1 if v < 0.15 else 0; sbest = max(sbest, srun)
    flags = []
    
    solid = hh[(hh > 0) & ~((hh < 110) & (gt >= 10000))]
    med_h = float(np.median(solid)) if len(solid) else 0.0; min_h = int(hh.min())
    if low_run > 45:
        low_vals = hh[(hh < 110) & (hh > 0)]
        flags.append('high:empty(hero<80px for >45 frames)' if len(low_vals) and np.median(low_vals) < 80 else 'medium:empty(hero<110px for >45 frames)')
    elif med_h < 170:
        flags.append('low:hero<170px')
    if float(np.median(gl)) < 800: flags.append('low:hero has no glow')
    if float(np.median(pp)) >= 8: flags.append('low:purple fragments>=8')
    if float(np.median(sm)) >= 10: flags.append('medium:background fragments>=10')
    if sbest > 45: flags.append(f'low:still for {sbest} frames')
    for f in flags:
        flags_total[f.split(':', 1)[0]] += 1
    lines.append(f'| {sid} | {lo}–{hi} | {med_h:.0f} / {min_h} | {low_run} | {np.median(gl):.0f} / {np.median(gt):.0f} | {np.median(pp):.0f} | {sbest} | {"；".join(flags) or "OK"} |')
head = f'# Composition, lighting, motion ({a.frames}, step {a.step}, backdrop {BG})\n\nFlags: high {flags_total["high"]} / medium {flags_total["medium"]} / low {flags_total["low"]}. See reference/production-rules.md.\n\n'
txt = head + '\n'.join(lines) + '\n'
if a.out:
    os.makedirs(os.path.dirname(a.out) or '.', exist_ok=True); open(a.out, 'w', encoding='utf-8').write(txt); print(a.out)
print(txt)
