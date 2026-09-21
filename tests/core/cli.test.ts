import assert from 'node:assert/strict';
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';

const cli = fileURLToPath(new URL('../../packages/core/src/cli.ts', import.meta.url));
const run = (args: string[]) => spawnSync(process.execPath, [cli, ...args], { encoding: 'utf8' });

test('CLI creates a truthful draft, refuses overwrite, and validates it from a fresh process', () => {
  const root = mkdtempSync(path.join(os.tmpdir(), 'a2swe-cli-'));
  try {
    const output = path.join(root, 'candidate.json');
    const args = ['domain-init', '--id', 'test', '--name', 'Synthetic fixture', '--kind', 'repository', '--as-of', '2026-09-17', '--out', output];
    const created = run(args);
    assert.equal(created.status, 0, created.stderr);
    const candidate = JSON.parse(readFileSync(output, 'utf8'));
    assert.equal(candidate.state, 'draft');
    assert.equal(candidate.windowStart, '2025-12-17');
    assert.ok(candidate.knownGaps.length > 0);
    assert.equal(run(args).status, 1);
    const verified = run(['validate', '--schema', 'DomainPack', '--file', output]);
    assert.equal(verified.status, 0, verified.stderr);
    assert.equal(JSON.parse(verified.stdout).valid, true);
    assert.equal(run(['validate', '--schema', 'Invented', '--file', output]).status, 1);
  } finally { rmSync(root, { recursive: true, force: true }); }
});

test('capabilities never advertise unfinished adapters', () => {
  const response = run(['capabilities']);
  assert.equal(response.status, 0, response.stderr);
  const capabilities = JSON.parse(response.stdout);
  assert.ok(capabilities.unavailable.includes('copilot_reasoning'));
  assert.ok(capabilities.unavailable.includes('mcp'));
  assert.ok(capabilities.unavailable.includes('domain_ready'));
});

test('asset CLI generates and verifies a real evaluation raster from fresh processes', () => {
  const root = mkdtempSync(path.join(os.tmpdir(), 'a2swe-cli-asset-'));
  try {
    const file = path.join(root, 'request.json');
    const output = path.join(root, 'bundle');
    writeFileSync(file, JSON.stringify({ schemaVersion: '1.0.0', assetId: 'fixture', domainDigest: 'a'.repeat(64), purpose: 'evaluation',
      method: 'diagram', role: 'diagram', prompt: 'Synthetic test', alt: 'Build then test', width: 1920, height: 1080, seed: 1,
      palette: ['#ffffff', '#112222', '#007766'], nodes: [{ label: 'Build', detail: 'Artifact' }, { label: 'Test', detail: 'Behavior' }] }));
    const created = run(['asset-generate', '--file', file, '--out', output]);
    assert.equal(created.status, 0, created.stderr);
    assert.equal(JSON.parse(created.stdout).review, 'pending');
    assert.equal(run(['asset-generate', '--file', file, '--out', output]).status, 1);
    const verified = run(['asset-verify', '--root', output]);
    assert.equal(verified.status, 0, verified.stderr);
    assert.equal(JSON.parse(verified.stdout).valid, true);
  } finally { rmSync(root, { recursive: true, force: true }); }
});