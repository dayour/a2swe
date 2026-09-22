#!/usr/bin/env python3
"""Shared media/QC helpers for the local video pipeline."""
from __future__ import annotations

import hashlib
import json
import math
import os
import re
import subprocess
import wave
from pathlib import Path
from typing import Any, Iterable

FPS = 30
WIDTH = 1920
HEIGHT = 1080
AUDIO_RATE = 48000
AUDIO_CHANNELS = 2


def fail(message: str) -> None:
    raise SystemExit(message)


def require_file(path: Path, label: str) -> Path:
    path = path.resolve()
    if not path.is_file():
        fail(f'{label} not found: {path}')
    return path


def ensure_new_file(path: Path, label: str) -> Path:
    path = path.resolve()
    if path.exists():
        fail(f'{label} already exists; choose a new path to preserve local work: {path}')
    path.parent.mkdir(parents=True, exist_ok=True)
    return path


def run(args: list[str | os.PathLike[str]], label: str) -> subprocess.CompletedProcess[str]:
    try:
        return subprocess.run([str(arg) for arg in args], check=True, text=True, capture_output=True)
    except FileNotFoundError:
        fail(f'{label} executable not found: {args[0]}')
    except subprocess.CalledProcessError as exc:
        detail = (exc.stderr or exc.stdout or '').strip()
        fail(f'{label} failed with exit code {exc.returncode}: {detail[:2000]}')


def probe_media(ffprobe: str | Path, movie: Path) -> dict[str, Any]:
    completed = run([
        ffprobe,
        '-v', 'error',
        '-show_streams',
        '-show_format',
        '-of', 'json',
        movie,
    ], 'ffprobe')
    try:
        media = json.loads(completed.stdout)
    except json.JSONDecodeError as exc:
        fail(f'ffprobe returned invalid JSON for {movie}: {exc}')
    if not media.get('streams') or not media.get('format'):
        fail(f'ffprobe returned no stream/container metadata for {movie}')
    return media


def first_stream(media: dict[str, Any], codec_type: str) -> dict[str, Any]:
    for stream in media.get('streams', []):
        if stream.get('codec_type') == codec_type:
            return stream
    fail(f'Media is missing a {codec_type} stream')


def parse_rate(rate: str) -> float:
    if '/' in rate:
        numerator, denominator = rate.split('/', 1)
        den = float(denominator)
        if den == 0:
            fail(f'Invalid frame rate from ffprobe: {rate}')
        return float(numerator) / den
    return float(rate)


def stream_duration(stream: dict[str, Any], container: dict[str, Any]) -> float:
    value = stream.get('duration') or container.get('duration')
    if value is None:
        fail('Media duration is missing from ffprobe output')
    return float(value)


def read_audio_mono(path: Path):
    import numpy as np

    require_file(path, 'audio')
    with wave.open(str(path), 'rb') as source:
        sample_rate = source.getframerate()
        channels = source.getnchannels()
        sample_width = source.getsampwidth()
        frames = source.readframes(source.getnframes())
    if sample_rate <= 0 or channels not in (1, 2) or sample_width != 2:
        fail(f'Expected 16-bit mono/stereo PCM audio in {path}')
    audio = np.frombuffer(frames, dtype='<i2').astype(np.float32).reshape(-1, channels) / 32768.0
    if audio.size == 0:
        fail(f'Audio is empty: {path}')
    if not np.isfinite(audio).all():
        fail(f'Audio contains non-finite samples: {path}')
    mono = np.asarray(audio.mean(axis=1), dtype=np.float32)
    if not np.any(mono):
        fail(f'Audio is entirely silent: {path}')
    return mono, sample_rate


