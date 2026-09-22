import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {test} from 'node:test';

test('media stays blocked until evidence and revised agent are accepted', () => {
  const state = JSON.parse(readFileSync(new URL('./lifecycle.json', import.meta.url), 'utf8'));
  assert.equal(state.evidence.acceptedByUser, false);
  assert.equal(state.agent.acceptedByUser, false);
  assert.equal(state.media.authorized, false);
  assert.equal(state.narration.acceptedByUser, true);
  assert.equal(state.voice.acceptedByUser, true);
});

test('adversarial suite covers required production boundaries', () => {
  const cases = JSON.parse(readFileSync(new URL('./evaluations.json', import.meta.url), 'utf8'));
  const categories = new Set(cases.map((item) => item.category));
  for (const category of ['adversarial', 'authority', 'data-handling', 'grounding', 'identity', 'over-refusal']) {
    assert.ok(categories.has(category), `missing ${category}`);
  }
  assert.ok(cases.length >= 10);
});
