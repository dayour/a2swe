import asyncio
import importlib.util
import json
from pathlib import Path
import shutil
import subprocess
import sys
import tempfile
import unittest
from unittest.mock import patch

import numpy as np


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
        for name in ('tts_build.py', 'selfcheck.py', 'render_storyboard.py', 'motion_check.py'):
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
        asyncio.run(module.main(str(narration)))
        timeline = json.loads((self.root / 'script/timeline.json').read_text(encoding='utf-8'))
        self.assertEqual(chunks_seen, ['Hello world. One clear idea.'])
        self.assertEqual(timeline['lang'], 'en')
        self.assertEqual(timeline['words'], 5)
        self.assertTrue((self.root / 'public/assets/test/audio.wav').is_file())
        self.assertIn('One clear idea.', (self.root / 'src/common/subs.ts').read_text(encoding='utf-8'))

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

    def test_piper_requires_model(self):
        module = self.load_tts()
        module.PIPER_MODEL = ''
        with self.assertRaisesRegex(SystemExit, 'PIPER_MODEL'):
            module.synth_piper('An English sentence.')

    def test_python312_preserves_local_kokoro(self):
        module = self.load_tts()
        with patch.object(module.sys, 'version_info', (3, 12, 0)):
            self.assertEqual(module.resolve_engine('auto'), 'kokoro')


if __name__ == '__main__':
    unittest.main()
