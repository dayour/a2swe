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
    names = ('kokoro', 'misaki') + (('kokoro-onnx',) if engine == 'kokoro_onnx' else ())
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


def import_filter_deps():
    try:
        from scipy.signal import butter, sosfiltfilt
    except ImportError as exc:
        fail(f'missing required audio cleanup dependency from requirements.lock.txt: {exc.name}')
    return butter, sosfiltfilt


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


def normalize_segment_records(raw_segments, text: str) -> list[dict[str, str]]:
    if not isinstance(raw_segments, list) or not raw_segments:
        fail('narration segments must be a nonempty list')
    records: list[dict[str, str]] = []
    for index, item in enumerate(raw_segments):
        if isinstance(item, str):
            segment_text = item
            scene_id = None
        elif isinstance(item, dict):
            segment_text = item.get('text')
            scene_id = item.get('sceneId')
            if scene_id is not None and (not isinstance(scene_id, str) or not scene_id.strip()):
                fail(f'narration segment {index} has an invalid sceneId')
        else:
            fail(f'narration segment {index} must be a string or object with text')
        if not isinstance(segment_text, str) or not segment_text.strip():
            fail(f'narration segment {index} text must be a nonempty string')
        record = {'text': segment_text.strip()}
        if scene_id is not None:
            record['sceneId'] = scene_id.strip()
        records.append(record)
    if re.sub(r'\s+', ' ', ' '.join(record['text'] for record in records)).strip() != re.sub(r'\s+', ' ', text).strip():
        fail('narration segments do not match narration text')
    return records


def resolve_engine() -> str:
    requested = os.environ.get('A2SWE_TTS_ENGINE') or os.environ.get('TTS_ENGINE') or 'auto'
    if requested not in ('auto', 'kokoro', 'kokoro_onnx'):
        fail('A2SWE_TTS_ENGINE/TTS_ENGINE must be auto, kokoro, or kokoro_onnx')
    if requested != 'auto':
        return requested
    full_kokoro = all(os.environ.get(name) for name in ('A2SWE_KOKORO_CONFIG', 'A2SWE_KOKORO_WEIGHTS', 'KOKORO_ONNX_VOICES'))
    onnx = all(os.environ.get(name) for name in ('KOKORO_ONNX_MODEL', 'KOKORO_ONNX_VOICES'))
    if onnx:
        return 'kokoro_onnx'
    if full_kokoro:
        return 'kokoro'
    fail('auto speech requires configured local model paths and a shared KOKORO_ONNX_VOICES bank')


