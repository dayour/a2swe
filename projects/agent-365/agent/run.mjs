import {spawn} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {resolveRuntime} from '../../../integrations/copilot/runtime.ts';

const root = fileURLToPath(new URL('../../../', import.meta.url));
const args = process.argv.slice(2);
const timeoutMs = Number.parseInt(process.env.A2SWE_AGENT_TIMEOUT_MS ?? '180000', 10);
if (!Number.isFinite(timeoutMs) || timeoutMs < 1000 || timeoutMs > 900000) {
  console.error('A2SWE_AGENT_TIMEOUT_MS must be between 1000 and 900000');
  process.exit(1);
}
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
  let timedOut = false;
  const timer = setTimeout(() => {
    timedOut = true;
    console.error(`Agent host exceeded ${timeoutMs}ms and was terminated`);
    child.kill();
  }, timeoutMs);
  const forwardSignal = (signal) => {
    if (!child.killed) child.kill(signal);
  };
  process.once('SIGINT', forwardSignal);
  process.once('SIGTERM', forwardSignal);
  child.on('error', (error) => {
    clearTimeout(timer);
    console.error(`Agent host failed: ${error.message}`);
    process.exitCode = 1;
  });
  child.on('exit', (code) => {
    clearTimeout(timer);
    process.removeListener('SIGINT', forwardSignal);
    process.removeListener('SIGTERM', forwardSignal);
    process.exitCode = timedOut ? 124 : (code ?? 1);
  });
}
