import { createInterface } from 'node:readline/promises';
import { parseArgs } from 'node:util';
import { CopilotClient } from '@github/copilot-sdk';
import type { CopilotSession, PermissionHandler } from '@github/copilot-sdk';
import { inspectRuntime, resolveRuntime } from './runtime.ts';
import { deadline, permissionMode, profileClient, profilePermissions, profileSession } from './profile.ts';

async function main() {
  const { values } = parseArgs({ options: { runtime: { type: 'string' }, cli: { type: 'string' },
    'runtime-home': { type: 'string' }, cwd: { type: 'string' }, model: { type: 'string' }, agent: { type: 'string' },
    prompt: { type: 'string' }, resume: { type: 'string' }, sessions: { type: 'boolean' }, doctor: { type: 'boolean' }, catalogs: { type: 'boolean' },
    capabilities: { type: 'boolean' }, permissions: { type: 'string', default: 'auto' }, 'trust-profile': { type: 'boolean' }, help: { type: 'boolean' } } });
  if (values.help) {
    console.log('Existing-profile SDK: --capabilities | --doctor | --sessions | --catalogs | --prompt TEXT [--resume ID] [--agent NAME] [--model MODEL]\nOptions: --cli ABSOLUTE_COPILOT_EXECUTABLE --runtime-home DIRECTORY --cwd DIRECTORY --permissions auto|ask|deny\nDefault auto approves tool requests without prompting, subject to managed policy. Installed configuration, plugins, MCP startup and hooks may execute as your OS user; this is not a sandbox. --trust-profile remains accepted for compatibility.\nUse npm run agency:copilot for native Agency; its launcher is incompatible with SDK headless mode.');
    return;
  }
  const permissions = permissionMode(values.permissions);
  if (!values.capabilities && !values.doctor && !values.sessions && !(values.prompt || values.catalogs)) {
    throw new Error('Provide --prompt TEXT, --catalogs, --sessions or --doctor; use --help for details');
  }
  const runtime = resolveRuntime({ runtime: values.runtime, cli: values.cli, home: values['runtime-home'], cwd: values.cwd });
  if (values.capabilities) {
    console.log(JSON.stringify(await inspectRuntime(runtime), null, 2));
    return;
  }
  const client = new CopilotClient(profileClient(runtime));
  let session: CopilotSession | undefined;
  let terminal: ReturnType<typeof createInterface> | undefined;
  let promptQueue = Promise.resolve();
  let phase = 'runtime_start';
  const ask = (question: string): Promise<string> => {
    if (!process.stdin.isTTY || !process.stderr.isTTY) return Promise.resolve('');
    const answer = promptQueue.then(async () => {
      terminal ??= createInterface({ input: process.stdin, output: process.stderr });
      return terminal.question(question);
    });
    promptQueue = answer.then(() => undefined, () => undefined);
    return answer;
  };
  const interactivePermission: PermissionHandler = async (request) => {
    const answer = await ask(`\nPermission request (untrusted tool data):\n${JSON.stringify(request, null, 2)}\nApprove this request once? [y/N] `);
    return answer.trim().toLowerCase() === 'y' ? { kind: 'approve-once' } : { kind: 'reject', feedback: 'Not approved by the terminal user.' };
  };
  try {
    await deadline(client.start(), 30000);
    if (values.doctor) {
      phase = 'diagnostics';
      const auth = await deadline(client.getAuthStatus(), 15000);
      const status = await deadline(client.getStatus(), 15000);
      const sessions = await deadline(client.listSessions(), 15000);
      console.log(JSON.stringify({ runtime: runtime.runtime, executable: runtime.cli, home: runtime.baseDirectory,
        cwd: runtime.workingDirectory, authenticated: auth.isAuthenticated, sessionCount: sessions.length,
        status, permissions, managedPolicy: 'enforced-per-request' }, null, 2));
      return;
    }
    if (values.sessions) {
      phase = 'list_sessions';
      const sessions = await deadline(client.listSessions(), 15000);
      console.log(JSON.stringify(sessions.map((entry) => ({ sessionId: entry.sessionId, startTime: entry.startTime, modifiedTime: entry.modifiedTime })), null, 2));
      return;
    }
    phase = values.resume ? 'session_resume' : 'session_create';
    const config = profileSession(runtime.workingDirectory, profilePermissions(permissions, interactivePermission), { ...(values.model ? { model: values.model } : {}),
      ...(values.agent ? { agent: values.agent } : {}) });
    config.onUserInputRequest = async (request) => {
      if (!process.stdin.isTTY) throw new Error('Interactive user input requires a terminal');
      const answer = await ask(`${request.question}\n${(request.choices ?? []).join(' / ')}\n> `);
      return { answer, wasFreeform: !request.choices?.includes(answer) };
    };
    session = await deadline(values.resume ? client.resumeSession(values.resume, config) : client.createSession(config), 60000);
    console.error(`Copilot session: ${session.sessionId}; permissions: ${permissions}`);
    if (values.catalogs) {
      phase = 'catalog_discovery';
      const agents = await deadline(session.rpc.agent.list(), 30000);
      await deadline(session.rpc.skills.ensureLoaded(), 30000);
      const skills = await deadline(session.rpc.skills.list(), 30000);
      const plugins = await deadline(session.rpc.plugins.list(), 30000);
      console.log(JSON.stringify({ agents: agents.agents.map((entry) => entry.name),
        skills: skills.skills.map((entry) => entry.name), plugins: plugins.plugins.map((entry) => entry.name) }, null, 2));
      return;
    }
    phase = 'model_response';
    const response = await session.sendAndWait({ prompt: values.prompt! }, 300000);
    if (!response?.data.content) throw new Error('copilot_no_answer');
    console.log(response.data.content);
  } catch (error) {
    throw new Error(`${phase}: ${error instanceof Error ? error.message : 'unknown_error'}`);
  } finally {
    terminal?.close();
    if (session) {
      await deadline(session.abort(), 5000).catch(() => undefined);
      await deadline(session.disconnect(), 5000).catch(() => undefined);
    }
    try { if ((await deadline(client.stop(), 5000)).length) await deadline(client.forceStop(), 5000); }
    catch { await deadline(client.forceStop(), 5000); }
  }
}

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : 'unknown_error';
  console.error(message.replace(/(?:gh[opusr]_[A-Za-z0-9_]+|Bearer\s+\S+)/gi, '[redacted]'));
  process.exitCode = 1;
});