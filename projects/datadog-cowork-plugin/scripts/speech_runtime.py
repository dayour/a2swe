"""Speech provenance and model-derived caption timing."""
import hashlib
import json
import math
import os
import re
import tempfile
from importlib.metadata import distribution
from pathlib import Path
from urllib.parse import unquote, urldefrag


def sha256(path):
    with Path(path).open('rb') as stream:
        return hashlib.file_digest(stream, 'sha256').hexdigest()


def write_json_atomic(path, value):
    path = Path(path)
    with tempfile.NamedTemporaryFile(mode='w', encoding='utf-8', dir=path.parent,
                                     suffix='.tmp', delete=False) as stream:
        temporary = Path(stream.name)
        json.dump(value, stream, indent=2)
    try:
        os.replace(temporary, path)
    finally:
        temporary.unlink(missing_ok=True)


def read_timing(wav):
    timing = json.loads(Path(wav).with_suffix('.timing.json').read_text(encoding='utf-8'))
    if timing.get('schema') != 1 or timing.get('audio_sha256') != sha256(wav):
        raise ValueError(f'Invalid Kokoro cache pair; remove and regenerate: {wav}')
    return timing['words']


def fork_provenance(root, engine):
    names = {'kokoro': ('kokoro', 'misaki'), 'kokoro_onnx': ('kokoro-onnx',)}.get(engine, ())
    if not names:
        return {}
    lock = (Path(root) / 'requirements.lock.txt').read_text(encoding='utf-8')
    result = {}
    for name in names:
        match = re.search(rf'^{re.escape(name)}(?:\[.*?\])? @ (\S+)$', lock, re.MULTILINE)
        if not match:
            raise SystemExit(f'Missing pinned {name} wheel in requirements.lock.txt')
        expected, fragment = urldefrag(match[1])
        if not re.fullmatch(r'sha256=[0-9a-f]{64}', fragment):
            raise SystemExit(f'{name} wheel must be pinned by SHA-256')
        package = distribution(name)
        source = json.loads(package.read_text('direct_url.json') or '{}')
        if unquote(source.get('url', '')) != unquote(expected):
            raise SystemExit(f'{name} is not the locked fork build; install requirements.lock.txt')
        result[name] = {'version': package.version, 'url': expected,
                        'locked_wheel_sha256': fragment.removeprefix('sha256='),
                        'installed_source': source}
    return result


def caption_starts(text, chunks, words, lead_cut, duration):
    """Map subtitle boundaries to actual tokens; never estimate by character count."""
    if ' '.join(chunks) != text:
        raise ValueError('Caption text must match the synthesized sentence')
    spans = []
    cursor = 0
    for word in words:
        token = word['text']
        if not token or not math.isfinite(word['t']) or not math.isfinite(word['d']) or min(word['t'], word['d']) < 0:
            raise ValueError('Invalid Kokoro token timing')
        offset = text.find(token, cursor)
        if offset < 0 or text[cursor:offset].strip():
            raise ValueError(f'Kokoro token does not match narration: {token!r}')
        end = offset + len(token)
        spans.append((offset, end, word['t']))
        cursor = end
    if text[cursor:].strip():
        raise ValueError('Kokoro timing does not cover the complete narration')
    starts = []
    cursor = 0
    for chunk in chunks:
        token = next((span for span in spans if span[0] <= cursor < span[1]), None)
        if token is None:
            raise ValueError(f'No model timestamp for subtitle: {chunk!r}')
        starts.append(max(0.0, token[2] - lead_cut))
        cursor += len(chunk) + 1
    starts[0] = 0.0
    if any(a >= b for a, b in zip(starts, starts[1:])) or starts[-1] >= duration:
        raise ValueError('Invalid or non-increasing Kokoro caption timestamps')
    return starts


def verify_narration(root):
    root = Path(root)
    timeline_path = root / 'script/timeline.json'
    timeline = json.loads(timeline_path.read_text(encoding='utf-8'))
    metadata = json.loads((root / 'audio/narration-metadata.json').read_text(encoding='utf-8'))
    if timeline['engine'] not in ('kokoro', 'kokoro_onnx'):
        raise ValueError('Expected local Kokoro narration; rebuild audio')
    for field in ('engine', 'voice', 'rate', 'runtime_fingerprint', 'models', 'forks'):
        if not timeline.get(field) or timeline[field] != metadata.get(field):
            raise ValueError(f'Speech provenance mismatch: {field}')
    inputs = {'narration_sha256': root / 'script/narration.txt',
              'timeline_sha256': timeline_path,
              'audio_sha256': root / metadata['audio_file']}
    profile = root / 'script/speech.json'
    if profile.exists():
        inputs['profile_sha256'] = profile
    for field, path in inputs.items():
        if sha256(path) != metadata.get(field):
            raise ValueError(f'Speech input changed: {field}; rebuild audio')
    for filename, digest in metadata['generated_files'].items():
        if sha256(root / filename) != digest:
            raise ValueError(f'Generated timing changed: {filename}; rebuild audio')
    for filename, digest in metadata['producer_files'].items():
        if sha256(root / filename) != digest:
            raise ValueError(f'Speech producer changed: {filename}; rebuild audio')
    return metadata
