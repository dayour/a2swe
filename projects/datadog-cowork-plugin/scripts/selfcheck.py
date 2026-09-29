#!/usr/bin/env python3
"""See reference/production-rules.md for the pipeline contract."""
import re, os, sys, glob
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sb = open(f'{ROOT}/storyboard.md', encoding='utf-8').read()


sb_shots = {}
for m in re.finditer(r'^\| (SC\d\d)[^|]*\| (\d+)[–-](\d+) \|', sb, re.M):
    sb_shots[m.group(1)] = (int(m.group(2)), int(m.group(3)))


wl_text = re.search(r'^\*\*Glitch whitelist\*\*:\s*(.*)$', sb, re.M)
whitelist = {}
if wl_text:
    for part in wl_text.group(1).split(';'):
        mm = re.match(r'\s*(SC\d\d)\s+(.*)', part.strip())
        if mm: whitelist[mm.group(1)] = mm.group(2).strip()

groups = sys.argv[1:] or sorted(os.path.basename(p) for p in glob.glob(f'{ROOT}/src/shots/G*'))
problems = 0


built = {}
for g in groups:
    idx = f'{ROOT}/src/shots/{g}/index.ts'
    if not os.path.exists(idx): continue
    src = open(idx, encoding='utf-8').read()
    for m in re.finditer(r"id:\s*'([^']+)'\s*,\s*from:\s*(\d+)\s*,\s*to:\s*(\d+)", src):
        built[m.group(1)] = (int(m.group(2)), int(m.group(3)), g)
    if not re.search(r"id:\s*'", src):
        print(f'[coverage] {g}: no literal shot ranges in index.ts; inspect constants manually')
print(f'[coverage] storyboard: {len(sb_shots)} shots; built: {len(built)} shots')
if not sb_shots:
    print('[coverage] ERROR: no storyboard shots parsed')
    problems += 1
for sid, (a, b) in sorted(sb_shots.items()):
    if sid not in built:
        print(f'  ERROR: missing shot {sid}')
        problems += 1
    else:
        ba, bb, g = built[sid]
        if (ba, bb) != (a, b):
            print(f'  ERROR: {sid} ({g}) range {ba}-{bb} differs from storyboard {a}-{b}'); problems += 1
import json
_tl = json.load(open(f'{ROOT}/script/timeline.json'))
_chapter_starts = {c['from'] for c in _tl['chapters']}
ids = sorted(built, key=lambda k: built[k][0])
for p, q in zip(ids, ids[1:]):
    gap = built[q][0] - built[p][1]
    
    if gap > 1 and any(built[q][0] == cs - 8 for cs in _chapter_starts):  
        print(f'  Chapter-card gap {p} to {q}: {built[p][1]}-{built[q][0]} (overlay)'); continue
    if gap > 1: print(f'  ERROR: gap {p} to {q}: {gap-1} uncovered frames'); problems += 1
    if gap < -4: print(f'  ERROR: overlap {p} to {q}: {-gap+1} frames'); problems += 1


print(f'[glitch] whitelist: {len(whitelist)} entries')
for g in groups:
    for f in sorted(glob.glob(f'{ROOT}/src/shots/{g}/SC*.tsx')):
        sid = os.path.basename(f)[:4]
        src = open(f, encoding='utf-8').read()
        n = len(re.findall(r'<GlitchIn\b', src)) + len(re.findall(r'glitchOpacity\(', src))
        want = 1 if sid in whitelist else 0
        flag = '' if n == want else '  ✗'
        if n != want: problems += 1
        print(f'  {sid} GlitchIn x{n} (whitelist: {whitelist.get(sid, "none")}){flag}')


fact = re.search(r'^\*\*Facts\*\*:.*$', sb, re.M)
fact_txt = (fact.group(0) if fact else '') + sb  
noise = re.compile(r'^(#|rgb|[0-9.\s%pxem-]+$|[a-z][A-Za-z0-9]*$|\.\./|src/|[A-Z_]+$|none|auto|absolute|relative|center|left|right|top|bottom|solid|dashed|round|butt|square|nowrap|hidden|visible|inherit|bold|italic|normal)')
print('[literals] Strings absent from storyboard/facts (manual review):')
seen = set()
for g in groups:
    for f in sorted(glob.glob(f'{ROOT}/src/shots/{g}/*.tsx')):
        src = open(f, encoding='utf-8').read()
        for s in re.findall(r"(?:'|\"|`)([^'\"`\n]{3,80})(?:'|\"|`)", src):
            s2 = s.strip()
            if not s2 or noise.match(s2) or s2 in seen: continue
            if '${' in s2 or 'px' in s2 or 'rgba' in s2 or 'gradient' in s2 or re.fullmatch(r'[\d.,\s]+', s2) or s2.startswith('./') or re.match(r'^[a-zA-Z-]+\(', s2) or s2 in ('border-box','content-box'): continue  
            if re.fullmatch(r'[\d.,×x%+\-–\s]+', s2): pass  
            elif not re.search(r'[A-Za-z]{3}', s2): continue
            if s2 in fact_txt or s2 in sb: continue
            seen.add(s2); print(f'  {os.path.basename(f)}: {s2}')
print(f'\nproblems: {problems}')
sys.exit(1 if problems else 0)
