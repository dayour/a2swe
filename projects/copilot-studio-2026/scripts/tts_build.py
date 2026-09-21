#!/usr/bin/env python3
"""See reference/production-rules.md for the pipeline contract."""
import asyncio, hashlib, json, os, re, subprocess, sys, tempfile
from functools import lru_cache
from importlib.metadata import PackageNotFoundError, distribution
from pathlib import Path
import numpy as np

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
REM = ROOT
_cfg = Path(f'{ROOT}/src/config.ts').read_text(encoding='utf-8')
SLUG = re.search(r"slug:\s*'([^']+)'", _cfg).group(1)
FPS = 30
SR = 48000
ENGINE = os.environ.get('TTS_ENGINE', 'auto')
VOICE = os.environ.get('VOICE', 'en-US-AndrewNeural')
RATE = os.environ.get('RATE', '+0%')
KOKORO_VOICE = os.environ.get('KOKORO_VOICE', 'am_liam')
KOKORO_LANG = os.environ.get('KOKORO_LANG', 'a')       # a=American English, b=British
KOKORO_SPEED = float(os.environ.get('KOKORO_SPEED', 1.0))
KOKORO_SR = 24000

PIPER_MODEL = os.environ.get('PIPER_MODEL', '')
PIPER_VOICE_NAME = os.path.basename(PIPER_MODEL).replace('.onnx', '') if PIPER_MODEL else 'piper'

KOKORO_ONNX_MODEL = os.environ.get('KOKORO_ONNX_MODEL', '')     
KOKORO_ONNX_VOICES = os.environ.get('KOKORO_ONNX_VOICES', '')  
KOKORO_ONNX_VOICE = os.environ.get('KOKORO_ONNX_VOICE', 'am_michael')
KOKORO_ONNX_LANG = os.environ.get('KOKORO_ONNX_LANG', 'en-us')
CHUNK_PAD = float(os.environ.get('CHUNK_PAD', 0.06))  


def _file_fp(path):
    """See reference/production-rules.md for the pipeline contract."""
    if not path:
        return 'none'
    rp = os.path.realpath(path)
    try:
        st = os.stat(rp)
        with open(rp, 'rb') as f:
            head = f.read(1 << 20)
    except OSError:
        return f'missing:{rp}'
    return hashlib.sha1(f'{rp}|{st.st_size}|{st.st_mtime_ns}|'.encode() + head).hexdigest()[:12]


PIPER_FP = _file_fp(PIPER_MODEL)
KOKORO_ONNX_FP = f'{_file_fp(KOKORO_ONNX_MODEL)}+{_file_fp(KOKORO_ONNX_VOICES)}'
EDGE_TRIES = int(os.environ.get('EDGE_TRIES', 4))     
GAP = int(os.environ.get('GAP', 10))          
CHAPTER_GAP = int(os.environ.get('CHAPTER_GAP', 45))  
LEAD = int(os.environ.get('LEAD', 40))        
TAIL = int(os.environ.get('TAIL', 90))        
CACHE = f'{ROOT}/audio/cache'
os.makedirs(CACHE, exist_ok=True)
if ENGINE not in ('auto', 'edge', 'kokoro', 'piper', 'kokoro_onnx'):
    raise SystemExit(f'Unknown TTS_ENGINE={ENGINE} (choose auto / edge / kokoro / piper / kokoro_onnx)')


def parse(path):
    items = []
    chap = 0
    chap_title = ''
    pending_gap = 0
    for raw in Path(path).read_text(encoding='utf-8').splitlines():
        line = raw.strip()
        if re.search(r'[\u3400-\u9fff]', line):
            raise SystemExit('English-only narration is required')
        if not line:
            continue
        m = re.match(r'^#\s*CHAPTER\s+(\d+)\s+(.*)$', line)
        if m:
            chap = int(m.group(1)); chap_title = m.group(2).strip()
            items.append({'type': 'chapter', 'chapter': chap, 'title': chap_title})
            continue
        m = re.match(r'^##\s*gap\s+(\d+)', line)
        if m:
            pending_gap += int(m.group(1)); continue
        if line.startswith('#'):
            continue
        items.append({'type': 'sent', 'chapter': chap, 'raw': line, 'gap_before': pending_gap})
        pending_gap = 0
    return items


