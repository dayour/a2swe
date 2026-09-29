#!/usr/bin/env python3
"""Core-managed local Kokoro/Kokoro-ONNX narration for the generated MP4 adapter."""
from __future__ import annotations

import hashlib
import json
import math
import os
import re
import sys
import tempfile
import wave
from importlib.metadata import PackageNotFoundError, distribution
from pathlib import Path
from urllib.parse import unquote, urldefrag, urlparse

REQUIRED_PYTHON = (3, 14)
KOKORO_REPO = 'hexgrad/Kokoro-82M'
OFFLINE_ENV = {
    'HF_HUB_OFFLINE': '1',
    'TRANSFORMERS_OFFLINE': '1',
    'HF_DATASETS_OFFLINE': '1',
    'HF_HUB_DISABLE_TELEMETRY': '1',
}


def fail(message: str) -> None:
    raise SystemExit(f'A2SWE_MP4_AUDIO_FAILED: {message}')


def sha256_path(path: Path) -> str:
    with path.open('rb') as stream:
        return hashlib.file_digest(stream, 'sha256').hexdigest()


def sha256_text(value: str) -> str:
    return hashlib.sha256(value.encode('utf-8')).hexdigest()


def write_json_atomic(path: Path, value: object) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    with tempfile.NamedTemporaryFile(mode='w', encoding='utf-8', dir=path.parent, suffix='.tmp', delete=False) as stream:
        temporary = Path(stream.name)
        json.dump(value, stream, indent=2, sort_keys=True)
        stream.write('\n')
    try:
        os.replace(temporary, path)
    finally:
        temporary.unlink(missing_ok=True)


def require_python314() -> None:
    if sys.version_info[:2] != REQUIRED_PYTHON:
        fail(f'Python {REQUIRED_PYTHON[0]}.{REQUIRED_PYTHON[1]} is required; got {sys.version.split()[0]}')


def require_file_env(name: str, suffixes: tuple[str, ...] = ()) -> Path:
    value = os.environ.get(name, '')
    if not value:
        fail(f'{name} must point to a local model file')
    path = Path(value)
    if not path.is_absolute():
        fail(f'{name} must be an absolute path: {value}')
    if not path.is_file():
        fail(f'{name} does not exist or is not a file: {path}')
    if suffixes and path.suffix.lower() not in suffixes:
        fail(f'{name} must use one of these file extensions: {", ".join(suffixes)}')
    return path


def enforce_offline_runtime() -> None:
    os.environ.update(OFFLINE_ENV)
    import socket

    def blocked_connect(*_args, **_kwargs):
        raise OSError('A2SWE_MP4_AUDIO_FAILED: network access is disabled for local MP4 speech synthesis')

    socket.create_connection = blocked_connect
    socket.socket.connect = blocked_connect
    socket.socket.connect_ex = blocked_connect


def validate_lock_references(root: Path, lock: str) -> None:
    project_root = root.resolve()
    for line in lock.splitlines():
        match = re.search(r'^\S+(?:\[.*?\])? @ (\S+)$', line)
        if not match:
            continue
        reference = urldefrag(match.group(1))[0]
        parsed = urlparse(reference)
        if parsed.scheme in ('http', 'https'):
            continue
        if parsed.scheme == 'file':
            raw_path = unquote(parsed.path)
            if os.name == 'nt' and re.match(r'^/[A-Za-z]:/', raw_path):
                raw_path = raw_path[1:]
            path = Path(raw_path)
        elif parsed.scheme:
            fail(f'requirements.lock.txt contains unsupported direct reference scheme: {parsed.scheme}')
        else:
            path = Path(unquote(reference))
            if not path.is_absolute():
                path = root / path
        resolved = path.resolve()
        try:
            resolved.relative_to(project_root)
        except ValueError:
            fail(f'requirements.lock.txt local path reference must stay inside the generated project: {reference}')
        if not resolved.exists():
            fail(f'requirements.lock.txt local path reference is missing inside the generated project: {reference}')


