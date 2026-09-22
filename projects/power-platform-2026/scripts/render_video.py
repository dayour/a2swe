"""Render a new candidate, then correct measured encoder delay without trimming speech."""
import argparse
import os
from pathlib import Path
import re
import shutil
import subprocess
import sys

from pipeline_media import ensure_new_file

ROOT = Path(__file__).resolve().parents[1]


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--version', required=True)
    args = parser.parse_args()
    if not re.fullmatch(r'v[1-9]\d*', args.version):
        raise SystemExit('Version must be v followed by a positive integer')
    npx = shutil.which('npx.cmd' if os.name == 'nt' else 'npx')
    ffmpeg = shutil.which('ffmpeg')
    if not npx or not ffmpeg:
        raise SystemExit('Rendering requires npx and ffmpeg on PATH')
    name = f'{ROOT.name}-{args.version}'
    final = ensure_new_file(ROOT / 'renders' / f'{name}.mp4', 'candidate')
    raw = ensure_new_file(ROOT / 'qc/encoded' / f'{name}-encoded.mp4', 'encoded intermediate')
    ensure_new_file(final.with_suffix('.alignment.json'), 'alignment report')
    for script, options in [('check_inputs.py', []), ('sync_scenes.py', ['--check'])]:
        subprocess.run([sys.executable, ROOT / 'scripts' / script, *options], cwd=ROOT, check=True)
    subprocess.run([npx, 'remotion', 'render', 'src/index.ts', 'Video', str(raw)], cwd=ROOT, check=True)
    subprocess.run([sys.executable, ROOT / 'scripts/align_audio.py', raw,
                    ROOT / 'public/assets' / ROOT.name / 'audio.wav', final,
                    '--ffmpeg', ffmpeg], cwd=ROOT, check=True)
    print(f'Candidate rendered: {final}. Run complete-frame/media QC and request listening review.')


if __name__ == '__main__':
    main()