@lru_cache(maxsize=None)
def runtime_fingerprint(engine):
    packages = {
        'kokoro': ('kokoro', 'misaki', 'torch', 'transformers', 'phonemizer'),
        'kokoro_onnx': ('kokoro-onnx', 'onnxruntime', 'onnxruntime-gpu', 'phonemizer'),
        'piper': ('piper-tts', 'onnxruntime'),
        'edge': ('edge-tts',),
    }[resolve_engine(engine)]
    identity = {}
    for name in (*packages, 'numpy', 'soundfile', 'scipy'):
        try:
            package = distribution(name)
        except PackageNotFoundError:
            identity[name] = 'not-installed'
        else:
            identity[name] = {
                'version': package.version,
                'source': package.read_text('direct_url.json'),
            }
    identity['pipeline'] = hashlib.sha256(Path(__file__).read_bytes()).hexdigest()
    return hashlib.sha256(json.dumps(identity, sort_keys=True).encode()).hexdigest()


def cache_path(text, ext):
    runtime = runtime_fingerprint(ENGINE)
    provider = os.environ.get('ONNX_PROVIDER', '')
    sig = f'{runtime}|{provider}|{ENGINE}|{VOICE}|{RATE}|{KOKORO_VOICE}|{KOKORO_ONNX_VOICE}|{KOKORO_ONNX_LANG}|{KOKORO_ONNX_FP}|{PIPER_FP}|{KOKORO_LANG}|{KOKORO_SPEED}|{text}'
    return f'{CACHE}/{hashlib.sha1(sig.encode()).hexdigest()[:16]}{ext}'





SUB_MAX_W = 1160
SUB_SIZE = 44
SUB_BUDGET = '48 characters'


def text_em(s):
    """See reference/production-rules.md for the pipeline contract."""
    t = 0.0
    for ch in s:
        c = ord(ch)
        if c >= 0x2000:
            t += 1.0                     
        elif ch == ' ':
            t += 0.227
        elif 'A' <= ch <= 'Z':
            t += 0.668
        elif '0' <= ch <= '9':
            t += 0.59
        elif 'a' <= ch <= 'z':
            t += 0.566
        elif 0xc0 <= c < 0x250:
            t += 0.58                    
        else:
            t += 0.325                   
    return t


def write_wav(path, x, sr):
    """See reference/production-rules.md for the pipeline contract."""
    import wave
    a = np.asarray(x, dtype=np.float32)
    if a.ndim not in (1, 2) or a.size == 0 or (a.ndim == 2 and a.shape[1] not in (1, 2)):
        raise ValueError('Speech audio must be non-empty mono or stereo samples')
    if not np.isfinite(a).all():
        raise ValueError('Speech audio contains non-finite samples')
    if not np.any(a):
        raise ValueError('Speech engine returned entirely silent audio')
    if not isinstance(sr, (int, np.integer)) or sr <= 0:
        raise ValueError(f'Invalid speech sample rate: {sr}')
    pcm = (np.clip(a, -1.0, 1.0) * 32767).astype(np.int16)
    target = Path(path)
    with tempfile.NamedTemporaryFile(dir=target.parent, suffix='.wav', delete=False) as stream:
        temporary = Path(stream.name)
    try:
        with wave.open(str(temporary), 'wb') as w:
            w.setnchannels(1 if a.ndim == 1 else a.shape[1]); w.setsampwidth(2); w.setframerate(sr)
            w.writeframes(pcm.tobytes())
        os.replace(temporary, target)
    finally:
        temporary.unlink(missing_ok=True)


