#!/usr/bin/env python3
"""See reference/production-rules.md for the pipeline contract."""
import json, re, sys, os
here = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))  
tl = json.load(open(f'{here}/script/timeline.json', encoding='utf-8'))
S = {s['id']: s for s in tl['sentences']}
C = {c['n']: c['from'] for c in tl['chapters']}
def sub(m):
    key, field, off = m.group(1), m.group(2), int(m.group(3) or 0)
    if key == 'TOTAL': v = tl['total_frames']
    elif key.startswith('C'): v = C[int(key[1:])]
    else:
        s = S[key]
        if field == 'from': v = s['from']
        elif field == 'to': v = s['to']
        elif field and field.startswith('c'): v = s['subs'][int(field[1:]) - 1]['from']
        else: raise SystemExit(f'bad token {m.group(0)}')
    return str(v + off)
src = open(f'{here}/script/storyboard_src.md', encoding='utf-8').read()
out = re.sub(r'\{(S\d+|C\d+|TOTAL)(?:\.(from|to|c\d+))?([+-]\d+)?\}', sub, src)
left = re.findall(r'\{(?:S\d+|C\d+|TOTAL)[^}]*\}', out)
if left:
    raise SystemExit(f'Unresolved storyboard tokens: {left[:5]}')
open(f'{here}/storyboard.md', 'w', encoding='utf-8').write(out)
print('written storyboard.md')