def synth_segments(segments: list[str], profile: dict, engine: str):
    enforce_offline_runtime()
    np, _, _ = import_audio_deps()
    try:
        import torch
        from kokoro import KModel, KPipeline
    except ImportError:
        fail('shared phonemization requires locked kokoro and misaki fork wheels')
    voice = profile.get('id')
    lang = profile.get('language')
    speed = profile.get('speed')
    if not isinstance(voice, str) or lang not in ('a', 'b') or not isinstance(speed, (int, float)) or not 0.5 <= speed <= 2:
        fail('invalid voice profile')
    for key in ('KOKORO_VOICE', 'KOKORO_ONNX_VOICE', 'KOKORO_SPEED', 'KOKORO_LANG', 'KOKORO_ONNX_LANG', 'A2SWE_KOKORO_VOICE_MODEL'):
        if os.environ.get(key):
            fail(f'{key} is superseded by ContentIR.voice profileId/speed; remove the override')
    torch.set_num_threads(min(4, os.cpu_count() or 1))
    voices_path = require_file_env('KOKORO_ONNX_VOICES')
    with np.load(voices_path) as bank:
        if voice not in bank:
            fail(f'voice profile {voice} is absent from the configured voice bank')
        voice_data = np.array(bank[voice], dtype=np.float32, copy=True)
    if voice_data.ndim != 3 or voice_data.shape[1:] != (1, 256) or not np.isfinite(voice_data).all():
        fail('invalid voice bank tensor')
    pipeline = KPipeline(lang_code=lang, repo_id=KOKORO_REPO, model=False)
    if engine == 'kokoro':
        config = require_file_env('A2SWE_KOKORO_CONFIG', ('.json',))
        weights = require_file_env('A2SWE_KOKORO_WEIGHTS', ('.pth',))
        model = KModel(repo_id=KOKORO_REPO, config=str(config), model=str(weights)).eval()
        vocab = model.vocab
    else:
        from kokoro_onnx import Kokoro
        model = Kokoro(str(require_file_env('KOKORO_ONNX_MODEL', ('.onnx',))), str(voices_path))
        vocab = model.tokenizer.vocab
    pieces = []
    phoneme_segments = []
    spoken_segments = []
    replacements = profile.get('pronunciations', {})
    if not isinstance(replacements, dict) or any(not isinstance(k, str) or not k.strip() or not isinstance(v, str) or not v.strip() for k, v in replacements.items()):
        fail('invalid pronunciation overrides')
    pattern = re.compile(r'(?<!\w)(?:' + '|'.join(re.escape(key) for key in sorted(replacements, key=len, reverse=True)) + r')(?!\w)', re.IGNORECASE) if replacements else None
    lookup = {key.casefold(): value for key, value in replacements.items()}
    try:
        for segment in segments:
            spoken = pattern.sub(lambda match: lookup[match.group().casefold()], segment) if pattern else segment
            spoken_segments.append(spoken)
            parts, phonemes = [], []
            for chunk in pipeline(spoken):
                if not chunk.phonemes:
                    fail('Misaki returned no phonemes')
                unknown = set(chunk.phonemes) - set(vocab)
                if unknown:
                    fail(f'phonemes missing from model vocabulary: {sorted(unknown)}')
                ids = [vocab[c] for c in chunk.phonemes]
                if not 0 < len(ids) <= min(510, len(voice_data)):
                    fail('phoneme chunk exceeds model or voice limits')
                if engine == 'kokoro':
                    with torch.inference_mode():
                        samples, _ = model.forward_with_tokens(torch.tensor([[0, *ids, 0]]), torch.from_numpy(voice_data[len(ids) - 1]), speed)
                    samples = samples.detach().cpu().numpy()
                else:
                    samples, _ = model.create(chunk.phonemes, voice=voice_data, speed=speed, is_phonemes=True, trim=False, sentence_pause=0, clause_pause=0)
                parts.append(np.asarray(samples, dtype=np.float32).reshape(-1))
                phonemes.append(chunk.phonemes)
            if not parts:
                fail('speech engine returned no audio')
            pieces.append(np.concatenate(parts))
            raw = pieces[-1]
            if not np.isfinite(raw).all() or not raw.size or float(np.max(np.abs(raw))) > 1:
                fail('speech engine returned invalid raw audio')
            if abs(float(np.mean(raw, dtype=np.float64))) > 0.001:
                fail('raw speech has excessive DC offset; verify the model reconstruction')
            phoneme_segments.append(phonemes)
    finally:
        if engine == 'kokoro_onnx':
            model.voices.close()
    return pieces, 24000, {'profileId': voice, 'lang': lang, 'speed': speed, 'phonemizer': 'misaki',
        'voiceTensorSha256': hashlib.sha256(voice_data.tobytes()).hexdigest(),
        'spokenSegments': spoken_segments, 'phonemeSegments': phoneme_segments,
        'phonemesSha256': sha256_text(json.dumps(phoneme_segments, ensure_ascii=True))}


def assemble_segments(pieces, sample_rate: int, segments: list[dict[str, str]]):
    np, _, _ = import_audio_deps()
    lead, gap, tail = 0.25, 0.55, 0.5
    cursor = int(lead * sample_rate)
    chunks = [np.zeros(cursor, dtype=np.float32)]
    timings = []
    for index, (piece, segment) in enumerate(zip(pieces, segments)):
        if piece.size == 0:
            fail('speech engine returned an empty segment')
        chunks.append(piece)
        timing = {'index': index, 'text': segment['text'], 'startSeconds': cursor / sample_rate, 'endSeconds': (cursor + piece.size) / sample_rate}
        if 'sceneId' in segment:
            timing['sceneId'] = segment['sceneId']
        timings.append(timing)
        cursor += piece.size
        spacer = int((gap if index < len(pieces) - 1 else tail) * sample_rate)
        chunks.append(np.zeros(spacer, dtype=np.float32))
        cursor += spacer
    return np.concatenate(chunks), timings


