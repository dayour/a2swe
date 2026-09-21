import { mkdtemp, readFile, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { parseArgs } from 'node:util';
import { CopilotClient, RuntimeConnection } from '@github/copilot-sdk';
import type { CopilotSession, SessionConfig } from '@github/copilot-sdk';
import { buildDomainQuery, resolveDomainAnswer } from '../../packages/core/src/domain-query.ts';
import { resolveRuntime } from './runtime.ts';

async function deadline<Value>(operation: Promise<Value>, milliseconds: number): Promise<Value> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([operation, new Promise<never>((_resolve, reject) => { timer = setTimeout(() => reject(new Error('copilot_operation_timeout')), milliseconds); })]);
  } finally { if (timer) clearTimeout(timer); }
}

async function main() {
  const { values } = parseArgs({ options: { domain: { type: 'string' }, question: { type: 'string' }, out: { type: 'string' },
    cli: { type: 'string' }, model: { type: 'string', default: 'gpt-5-mini' }, 'runtime-home': { type: 'string' }, 'allow-copilot-transfer': { type: 'boolean' } } });
  if (!values.domain || !values.question || !values.out || !values['allow-copilot-transfer']) {
    throw new Error('required: --domain FILE --question TEXT --out NEW_FILE --allow-copilot-transfer [--cli ABSOLUTE_EXECUTABLE] [--model MODEL]');
  }
  const query = buildDomainQuery(JSON.parse(await readFile(values.domain, 'utf8')), values.question);
  const workingDirectory = await mkdtemp(path.join(tmpdir(), 'a2swe-copilot-'));
  const runtime = resolveRuntime({ runtime: 'copilot', cli: values.cli, home: values['runtime-home'], cwd: workingDirectory });
  const client = new CopilotClient({ connection: RuntimeConnection.forStdio({ path: runtime.cli }), mode: 'empty',
    workingDirectory, baseDirectory: runtime.baseDirectory, useLoggedInUser: true, logLevel: 'error', enableRemoteSessions: false });
  let session: CopilotSession | undefined;
  const denied: string[] = [];
  let phase = 'runtime_start';
  try {
    await deadline(client.start(), 20000);
    phase = 'session_create';
    const config: SessionConfig = { model: values.model, workingDirectory, availableTools: [], excludedTools: ['builtin:*', 'mcp:*', 'custom:*'],
      tools: [], mcpServers: {}, customAgents: [], skillDirectories: [], pluginDirectories: [], instructionDirectories: [],
      enableConfigDiscovery: false, enableOnDemandInstructionDiscovery: false, enableFileHooks: false, enableHostGitOperations: false,
      enableSessionStore: false, enableSkills: false, memory: { enabled: false }, infiniteSessions: { enabled: false }, remoteSession: 'off',
      skipEmbeddingRetrieval: true, embeddingCacheStorage: 'in-memory', systemMessage: { mode: 'append', content: query.system },
      onPermissionRequest: (request) => { denied.push(request.kind); return { kind: 'reject', feedback: 'This evaluator permits no tool or file access.' }; },
      hooks: { onPreToolUse: () => ({ permissionDecision: 'deny', permissionDecisionReason: 'No tools permitted' }) } };
    session = await deadline(client.createSession(config), 30000);
    phase = 'model_response';
    const response = await session.sendAndWait({ prompt: query.prompt }, 60000);
    if (!response?.data.content) throw new Error('copilot_no_answer');
    const answer = resolveDomainAnswer(query.domain, response.data.content);
    phase = 'write_result';
    await writeFile(values.out, `${JSON.stringify({ ...answer, backend: 'copilot-sdk-1.0.14', model: values.model,
      executedAt: new Date().toISOString(), deniedPermissionKinds: denied, runtimeDirectory: workingDirectory }, null, 2)}\n`, { flag: 'wx', mode: 0o600 });
    console.log(JSON.stringify({ output: values.out, backend: 'copilot-sdk', model: values.model, claimCount: answer.facts.length, engineeringExecution: 'not_run' }));
  } catch (error) {
    throw new Error(`${phase}: ${error instanceof Error ? error.message : 'unknown_error'}`);
  } finally {
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
  console.error(JSON.stringify({ status: 'blocked_or_failed', reason: message.replace(/(?:gh[opusr]_[A-Za-z0-9_]+|Bearer\s+\S+)/gi, '[redacted]') }));
  process.exitCode = 1;
});