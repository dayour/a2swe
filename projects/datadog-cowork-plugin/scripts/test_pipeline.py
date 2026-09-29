import asyncio
import importlib.util
import json
import os
from pathlib import Path
import shutil
import subprocess
import sys
import tempfile
import unittest
from unittest.mock import patch

import numpy as np
from speech_runtime import caption_starts, fork_provenance, read_timing, sha256, verify_narration


class PipelineTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.addCleanup(self.temp.cleanup)
        self.root = Path(self.temp.name)
        (self.root / 'scripts').mkdir()
        (self.root / 'script').mkdir()
        (self.root / 'src/common').mkdir(parents=True)
        (self.root / 'src/shots/G1').mkdir(parents=True)
        (self.root / 'src/config.ts').write_text("export const VIDEO = {slug: 'test', lang: 'en'};", encoding='utf-8')
        for name in ('tts_build.py', 'speech_runtime.py', 'python.mjs', 'selfcheck.py', 'render_storyboard.py', 'motion_check.py', 'pipeline_media.py'):
            shutil.copy2(Path(__file__).with_name(name), self.root / 'scripts' / name)
        self.timeline = {
            'total_frames': 60,
            'chapters': [{'n': 12, 'from': 1}],
            'sentences': [{'id': 'S01', 'from': 1, 'to': 60, 'subs': [{'from': 1}]}],
        }
        (self.root / 'script/timeline.json').write_text(json.dumps(self.timeline), encoding='utf-8')
        self.storyboard = '## G1 Opening\n\n| SC01 | 1-60 | A moving diagram |\n'
        (self.root / 'storyboard.md').write_text(self.storyboard, encoding='utf-8')

    def run_script(self, name, *args):
        return subprocess.run([sys.executable, str(self.root / 'scripts' / name), *args], capture_output=True, text=True, encoding='utf-8')

    def load_tts(self):
        spec = importlib.util.spec_from_file_location('test_tts', self.root / 'scripts/tts_build.py')
        module = importlib.util.module_from_spec(spec)
        spec.loader.exec_module(module)
        return module

    def load_media(self):
        spec = importlib.util.spec_from_file_location('test_media', self.root / 'scripts/pipeline_media.py')
        module = importlib.util.module_from_spec(spec)
        spec.loader.exec_module(module)
        return module

    def test_missing_shot_fails(self):
        result = self.run_script('selfcheck.py')
        self.assertNotEqual(result.returncode, 0)
        self.assertIn('missing shot SC01', result.stdout)

    def test_matching_shot_passes(self):
        (self.root / 'src/shots/G1/index.ts').write_text("export const SHOTS = [{id: 'SC01', from: 1, to: 60}];", encoding='utf-8')
        result = self.run_script('selfcheck.py')
        self.assertEqual(result.returncode, 0, result.stdout + result.stderr)

    def test_storyboard_english_filename_and_chapter_token(self):
        (self.root / 'script/storyboard_src.md').write_text('| SC01 | {S01.from}-{S01.to} | {C12} {TOTAL} |', encoding='utf-8')
        result = self.run_script('render_storyboard.py')
        self.assertEqual(result.returncode, 0, result.stderr)
        self.assertEqual((self.root / 'storyboard.md').read_text(encoding='utf-8'), '| SC01 | 1-60 | 1 60 |')

    def test_unresolved_storyboard_token_fails(self):
        (self.root / 'script/storyboard_src.md').write_text('{S01.unknown}', encoding='utf-8')
        self.assertNotEqual(self.run_script('render_storyboard.py').returncode, 0)

    def test_empty_motion_input_fails(self):
        frames = self.root / 'frames'
        frames.mkdir()
        result = self.run_script('motion_check.py', '--frames', str(frames))
        self.assertNotEqual(result.returncode, 0)
        self.assertIn('No frames', result.stdout + result.stderr)

    def test_english_chunks_and_generated_timeline(self):
        module = self.load_tts()
        chunks_seen = []

        async def fake_synthesis(chunks, sep=' '):
            chunks_seen.append(sep.join(chunks))
            return np.ones(module.SR, dtype=np.float32) * 0.1, [0.0, 0.5], 1.0

        module.synth_sentence = fake_synthesis
        narration = self.root / 'script/narration.txt'
        narration.write_text('# CHAPTER 1 Opening\nHello world.|One clear idea.\n', encoding='utf-8')
        with patch.object(module, 'fork_provenance', return_value={'kokoro': {'url': 'fixture'}}), \
             patch.object(module, 'kokoro_files', return_value={'weights': str(narration)}):
            asyncio.run(module.main(str(narration)))
        timeline = json.loads((self.root / 'script/timeline.json').read_text(encoding='utf-8'))
        self.assertEqual(chunks_seen, ['Hello world. One clear idea.'])
        self.assertEqual(timeline['lang'], 'en')
        self.assertEqual(timeline['words'], 5)
        self.assertTrue((self.root / 'public/assets/test/audio.wav').is_file())
        self.assertIn('One clear idea.', (self.root / 'src/common/subs.ts').read_text(encoding='utf-8'))
        metadata = verify_narration(self.root)
        self.assertEqual(metadata['engine'], 'kokoro')
        self.assertEqual(metadata['voice'], 'am_liam')
        for name in ('public/assets/test/audio.wav', 'script/timeline.json',
                     'src/common/subs.ts', 'src/common/timeline.ts', 'scripts/tts_build.py'):
            path = self.root / name
            original = path.read_bytes()
            path.write_bytes(original + b' ')
            with self.assertRaises(ValueError, msg=name):
                verify_narration(self.root)
            path.write_bytes(original)
        narration.write_text('Changed narration.', encoding='utf-8')
        with self.assertRaisesRegex(ValueError, 'Speech input changed'):
            verify_narration(self.root)

    def test_project_voice_profile_and_explicit_override(self):
        (self.root / 'script/speech.json').write_text(json.dumps({
            'TTS_ENGINE': 'kokoro', 'KOKORO_VOICE': 'am_liam', 'KOKORO_SPEED': 1.0, 'LEAD': 24,
        }), encoding='utf-8')
        module = self.load_tts()
        self.assertEqual((module.ENGINE, module.KOKORO_VOICE, module.KOKORO_SPEED, module.LEAD),
                         ('kokoro', 'am_liam', 1.0, 24))
        with patch.dict(os.environ, {'LEAD': '30'}):
            self.assertEqual(self.load_tts().LEAD, 30)

    def test_npm_launcher_uses_explicit_python_and_rejects_relative_paths(self):
        script = self.root / 'scripts/probe.py'
        script.write_text('import sys; print(sys.executable)', encoding='utf-8')
        environment = {**os.environ, 'A2SWE_PYTHON': sys.executable}
        command = ['node', str(self.root / 'scripts/python.mjs'), 'scripts/probe.py']
        result = subprocess.run(command, env=environment, capture_output=True, text=True)
        self.assertEqual(result.returncode, 0, result.stderr)
        self.assertIn(sys.executable, result.stdout)
        environment['A2SWE_PYTHON'] = 'python.exe'
        result = subprocess.run(command, env=environment, capture_output=True, text=True)
        self.assertNotEqual(result.returncode, 0)
        self.assertIn('absolute interpreter path', result.stderr)

    def test_kokoro_synthesizes_whole_sentence(self):
        module = self.load_tts()
        module.ENGINE = 'kokoro'
        wav = self.root / 'sentence.wav'
        wav.write_bytes(b'fixture')
        words = [
            {'text': 'Hello', 't': 0.1, 'd': 0.4},
            {'text': 'world.', 't': 0.7, 'd': 0.3},
        ]
        wav.with_suffix('.timing.json').write_text(json.dumps({
            'schema': 1, 'audio_sha256': sha256(wav), 'words': words,
        }), encoding='utf-8')
        with patch.object(module, 'synth_kokoro', return_value=str(wav)) as synth, \
             patch.object(module, 'decode', return_value=np.full(module.SR * 2, 0.1)):
            audio, starts, duration = asyncio.run(module.synth_sentence(['Hello', 'world.']))
        synth.assert_called_once_with('Hello world.')
        self.assertEqual(starts, [0.0, 0.7])
        self.assertEqual(duration, 2.0)
        self.assertEqual(len(audio), module.SR * 2)
        wav.write_bytes(b'corrupted')
        with self.assertRaisesRegex(ValueError, 'Invalid Kokoro cache pair'):
            read_timing(wav)

    def test_kokoro_failure_never_uses_another_engine(self):
        module = self.load_tts()
        module.ENGINE = 'kokoro'
        with patch.object(module, 'synth_kokoro', side_effect=RuntimeError('inference failed')), \
             patch.object(module, 'synth_edge') as edge:
            with self.assertRaisesRegex(RuntimeError, 'inference failed'):
                asyncio.run(module.synth_sentence(['Hello world.']))
            edge.assert_not_called()

    def test_caption_timestamps_match_repeated_words(self):
        words = [{'text': text, 't': time, 'd': 0.2}
                 for text, time in [('Test', 0.1), ('and', 0.4), ('test', 0.8), ('.', 1.1)]]
        starts = caption_starts('Test and test.', ['Test and', 'test.'], words, 0.1, 2)
        self.assertEqual(starts[0], 0.0)
        self.assertAlmostEqual(starts[1], 0.7)
        with self.assertRaisesRegex(ValueError, 'complete narration'):
            caption_starts('Test and test.', ['Test and', 'test.'], words[:-1], 0.1, 2)

    def test_cache_tracks_model_hash(self):
        module = self.load_tts()
        module.ENGINE = 'kokoro'
        first = module.cache_path('same text', '.wav')
        module.MODELS['voice'] = {'sha256': 'changed'}
        module.runtime_fingerprint.cache_clear()
        self.assertNotEqual(first, module.cache_path('same text', '.wav'))

    def test_unpinned_fork_is_rejected(self):
        (self.root / 'requirements.lock.txt').write_text(
            'kokoro @ https://github.com/dayour/kokoro/releases/download/test/kokoro.whl#sha256=' + 'a' * 64,
            encoding='utf-8')
        with patch('speech_runtime.distribution') as package:
            package.return_value.read_text.return_value = json.dumps({'url': 'https://pypi.org/upstream.whl'})
            with self.assertRaisesRegex(SystemExit, 'not the locked fork'):
                fork_provenance(self.root, 'kokoro')

    def test_invalid_wave_is_not_cached(self):
        module = self.load_tts()
        wav = self.root / 'invalid.wav'
        for audio in (np.array([]), np.zeros(10), np.array([np.nan]), np.ones((10, 3))):
            with self.assertRaises(ValueError):
                module.write_wav(wav, audio, module.SR)
            self.assertFalse(wav.exists())

    def test_non_english_narration_rejected(self):
        module = self.load_tts()
        narration = self.root / 'script/narration.txt'
        narration.write_text('\u4e2d\u6587', encoding='utf-8')
        with self.assertRaisesRegex(SystemExit, 'English'):
            module.parse(str(narration))

    def test_python314_auto_stays_local(self):
        module = self.load_tts()
        with patch.object(module.sys, 'version_info', (3, 14, 7)):
            self.assertEqual(module.resolve_engine('auto'), 'kokoro')
            self.assertEqual(module.resolve_engine('edge'), 'edge')
            for engine in ('kokoro', 'kokoro_onnx'):
                self.assertEqual(module.resolve_engine(engine), engine)

    def test_tts_requires_python314(self):
        module = self.load_tts()
        with patch.object(module.sys, 'version_info', (3, 13, 0)):
            with self.assertRaisesRegex(SystemExit, 'Python 3.14 is required'):
                module.require_python314()

    def test_piper_requires_model(self):
        module = self.load_tts()
        module.PIPER_MODEL = ''
        with self.assertRaisesRegex(SystemExit, 'PIPER_MODEL'):
            module.synth_piper('An English sentence.')

    def test_media_helpers_refuse_overwrite_and_validate_coverage(self):
        module = self.load_media()
        existing = self.root / 'existing.mp4'
        existing.write_text('keep', encoding='utf-8')
        with self.assertRaisesRegex(SystemExit, 'already exists'):
            module.ensure_new_file(existing, 'output')
        shots = [('SC01', 1, 30, 'G1'), ('SC02', 31, 60, 'G1')]
        self.assertEqual(module.validate_shot_coverage(shots, 60), shots)
        with self.assertRaisesRegex(SystemExit, 'gap/overlap'):
            module.validate_shot_coverage([('SC01', 1, 20, 'G1'), ('SC02', 25, 60, 'G1')], 60)

    def test_frame_dir_prefers_versioned_then_legacy(self):
        module = self.load_media()
        legacy = self.root / 'fin_frames'
        legacy.mkdir()
        self.assertEqual(module.resolve_frames_dir(self.root, 'v9'), legacy.resolve())
        versioned = self.root / 'fin_frames_v9'
        versioned.mkdir()
        self.assertEqual(module.resolve_frames_dir(self.root, 'v9'), versioned.resolve())

    def test_explicit_frame_dir_must_exist(self):
        module = self.load_media()
        explicit = self.root / 'custom_frames'
        explicit.mkdir()
        self.assertEqual(module.resolve_frames_dir(self.root, 'v9', Path('custom_frames')), explicit.resolve())
        with self.assertRaisesRegex(SystemExit, 'Frame directory not found'):
            module.resolve_frames_dir(self.root, 'v9', Path('missing_frames'))


if __name__ == '__main__':
    unittest.main()
