import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { chmodSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';
import { inspectRuntime, parseNativeHelp, resolveRuntime } from '../../integrations/copilot/runtime.ts';

test('existing Copilot resolution preserves home, cwd and Agency prefix without a bundled runtime', () => {
  const root = mkdtempSync(path.join(tmpdir(), 'a2swe-runtime-'));
  try {
    const binary = path.join(root, 'copilot.exe');
    writeFileSync(binary, 'fixture');
    chmodSync(binary, 0o700);
    const resolved = resolveRuntime({ cli: binary }, { COPILOT_HOME: path.join(root, 'profile'), INIT_CWD: root }, 'win32', root);
    assert.equal(resolved.baseDirectory, path.join(root, 'profile'));
    assert.equal(resolved.workingDirectory, root);
    assert.deepEqual(resolved.args, []);
    const agency = resolveRuntime({ runtime: 'agency', cli: binary, home: root }, {}, 'win32', root);
    assert.deepEqual(agency.args, ['copilot']);
    assert.equal(agency.baseDirectory, root);
    assert.throws(() => resolveRuntime({ runtime: 'other', cli: binary }, {}, 'win32', root), /runtime must/);
    assert.throws(() => resolveRuntime({ cli: 'copilot.exe' }, {}, 'win32', root), /absolute/);
    const wrapper = path.join(root, 'copilot.cmd');
    writeFileSync(wrapper, 'fixture');
    assert.throws(() => resolveRuntime({ cli: wrapper }, {}, 'win32', root), /not found/);
    const knownDirectory = path.join(root, 'Microsoft', 'WinGet', 'Links');
    mkdirSync(knownDirectory, { recursive: true });
    const known = path.join(knownDirectory, 'copilot.exe');
    writeFileSync(known, 'fixture');
    chmodSync(known, 0o700);
    assert.equal(resolveRuntime({}, { LOCALAPPDATA: root, PATH: root }, 'win32', root).cli, known);
    assert.equal(resolveRuntime({}, { LOCALAPPDATA: root }, 'win32', root).baseDirectory, path.join(root, '.copilot'));
  } finally { rmSync(root, { recursive: true, force: true }); }
});

test('native bridge forwards literal arguments, home and cwd without a shell', () => {
  const root = mkdtempSync(path.join(tmpdir(), 'a2swe-forward-'));
  try {
    const literal = 'argument with spaces & $(not-a-command)';
    const forwarded = [literal, 'sessions', 'memories', 'instruction', 'lsp', 'plugin', 'mcp', 'skill',
      '--fleet', '--auto-tier', 'intelligence', '--reasoning-effort', 'high', '--context', 'long_context',
      '--resume=session name', '--plugin-dir', 'path with spaces', '--plugin-dir', 'second path',
      '--additional-mcp-config', '@config with spaces.json', '--attachment', 'image.png', '--acp',
      '--allow-tool=shell(git:*)', '--deny-tool=shell(git push)', '--future-native-option'];
    const code = 'console.log(JSON.stringify({args:process.argv.slice(1),home:process.env.COPILOT_HOME,cwd:process.cwd()}))';
    const result = spawnSync(process.execPath, [fileURLToPath(new URL('../../integrations/copilot/cli.ts', import.meta.url)),
      '--cli', process.execPath, '--runtime-home', root, '--', '-e', code, '--', ...forwarded],
    { encoding: 'utf8', env: { ...process.env, A2SWE_COPILOT_RUNTIME: 'copilot', INIT_CWD: root }, timeout: 15000 });
    assert.equal(result.status, 0, result.stderr);
    assert.deepEqual(JSON.parse(result.stdout), { args: forwarded, home: root, cwd: root });
  } finally { rmSync(root, { recursive: true, force: true }); }
});

test('native capabilities only report advertised options and commands', () => {
  const help = 'Commands:\n  sessions     Manage saved sessions\n  plugin       Manage plugins\n\nOptions:\n  -p, --prompt <text>\n      --fleet\n      --resume [<value>]\nExamples:\n  copilot --invented-example\n  --not-an-option-in-prose is indented\n';
  const parsed = parseNativeHelp(help);
  assert.deepEqual(parsed.commands, ['plugin', 'sessions']);
  assert.ok(parsed.options.includes('--fleet'));
  assert.ok(parsed.options.includes('--prompt'));
  assert.ok(!parsed.options.includes('--invented-example'));
  assert.ok(!parsed.options.includes('--not-an-option-in-prose'));
  assert.deepEqual(parseNativeHelp('unrecognized output').commands, []);
});

test('runtime inspection uses bounded no-update subprocesses and never starts Agency', async () => {
  const root = mkdtempSync(path.join(tmpdir(), 'a2swe-probe-'));
  try {
    const fixture = path.join(root, 'probe.cjs');
    writeFileSync(fixture, `if (!process.argv.includes('--no-auto-update')) process.exit(9);\nif (process.argv.includes('--version')) console.log('fixture-1');\nelse if (process.argv.includes('--help')) console.log('Commands:\\n  sessions     Manage sessions\\nOptions:\\n      --fleet');\nelse process.exit(8);`);
    const runtime = { runtime: 'copilot', cli: process.execPath, args: [fixture], baseDirectory: root, workingDirectory: root };
    const result = await inspectRuntime(runtime);
    assert.equal(result.version, 'fixture-1');
    assert.deepEqual(result.native.commands, ['sessions']);
    assert.deepEqual(result.native.options, ['--fleet']);
    assert.equal(result.autoUpdate, false);
    await assert.rejects(inspectRuntime({ ...runtime, runtime: 'agency' }), /Agency probes/);
  } finally { rmSync(root, { recursive: true, force: true }); }
});