#!/usr/bin/env python3
"""Fail-closed production dependency checks for the Power Platform 2026 project."""
from __future__ import annotations

import json
import re
import argparse
from datetime import datetime, timezone
from pathlib import Path
from typing import Any
from speech_runtime import verify_narration

ROOT = Path(__file__).resolve().parents[1]
QC = ROOT / 'qc'
MIN_SECONDS = 30
MAX_SECONDS = 45
FPS = 30


def next_report_path() -> Path:
    QC.mkdir(parents=True, exist_ok=True)
    version = 1
    while True:
        path = QC / f'dependency-report-v{version}.json'
        if not path.exists():
            return path
        version += 1


def read_text(path: Path) -> str:
    return path.read_text(encoding='utf-8') if path.is_file() else ''


def has_research() -> tuple[bool, list[str]]:
    candidates = [ROOT / 'research' / 'research.md', ROOT / 'research' / 'sources.json']
    present = [str(path.relative_to(ROOT)) for path in candidates if path.is_file() and path.stat().st_size > 0]
    if not present:
        return False, ['Missing research/research.md or research/sources.json with verified claim traceability.']
    if (ROOT / 'research' / 'sources.json').is_file():
        try:
            json.loads((ROOT / 'research' / 'sources.json').read_text(encoding='utf-8'))
        except json.JSONDecodeError as exc:
            return False, [f'research/sources.json is not valid JSON: {exc}']
    return True, present


def narration_status() -> tuple[bool, list[str], int]:
    path = ROOT / 'script' / 'narration.txt'
    if not path.is_file():
        return False, ['Missing script/narration.txt.'], 0
    text = read_text(path)
    lines = [line.strip() for line in text.splitlines() if line.strip() and not line.lstrip().startswith('#')]
    if not lines:
        return False, ['script/narration.txt contains only placeholder comments; final English narration is required.'], 0
    if re.search(r'[\u3400-\u9fff]', text):
        return False, ['script/narration.txt is not English-only.'], len(lines)
    if 'Awaiting externally researched English narration' in text:
        return False, ['script/narration.txt still contains the scaffold placeholder.'], len(lines)
    return True, [f'{len(lines)} narration lines ready.'], len(lines)


def timeline_status() -> tuple[bool, list[str]]:
    path = ROOT / 'script' / 'timeline.json'
    if not path.is_file():
        return False, ['script/timeline.json not generated yet; run npm run audio.']
    try:
        timeline: dict[str, Any] = json.loads(path.read_text(encoding='utf-8'))
    except json.JSONDecodeError as exc:
        return False, [f'script/timeline.json is not valid JSON: {exc}']
    total_frames = int(timeline.get('total_frames', 0))
    seconds = total_frames / FPS
    if not (MIN_SECONDS <= seconds <= MAX_SECONDS):
        return False, [f'timeline duration is {seconds:.1f}s; expected {MIN_SECONDS}-{MAX_SECONDS}s.']
    if timeline.get('lang') != 'en':
        return False, [f"timeline language is {timeline.get('lang')!r}; expected 'en'."]
    try:
        speech = verify_narration(ROOT)
    except (ValueError, KeyError, OSError) as exc:
        return False, [f'Audio provenance check failed: {exc}']
    if speech['engine'] != 'kokoro' or speech['voice'] != 'am_liam' or speech['rate'] != 1.0:
        return False, ['This candidate requires the approved Kokoro am_liam voice at speed 1.0.']
    return True, [f'timeline duration {seconds:.1f}s is within target.']


def write_report(ok: bool, details: dict[str, Any]) -> Path:
    path = next_report_path()
    payload = {
        'project': 'power-platform-2026',
        'created_at': datetime.now(timezone.utc).isoformat(),
        'status': 'ready' if ok else 'blocked',
        'target': {'width': 1920, 'height': 1080, 'fps': FPS, 'duration_seconds': [MIN_SECONDS, MAX_SECONDS], 'language': 'en'},
        'media_policy': 'original code-drawn visuals only; no external logos/media',
        'human_approvals': 'not supplied; do not fabricate',
        **details,
    }
    path.write_text(json.dumps(payload, indent=2, sort_keys=True), encoding='utf-8')
    return path


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument('--before-audio', action='store_true')
    args = parser.parse_args()
    research_ok, research_detail = has_research()
    narration_ok, narration_detail, narration_lines = narration_status()
    timeline_ok, timeline_detail = (True, ['Deferred until audio generation.']) if args.before_audio else timeline_status()
    ok = research_ok and narration_ok and timeline_ok
    report = write_report(ok, {
        'checks': {
            'research': {'ok': research_ok, 'detail': research_detail},
            'narration': {'ok': narration_ok, 'detail': narration_detail, 'line_count': narration_lines},
            'timeline': {'ok': timeline_ok, 'detail': timeline_detail},
        },
    })
    print(f'production dependency report: {report.relative_to(ROOT)} ({ "ready" if ok else "blocked" })')
    if not ok:
        raise SystemExit(1)


if __name__ == '__main__':
    main()
