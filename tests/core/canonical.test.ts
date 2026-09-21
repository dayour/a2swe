import assert from 'node:assert/strict';
import test from 'node:test';
import { canonicalJson, digest, freshness, windowStart } from '../../packages/core/src/canonical.ts';

test('canonical hashes are order independent but bind every input', () => {
  assert.equal(digest({ subject: 'Deere', policy: { version: 1 } }), digest({ policy: { version: 1 }, subject: 'Deere' }));
  assert.notEqual(digest({ approved: false }), digest({ approved: true }));
  for (const value of [undefined, NaN, Infinity, new Date(), { missing: undefined }, new Array(2)]) {
    assert.throws(() => canonicalJson(value), /invalid_json/);
  }
});

test('nine calendar months clamp month ends and include the boundary', () => {
  assert.equal(windowStart('2026-09-17'), '2025-12-17');
  assert.equal(windowStart('2024-11-30'), '2024-02-29');
  assert.equal(windowStart('2025-11-30'), '2025-02-28');
  assert.equal(freshness('2025-12-16', '2026-09-17'), 'stale');
  assert.equal(freshness('2025-12-17', '2026-09-17'), 'recent');
  assert.equal(freshness(null, '2026-09-17'), 'unverifiable');
  assert.equal(freshness('2026-09-18', '2026-09-17'), 'future');
  assert.throws(() => windowStart('2025-02-29'), /invalid_date/);
  assert.throws(() => windowStart('2026-09-17T00:00:00Z'), /invalid_date/);
});