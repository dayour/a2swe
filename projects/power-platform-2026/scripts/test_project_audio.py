import json
from pathlib import Path
import tempfile
import unittest

from sync_scenes import scene_files


class SceneTimingTests(unittest.TestCase):
    def test_all_render_and_qc_ranges_follow_audio(self):
        with tempfile.TemporaryDirectory() as folder:
            root = Path(folder)
            (root / 'script').mkdir()
            timeline = {'total_frames': 1200, 'chapters': [
                {'n': n, 'from': (n - 1) * 180 + 25, 'title': f'Chapter {n}'}
                for n in range(1, 7)]}
            (root / 'script/timeline.json').write_text(json.dumps(timeline), encoding='utf-8')
            (root / 'storyboard.md').write_text('\n'.join(
                f'| SC{n:02d} | 1-10 | 0.0-0.3s | Visual {n} |' for n in range(1, 7)),
                encoding='utf-8')
            files = scene_files(root)
            self.assertIn('from: 1, to: 204', files['src/shots/G1/index.ts'])
            self.assertIn('from: 925, to: 1200', files['src/shots/G6/index.ts'])
            self.assertIn('| SC06 | 925-1200 | 30.8-40.0s | Visual 6 |', files['storyboard.md'])
            scenes = json.loads(files['src/common/scenes.ts'].split(' = ', 1)[1].rstrip(';\n'))
            self.assertEqual(sum(s['to'] - s['from'] + 1 for s in scenes), 1200)
            timeline['chapters'][2]['from'] = 1
            (root / 'script/timeline.json').write_text(json.dumps(timeline), encoding='utf-8')
            with self.assertRaisesRegex(ValueError, 'Chapter ranges'):
                scene_files(root)


if __name__ == '__main__':
    unittest.main()