def decode_movie_audio(ffmpeg: str | Path, movie: Path):
    import numpy as np

    scratch = movie.resolve().parent.parent / 'qc'
    scratch.mkdir(parents=True, exist_ok=True)
    decoded_path = scratch / f'.decoded-{hashlib.sha256(str(movie.resolve()).encode()).hexdigest()[:12]}.wav'
    if decoded_path.exists():
        decoded_path.unlink()
    try:
        run([
            ffmpeg,
            '-v', 'error',
            '-i', movie,
            '-vn',
            '-c:a', 'pcm_s16le',
            decoded_path,
        ], 'ffmpeg audio decode')
        decoded, rate = read_audio_mono(decoded_path)
    finally:
        decoded_path.unlink(missing_ok=True)
    if decoded.size == 0 or not np.isfinite(decoded).all():
        fail(f'Decoded movie audio is invalid: {movie}')
    peak = float(np.abs(decoded).max())
    if peak == 0:
        fail(f'Decoded movie audio is silent: {movie}')
    return np.asarray(decoded, dtype=np.float32), rate, peak


def audio_alignment(actual, reference) -> dict[str, float | int]:
    import numpy as np
    from scipy.signal import correlate

    actual_norm = float(np.linalg.norm(actual))
    reference_norm = float(np.linalg.norm(reference))
    if actual_norm == 0 or reference_norm == 0:
        fail('Cannot align silent audio')
    correlations = correlate(actual, reference, mode='full', method='fft')
    peak_index = int(np.argmax(correlations))
    lag = peak_index - reference.size + 1
    similarity = float(correlations[peak_index] / (reference_norm * actual_norm))
    if not math.isfinite(similarity):
        fail('Audio correlation produced a non-finite similarity score')
    return {'lag_samples': lag, 'similarity': similarity}


def file_sha256(path: Path) -> str:
    with path.open('rb') as stream:
        return hashlib.file_digest(stream, 'sha256').hexdigest()


def write_json_new(path: Path, payload: dict[str, Any]) -> None:
    ensure_new_file(path, 'QC report')
    path.write_text(json.dumps(payload, indent=2, sort_keys=True), encoding='utf-8')


def resolve_frames_dir(project: Path, version: str, frames_dir: Path | None = None) -> Path:
    if frames_dir is not None:
        candidate = frames_dir if frames_dir.is_absolute() else project / frames_dir
        candidate = candidate.resolve()
        if not candidate.is_dir():
            fail(f'Frame directory not found: {candidate}')
        return candidate
    versioned = (project / f'fin_frames_{version}').resolve()
    if versioned.is_dir():
        return versioned
    legacy = (project / 'fin_frames').resolve()
    if legacy.is_dir():
        return legacy
    fail(f'Frame directory not found: expected {versioned} or legacy {legacy}')


def parse_shots(project: Path) -> list[tuple[str, int, int, str]]:
    shots: list[tuple[str, int, int, str]] = []
    for index in sorted((project / 'src/shots').glob('G*/index.ts')):
        source = index.read_text(encoding='utf-8')
        group = index.parent.name
        for match in re.finditer(r"id:\s*'([^']+)'\s*,\s*from:\s*(\d+)\s*,\s*to:\s*(\d+)", source):
            shots.append((match.group(1), int(match.group(2)), int(match.group(3)), group))
    return sorted(shots, key=lambda shot: (shot[1], shot[2], shot[0]))


def validate_shot_coverage(shots: Iterable[tuple[str, int, int, str]], total_frames: int) -> list[tuple[str, int, int, str]]:
    ordered = list(shots)
    if not ordered:
        fail('No literal shot ranges found in src/shots/G*/index.ts')
    if ordered[0][1] != 1:
        fail(f'First shot starts at frame {ordered[0][1]}, expected 1')
    if ordered[-1][2] != total_frames:
        fail(f'Last shot ends at frame {ordered[-1][2]}, expected {total_frames}')
    for previous, current in zip(ordered, ordered[1:]):
        if previous[2] + 1 != current[1]:
            fail(f'Shot coverage gap/overlap between {previous[0]} and {current[0]}: {previous[2]} -> {current[1]}')
    return ordered