def resample_to_target(audio, sample_rate: int, target_rate: int):
    np, _, resample_poly = import_audio_deps()
    if sample_rate == target_rate:
        return np.asarray(audio, dtype=np.float32)
    from scipy.signal import firwin, kaiserord
    divisor = math.gcd(sample_rate, target_rate)
    up, down = target_rate // divisor, sample_rate // divisor
    # SciPy's default 21-tap-per-phase Kaiser filter leaves spectral images within 2 kHz above the source Nyquist.
    # This steep design keeps speech below 0.92 of the lower Nyquist and rejects images by about 100 dB.
    nyquist = min(sample_rate, target_rate) / 2.0
    design_rate = sample_rate * up
    transition = nyquist / 12.0
    numtaps, beta = kaiserord(100.0, transition / (0.5 * design_rate))
    numtaps = max(numtaps | 1, 2 * 10 * max(up, down) + 1)
    taps = firwin(numtaps, nyquist - transition / 2.0, window=('kaiser', beta), fs=design_rate)
    return np.asarray(resample_poly(audio, up, down, window=taps), dtype=np.float32)


TARGET_LUFS = -16.0
TRUE_PEAK_CEILING_DBTP = -1.5


def integrated_loudness(mono, sample_rate: int, channels: int) -> float:
    """ITU-R BS.1770-4 gated loudness for identical channels at 48 kHz."""
    np, _, _ = import_audio_deps()
    from scipy.signal import lfilter
    if sample_rate != 48000:
        fail('loudness measurement requires 48 kHz audio')
    shelf = lfilter([1.53512485958697, -2.69169618940638, 1.19839281085285], [1.0, -1.69065929318241, 0.73248077421585], mono)
    weighted = lfilter([1.0, -2.0, 1.0], [1.0, -1.99004745483398, 0.99007225036621], shelf)
    block = int(0.4 * sample_rate)
    step = int(0.1 * sample_rate)
    if weighted.size < block:
        return -70.0
    cumulative = np.concatenate(([0.0], np.cumsum(np.square(weighted))))
    starts = np.arange(0, weighted.size - block + 1, step)
    power = (cumulative[starts + block] - cumulative[starts]) / block * channels
    loudness = -0.691 + 10.0 * np.log10(np.maximum(power, 1e-30))
    absolute = power[loudness > -70.0]
    if absolute.size == 0:
        return -70.0
    relative_gate = -0.691 + 10.0 * math.log10(float(np.mean(absolute))) - 10.0
    gated = power[(loudness > -70.0) & (loudness > relative_gate)]
    return float(-0.691 + 10.0 * math.log10(float(np.mean(gated))))


def true_peak(array) -> float:
    np, _, resample_poly = import_audio_deps()
    return float(np.max(np.abs(resample_poly(array, 4, 1)))) if array.size else 0.0


def master_loudness(audio, sample_rate: int, channels: int):
    """Normalize narration to the online-video loudness target with a smooth 4x-oversampled true-peak limiter."""
    np, _, resample_poly = import_audio_deps()
    from scipy.ndimage import minimum_filter1d, uniform_filter1d
    source = np.asarray(audio, dtype=np.float64)
    before = integrated_loudness(source, sample_rate, channels)
    ceiling = 10.0 ** (TRUE_PEAK_CEILING_DBTP / 20.0)
    window = 2 * int(0.01 * sample_rate) + 1
    gain_db = TARGET_LUFS - before
    limited = source
    smooth = np.ones(source.size)
    for _ in range(4):
        gained = source * (10.0 ** (gain_db / 20.0))
        envelope = np.abs(resample_poly(gained, 4, 1))[: gained.size * 4].reshape(-1, 4).max(axis=1)
        required = np.minimum(1.0, ceiling / np.maximum(envelope, 1e-12))
        # Holding the minimum over the averaging span guarantees the smoothed gain never exceeds what a peak requires.
        smooth = uniform_filter1d(minimum_filter1d(required, size=window, mode='nearest'), size=window, mode='nearest')
        limited = gained * smooth
        peak = true_peak(limited)
        if peak > ceiling:
            limited = limited * (ceiling / peak)
        after = integrated_loudness(limited, sample_rate, channels)
        if abs(after - TARGET_LUFS) <= 0.2:
            break
        gain_db += TARGET_LUFS - after
    return limited.astype(np.float32), {
        'standard': 'ITU-R BS.1770-4 gated integrated loudness; 4x oversampled true peak',
        'targetLufs': TARGET_LUFS,
        'truePeakCeilingDbtp': TRUE_PEAK_CEILING_DBTP,
        'inputLufs': round(before, 2),
        'gainDb': round(gain_db, 2),
        'maxLimiterReductionDb': round(float(-20.0 * np.log10(max(float(np.min(smooth)), 1e-12))), 2),
        'limitedSampleRatio': round(float(np.mean(smooth < 0.999)), 5),
        'outputLufs': round(integrated_loudness(limited, sample_rate, channels), 2),
        'outputTruePeakDbtp': round(20.0 * math.log10(max(true_peak(limited), 1e-12)), 2),
    }


