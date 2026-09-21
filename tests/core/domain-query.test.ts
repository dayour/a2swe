import assert from 'node:assert/strict';
import test from 'node:test';
import { sha256 } from '../../packages/core/src/canonical.ts';
import { buildDomainQuery, resolveDomainAnswer } from '../../packages/core/src/domain-query.ts';

const candidate = { schemaVersion: '1.0.0', domainId: 'fixture', kind: 'tool', canonicalName: 'Synthetic query fixture',
  asOf: '2026-09-18', windowStart: '2025-12-18', timezone: 'UTC', state: 'draft', knownGaps: ['Synthetic evidence only'],
  sources: ['recent', 'old'].map((id) => ({ schemaVersion: '1.0.0', sourceId: id, domainId: 'fixture', canonicalUrl: `https://example.com/${id}`,
    publisher: 'Synthetic', title: id, publicationDate: id === 'old' ? '2025-01-01' : '2026-01-01', modifiedDate: null,
    retrievedAt: '2026-09-18T00:00:00Z', dateEvidence: 'Synthetic fixture', contentHash: sha256(id) })),
  evidence: ['recent', 'old'].map((id) => ({ evidenceId: id, sourceId: id, sourceDigest: sha256(id), locator: 'Synthetic paragraph', quote: id, quoteDigest: sha256(id) })),
  claims: [{ claimId: 'pp-c07', wording: 'Synthetic recent claim', evidenceIds: ['recent'], disposition: 'unreviewed' },
    { claimId: 'pp-c01', wording: 'Synthetic foundation claim', evidenceIds: ['old'], disposition: 'unreviewed' }] };

test('domain query keeps source wording and locators outside model control', () => {
  const query = buildDomainQuery(candidate, 'Does deployment include records?');
  const answer = resolveDomainAnswer(query.domain, JSON.stringify({ claimIds: ['pp-c07'], recommendations: ['Proposal: plan record migration separately.'], unknowns: [] }));
  assert.equal(answer.facts[0].text, candidate.claims.find((claim) => claim.claimId === 'pp-c07')!.wording);
  assert.equal(answer.facts[0].citations[0].url, 'https://example.com/recent');
  assert.ok(answer.facts[0].citations[0].locator.length);
  assert.equal(answer.checks.engineeringExecution, 'not_run');
  assert.throws(() => resolveDomainAnswer(query.domain, JSON.stringify({ claimIds: ['fabricated'], recommendations: [], unknowns: [] })), /unknown_or_disallowed_claim/);
  assert.throws(() => resolveDomainAnswer(query.domain, JSON.stringify({ claimIds: [], recommendations: [], unknowns: [], approved: true })), /invalid_domain_answer/);
});

test('domain query preserves pending foundations and refuses unbounded questions', () => {
  const query = buildDomainQuery(candidate, 'What belongs in source control?');
  const answer = resolveDomainAnswer(query.domain, JSON.stringify({ claimIds: ['pp-c01'], recommendations: [], unknowns: ['Foundation approval is pending.'] }));
  assert.equal(answer.facts[0].citations[0].foundationReview, 'pending_or_unverified');
  assert.throws(() => buildDomainQuery(candidate, 'x'.repeat(4001)), /invalid_domain_question/);
});