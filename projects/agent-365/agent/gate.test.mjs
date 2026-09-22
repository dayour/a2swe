import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {test} from 'node:test';

test('media authorization requires accepted evidence, agent, narration and voice', () => {
  const state = JSON.parse(readFileSync(new URL('./lifecycle.json', import.meta.url), 'utf8'));
  assert.equal(state.evidence.acceptedByUser, true);
  assert.equal(state.agent.acceptedByUser, true);
  assert.equal(state.media.authorized, true);
  assert.equal(state.narration.acceptedByUser, true);
  assert.equal(state.voice.acceptedByUser, true);
  assert.equal(state.release.acceptedByUser, false);
  assert.equal(state.release.domainReadyCertified, false);
});

test('adversarial suite covers required production boundaries', () => {
  const cases = JSON.parse(readFileSync(new URL('./evaluations.json', import.meta.url), 'utf8'));
  const categories = new Set(cases.map((item) => item.category));
  for (const category of ['adversarial', 'authority', 'data-handling', 'grounding', 'identity', 'over-refusal']) {
    assert.ok(categories.has(category), `missing ${category}`);
  }
  assert.ok(cases.length >= 10);
});
