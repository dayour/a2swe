import assert from 'node:assert/strict';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { DatabaseSync } from 'node:sqlite';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { Store } from '../../packages/core/src/store.ts';
import type { Actor } from '../../packages/core/src/store.ts';
import type { Job } from '../../packages/core/src/store.ts';
import type { WorkItem } from '../../packages/core/src/contracts.ts';

const coordinator: Actor = { principalId: 'user', role: 'coordinator', capabilities: new Set() };
const worker: Actor = { ...coordinator, role: 'worker', workerId: 'worker-1' };
const work: WorkItem = { schemaVersion: '1.0.0', taskId: 'task-1', runId: 'run-1', domainId: 'fixture', domainDigest: 'a'.repeat(64),
  stage: 'research', objective: 'Synthetic store test, no external effects', inputs: [], dependencies: [], requiredCapabilities: [], idempotencyKey: 'request-1' };
const result = (job: Job) => ({ schemaVersion: '1.0.0', taskId: job.taskId, inputDigest: job.inputDigest, status: 'succeeded', outputs: [], checks: [{ name: 'fixture', status: 'passed' }], summary: 'Synthetic check only' });

function fixture(operation: (root: string) => void): void {
  const root = mkdtempSync(path.join(os.tmpdir(), 'a2swe-store-'));
  try { operation(root); } finally { rmSync(root, { recursive: true, force: true }); }
}

test('lost submission response replays across a genuinely fresh process', () => fixture((root) => {
  const moduleUrl = new URL('../../packages/core/src/store.ts', import.meta.url).href;
  const script = `import {Store} from ${JSON.stringify(moduleUrl)};
    const store=new Store(${JSON.stringify(root)},{principalId:'user',role:'coordinator',capabilities:new Set()});
    store.submit(${JSON.stringify(work)}); process.exit(0);`;
  const processResult = spawnSync(process.execPath, ['--input-type=module', '-e', script], { encoding: 'utf8' });
  assert.equal(processResult.status, 0, processResult.stderr);
  const store = new Store(root, coordinator);
  try {
    assert.equal(store.submit(work).revision, 0);
    assert.equal(store.events(work.taskId).length, 1);
    assert.throws(() => store.submit({ ...work, objective: 'Changed input' }), /idempotency_conflict/);
  } finally { store.close(); }
}));

test('lease fencing, revision conflicts, cancellation and production readiness fail closed', () => fixture((root) => {
  let now = 1000;
  const store = new Store(root, coordinator, () => now);
  const first = new Store(root, worker, () => now);
  const second = new Store(root, { ...worker, workerId: 'worker-2' }, () => now);
  try {
    store.submit(work);
    const lease = first.claim(work.taskId, 0, 100);
    assert.throws(() => second.claim(work.taskId, 0), /state_conflict/);
    now = 1101;
    const reassigned = second.claim(work.taskId, lease.revision);
    assert.ok(reassigned.fence > lease.fence);
    assert.throws(() => first.start(work.taskId, lease.revision, lease.fence), /stale_lease/);
    const running = second.start(work.taskId, reassigned.revision, reassigned.fence);
    assert.throws(() => second.complete(work.taskId, running.revision, running.fence, { ...result(running), checks: [] }), /checks_incomplete/);
    const cancelled = store.cancel(work.taskId, running.revision);
    assert.equal(cancelled.state, 'cancelled');
    assert.throws(() => second.complete(work.taskId, running.revision, running.fence, result(running)), /stale_lease/);
    assert.throws(() => store.submit({ ...work, taskId: 'media', idempotencyKey: 'media', stage: 'production' }), /approval_required/);
    assert.throws(() => first.submit(work), /permission_denied/);
  } finally { first.close(); second.close(); store.close(); }
}));

test('expired running work requires explicit reconciliation and verified checkpoint evidence', () => fixture((root) => {
  let now = 1000;
  const store = new Store(root, coordinator, () => now);
  const runner = new Store(root, worker, () => now);
  try {
    store.submit(work);
    const lease = runner.claim(work.taskId, 0, 100);
    const running = runner.start(work.taskId, lease.revision, lease.fence);
    now = 1200;
    assert.throws(() => runner.claim(work.taskId, running.revision), /reconciliation_required/);
    const evidence = store.putArtifact(Buffer.from('No external effect occurred in this synthetic test.'), 'text/plain');
    const reconciled = store.reconcile(work.taskId, running.revision, 'retry', evidence);
    const retry = runner.claim(work.taskId, reconciled.revision);
    const restarted = runner.start(work.taskId, retry.revision, retry.fence);
    const checked = runner.checkpoint(work.taskId, restarted.revision, restarted.fence, evidence);
    assert.equal(runner.complete(work.taskId, checked.revision, checked.fence, result(checked)).state, 'succeeded');
    assert.throws(() => store.cancel(work.taskId, runner.get(work.taskId).revision), /immutable_terminal_state/);
    assert.equal(store.events(work.taskId).length, 8);
  } finally { runner.close(); store.close(); }
}));

test('artifacts are rehashed and scoped; failed commits do not make successors runnable', () => fixture((root) => {
  const store = new Store(root, coordinator);
  const runner = new Store(root, worker);
  const other = new Store(root, { ...coordinator, principalId: 'other' });
  try {
    const artifact = store.putArtifact(Buffer.from('original'), 'text/plain');
    store.submit({ ...work, inputs: [artifact] });
    store.submit({ ...work, taskId: 'next', idempotencyKey: 'next', dependencies: [work.taskId] });
    assert.throws(() => runner.claim('next', 0), /dependencies_not_ready/);
    assert.throws(() => other.get(work.taskId), /not_found_or_denied/);
    assert.throws(() => other.readArtifact(artifact), /not_found_or_denied/);
    const lease = runner.claim(work.taskId, 0);
    const running = runner.start(work.taskId, lease.revision, lease.fence);
    writeFileSync(path.join(root, 'artifacts', artifact.digest), 'tampered');
    assert.throws(() => runner.complete(work.taskId, running.revision, running.fence, result(running)), /integrity_failure/);
    assert.throws(() => runner.complete(work.taskId, running.revision, running.fence, { ...result(running), outputs: [artifact] }), /integrity_failure/);
    assert.equal(store.get(work.taskId).state, 'running');
    assert.throws(() => runner.claim('next', 0), /dependencies_not_ready/);
  } finally { other.close(); runner.close(); store.close(); }
}));

test('database failure rolls back acceptance and allows one subsequent receipt', () => fixture((root) => {
  const store = new Store(root, coordinator);
  const database = new DatabaseSync(path.join(root, 'state.sqlite'));
  try {
    database.exec("CREATE TRIGGER injected_failure BEFORE INSERT ON events BEGIN SELECT RAISE(ABORT, 'injected_commit_failure'); END;");
    assert.throws(() => store.submit(work), /injected_commit_failure/);
    assert.throws(() => store.get(work.taskId), /not_found_or_denied/);
    database.exec('DROP TRIGGER injected_failure');
    assert.equal(store.submit(work).revision, 0);
    assert.equal(store.events(work.taskId).length, 1);
  } finally { database.close(); store.close(); }
}));

test('modified event payloads fail HMAC verification', () => fixture((root) => {
  const store = new Store(root, coordinator);
  const database = new DatabaseSync(path.join(root, 'state.sqlite'));
  try {
    store.submit(work);
    database.prepare('UPDATE events SET payload=? WHERE task_id=?').run(JSON.stringify({ taskId: work.taskId, kind: 'forged' }), work.taskId);
    assert.throws(() => store.events(work.taskId), /event_integrity_failure/);
  } finally { database.close(); store.close(); }
}));