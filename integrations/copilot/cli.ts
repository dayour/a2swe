import { spawn } from 'node:child_process';
import { resolveRuntime } from './runtime.ts';
import type { RuntimeOptions } from './runtime.ts';

try {
  const forwarded = process.argv.slice(2);
  const options: RuntimeOptions = {};
  while (['--runtime', '--cli', '--runtime-home'].includes(forwarded[0] ?? '')) {
    const flag = forwarded.shift();
    const value = forwarded.shift();
    if (!value || value.startsWith('--')) throw new Error(`Missing value for ${flag}`);
    if (flag === '--runtime') options.runtime = value;
    if (flag === '--cli') options.cli = value;
    if (flag === '--runtime-home') options.home = value;
  }
  if (forwarded[0] === '--') forwarded.shift();
  const runtime = resolveRuntime(options);
  const child = spawn(runtime.cli, [...runtime.args, ...forwarded], { shell: false, stdio: 'inherit',
    cwd: runtime.workingDirectory, env: { ...process.env, COPILOT_HOME: runtime.baseDirectory } });
  child.on('error', () => { console.error('Existing Copilot CLI could not start.'); process.exitCode = 1; });
  child.on('exit', (code) => { process.exitCode = code ?? 1; });
} catch (error) {
  console.error(error instanceof Error ? error.message : 'Unable to resolve existing Copilot CLI');
  process.exitCode = 1;
}