def verify_lock_source(root: Path, engine: str) -> dict[str, object]:
    names = {'kokoro': ('kokoro', 'misaki'), 'kokoro_onnx': ('kokoro-onnx',)}[engine]
    lock_path = root / 'requirements.lock.txt'
    if not lock_path.is_file():
        fail('requirements.lock.txt is required for speech provenance')
    lock = lock_path.read_text(encoding='utf-8')
    validate_lock_references(root, lock)
    result: dict[str, object] = {}
    for name in names:
        match = re.search(rf'^{re.escape(name)}(?:\[.*?\])? @ (\S+)$', lock, re.MULTILINE)
        if not match:
            fail(f'Missing pinned {name} wheel in requirements.lock.txt')
        expected, fragment = urldefrag(match.group(1))
        if not re.fullmatch(r'sha256=[0-9a-f]{64}', fragment):
            fail(f'{name} wheel must be pinned by SHA-256')
        try:
            package = distribution(name)
        except PackageNotFoundError:
            fail(f'{name} is not installed in the selected Python 3.14 environment')
        source = json.loads(package.read_text('direct_url.json') or '{}')
        if unquote(source.get('url', '')) != unquote(expected):
            fail(f'{name} is not the locked fork build; install requirements.lock.txt')
        result[name] = {
            'version': package.version,
            'url': expected,
            'locked_wheel_sha256': fragment.removeprefix('sha256='),
            'installed_source': source,
        }
    return result


def import_audio_deps():
    try:
        import numpy as np
        import soundfile as sf
        from scipy.signal import resample_poly
    except ImportError as exc:
        fail(f'missing required audio dependency from requirements.lock.txt: {exc.name}')
    return np, sf, resample_poly


def validate_narration(payload: dict[str, object]) -> str:
    if payload.get('schemaVersion') != '1.0.0':
        fail('narration schemaVersion must be 1.0.0')
    if payload.get('language') != 'en':
        fail('only English narration is supported by the local speech stack')
    if payload.get('externalTransfer') is not False:
        fail('narration must not permit external speech transfer')
    text = payload.get('text')
    if not isinstance(text, str) or not text.strip():
        fail('narration text must be a nonempty string')
    if re.search(r'[\u3400-\u9fff]', text):
        fail('English-only narration is required')
    expected_digest = payload.get('narrationSha256')
    if expected_digest != sha256_text(text):
        fail('narration digest does not match text')
    return text


def resolve_engine() -> str:
    requested = os.environ.get('A2SWE_TTS_ENGINE') or os.environ.get('TTS_ENGINE') or 'auto'
    if requested not in ('auto', 'kokoro', 'kokoro_onnx'):
        fail('A2SWE_TTS_ENGINE/TTS_ENGINE must be auto, kokoro, or kokoro_onnx')
    if requested != 'auto':
        return requested
    full_kokoro = all(os.environ.get(name) for name in ('A2SWE_KOKORO_CONFIG', 'A2SWE_KOKORO_WEIGHTS', 'A2SWE_KOKORO_VOICE_MODEL'))
    onnx = all(os.environ.get(name) for name in ('KOKORO_ONNX_MODEL', 'KOKORO_ONNX_VOICES'))
    if onnx:
        return 'kokoro_onnx'
    if full_kokoro:
        return 'kokoro'
    fail('auto speech requires configured local model paths: A2SWE_KOKORO_CONFIG/A2SWE_KOKORO_WEIGHTS/A2SWE_KOKORO_VOICE_MODEL or KOKORO_ONNX_MODEL/KOKORO_ONNX_VOICES')


def synth_kokoro(segments: list[str]):
    enforce_offline_runtime()
    np, _, _ = import_audio_deps()
    try:
        from kokoro import KModel, KPipeline
    except ImportError:
        fail('TTS_ENGINE=kokoro requires locked kokoro and misaki fork wheels')
    config = require_file_env('A2SWE_KOKORO_CONFIG', ('.json',))
    weights = require_file_env('A2SWE_KOKORO_WEIGHTS', ('.pth',))
    voice_model = require_file_env('A2SWE_KOKORO_VOICE_MODEL', ('.pt',))
    lang = os.environ.get('KOKORO_LANG', 'a')
    speed = float(os.environ.get('KOKORO_SPEED', '1.0'))
    if not math.isfinite(speed) or speed <= 0:
        fail('KOKORO_SPEED must be a positive finite number')
    model = KModel(repo_id=KOKORO_REPO, config=str(config), model=str(weights)).eval()
    pipeline = KPipeline(lang_code=lang, repo_id=KOKORO_REPO, model=model)
    pieces = []
    token_count = 0
    for segment in segments:
        parts = []
        for result in pipeline(segment, voice=str(voice_model), speed=speed):
            if result.audio is None or not result.tokens:
                fail('Kokoro must return audio and English token timestamps')
            parts.append(result.audio.detach().cpu().numpy().reshape(-1))
            token_count += len(result.tokens)
        if not parts:
            fail('Kokoro returned no audio')
        pieces.append(np.concatenate(parts))
    return pieces, 24000, {'voice': str(voice_model), 'lang': lang, 'speed': speed, 'tokens': token_count}


