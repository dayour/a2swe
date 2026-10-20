'use strict';

// Persistent, per-project browser profiles for @remotion/renderer.
//
// Stock Remotion mkdtemp()s a new os.tmpdir()/puppeteer_dev_chrome_profile-* folder for every browser launch and
// deletes it on close. On Windows that delete races an asynchronous taskkill while Chrome still holds file locks, so
// the folders leak by the thousand. scripts/patch_remotion_profile.cjs installs this file into the renderer as
// dist/a2swe-profile.js and routes profile acquire / attach / release through it:
//   - REMOTION_USER_DATA_DIR (default <cwd>/.remotion/chrome-profile) is reused by every render.
//   - Concurrent renders claim sibling slots (<base>-1, <base>-2, ...) through a .a2swe-claim file per slot; the
//     headless shell writes no lockfile of its own, so the claim is the only concurrency guard.
//   - Profiles are never deleted. Only HTTP / GPU caches are trimmed when a slot is acquired.

const crypto = require('node:crypto');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const MAX_SLOTS = 64;
const CLAIM = '.a2swe-claim';
const LOCK_STALE_MS = 10000;
const LOCK_WAIT_MS = 15000;
const CORRUPT_GRACE_MS = 60000;
const DRAIN_WAIT_MS = 3000;
const POLL_MS = 100;
const TEMP_PREFIX = 'puppeteer_dev_chrome_profile-';
// Remotion serves every bundle from the same localhost port, so a reused HTTP cache could replay an older render's
// bundle, and these caches are the only parts of a profile that grow without bound.
const TRIM = [
  'DevToolsActivePort',
  ...['Cache', 'Code Cache', 'DawnCache', 'DawnGraphiteCache', 'DawnWebGPUCache', 'GPUCache'].map((name) => path.join('Default', name)),
  'GrShaderCache',
  'GraphiteDawnCache',
  'ShaderCache',
];

const held = new Map();
const pause = new Int32Array(new SharedArrayBuffer(4));
const sleep = (ms) => Atomics.wait(pause, 0, 0, ms);
const fold = (value) => (process.platform === 'win32' ? value.toLowerCase() : value);

const alive = (pid) => {
  if (!Number.isInteger(pid) || pid <= 0) return false;
  try {
    process.kill(pid, 0);
    return true;
  } catch (error) {
    return error.code === 'EPERM';
  }
};

const modified = (file) => {
  try {
    return fs.statSync(file).mtimeMs;
  } catch {
    return Date.now();
  }
};

const readClaim = (dir) => {
  const file = path.join(dir, CLAIM);
  try {
    const claim = JSON.parse(fs.readFileSync(file, 'utf8'));
    if (claim && Number.isInteger(claim.pid) && typeof claim.token === 'string') return claim;
  } catch (error) {
    if (error.code === 'ENOENT') return undefined;
  }
  return {corrupt: true, modifiedMs: modified(file)};
};

const renameWithRetry = (from, to) => {
  for (let attempt = 0; ; attempt++) {
    try {
      fs.renameSync(from, to);
      return;
    } catch (error) {
      if (attempt >= 20 || !['EPERM', 'EACCES', 'EBUSY'].includes(error.code)) throw error;
      sleep(25);
    }
  }
};

const writeClaim = (dir, claim) => {
  const temp = path.join(dir, `${CLAIM}.${process.pid}.${crypto.randomUUID()}.tmp`);
  fs.writeFileSync(temp, JSON.stringify(claim));
  try {
    renameWithRetry(temp, path.join(dir, CLAIM));
  } catch (error) {
    fs.rmSync(temp, {force: true});
    throw error;
  }
};

const state = (dir) => {
  if (held.has(dir)) return 'busy';
  const claim = readClaim(dir);
  if (!claim) return 'free';
  if (claim.corrupt) return Date.now() - claim.modifiedMs < CORRUPT_GRACE_MS ? 'busy' : 'free';
  // A claim from this pid that is no longer held was released here, or belongs to a recycled pid.
  if (!claim.releasedAt && claim.pid !== process.pid && alive(claim.pid)) return 'busy';
  // Released, but the previous browser may still be exiting (taskkill is asynchronous on Windows).
  return alive(claim.chromePid) ? 'draining' : 'free';
};