async def synth_edge(text):
    """See reference/production-rules.md for the pipeline contract."""
    import edge_tts
    mp3 = cache_path(text, '.mp3'); js = cache_path(text, '.json')
    if os.path.exists(mp3) and os.path.exists(js):
        return mp3, json.load(open(js))
    for attempt in range(1, EDGE_TRIES + 1):
        audio = bytearray(); words = []
        try:
            comm = edge_tts.Communicate(text, VOICE, rate=RATE, boundary='WordBoundary')
            async for ch in comm.stream():
                if ch['type'] == 'audio':
                    audio += ch['data']
                elif ch['type'] == 'WordBoundary':
                    words.append({'t': ch['offset'] / 1e7, 'd': ch['duration'] / 1e7, 'text': ch['text']})
            if audio:
                break
            why = 'endpoint returned empty audio'
        except TypeError:                
            raise SystemExit("edge-tts is too old: pip install 'edge-tts==7.2.8'")
        except Exception as e:
            why = f'{type(e).__name__}: {e}'
        if attempt == EDGE_TRIES:
            raise SystemExit(f'edge-tts failed after {EDGE_TRIES} attempts ({why}): {text[:30]}…')
        print(f'  ⚠ edge-tts attempt {attempt} failed ({why}); retrying after {1.5 * attempt:.1f}s: {text[:16]}…')
        await asyncio.sleep(1.5 * attempt)
    open(mp3, 'wb').write(audio)
    json.dump(words, open(js, 'w'), ensure_ascii=False)
    return mp3, words


_kokoro = None





PRONOUNCE = {}


def apply_pronounce(text):
    for k, v in PRONOUNCE.items():
        text = re.sub(r'(?<![A-Za-z0-9])' + re.escape(k) + r'(?![A-Za-z0-9])', v, text)
    return text


def synth_kokoro(text):
    """See reference/production-rules.md for the pipeline contract."""
    global _kokoro
    text = apply_pronounce(text)
    au = cache_path(text, '.wav')
    if os.path.exists(au):
        return au
    if _kokoro is None:
        try:
            from kokoro import KPipeline
        except ImportError:
            raise SystemExit('TTS_ENGINE=kokoro requires the pinned Python 3.14 fork releases. '
                             'Install requirements.lock.txt; see reference/speech-stack.md.')
        _kokoro = KPipeline(lang_code=KOKORO_LANG)
    parts = []
    for r in _kokoro(text, voice=KOKORO_VOICE, speed=KOKORO_SPEED):
        a = getattr(r, 'audio', None)
        if a is None:
            a = r[2]                                    
        if hasattr(a, 'detach'):
            a = a.detach().cpu().numpy()                # torch tensor
        parts.append(np.asarray(a, dtype=np.float32).reshape(-1))
    if not parts:
        raise SystemExit(f'kokoro produced no audio: {text[:24]}…')
    write_wav(au, np.concatenate(parts), KOKORO_SR)
    return au


_piper = None


def synth_piper(text):
    """See reference/production-rules.md for the pipeline contract."""
    global _piper
    if not PIPER_MODEL:
        raise SystemExit('TTS_ENGINE=piper requires PIPER_MODEL to point to a voice .onnx file'
                         ' (pip install piper-tts; see github.com/rhasspy/piper for voices)')
    au = cache_path(text, '.wav')
    if os.path.exists(au):
        return au
    if _piper is None:
        try:
            from piper import PiperVoice
        except ImportError:
            raise SystemExit('TTS_ENGINE=piper requires piper: pip install piper-tts')
        _piper = PiperVoice.load(PIPER_MODEL)
    import wave
    with wave.open(au, 'wb') as w:
        _piper.synthesize_wav(text, w)
    return au


_kokoro_onnx = None


