import argparse
import hashlib
import json
import platform
from importlib.metadata import version
from pathlib import Path

import numpy as np
import soundfile as sf
import torch
from huggingface_hub import hf_hub_download
from kokoro import KPipeline
from kokoro_onnx import Kokoro
from misaki import en


def fingerprint(path):
    with Path(path).open('rb') as stream:
        return hashlib.file_digest(stream, 'sha256').hexdigest()


def save_audio(path, audio, sample_rate):
    assert audio.ndim == 1 and audio.size > sample_rate, 'Missing or short audio'
    assert np.isfinite(audio).all(), 'Nonfinite audio'
    peak = float(np.abs(audio).max())
    rms = float(np.sqrt(np.mean(audio.astype(np.float64) ** 2)))
    assert 0.001 < peak <= 1, f'Invalid peak: {peak}'
    assert rms > 0.001, f'Silent audio: {rms}'
    sf.write(path, audio, sample_rate, subtype='PCM_16')
    restored, restored_rate = sf.read(path, dtype='float32')
    assert restored_rate == sample_rate and restored.shape == audio.shape
    np.testing.assert_allclose(restored, audio, atol=1 / 32768)
    return {'file': path.name, 'seconds': audio.size / sample_rate,
            'sample_rate': sample_rate, 'peak': peak, 'rms': rms,
            'sha256': fingerprint(path)}


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--onnx-model', type=Path, required=True)
    parser.add_argument('--onnx-voices', type=Path, required=True)
    parser.add_argument('--output', type=Path, required=True)
    parser.add_argument('narration', type=Path, nargs='+')
    args = parser.parse_args()
    args.output.mkdir(parents=True, exist_ok=True)
    pipeline = KPipeline(lang_code='a', device='cpu', repo_id='hexgrad/Kokoro-82M')
    phonemizer = en.G2P(trf=False, british=False)
    onnx = Kokoro(str(args.onnx_model), str(args.onnx_voices))
    model_path = hf_hub_download('hexgrad/Kokoro-82M', 'kokoro-v1_0.pth')
    report = {
        'python': platform.python_version(),
        'packages': {name: version(name) for name in
                     ('kokoro', 'kokoro-onnx', 'misaki', 'torch', 'onnxruntime', 'spacy', 'en-core-web-sm')},
        'device': 'cpu',
        'parameter_count': sum(parameter.numel() for parameter in pipeline.model.parameters()),
        'models': {str(path): fingerprint(path) for path in
                   (Path(model_path), args.onnx_model, args.onnx_voices)},
        'results': [],
    }
    for narration in args.narration:
        slug = narration.parent.parent.name
        text = ' '.join(line.replace('|', ' ') for line in
                        narration.read_text(encoding='utf-8').splitlines()
                        if line.strip() and not line.startswith('#'))
        phonemes, tokens = phonemizer(text)
        assert phonemes and tokens, 'Misaki did not produce phonemes and tokens'
        with torch.inference_mode():
            chunks = list(pipeline(text, voice='am_liam'))
        assert chunks and all(chunk.phonemes and chunk.audio is not None for chunk in chunks)
        audio = np.concatenate([chunk.audio.detach().cpu().numpy() for chunk in chunks])
        full_result = save_audio(args.output / f'{slug}-kokoro.wav', audio, 24000)
        onnx_audio, sample_rate = onnx.create(text, voice='am_michael', speed=1.0, lang='en-us')
        onnx_result = save_audio(args.output / f'{slug}-kokoro-onnx.wav', onnx_audio, sample_rate)
        result = {'topic': slug, 'text': text, 'misaki_phonemes': phonemes,
                  'misaki_token_count': len(tokens), 'kokoro': full_result, 'kokoro_onnx': onnx_result}
        report['results'].append(result)
        (args.output / 'verification.json').write_text(json.dumps(report, indent=2), encoding='utf-8')
        print(f'{slug}: Misaki {len(tokens)} tokens; Kokoro {full_result["seconds"]:.2f}s; ONNX {onnx_result["seconds"]:.2f}s', flush=True)
    onnx.voices.close()
    print(f'PASS: real model audio and provenance saved to {args.output}', flush=True)


if __name__ == '__main__':
    main()