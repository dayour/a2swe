import { DatabaseSync } from 'node:sqlite';
import { createHmac, randomBytes, randomUUID, timingSafeEqual } from 'node:crypto';
import { existsSync, lstatSync, mkdirSync, readFileSync, renameSync, rmSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { canonicalJson, digest, sha256 } from './canonical.ts';
import { validate } from './contracts.ts';
import type { ArtifactRef, TaskResult, WorkItem } from './contracts.ts';

export interface Actor {
  principalId: string;
  role: 'coordinator' | 'worker' | 'reader';
  workerId?: string;
  capabilities: ReadonlySet<string>;
}
export interface Job {
  taskId: string;
  owner: string;
  state: 'pending' | 'ready' | 'leased' | 'running' | 'succeeded' | 'failed' | 'blocked' | 'cancelled' | 'outcome_unknown';
  revision: number;
  attempt: number;
  fence: number;
  leaseOwner: string | null;
  leaseUntil: number | null;
  inputDigest: string;
  work: WorkItem;
  result: TaskResult | null;
}
type Row = Record<string, string | number | null>;

function ownedDirectory(directory: string): void {
  mkdirSync(directory, { recursive: true, mode: 0o700 });
  if (lstatSync(directory).isSymbolicLink() || !lstatSync(directory).isDirectory()) throw new Error('unsafe_store_path');
}

export class Store {
  private database: DatabaseSync;
  private key: Buffer;
  private root: string;
  private actor: Actor;
  private now: () => number;

  constructor(root: string, actor: Actor, now: () => number = Date.now) {
    if (!actor.principalId || !['coordinator', 'worker', 'reader'].includes(actor.role)) throw new Error('invalid_actor');
    this.root = path.resolve(root);
    this.actor = { ...actor, capabilities: new Set(actor.capabilities) };
    this.now = now;
    ownedDirectory(this.root);
    ownedDirectory(path.join(this.root, 'artifacts'));
    const databasePath = path.join(this.root, 'state.sqlite');
    const keyPath = path.join(this.root, 'integrity.key');
    for (const filename of [databasePath, keyPath]) {
      if (existsSync(filename) && lstatSync(filename).isSymbolicLink()) throw new Error('unsafe_store_path');
    }
    if (!existsSync(keyPath)) {
      if (existsSync(databasePath)) throw new Error('integrity_key_missing');
      try { writeFileSync(keyPath, randomBytes(32), { flag: 'wx', mode: 0o600 }); }
      catch (error) { if ((error as NodeJS.ErrnoException).code !== 'EEXIST') throw error; }
    }
    this.key = readFileSync(keyPath);
    if (this.key.length !== 32) throw new Error('invalid_integrity_key');
    this.database = new DatabaseSync(databasePath);
    this.database.exec('PRAGMA journal_mode=WAL; PRAGMA synchronous=FULL; PRAGMA foreign_keys=ON; PRAGMA busy_timeout=5000;');
    const version = this.database.prepare('PRAGMA user_version').get() as Row;
    if (Number(version.user_version) > 1) {
      this.database.close();
      throw new Error('unsupported_store_version');
    }
    this.database.exec(`
      CREATE TABLE IF NOT EXISTS jobs (
        task_id TEXT PRIMARY KEY, owner TEXT NOT NULL, state TEXT NOT NULL, revision INTEGER NOT NULL,
        attempt INTEGER NOT NULL, fence INTEGER NOT NULL, lease_owner TEXT, lease_until INTEGER,
        input_digest TEXT NOT NULL, work_json TEXT NOT NULL, result_json TEXT,
        idempotency_key TEXT NOT NULL, UNIQUE(owner, idempotency_key)
      );
      CREATE TABLE IF NOT EXISTS events (
        sequence INTEGER PRIMARY KEY AUTOINCREMENT, task_id TEXT NOT NULL REFERENCES jobs(task_id),
        payload TEXT NOT NULL, mac TEXT NOT NULL
      );
      CREATE TABLE IF NOT EXISTS artifacts (
        owner TEXT NOT NULL, digest TEXT NOT NULL, media_type TEXT NOT NULL, byte_size INTEGER NOT NULL,
        PRIMARY KEY(owner, digest, media_type)
      );
      PRAGMA user_version=1;
    `);
  }

  close(): void { this.database.close(); }

  private requireRole(role: Actor['role']): void {
    if (this.actor.role !== role) throw new Error('permission_denied');
  }

  private transaction<Value>(operation: () => Value): Value {
    this.database.exec('BEGIN IMMEDIATE');
    try {
      const result = operation();
      this.database.exec('COMMIT');
      return result;
    } catch (error) {
      this.database.exec('ROLLBACK');
      throw error;
    }
  }

  private record(taskId: string, kind: string, detail: unknown): void {
    const previous = this.database.prepare('SELECT mac FROM events WHERE task_id=? ORDER BY sequence DESC LIMIT 1').get(taskId) as Row | undefined;
    const payload = canonicalJson({ taskId, kind, detail, at: this.now(), principal: this.actor.principalId, role: this.actor.role, previous: previous?.mac ?? null });
    const mac = createHmac('sha256', this.key).update(payload).digest('hex');
    this.database.prepare('INSERT INTO events(task_id,payload,mac) VALUES(?,?,?)').run(taskId, payload, mac);
  }

  get(taskId: string): Job {
    const row = this.database.prepare('SELECT * FROM jobs WHERE task_id=? AND owner=?').get(taskId, this.actor.principalId) as Row | undefined;
    if (!row) throw new Error('not_found_or_denied');
    return {
      taskId: String(row.task_id), owner: String(row.owner), state: row.state as Job['state'], revision: Number(row.revision),
      attempt: Number(row.attempt), fence: Number(row.fence), leaseOwner: row.lease_owner as string | null,
      leaseUntil: row.lease_until === null ? null : Number(row.lease_until), inputDigest: String(row.input_digest),
      work: JSON.parse(String(row.work_json)), result: row.result_json ? JSON.parse(String(row.result_json)) : null
    };
  }

  submit(input: unknown): Job {
    this.requireRole('coordinator');
    const work = validate('WorkItem', input);
    if (work.stage === 'production') throw new Error('approval_required: DomainReady and media gates are not implemented');
    if (work.requiredCapabilities.some((capability) => !this.actor.capabilities.has(capability))) throw new Error('capability_unavailable');
    const inputDigest = digest(work);
    return this.transaction(() => {
      const prior = this.database.prepare('SELECT task_id,input_digest FROM jobs WHERE owner=? AND idempotency_key=?')
        .get(this.actor.principalId, work.idempotencyKey) as Row | undefined;
      if (prior) {
        if (prior.input_digest !== inputDigest) throw new Error('idempotency_conflict');
        return this.get(String(prior.task_id));
      }
      if (work.dependencies.includes(work.taskId)) throw new Error('dependency_cycle');
      let ready = true;
      for (const dependencyId of work.dependencies) {
        const dependency = this.get(dependencyId);
        if (dependency.work.runId !== work.runId || dependency.work.domainId !== work.domainId || dependency.work.domainDigest !== work.domainDigest) throw new Error('dependency_scope_mismatch');
        ready = ready && dependency.state === 'succeeded';
      }
      for (const reference of work.inputs) this.readArtifact(reference);
      this.database.prepare('INSERT INTO jobs VALUES(?,?,?,?,?,?,?,?,?,?,?,?)').run(
        work.taskId, this.actor.principalId, ready ? 'ready' : 'pending', 0, 0, 0, null, null, inputDigest, canonicalJson(work), null, work.idempotencyKey
      );
      this.record(work.taskId, 'accepted', { inputDigest });
      return this.get(work.taskId);
    });
  }

  claim(taskId: string, expectedRevision: number, ttlMs = 60000): Job {
    this.requireRole('worker');
    if (!this.actor.workerId) throw new Error('worker_identity_required');
    if (!Number.isSafeInteger(ttlMs) || ttlMs < 100 || ttlMs > 300000) throw new Error('invalid_lease_ttl');
    return this.transaction(() => {
      const job = this.get(taskId);
      if (job.revision !== expectedRevision) throw new Error('state_conflict');
      if (job.state === 'running' && (job.leaseUntil ?? 0) <= this.now()) throw new Error('outcome_unknown: reconciliation_required');
      const reclaimable = job.state === 'leased' && (job.leaseUntil ?? 0) <= this.now();
      if (!['ready', 'pending'].includes(job.state) && !reclaimable) throw new Error('not_claimable');
      if (job.work.dependencies.some((dependency) => this.get(dependency).state !== 'succeeded')) throw new Error('dependencies_not_ready');
      if (job.work.requiredCapabilities.some((capability) => !this.actor.capabilities.has(capability))) throw new Error('capability_unavailable');
      for (const reference of job.work.inputs) this.readArtifact(reference);
      this.database.prepare('UPDATE jobs SET state=?,revision=revision+1,attempt=attempt+1,fence=fence+1,lease_owner=?,lease_until=? WHERE task_id=?')
        .run('leased', this.actor.workerId!, this.now() + ttlMs, taskId);
      this.record(taskId, 'leased', { workerId: this.actor.workerId, fence: job.fence + 1 });
      return this.get(taskId);
    });
  }

  private activeLease(taskId: string, revision: number, fence: number): Job {
    this.requireRole('worker');
    const job = this.get(taskId);
    if (job.revision !== revision || job.fence !== fence || job.leaseOwner !== this.actor.workerId
      || (job.leaseUntil ?? 0) <= this.now() || !['leased', 'running'].includes(job.state)) throw new Error('stale_lease');
    return job;
  }

  start(taskId: string, revision: number, fence: number): Job {
    return this.transaction(() => {
      this.activeLease(taskId, revision, fence);
      this.database.prepare('UPDATE jobs SET state=?,revision=revision+1 WHERE task_id=?').run('running', taskId);
      this.record(taskId, 'started', { fence });
      return this.get(taskId);
    });
  }

  checkpoint(taskId: string, revision: number, fence: number, artifact: ArtifactRef): Job {
    return this.transaction(() => {
      this.activeLease(taskId, revision, fence);
      this.readArtifact(artifact);
      this.database.prepare('UPDATE jobs SET revision=revision+1,lease_until=? WHERE task_id=?').run(this.now() + 60000, taskId);
      this.record(taskId, 'checkpoint', { artifact, fence });
      return this.get(taskId);
    });
  }

  complete(taskId: string, revision: number, fence: number, input: unknown): Job {
    const result = validate('TaskResult', input);
    return this.transaction(() => {
      const job = this.activeLease(taskId, revision, fence);
      if (job.state !== 'running') throw new Error('task_not_started');
      if (result.taskId !== taskId || result.inputDigest !== job.inputDigest) throw new Error('input_changed');
      if (result.status === 'succeeded' && (!result.checks.length || result.checks.some((check) => check.status !== 'passed'))) throw new Error('checks_incomplete');
      for (const reference of job.work.inputs) this.readArtifact(reference);
      for (const reference of result.outputs) this.readArtifact(reference);
      this.database.prepare('UPDATE jobs SET state=?,revision=revision+1,result_json=?,lease_owner=NULL,lease_until=NULL WHERE task_id=?')
        .run(result.status, canonicalJson(result), taskId);
      this.record(taskId, 'completed', { fence, resultDigest: digest(result) });
      return this.get(taskId);
    });
  }

  cancel(taskId: string, expectedRevision: number): Job {
    this.requireRole('coordinator');
    return this.transaction(() => {
      const job = this.get(taskId);
      if (job.state === 'cancelled') return job;
      if (job.revision !== expectedRevision) throw new Error('state_conflict');
      if (['succeeded', 'failed'].includes(job.state)) throw new Error('immutable_terminal_state');
      this.database.prepare('UPDATE jobs SET state=?,revision=revision+1,fence=fence+1,lease_owner=NULL,lease_until=NULL WHERE task_id=?').run('cancelled', taskId);
      this.record(taskId, 'cancelled', { previousState: job.state });
      return this.get(taskId);
    });
  }

  reconcile(taskId: string, expectedRevision: number, decision: 'retry' | 'fail', evidence: ArtifactRef): Job {
    this.requireRole('coordinator');
    if (!['retry', 'fail'].includes(decision)) throw new Error('invalid_reconciliation');
    return this.transaction(() => {
      const job = this.get(taskId);
      if (job.revision !== expectedRevision) throw new Error('state_conflict');
      if (job.state !== 'outcome_unknown' && !(job.state === 'running' && (job.leaseUntil ?? 0) <= this.now())) throw new Error('reconciliation_not_required');
      this.readArtifact(evidence);
      this.database.prepare('UPDATE jobs SET state=?,revision=revision+1,fence=fence+1,lease_owner=NULL,lease_until=NULL WHERE task_id=?')
        .run(decision === 'retry' ? 'ready' : 'failed', taskId);
      this.record(taskId, 'reconciled', { decision, evidence });
      return this.get(taskId);
    });
  }

  putArtifact(bytes: Uint8Array, mediaType: string): ArtifactRef {
    if (this.actor.role === 'reader') throw new Error('permission_denied');
    if (!mediaType || mediaType.length > 200 || bytes.byteLength > 64 * 1024 * 1024) throw new Error('artifact_budget_exceeded');
    const reference = { digest: sha256(bytes), byteSize: bytes.byteLength, mediaType };
    const destination = path.join(this.root, 'artifacts', reference.digest);
    if (existsSync(destination)) this.verifyFile(reference);
    else {
      const temporary = path.join(this.root, 'artifacts', `.staging-${randomUUID()}`);
      try {
        writeFileSync(temporary, bytes, { flag: 'wx', mode: 0o600, flush: true });
        renameSync(temporary, destination);
      } finally { rmSync(temporary, { force: true }); }
    }
    this.database.prepare('INSERT OR IGNORE INTO artifacts VALUES(?,?,?,?)').run(this.actor.principalId, reference.digest, mediaType, bytes.byteLength);
    return reference;
  }

  private verifyFile(reference: ArtifactRef): Buffer {
    if (!/^[a-f0-9]{64}$/.test(reference.digest)) throw new Error('invalid_artifact_digest');
    const filename = path.join(this.root, 'artifacts', reference.digest);
    const info = lstatSync(filename);
    if (info.isSymbolicLink() || !info.isFile() || info.size !== reference.byteSize || info.size > 64 * 1024 * 1024) throw new Error('artifact_integrity_failure');
    const bytes = readFileSync(filename);
    if (sha256(bytes) !== reference.digest) throw new Error('artifact_integrity_failure');
    return bytes;
  }

  readArtifact(reference: ArtifactRef): Buffer {
    const record = this.database.prepare('SELECT byte_size FROM artifacts WHERE owner=? AND digest=? AND media_type=?')
      .get(this.actor.principalId, reference.digest, reference.mediaType) as Row | undefined;
    if (!record || record.byte_size !== reference.byteSize) throw new Error('artifact_not_found_or_denied');
    return this.verifyFile(reference);
  }

  events(taskId: string, after = 0): { sequence: number; payload: unknown }[] {
    this.get(taskId);
    const rows = this.database.prepare('SELECT * FROM events WHERE task_id=? ORDER BY sequence').all(taskId) as Row[];
    let previous: string | null = null;
    const events: { sequence: number; payload: unknown }[] = [];
    for (const row of rows) {
      const payload = String(row.payload);
      const mac = createHmac('sha256', this.key).update(payload).digest();
      const stored = Buffer.from(String(row.mac), 'hex');
      const parsed = JSON.parse(payload);
      if (stored.length !== mac.length || !timingSafeEqual(mac, stored) || parsed.previous !== previous || parsed.taskId !== taskId) throw new Error('event_integrity_failure');
      previous = String(row.mac);
      if (Number(row.sequence) > after) events.push({ sequence: Number(row.sequence), payload: parsed });
    }
    return events;
  }
}