def synth_kokoro_onnx(text):
    """See reference/production-rules.md for the pipeline contract."""
    global _kokoro_onnx
    if not (KOKORO_ONNX_MODEL and KOKORO_ONNX_VOICES):
        raise SystemExit('TTS_ENGINE=kokoro_onnx requires KOKORO_ONNX_MODEL and KOKORO_ONNX_VOICES'
                         ' (see https://dayour.github.io/kokoro-onnx/onnx/installation/)')
    au = cache_path(text, '.wav')
    if os.path.exists(au):
        return au
    if _kokoro_onnx is None:
        try:
            from kokoro_onnx import Kokoro
        except ImportError:
            raise SystemExit('TTS_ENGINE=kokoro_onnx requires the pinned fork release in requirements.lock.txt')
        _kokoro_onnx = Kokoro(KOKORO_ONNX_MODEL, KOKORO_ONNX_VOICES)
    s, sr = _kokoro_onnx.create(text, voice=KOKORO_ONNX_VOICE, speed=KOKORO_SPEED, lang=KOKORO_ONNX_LANG)
    write_wav(au, np.asarray(s, dtype=np.float32).reshape(-1), sr)
    return au


def decode(mp3):
    import math
    import soundfile as sf
    from scipy.signal import resample_poly
    audio, sample_rate = sf.read(mp3, dtype='float32', always_2d=True)
    if not audio.size or not np.isfinite(audio).all() or sample_rate <= 0:
        raise ValueError(f'Invalid decoded narration audio: {mp3}')
    audio = audio.mean(axis=1)
    if sample_rate != SR:
        divisor = math.gcd(sample_rate, SR)
        audio = resample_poly(audio, SR // divisor, sample_rate // divisor)
    return np.asarray(audio, dtype=np.float32)


def trim_edges(x, thr=0.004):
    idx = np.where(np.abs(x) > thr)[0]
    if len(idx) == 0:
        return x, 0.0
    a = max(0, idx[0] - int(0.03 * SR)); b = min(len(x), idx[-1] + int(0.12 * SR))
    return x[a:b], a / SR


def chunk_starts(tts_text, chunks, words, lead_cut, dur, sep=' '):
    """See reference/production-rules.md for the pipeline contract."""
    
    char_t = [None] * len(tts_text)
    cur = 0
    for w in words:
        wt = re.sub(r'[\s，。、！？：；“”（）,.!?:;()\-—…]', '', w['text'])
        if not wt:
            continue
        p = tts_text.find(wt, cur)
        if p < 0:
            p = tts_text.find(wt[0], cur)
            if p < 0:
                continue
        for i in range(p, min(len(tts_text), p + len(wt))):
            char_t[i] = (w['t'] - lead_cut, w['d'])
        cur = p + len(wt)
    
    starts = []
    pos = 0
    for c in chunks:
        seg = tts_text[pos:pos + len(c)]
        st = None
        for i in range(pos, pos + len(c)):
            if char_t[i] is not None:
                st = char_t[i][0]; break
        starts.append(st)
        pos += len(c) + len(sep)
    
    for i, st in enumerate(starts):
        if st is None:
            prev = starts[i - 1] if i > 0 and starts[i - 1] is not None else 0.0
            starts[i] = prev + dur * len(chunks[i - 1]) / max(1, len(tts_text)) if i > 0 else 0.0
    starts[0] = 0.0
    return [max(0.0, s) for s in starts]


async def synth_sentence(chunks, sep=' '):
    """See reference/production-rules.md for the pipeline contract."""
    text = sep.join(chunks)
    if ENGINE == 'edge':
        au, words = await synth_edge(text)
        x, lead_cut = trim_edges(decode(au))
        dur = len(x) / SR
        return x, chunk_starts(text, chunks, words, lead_cut, dur, sep), dur
    chunk_synth = {'piper': synth_piper, 'kokoro_onnx': synth_kokoro_onnx}.get(ENGINE, synth_kokoro)
    pad = np.zeros(int(CHUNK_PAD * SR), dtype=np.float32)
    parts = []; starts = []; pos = 0.0
    for i, c in enumerate(chunks):
        xi, _ = trim_edges(decode(chunk_synth(c)))
        if i:
            parts.append(pad); pos += len(pad) / SR
        starts.append(pos)
        parts.append(xi); pos += len(xi) / SR
    x = np.concatenate(parts) if parts else np.zeros(0, dtype=np.float32)
    return x, starts, len(x) / SR


def resolve_engine(engine):
    if engine == 'auto':
        engine = 'kokoro'
    return engine


async def main(narr):
    global ENGINE
    items = parse(narr)
    if not any(item['type'] == 'sent' and item['raw'].replace('|', '').strip() for item in items):
        raise SystemExit('Narration must contain at least one English sentence')
    ENGINE = resolve_engine(ENGINE)
    if ENGINE == 'edge' and not VOICE.lower().startswith('en-'):
        raise SystemExit('An English Edge voice is required')
    lang = 'en'
    print(f'English narration: TTS_ENGINE={ENGINE}; override with TTS_ENGINE if needed.')
    
    sep = ' '
    t = LEAD / FPS
    audio_parts = []  # (start_sec, np.array)
    sentences = []; chapters = []
    sid = 0
    total_chars = 0; total_words = 0; speech_sec = 0.0
    for it in items:
        if it['type'] == 'chapter':
            t += CHAPTER_GAP / FPS
            chapters.append({'n': it['chapter'], 'title': it['title'], 'from': int(round(t * FPS)) + 1})
            continue
        t += it['gap_before'] / FPS
        raw = it['raw']
        chunks = [c.strip() for c in raw.split('|') if c.strip()]
        if not chunks:
            continue
        tts_text = sep.join(chunks)
        x, starts, dur = await synth_sentence(chunks, sep)
        sid += 1
        subs = [(t + starts[i], t + (starts[i + 1] if i + 1 < len(starts) else dur)) for i in range(len(chunks))]
        f0 = int(round(t * FPS)) + 1; f1 = int(round((t + dur) * FPS))
        sentences.append({'id': f'S{sid:02d}', 'chapter': it['chapter'], 'from': f0, 'to': f1, 'text': tts_text,
                          'subs': [{'from': int(round(a * FPS)) + 1, 'to': int(round(b * FPS)), 'text': c} for c, (a, b) in zip(chunks, subs)]})
        audio_parts.append((t, x))
        total_chars += len(re.sub(r'[，。、！？：；“”（）,.!?:;()\-—…\s]', '', tts_text))
        total_words += len(tts_text.split()); speech_sec += dur
        t += dur + GAP / FPS
    t += TAIL / FPS
    total = int(np.ceil(t * FPS))
    
    y = np.zeros(int(total / FPS * SR) + SR, dtype=np.float32)
    for st, x in audio_parts:
        a = int(st * SR); y[a:a + len(x)] += x
    y = y[: int(total / FPS * SR)]
    peak = float(np.max(np.abs(y))) or 1.0
    y = y / peak * 0.89
    os.makedirs(f'{REM}/public/assets/{SLUG}', exist_ok=True)
    wav = f'{REM}/public/assets/{SLUG}/audio.wav'
    write_wav(wav, np.stack([y, y], 1), SR)
    
    all_subs = []
    for s in sentences:
        for k, sb in enumerate(s['subs']):
            if sb['to'] < sb['from']:
                sb['to'] = sb['from']
            all_subs.append(dict(sb))
    for i in range(len(all_subs) - 1):
        if all_subs[i]['to'] >= all_subs[i + 1]['from']:
            all_subs[i]['to'] = all_subs[i + 1]['from'] - 1
    
    over = [(sb, text_em(sb['text']) * SUB_SIZE) for sb in all_subs]
    over = [(sb, w) for sb, w in over if w > SUB_MAX_W]
    if over:
        print(f'WARNING: {len(over)}/{len(all_subs)} subtitle blocks exceed {SUB_MAX_W}px at {SUB_SIZE}px.'
              f' Keep blocks within {SUB_BUDGET}; split with |:')
        for sb, w in over[:5]:
            print(f"    f{sb['from']} ({w:.0f}px{'; wraps to two lines' if w > SUB_MAX_W * 1.3 else ''}) {sb['text']}")
    
    tl = {'fps': FPS, 'total_frames': total, 'engine': ENGINE,
          'runtime_fingerprint': runtime_fingerprint(ENGINE),
          'voice': {'edge': VOICE, 'piper': PIPER_VOICE_NAME, 'kokoro_onnx': KOKORO_ONNX_VOICE}.get(ENGINE, KOKORO_VOICE),
          'rate': RATE if ENGINE == 'edge' else KOKORO_SPEED,
          'gap': GAP, 'chapter_gap': CHAPTER_GAP, 'lead': LEAD, 'tail': TAIL,
          'lang': lang, 'chapters': chapters, 'sentences': sentences, 'chars': total_chars, 'words': total_words,
          'speech_sec': round(speech_sec, 2)}
    unit, cnt = 'words', total_words
    os.makedirs(f'{ROOT}/script', exist_ok=True)
    Path(f'{ROOT}/script/timeline.json').write_text(json.dumps(tl, ensure_ascii=False, indent=1), encoding='utf-8')
    with open(f'{ROOT}/script/timeline.md', 'w', encoding='utf-8') as f:
        f.write(f"# Timeline ({ENGINE}, {tl['voice']} {tl['rate']}, {total} frames = {total/FPS:.1f}s, {cnt} {unit}, {cnt/max(1e-6,speech_sec):.2f} {unit}/s)\n\n")
        f.write('| Sentence | Chapter | Frames | Duration | Subtitle blocks |\n| --- | --- | --- | --- | --- |\n')
        ci = {c['from']: c for c in chapters}
        for s in sentences:
            for c in chapters:
                if s['from'] >= c['from'] and (not any(s['from'] >= c2['from'] > c['from'] for c2 in chapters)):
                    pass
            f.write(f"| {s['id']} | {s['chapter']} | {s['from']}–{s['to']} | {(s['to']-s['from']+1)/FPS:.1f}s | {'｜'.join(sb['text'] for sb in s['subs'])} |\n")
        f.write('\n## Chapter start frames\n')
        for c in chapters:
            f.write(f"- Chapter {c['n']} {c['title']}: f{c['from']}\n")
    
    
    def lit(s):
        return json.dumps(s, ensure_ascii=False)
    with open(f'{REM}/src/common/subs.ts', 'w', encoding='utf-8') as f:
        f.write('// Generated by scripts/tts_build.py from script/narration.txt.\n')
        f.write("export type SubEntry = {from: number; to: number; text: string};\nexport const SUBS: SubEntry[] = [\n")
        for sb in all_subs:
            f.write(f"  {{from: {sb['from']}, to: {sb['to']}, text: {lit(sb['text'])}}},\n")
        f.write('];\n')
    with open(f'{REM}/src/common/timeline.ts', 'w', encoding='utf-8') as f:
        f.write('// Generated by scripts/tts_build.py. Frames are 1-based and inclusive.\n')
        f.write(f'export const TOTAL_FRAMES = {total};\n')
        f.write('export const CHAPTER_STARTS: Array<{n: number; title: string; from: number}> = [\n')
        for c in chapters:
            f.write(f"  {{n: {c['n']}, title: {lit(c['title'])}, from: {c['from']}}},\n")
        f.write('];\n')
        f.write('export type Sentence = {id: string; chapter: number; from: number; to: number; text: string};\n')
        f.write('export const SENTENCES: Sentence[] = [\n')
        for s in sentences:
            f.write(f"  {{id: {lit(s['id'])}, chapter: {s['chapter']}, from: {s['from']}, to: {s['to']}, text: {lit(s['text'])}}},\n")
        f.write('];\n')
    print(f'lang={lang} engine={ENGINE} voice={tl["voice"]} total_frames={total} ({total/FPS:.1f}s) '
          f'sentences={len(sentences)} words={cnt} speech={speech_sec:.1f}s '
          f'rate={cnt/max(1e-6,speech_sec):.2f} {unit}/s')
    for c in chapters:
        print(f"  chapter {c['n']} {c['title']} from f{c['from']}")

if __name__ == '__main__':
    asyncio.run(main(sys.argv[1] if len(sys.argv) > 1 else f'{ROOT}/script/narration.txt'))
