import assert from 'node:assert/strict';
import { mkdtemp, rm } from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import test from 'node:test';
import { digest } from '../../packages/core/src/canonical.ts';
import { exportAssetJob, runAssetJob, submitAssetJob } from '../../packages/core/src/asset-jobs.ts';
import { verifyAssetBundle } from '../../packages/core/src/assets.ts';
import { Store } from '../../packages/core/src/store.ts';

const domain = { schemaVersion: '1.0.0', domainId: 'synthetic', kind: 'tool', canonicalName: 'Synthetic renderer fixture',
  asOf: '2026-09-18', windowStart: '2025-12-18', timezone: 'UTC', state: 'draft', sources: [], evidence: [], claims: [], knownGaps: ['Engineering test only'] };
const request = { schemaVersion: '1.0.0', assetId: 'fixture', domainDigest: digest(domain), purpose: 'evaluation', method: 'diagram', role: 'diagram',
  prompt: 'Synthetic workflow', alt: 'Code becomes an artifact', width: 1920, height: 1080, seed: 1,
  palette: ['#ffffff', '#182322', '#00786b'], nodes: [{ label: 'Code', detail: 'Versioned source', symbol: 'code' }, { label: 'Build', detail: 'Immutable artifact', symbol: 'artifact' }] };

test('durable asset worker reuses receipts, verifies outputs and exports from a fresh store', async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), 'a2swe-asset-job-'));
  try {
    const job = submitAssetJob(root, 'user', request, domain);
    assert.equal(submitAssetJob(root, 'user', request, domain).taskId, job.taskId);
    const result = await runAssetJob(root, 'user', job.taskId);
    assert.equal(result.state, 'succeeded');
    assert.equal(result.result?.outputs.length, 2);
    const replay = await runAssetJob(root, 'user', job.taskId);
    assert.equal(replay.revision, result.revision);
    await assert.rejects(runAssetJob(root, 'other', job.taskId), /not_found_or_denied/);
    const output = path.join(root, 'export');
    await exportAssetJob(root, 'user', job.taskId, output);
    assert.equal((await verifyAssetBundle(output)).review, 'pending');
  } finally { await rm(root, { recursive: true, force: true }); }
});

test('asset jobs deny stale domain requests and cannot run a cancelled job', async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), 'a2swe-asset-cancel-'));
  try {
    assert.throws(() => submitAssetJob(root, 'user', { ...request, domainDigest: digest('wrong') }, domain), /scope_mismatch/);
    const job = submitAssetJob(root, 'user', request, domain);
    const store = new Store(root, { principalId: 'user', role: 'coordinator', capabilities: new Set() });
    try { store.cancel(job.taskId, job.revision); } finally { store.close(); }
    await assert.rejects(runAssetJob(root, 'user', job.taskId), /not_claimable/);
  } finally { await rm(root, { recursive: true, force: true }); }
});