const settle = (dir) => {
  const deadline = Date.now() + DRAIN_WAIT_MS;
  for (;;) {
    const current = state(dir);
    if (current === 'free') return true;
    if (current === 'busy' || Date.now() >= deadline) return false;
    sleep(POLL_MS);
  }
};

const lock = (file) => {
  const deadline = Date.now() + LOCK_WAIT_MS;
  for (;;) {
    try {
      fs.mkdirSync(file);
      return true;
    } catch (error) {
      if (error.code !== 'EEXIST') return false;
    }
    if (Date.now() - modified(file) > LOCK_STALE_MS) {
      try {
        fs.rmdirSync(file);
        continue;
      } catch {}
    }
    if (Date.now() >= deadline) return false;
    sleep(POLL_MS);
  }
};

const claimSlot = (dir) => {
  const lockFile = path.join(dir, `${CLAIM}.lock`);
  if (!lock(lockFile)) return undefined;
  try {
    if (state(dir) !== 'free') return undefined;
    const token = crypto.randomUUID();
    writeClaim(dir, {pid: process.pid, token, startedAt: new Date().toISOString()});
    const claim = readClaim(dir);
    return claim && claim.token === token ? token : undefined;
  } finally {
    try {
      fs.rmdirSync(lockFile);
    } catch {}
  }
};

const trim = (dir) => {
  for (const entry of TRIM) {
    try {
      fs.rmSync(path.join(dir, entry), {recursive: true, force: true, maxRetries: 2, retryDelay: 100});
    } catch {}
  }
};

// Only a stock mkdtemp() profile (a renderer opened before the patch completed) is ever deleted.
const removeTemporary = (dir) => {
  if (typeof dir !== 'string' || !dir) return;
  const resolved = path.resolve(dir);
  if (fold(path.dirname(resolved)) !== fold(path.resolve(os.tmpdir()))) return;
  if (!fold(path.basename(resolved)).startsWith(fold(TEMP_PREFIX))) return;
  if (fs.existsSync(path.join(resolved, CLAIM))) return;
  fs.rmSync(resolved, {recursive: true, force: true, maxRetries: 2, retryDelay: 100});
};

const acquire = () => {
  const base = path.resolve(process.env.REMOTION_USER_DATA_DIR || path.join(process.cwd(), '.remotion', 'chrome-profile'));
  for (let slot = 0; slot < MAX_SLOTS; slot++) {
    const dir = slot === 0 ? base : `${base}-${slot}`;
    if (!settle(dir)) continue;
    fs.mkdirSync(dir, {recursive: true});
    const token = claimSlot(dir);
    if (!token) continue;
    held.set(dir, {token, chromePid: undefined});
    trim(dir);
    return dir;
  }
  throw new Error(`No free Remotion browser profile among ${MAX_SLOTS} slots of ${base}; finish other renders or point REMOTION_USER_DATA_DIR at another directory.`);
};

const release = (dir, pid) => {
  try {
    const entry = held.get(dir);
    if (!entry) {
      removeTemporary(dir);
      return;
    }
    if (entry.chromePid !== pid) return;
    held.delete(dir);
    const claim = readClaim(dir);
    if (claim && claim.token === entry.token) writeClaim(dir, {...claim, releasedAt: new Date().toISOString()});
  } catch {}
};

const attach = (dir, proc) => {
  try {
    const entry = held.get(dir);
    if (!entry) return;
    const pid = typeof proc === 'number' ? proc : proc && proc.pid;
    if (!Number.isInteger(pid) || pid <= 0) {
      release(dir);
      return;
    }
    entry.chromePid = pid;
    if (proc && typeof proc.once === 'function') proc.once('exit', () => release(dir, pid));
    const claim = readClaim(dir);
    if (claim && claim.token === entry.token) writeClaim(dir, {...claim, chromePid: pid});
  } catch {}
};

process.on('exit', () => {
  for (const [dir, entry] of [...held]) release(dir, entry.chromePid);
});

module.exports = {acquire, attach, release};