def rms_dbfs(audio) -> float:
    np, _, _ = import_audio_deps()
    array = np.asarray(audio, dtype=np.float32)
    if array.size == 0:
        return -240.0
    rms = float(np.sqrt(np.mean(np.square(array))))
    return 20.0 * math.log10(max(rms, 1e-12))


def spectral_cleanup_metrics(audio, sample_rate: int) -> dict[str, float]:
    np, _, _ = import_audio_deps()
    array = np.asarray(audio, dtype=np.float32).reshape(-1)
    if array.size < 4096:
        return {'rmsDbfs': rms_dbfs(array), 'highFrequencyRatio8k': 0.0, 'spectralFlatness': 0.0, 'dcOffset': float(np.mean(array)) if array.size else 0.0}
    window = min(65536, 1 << (array.size.bit_length() - 1))
    offset = max(0, (array.size - window) // 2)
    sample = array[offset:offset + window] * np.hanning(window)
    power = np.square(np.abs(np.fft.rfft(sample)))
    frequencies = np.fft.rfftfreq(window, 1 / sample_rate)
    audible = power[(frequencies >= 80) & (frequencies <= min(20000, sample_rate / 2))]
    high = power[frequencies >= 8000]
    positive = audible[audible > 1e-20]
    flatness = float(np.exp(np.mean(np.log(positive))) / np.mean(positive)) if positive.size else 0.0
    return {
        'rmsDbfs': rms_dbfs(array),
        'highFrequencyRatio8k': float(np.sum(high) / max(np.sum(audible), 1e-30)),
        'spectralFlatness': flatness,
        'dcOffset': float(np.mean(array)),
    }


def cleanup_audio(audio, sample_rate: int, timings):
    np, _, _ = import_audio_deps()
    mode = os.environ.get('A2SWE_AUDIO_CLEANUP', 'auto').strip().lower()
    if mode not in ('auto', 'off', 'on'):
        fail('A2SWE_AUDIO_CLEANUP must be auto, off, or on')
    policy = {'mode': mode, 'lowpassHz': os.environ.get('A2SWE_AUDIO_CLEANUP_LOWPASS_HZ', '11500').strip()}
    array = np.asarray(audio, dtype=np.float32).reshape(-1)
    before = spectral_cleanup_metrics(array, sample_rate)
    cleaned = np.asarray(array, dtype=np.float32).copy()
    actions = []
    measured_hiss = before['highFrequencyRatio8k'] > 0.05 and before['spectralFlatness'] > 0.02 and before['rmsDbfs'] > -70
    if mode != 'off':
        butter, sosfiltfilt = import_filter_deps()
        highpass = butter(4, 35, btype='highpass', fs=sample_rate, output='sos')
        lowpass = None
        if mode == 'on' or (mode == 'auto' and measured_hiss):
            cutoff = float(os.environ.get('A2SWE_AUDIO_CLEANUP_LOWPASS_HZ', '11500'))
            if not math.isfinite(cutoff) or cutoff <= 1000 or cutoff >= sample_rate / 2:
                fail('A2SWE_AUDIO_CLEANUP_LOWPASS_HZ must be a finite frequency between 1000 Hz and Nyquist')
            lowpass = butter(4, cutoff, btype='lowpass', fs=sample_rate, output='sos')
        for segment in timings:
            start = round(segment['startSeconds'] * sample_rate)
            end = round(segment['endSeconds'] * sample_rate)
            if end - start <= 32:
                fail('speech segment is too short for boundary-safe filtering')
            speech = sosfiltfilt(highpass, cleaned[start:end])
            if lowpass is not None:
                speech = sosfiltfilt(lowpass, speech)
            fade = min(round(0.025 * sample_rate), (end - start) // 4)
            envelope = np.sin(np.linspace(0, np.pi / 2, fade, dtype=np.float64)) ** 2
            speech[:fade] *= envelope
            speech[-fade:] *= envelope[::-1]
            cleaned[start:end] = speech.astype(np.float32)
        actions.extend(('speech_dc_highpass', 'speech_boundary_fade'))
        if lowpass is not None:
            actions.append('measured_lowpass_denoise')
    after = spectral_cleanup_metrics(cleaned, sample_rate)
    return cleaned, {'mode': mode, 'policy': policy, 'actions': actions, 'before': before, 'after': after}


def write_wav(path: Path, audio, sample_rate: int, channels: int) -> None:
    np, _, _ = import_audio_deps()
    array = np.asarray(audio, dtype=np.float32)
    if array.ndim != 1 or array.size == 0:
        fail('speech engine returned empty or non-mono audio')
    if not np.isfinite(array).all():
        fail('speech engine returned non-finite audio samples')
    if not np.any(array):
        fail('speech engine returned entirely silent audio')
    if float(np.max(np.abs(array))) > 1.0:
        fail('mastered narration exceeds full scale')
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
    np, _, _ = import_audio_deps()
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
    segments = normalize_segment_records(payload.get('segments'), text)
    segment_texts = [segment['text'] for segment in segments]
    pieces, input_rate, voice_info = synth_segments(segment_texts, payload.get('voiceProfile', {}), engine)
    samples, timings = assemble_segments(pieces, input_rate, segments)
    output_rate = int(payload['sampleRate'])
    output_channels = int(payload['channels'])
    audio = resample_to_target(samples, input_rate, output_rate)
    audio, cleanup_info = cleanup_audio(audio, output_rate, timings)
    audio, mastering_info = master_loudness(audio, output_rate, output_channels)
    output_wav = root / str(payload['outputWav'])
    write_wav(output_wav, audio, output_rate, output_channels)
    duration = probe_duration(output_wav)
    expected = float(payload['expectedDurationSeconds'])
    if not math.isfinite(expected) or expected <= 0:
        fail('requested narration duration must be positive and finite')
    model_files = {}
    if engine == 'kokoro':
        model_files = {name: {'path': str(require_file_env(env)), 'sha256': sha256_path(require_file_env(env))}
                       for name, env in {'config': 'A2SWE_KOKORO_CONFIG', 'weights': 'A2SWE_KOKORO_WEIGHTS', 'voices': 'KOKORO_ONNX_VOICES'}.items()}
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
        'voiceProfile': payload.get('voiceProfile'),
        'voice': voice_info,
        'models': model_files,
        'forks': forks,
        'cleanupPolicy': cleanup_info['policy'],
        'audioCleanup': cleanup_info,
        'mastering': mastering_info,
        'rawAudio': {'dc': float(np.mean(samples, dtype=np.float64)),
                     'rms': float(np.sqrt(np.mean(samples.astype(np.float64) ** 2))),
                     'peak': float(np.max(np.abs(samples)))},
        'producer': Path(__file__).relative_to(root).as_posix(),
        'producerSha256': sha256_path(Path(__file__)),
        'requirementsLockSha256': sha256_path(root / 'requirements.lock.txt'),
    }
    write_json_atomic(root / str(payload['metadataPath']), metadata)
    print(json.dumps({'audio': metadata['audioFile'], 'sha256': metadata['audioSha256'], 'durationSeconds': duration, 'engine': engine}, sort_keys=True))


if __name__ == '__main__':
    main()