def synth_kokoro_onnx(segments: list[str]):
    enforce_offline_runtime()
    np, _, _ = import_audio_deps()
    try:
        from kokoro_onnx import Kokoro
    except ImportError:
        fail('TTS_ENGINE=kokoro_onnx requires the locked kokoro-onnx fork wheel')
    model = require_file_env('KOKORO_ONNX_MODEL', ('.onnx',))
    voices = require_file_env('KOKORO_ONNX_VOICES')
    voice = os.environ.get('KOKORO_ONNX_VOICE', 'am_michael')
    lang = os.environ.get('KOKORO_ONNX_LANG', 'en-us')
    speed = float(os.environ.get('KOKORO_SPEED', '1.0'))
    if not math.isfinite(speed) or speed <= 0:
        fail('KOKORO_SPEED must be a positive finite number')
    kokoro = Kokoro(str(model), str(voices))
    pieces = []
    sample_rate = 24000
    for segment in segments:
        samples, sample_rate = kokoro.create(segment, voice=voice, speed=speed, lang=lang)
        pieces.append(np.asarray(samples, dtype=np.float32).reshape(-1))
    return pieces, int(sample_rate), {'voice': voice, 'lang': lang, 'speed': speed}


def assemble_segments(pieces, sample_rate: int, segments: list[str]):
    np, _, _ = import_audio_deps()
    lead, gap, tail = 0.25, 0.55, 0.5
    cursor = int(lead * sample_rate)
    chunks = [np.zeros(cursor, dtype=np.float32)]
    timings = []
    for index, (piece, text) in enumerate(zip(pieces, segments)):
        if piece.size == 0:
            fail('speech engine returned an empty segment')
        chunks.append(piece)
        timings.append({'index': index, 'text': text, 'startSeconds': cursor / sample_rate, 'endSeconds': (cursor + piece.size) / sample_rate})
        cursor += piece.size
        spacer = int((gap if index < len(pieces) - 1 else tail) * sample_rate)
        chunks.append(np.zeros(spacer, dtype=np.float32))
        cursor += spacer
    return np.concatenate(chunks), timings


