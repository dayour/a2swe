import assert from 'node:assert/strict';
import { execFile } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';
import { promisify } from 'node:util';
import type { PermissionRequest } from '@github/copilot-sdk';
import { permissionMode, profileClient, profilePermissions, profileSession } from './profile.ts';

test('profile mode preserves keychain auth, native catalogs and persistent sessions', () => {
  const runtime = { runtime: 'copilot', cli: '/existing/copilot', args: [], baseDirectory: '/home/user/.copilot', workingDirectory: '/repo' };
  const client = profileClient(runtime);
  assert.throws(() => profileClient({ ...runtime, runtime: 'agency', args: ['copilot'] }), /cannot launch SDK/);
  assert.equal(client.mode, 'copilot-cli');
  assert.equal(client.useLoggedInUser, true);
  assert.equal(client.baseDirectory, '/home/user/.copilot');
  assert.deepEqual(client.connection, { kind: 'stdio', path: '/existing/copilot', args: [], env: undefined });
  const permission = () => ({ kind: 'reject' as const, feedback: 'test' });
  const session = profileSession('/repo', permission, { agent: 'existing-agent' });
  assert.equal(session.agent, 'existing-agent');
  assert.equal(session.enableConfigDiscovery, true);
  assert.equal(session.enableSessionStore, true);
  assert.equal(session.enableSkills, true);
  assert.equal(session.onPermissionRequest, permission);
  for (const key of ['availableTools', 'excludedTools', 'customAgents', 'mcpServers', 'pluginDirectories', 'skillDirectories']) {
    assert.equal(Object.hasOwn(session, key), false, `${key} must not override native discovery`);
  }
});

test('automatic permissions approve without prompting and never override managed policy', async () => {
  const request = { kind: 'read' } as PermissionRequest;
  let prompted = false;
  const handler = profilePermissions('auto', () => { prompted = true; return { kind: 'reject' }; });
  assert.equal(permissionMode(), 'auto');
  assert.deepEqual(await handler(request, { sessionId: 'fixture' }), { kind: 'approve-once' });
  assert.equal(prompted, false);
  const managed = await handler(request, { sessionId: 'fixture', managedSettingsEnabled: true });
  assert.equal(managed.kind, 'reject');
  assert.equal((await handler({ ...request, managedApprovalRequired: true }, { sessionId: 'fixture' })).kind, 'reject');
  assert.equal(prompted, false);
});

test('explicit ask and deny modes remain available and invalid modes fail before runtime launch', async () => {
  const request = { kind: 'read' } as PermissionRequest;
  const ask = () => ({ kind: 'approve-once' as const });
  assert.equal(profilePermissions('ask', ask), ask);
  assert.equal((await profilePermissions('deny')(request, { sessionId: 'fixture' })).kind, 'reject');
  assert.throws(() => profilePermissions('ask'), /requires an interactive/);
  assert.throws(() => permissionMode('all'), /permissions must/);
  assert.equal(permissionMode('ask'), 'ask');
  assert.equal(permissionMode('deny'), 'deny');
});

test('live noninteractive session writes an owned fixture without approval prompts and resumes',
  { skip: process.env.A2SWE_LIVE_COPILOT_TEST !== '1', timeout: 420000 }, async () => {
    const directory = await mkdtemp(path.join(tmpdir(), 'a2swe-auto-permissions-'));
    const marker = `A2SWE_AUTO_${randomUUID()}`;
    const runner = fileURLToPath(new URL('./session.ts', import.meta.url));
    const execute = promisify(execFile);
    const options = { timeout: 190000, maxBuffer: 1024 * 1024, encoding: 'utf8' as const };
    try {
      const first = await execute(process.execPath, [runner, '--cwd', directory, '--prompt',
        `This is an isolated local integration test. Use a local file editing tool to create sentinel.txt in the working directory with exactly ${marker}. Do not use external integrations, subagents or network tools. Do not change any other files. Reply with only the marker after the file exists.`], options);
      assert.equal((await readFile(path.join(directory, 'sentinel.txt'), 'utf8')).trim(), marker);
      assert.ok(first.stderr.includes('permissions: auto'));
      assert.ok(!first.stderr.includes('Approve this request'));
      const sessionId = /Copilot session: ([a-f0-9-]+);/.exec(first.stderr)?.[1];
      assert.ok(sessionId, 'actual session ID must be returned');
      const second = await execute(process.execPath, [runner, '--cwd', directory, '--resume', sessionId, '--prompt',
        'Reply with only the exact marker from the previous turn. Do not use tools or change files.'], options);
      assert.ok(second.stdout.includes(marker));
      assert.ok(!second.stderr.includes('Approve this request'));
    } finally { await rm(directory, { recursive: true, force: true }); }
  });