import {spawn} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {resolveRuntime} from '../../../integrations/copilot/runtime.ts';

const root = fileURLToPath(new URL('../../../', import.meta.url));
const args = process.argv.slice(2);
if (args.length && (args.length !== 2 || args[0] !== '--prompt' || !args[1].trim())) {
  console.error('Usage: node projects/agent-365/agent/run.mjs [--prompt "engineering question"]');
  process.exitCode = 1;
} else {
  const runtime = resolveRuntime({cwd: root});
  const options = ['--no-auto-update', '--agent', 'agent-365-swe', '--disable-builtin-mcps'];
  for (const name of ['calendar', 'cli_for_microsoft365', 'darbot-browser', 'github-mcp-server', 'ide', 'mail', 'playwright', 'teams', 'workiq']) {
    options.push('--disable-mcp-server', name);
  }
  if (args.length) options.push('--available-tools=view', '--deny-tool=write', '--deny-tool=shell',
    '--deny-tool=url', '--no-ask-user', '--silent', '--prompt', args[1]);
  const child = spawn(runtime.cli, [...runtime.args, ...options], {
    cwd: root, env: {...process.env, COPILOT_HOME: runtime.baseDirectory}, stdio: 'inherit', shell: false,
  });
  child.on('error', (error) => {console.error(`Agent host failed: ${error.message}`); process.exitCode = 1;});
  child.on('exit', (code) => {process.exitCode = code ?? 1;});
}