def resample_to_target(audio, sample_rate: int, target_rate: int):
    np, _, resample_poly = import_audio_deps()
    if sample_rate == target_rate:
        return np.asarray(audio, dtype=np.float32)
    divisor = math.gcd(sample_rate, target_rate)
    return np.asarray(resample_poly(audio, target_rate // divisor, sample_rate // divisor), dtype=np.float32)


def write_wav(path: Path, audio, sample_rate: int, channels: int) -> None:
    np, _, _ = import_audio_deps()
    array = np.asarray(audio, dtype=np.float32)
    if array.ndim != 1 or array.size == 0:
        fail('speech engine returned empty or non-mono audio')
    if not np.isfinite(array).all():
        fail('speech engine returned non-finite audio samples')
    if not np.any(array):
        fail('speech engine returned entirely silent audio')
    peak = float(np.max(np.abs(array))) or 1.0
    array = array / peak * 0.89
    if channels == 2:
        array = np.stack([array, array], axis=1)
    elif channels != 1:
        fail(f'unsupported WAV channel count: {channels}')
    pcm = (np.clip(array, -1.0, 1.0) * 32767).astype(np.int16)
    path.parent.mkdir(parents=True, exist_ok=True)
    with tempfile.NamedTemporaryFile(dir=path.parent, suffix='.wav', delete=False) as stream:
        temporary = Path(stream.name)
    try:
        with wave.open(str(temporary), 'wb') as output:
            output.setnchannels(channels)
            output.setsampwidth(2)
            output.setframerate(sample_rate)
            output.writeframes(pcm.tobytes())
        os.replace(temporary, path)
    finally:
        temporary.unlink(missing_ok=True)


def probe_duration(path: Path) -> float:
    with wave.open(str(path), 'rb') as wav:
        frames = wav.getnframes()
        sample_rate = wav.getframerate()
        if sample_rate <= 0 or frames <= 0:
            fail(f'generated WAV has invalid duration metadata: {path}')
        return frames / sample_rate


def main() -> None:
    require_python314()
    root = Path(__file__).resolve().parents[1]
    manifest_path = root / (sys.argv[1] if len(sys.argv) > 1 else 'speech/narration-manifest.json')
    payload = json.loads(manifest_path.read_text(encoding='utf-8'))
    text = validate_narration(payload)
    if int(payload.get('sampleRate', 0)) != 48000:
        fail('narration sampleRate must be 48000')
    if int(payload.get('channels', 0)) != 2:
        fail('narration channels must be 2')
    engine = resolve_engine()
    forks = verify_lock_source(root, engine)
    segments = payload.get('segments')
    if not isinstance(segments, list) or not segments or not all(isinstance(part, str) and part.strip() for part in segments):
        fail('narration segments must be a nonempty list of nonempty strings')
    if re.sub(r'\s+', ' ', ' '.join(segments)).strip() != re.sub(r'\s+', ' ', text).strip():
        fail('narration segments do not match narration text')
    if engine == 'kokoro':
        pieces, input_rate, voice_info = synth_kokoro(segments)
    else:
        pieces, input_rate, voice_info = synth_kokoro_onnx(segments)
    samples, timings = assemble_segments(pieces, input_rate, segments)
    output_rate = int(payload['sampleRate'])
    output_channels = int(payload['channels'])
    audio = resample_to_target(samples, input_rate, output_rate)
    output_wav = root / str(payload['outputWav'])
    write_wav(output_wav, audio, output_rate, output_channels)
    duration = probe_duration(output_wav)
    expected = float(payload['expectedDurationSeconds'])
    if not math.isfinite(expected) or expected <= 0:
        fail('requested narration duration must be positive and finite')
    model_files = {}
    if engine == 'kokoro':
        model_files = {name: {'path': str(require_file_env(env)), 'sha256': sha256_path(require_file_env(env))}
                       for name, env in {'config': 'A2SWE_KOKORO_CONFIG', 'weights': 'A2SWE_KOKORO_WEIGHTS', 'voice': 'A2SWE_KOKORO_VOICE_MODEL'}.items()}
    else:
        model_files = {name: {'path': str(require_file_env(env)), 'sha256': sha256_path(require_file_env(env))}
                       for name, env in {'weights': 'KOKORO_ONNX_MODEL', 'voices': 'KOKORO_ONNX_VOICES'}.items()}
    metadata = {
        'schemaVersion': '1.0.0',
        'engine': engine,
        'python': sys.version.split()[0],
        'interpreter': sys.executable,
        'contentDigest': payload['contentDigest'],
        'narrationSha256': payload['narrationSha256'],
        'audioFile': output_wav.relative_to(root).as_posix(),
        'audioSha256': sha256_path(output_wav),
        'sampleRate': output_rate,
        'channels': output_channels,
        'durationSeconds': duration,
        'requestedDurationSeconds': expected,
        'inputSampleRate': input_rate,
        'segments': timings,
        'voice': voice_info,
        'models': model_files,
        'forks': forks,
        'producer': Path(__file__).relative_to(root).as_posix(),
        'producerSha256': sha256_path(Path(__file__)),
        'requirementsLockSha256': sha256_path(root / 'requirements.lock.txt'),
    }
    write_json_atomic(root / str(payload['metadataPath']), metadata)
    print(json.dumps({'audio': metadata['audioFile'], 'sha256': metadata['audioSha256'], 'durationSeconds': duration, 'engine': engine}, sort_keys=True))


if __name__ == '__main__':
    main()
