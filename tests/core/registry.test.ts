import assert from 'node:assert/strict';
import { mkdtemp, mkdir, writeFile, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { inventory, resolveEntries, safeRelativePath } from '../../packages/core/src/registry.ts';
import type { LibraryEntry } from '../../packages/core/src/contracts.ts';

test('inventory parses case-insensitive skills, excludes secrets and never enables code', async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), 'a2swe-inventory-'));
  try {
    await mkdir(path.join(root, 'office'));
    await writeFile(path.join(root, 'office', 'skill.md'), '---\nname: Fixture\ndescription: Test\n---\n');
    await writeFile(path.join(root, 'office', 'payload.js'), 'throw new Error("MUST NOT EXECUTE");');
    await writeFile(path.join(root, '.env'), 'SYNTHETIC_SECRET=not-a-credential');
    await writeFile(path.join(root, 'pending.zip'), 'not inspected as an archive');
    await mkdir(path.join(root, 'guides'));
    await writeFile(path.join(root, 'guides', 'dayour-operations.md'), '# Reference guide, not an agent');
    const result = await inventory({ id: 'fixture', path: root, kind: 'installed' });
    assert.equal(result.files.length, 5);
    assert.equal(result.entries.length, 2);
    assert.equal(result.findings.length, 0);
    assert.equal(result.files.find((file) => file.path === '.env')?.contentHash, null);
    assert.equal(result.entries.find((entry) => entry.kind === 'skill')?.displayName, 'Fixture');
    assert.ok(result.entries.every((entry) => entry.enablementStatus === 'disabled' && entry.runtimeValidation === 'not_run'));
    assert.equal(result.entries.find((entry) => entry.kind === 'archive')?.reviewStatus, 'quarantined');
    assert.equal(result.digest, (await inventory({ id: 'fixture', path: root, kind: 'installed' })).digest);
    assert.ok(!JSON.stringify(result).includes(root));
    assert.throws(() => resolveEntries(result.entries, [result.entries[0].id], new Set()), /component_not_ready/);
    await writeFile(path.join(root, 'office', 'payload.js'), 'changed');
    assert.notEqual(result.digest, (await inventory({ id: 'fixture', path: root, kind: 'installed' })).digest);
  } finally { await rm(root, { recursive: true, force: true }); }
});

test('unsafe portable paths fail Windows and POSIX rules', () => {
  for (const value of ['../escape', '/absolute', 'C:/file', 'file:stream', 'CON.txt', 'nested/..', 'file.', 'file ', 'a\\b', 'a//b']) assert.equal(safeRelativePath(value), false, value);
  assert.equal(safeRelativePath('skills/example/SKILL.md'), true);
});

test('resolver rejects missing dependencies, cycles, unknown rights and private effects', () => {
  const entry: LibraryEntry = {
    schemaVersion: '1.0.0', id: 'fixture/one', kind: 'skill', displayName: 'One', sourceRoot: 'fixture', entrypoint: 'SKILL.md',
    contentHash: 'a'.repeat(64), dependencies: [], requiredCapabilities: [], dataClasses: ['public'], effects: ['read'],
    rights: 'permitted', reviewStatus: 'approved', enablementStatus: 'enabled', runtimeValidation: 'passed'
  };
  assert.equal(resolveEntries([entry], [entry.id], new Set()).length, 1);
  assert.throws(() => resolveEntries([{ ...entry, dependencies: ['missing'] }], [entry.id], new Set()), /missing_dependency/);
  assert.throws(() => resolveEntries([{ ...entry, dependencies: [entry.id] }], [entry.id], new Set()), /dependency_cycle/);
  assert.throws(() => resolveEntries([{ ...entry, rights: 'unknown' }], [entry.id], new Set()), /rights_unknown/);
  assert.throws(() => resolveEntries([{ ...entry, effects: ['publish'] }], [entry.id], new Set()), /public_profile_denied/);
  assert.throws(() => resolveEntries([{ ...entry, requiredCapabilities: ['private.graph'] }], [entry.id], new Set()), /capability_unavailable/);
});