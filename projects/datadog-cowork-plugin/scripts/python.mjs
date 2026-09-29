import {existsSync} from 'node:fs';
import {dirname, isAbsolute, join, resolve} from 'node:path';
import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';

const root = dirname(dirname(fileURLToPath(import.meta.url)));
let python = process.env.A2SWE_PYTHON;
if (python && !isAbsolute(python)) {
  throw new Error('A2SWE_PYTHON must be an absolute interpreter path.');
}
if (!python) {
  for (let dir = root; ; dir = dirname(dir)) {
    const candidate = join(dir, '.venv', process.platform === 'win32' ? 'Scripts' : 'bin',
      process.platform === 'win32' ? 'python.exe' : 'python');
    if (existsSync(candidate)) { python = candidate; break; }
    if (dirname(dir) === dir) break;
  }
}
if (!python || !existsSync(python)) {
  throw new Error('Create a Python 3.14 .venv and install requirements.lock.txt, or set A2SWE_PYTHON.');
}
const version = spawnSync(python, ['-c', 'import sys; print(sys.version.split()[0]); sys.exit(sys.version_info[:2] != (3, 14))'], {encoding: 'utf8'});
if (version.error) throw version.error;
if (version.status !== 0) throw new Error(`Python 3.14 required: ${version.stdout} ${version.stderr}`);
const [script, ...args] = process.argv.slice(2);
if (!script) throw new Error('Pass a Python script path.');
console.log(`Python ${version.stdout.trim()}: ${python}`);
const child = spawnSync(python, [resolve(root, script), ...args], {
  cwd: root, stdio: 'inherit', env: {...process.env, PYTHONUTF8: '1'},
});
if (child.error) throw child.error;
process.exit(child.status ?? 1);
