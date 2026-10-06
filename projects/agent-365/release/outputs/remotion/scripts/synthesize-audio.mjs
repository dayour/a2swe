import { existsSync } from 'node:fs';
import { dirname, isAbsolute, join, resolve } from 'node:path';
import { spawnSync } from 'node:child_process';

const root = process.cwd();
let python = process.env.A2SWE_PYTHON;
if (python && !isAbsolute(python)) {
  throw new Error('A2SWE_MP4_AUDIO_FAILED: A2SWE_PYTHON must be an absolute Python 3.14 interpreter path');
}
if (!python) {
  for (let dir = root; ; dir = dirname(dir)) {
    const candidate = join(dir, '.venv', process.platform === 'win32' ? 'Scripts' : 'bin', process.platform === 'win32' ? 'python.exe' : 'python');
    if (existsSync(candidate)) { python = candidate; break; }
    if (dirname(dir) === dir) break;
  }
}
if (!python || !existsSync(python)) {
  throw new Error('A2SWE_MP4_AUDIO_FAILED: create a Python 3.14 .venv with requirements.lock.txt installed, or set absolute A2SWE_PYTHON');
}
const version = spawnSync(python, ['-c', 'import sys; print(sys.version.split()[0]); sys.exit(sys.version_info[:2] != (3, 14))'], { cwd: root, encoding: 'utf8', windowsHide: true });
if (version.error) throw new Error(`A2SWE_MP4_AUDIO_FAILED: Python version check failed: ${version.error.message}`);
if (version.status !== 0) {
  throw new Error(`A2SWE_MP4_AUDIO_FAILED: Python 3.14 required; got ${version.stdout.trim() || version.stderr.trim() || 'unknown'}`);
}
const result = spawnSync(python, [resolve(root, 'scripts/synthesize-audio.py'), 'speech/narration-manifest.json'], {
  cwd: root,
  stdio: 'inherit',
  env: { ...process.env, PYTHONUTF8: '1' },
  windowsHide: true
});
if (result.error) throw new Error(`A2SWE_MP4_AUDIO_FAILED: local Kokoro synthesis failed to start: ${result.error.message}`);
process.exit(result.status ?? 1);
