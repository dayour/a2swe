import assert from 'node:assert/strict';
import { generateKeyPairSync, sign } from 'node:crypto';
import test from 'node:test';
import { canonicalJson, digest, sha256 } from '../../packages/core/src/canonical.ts';
import { certifyDomain, verifyApproval } from '../../packages/core/src/approvals.ts';
import type { ApprovalScope, ApprovalStatement, DomainReview, ReviewPolicy } from '../../packages/core/src/approvals.ts';

const now = Date.parse('2026-09-18T12:00:00Z');
const qa = generateKeyPairSync('ed25519');
const human = generateKeyPairSync('ed25519');
const policy: ReviewPolicy = { producerId: 'producer', revokedSignatures: [], reviewers: [
  { reviewerId: 'qa', publicKey: qa.publicKey.export({ type: 'spki', format: 'pem' }).toString(), scopes: ['domain_qa', 'asset_visual'] },
  { reviewerId: 'human', publicKey: human.publicKey.export({ type: 'spki', format: 'pem' }).toString(), scopes: ['domain', 'asset_rights'] }
] };
function approval(scope: ApprovalScope, subjectDigest: string, evidenceDigest: string, reviewerId = scope === 'domain_qa' ? 'qa' : 'human') {
  const statement: ApprovalStatement = { schemaVersion: '1.0.0', reviewerId, scope, subjectDigest, evidenceDigest, decision: 'approve',
    issuedAt: '2026-09-18T10:00:00Z', expiresAt: '2026-09-19T10:00:00Z' };
  return { statement, signature: sign(null, Buffer.from(canonicalJson(statement)), reviewerId === 'qa' ? qa.privateKey : human.privateKey).toString('base64') };
}

test('signed approvals bind reviewer, exact artifact, evidence, scope, expiry and revocation', () => {
  const subject = digest('subject');
  const evidence = digest('evidence');
  const signed = approval('asset_rights', subject, evidence);
  assert.equal(verifyApproval(signed, 'asset_rights', subject, evidence, policy, now), signed);
  assert.throws(() => verifyApproval(signed, 'asset_visual', subject, evidence, policy, now), /scope_mismatch/);
  assert.throws(() => verifyApproval(signed, 'asset_rights', digest('edited'), evidence, policy, now), /scope_mismatch/);
  assert.throws(() => verifyApproval(signed, 'asset_rights', subject, evidence, policy, now + 86400000), /expired/);
  assert.throws(() => verifyApproval(signed, 'asset_rights', subject, evidence, { ...policy, revokedSignatures: [digest(signed)] }, now), /revoked/);
  assert.throws(() => verifyApproval(signed, 'asset_rights', subject, evidence, { ...policy, producerId: 'human' }, now), /untrusted/);
  assert.throws(() => verifyApproval({ ...signed, statement: { ...signed.statement, issuedAt: '2026-09-18T09:00:00Z' } }, 'asset_rights', subject, evidence, policy, now), /signature/);
  assert.throws(() => verifyApproval({ ...signed, statement: { ...signed.statement, issuedAt: '2026-02-30T10:00:00Z' } }, 'asset_rights', subject, evidence, policy, now), /invalid_date/);
  assert.throws(() => verifyApproval({ ...signed, statement: { ...signed.statement, issuedAt: '2026-09-17T24:00:00Z' } }, 'asset_rights', subject, evidence, policy, now), /invalid_approval_time/);
});

test('domain certification requires independent signatures, current evidence and actual execution attestations', () => {
  const domain = { schemaVersion: '1.0.0', domainId: 'fixture', kind: 'repository', canonicalName: 'Synthetic only',
    asOf: '2026-09-18', windowStart: '2025-12-18', timezone: 'UTC', state: 'verifying', knownGaps: [],
    sources: [{ schemaVersion: '1.0.0', sourceId: 'source', domainId: 'fixture', canonicalUrl: 'https://example.com', publisher: 'Fixture', title: 'Fixture',
      publicationDate: '2025-01-01', modifiedDate: null, retrievedAt: '2026-09-18T00:00:00Z', dateEvidence: 'Synthetic', contentHash: sha256('source') }],
    evidence: [{ evidenceId: 'span', sourceId: 'source', sourceDigest: sha256('source'), locator: 'Synthetic', quote: 'Test', quoteDigest: sha256('Test') }],
    claims: [{ claimId: 'claim', wording: 'Synthetic', evidenceIds: ['span'], disposition: 'supported' }] };
  const review: DomainReview = { schemaVersion: '1.0.0', domainDigest: digest(domain), profileDigest: digest('profile'), reportDigest: digest('report'),
    nativeHostExecution: 'passed', sourceVerification: 'passed', engineeringExecution: 'passed', questionsPassed: 20,
    engineeringTasksPassed: 3, adversarialCasesPassed: 8, foundations: ['source'], unresolvedBlockers: [] };
  const subject = digest({ domainDigest: digest(domain), profileDigest: review.profileDigest });
  const approvals = [approval('domain_qa', subject, digest(review)), approval('domain', subject, digest(review))];
  assert.equal(certifyDomain(domain, review, approvals, policy, now).status, 'ready');
  assert.throws(() => certifyDomain(domain, review, [], policy, now), /approval_required/);
  assert.throws(() => certifyDomain(domain, { ...review, engineeringTasksPassed: 2 }, approvals, policy, now), /review_incomplete/);
  assert.throws(() => certifyDomain(domain, { ...review, foundations: [] }, approvals, policy, now), /foundation/);
  assert.throws(() => certifyDomain({ ...domain, knownGaps: ['unresolved'] }, review, approvals, policy, now), /review_incomplete/);
  assert.throws(() => certifyDomain(domain, { ...review, profileDigest: digest('changed') }, approvals, policy, now), /scope_mismatch/);
  assert.throws(() => certifyDomain(domain, review, approvals, policy, now + 86400000), /current_date/);
});
