import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {readFileSync} from 'node:fs';
import test from 'node:test';
import {inspectTelemetry} from './preflight.mjs';

const valid = JSON.parse(readFileSync(new URL('./fixtures/telemetry-ready.json', import.meta.url), 'utf8'));
test('offline consistency never claims tenant verification', () => {
  assert.deepEqual(inspectTelemetry(valid), {scope: 'offline-redacted-fixture', liveIntegrationVerified: false, findings: []});
});
test('each documented telemetry prerequisite is independently diagnosed', () => {
  for (const [change, code] of [
    [{licensedUserAssigned: false}, 'LICENSE_ASSIGNMENT_MISSING'],
    [{consentGranted: false}, 'CONSENT_MISSING'],
    [{rootOperation: 'execute_tool'}, 'INVOKE_AGENT_ROOT_MISSING'],
    [{payloadAgentId: '22222222-2222-4222-8222-222222222222'}, 'APP_ID_MISMATCH'],
    [{workIqRequested: true}, 'WORK_IQ_REQUIRES_DELEGATED_PATH'],
  ]) assert.equal(inspectTelemetry({...valid, ...change}).findings[0].code, code);
});
test('invalid, unknown and secret-bearing fields fail rather than silently pass', () => {
  for (const fixture of [null, [], {}, {...valid, mode: 'ADMIN'}, {...valid, appId: 'object-id'},
    {...valid, consentGranted: 'true'}, {...valid, token: 'do-not-submit-secrets'}]) {
    assert.throws(() => inspectTelemetry(fixture), /Invalid redacted/);
  }
});
test('claim references point to current dated Microsoft evidence', () => {
  const evidence = JSON.parse(readFileSync(new URL('../research/sources.json', import.meta.url), 'utf8'));
  const sourceIds = new Set(evidence.sources.map((source) => source.id));
  assert.equal(sourceIds.size, evidence.sources.length);
  assert.equal(new Set(evidence.claims.map((claim) => claim.id)).size, evidence.claims.length);
  for (const source of evidence.sources) {
    assert.ok(source.documentDate >= evidence.windowStart && source.documentDate <= evidence.asOf);
    assert.ok(source.modifiedDate >= evidence.windowStart && source.modifiedDate <= evidence.asOf);
    assert.equal(new URL(source.url).hostname, 'learn.microsoft.com');
    assert.match(source.revision, /^[a-f0-9]{40}$/);
  }
  for (const claim of evidence.claims) assert.ok(claim.sources.length && claim.sources.every((id) => sourceIds.has(id)));
});
test('source receipts bind exact evidence bytes and headings to their actual URLs', () => {
  const bytes = readFileSync(new URL('../research/sources.json', import.meta.url));
  const evidence = JSON.parse(bytes.toString('utf8'));
  const receipts = JSON.parse(readFileSync(new URL('../qc/source-receipts.json', import.meta.url), 'utf8'));
  assert.equal(receipts.evidenceSha256, createHash('sha256').update(bytes).digest('hex'));
  for (const claim of evidence.claims) {
    if (claim.sources.length > 1) assert.deepEqual(Object.keys(claim.sourceLocators).sort(), [...claim.sources].sort());
    for (const id of claim.sources) {
      const source = evidence.sources.find((item) => item.id === id);
      const receipt = receipts.receipts.find((item) => item.sourceId === id);
      assert.equal(receipt.url, source.url);
      assert.equal(receipt.revision, source.revision);
      const titles = claim.sources.length === 1 ? claim.locator.split(' / ') : claim.sourceLocators[id];
      for (const title of titles) assert.ok(receipt.headings.some((heading) => heading.title === title), `${claim.id}: ${id}: ${title}`);
    }
  }
});
