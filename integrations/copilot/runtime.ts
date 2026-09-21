import { accessSync, constants, statSync } from 'node:fs';
import { execFile } from 'node:child_process';
import { homedir } from 'node:os';
import path from 'node:path';
import { promisify } from 'node:util';

export interface RuntimeOptions {
  runtime?: string;
  cli?: string;
  home?: string;
  cwd?: string;
}

export function resolveRuntime(options: RuntimeOptions = {}, environment: NodeJS.ProcessEnv = process.env,
  platform: NodeJS.Platform = process.platform, userHome = homedir()) {
  const runtime = options.runtime ?? environment.A2SWE_COPILOT_RUNTIME ?? 'copilot';
  if (!['copilot', 'agency'].includes(runtime)) throw new Error('runtime must be copilot or agency');
  const windows = platform === 'win32';
  const executable = windows ? `${runtime}.exe` : runtime;
  const explicit = options.cli ?? environment.A2SWE_COPILOT_CLI;
  if (explicit && !path.isAbsolute(explicit)) throw new Error('cli must be an absolute executable path');
  const known = windows ? runtime === 'copilot'
    ? [path.join(environment.LOCALAPPDATA ?? path.join(userHome, 'AppData', 'Local'), 'Microsoft', 'WinGet', 'Links', executable)]
    : [path.join(environment.APPDATA ?? path.join(userHome, 'AppData', 'Roaming'), 'agency', 'CurrentVersion', executable)] : [];
  const searchPath = environment.PATH ?? environment.Path ?? '';
  const candidates = explicit ? [explicit] : [...known, ...searchPath.split(windows ? ';' : ':')
    .filter((directory) => path.isAbsolute(directory)).map((directory) => path.join(directory, executable))];
  const cli = candidates.find((candidate) => {
    if (windows && !/\.(exe|com)$/i.test(candidate)) return false;
    try { accessSync(candidate, constants.X_OK); return statSync(candidate).isFile(); } catch { return false; }
  });
  if (!cli) throw new Error(`Existing ${runtime} executable not found; set --cli or A2SWE_COPILOT_CLI. Shell/bootstrap wrappers are not launched automatically.`);
  const baseDirectory = path.resolve(options.home ?? environment.COPILOT_HOME ?? path.join(userHome, '.copilot'));
  const workingDirectory = path.resolve(options.cwd ?? environment.INIT_CWD ?? process.cwd());
  return { runtime, cli, args: runtime === 'agency' ? ['copilot'] : [], baseDirectory, workingDirectory };
}

export function parseNativeHelp(help: string) {
  const commands: string[] = [];
  const options: string[] = [];
  let commandSection = false;
  let optionSection = false;
  for (const line of help.split(/\r?\n/)) {
    if (/^\S/.test(line)) {
      commandSection = /^Commands:\s*$/.test(line);
      optionSection = /^Options:\s*$/.test(line);
      continue;
    }
    const match = commandSection ? /^\s{2,}([a-z][a-z0-9-]*)\s{2,}\S/.exec(line) : null;
    if (match) commands.push(match[1]);
    const option = optionSection ? /^\s+(?:-[a-zA-Z],\s*)?(--[a-z][a-z0-9-]*)\b/.exec(line) : null;
    if (option) options.push(option[1]);
  }
  return { commands: [...new Set(commands)].sort(), options: [...new Set(options)].sort() };
}

export async function inspectRuntime(runtime: ReturnType<typeof resolveRuntime>) {
  if (runtime.runtime !== 'copilot') throw new Error('Use the native Agency help command; automatic Agency probes may install a runtime.');
  const execute = promisify(execFile);
  const options = { cwd: runtime.workingDirectory, env: { ...process.env, COPILOT_HOME: runtime.baseDirectory },
    timeout: 15000, maxBuffer: 256 * 1024, windowsHide: true, encoding: 'utf8' as const };
  const version = await execute(runtime.cli, [...runtime.args, '--no-auto-update', '--version'], options);
  const help = await execute(runtime.cli, [...runtime.args, '--no-auto-update', '--help'], options);
  return { runtime: runtime.runtime, executable: runtime.cli, version: version.stdout.trim(),
    home: runtime.baseDirectory, cwd: runtime.workingDirectory, autoUpdate: false,
    native: { forwarding: 'literal-arguments', ...parseNativeHelp(help.stdout), evidence: 'advertised-help-not-execution-test' },
    sdk: { permissions: ['auto', 'ask', 'deny'], sessions: ['create', 'list', 'resume', 'catalogs'],
      options: ['model', 'agent'], liveAttachment: 'not_implemented',
      unsupportedOptionHandling: 'Use the native copilot command; SDK options are strictly parsed.' } };
}