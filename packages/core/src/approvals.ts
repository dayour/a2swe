import { createPublicKey, verify } from 'node:crypto';
import { Ajv2020 } from 'ajv/dist/2020.js';
import { canonicalJson, digest, parseDate } from './canonical.ts';
import { validate } from './contracts.ts';
import type { DomainPack } from './contracts.ts';

export type ApprovalScope = 'domain_qa' | 'domain' | 'asset_rights' | 'asset_visual' | 'content' | 'voice' | 'style' | 'release';
export interface ApprovalStatement {
  schemaVersion: '1.0.0';
  reviewerId: string;
  scope: ApprovalScope;
  subjectDigest: string;
  evidenceDigest: string;
  decision: 'approve' | 'reject';
  issuedAt: string;
  expiresAt: string;
}
export interface SignedApproval { statement: ApprovalStatement; signature: string }
export interface ReviewerTrust { reviewerId: string; publicKey: string; scopes: ApprovalScope[] }
export interface ReviewPolicy { producerId: string; reviewers: ReviewerTrust[]; revokedSignatures: string[] }
export interface DomainReview {
  schemaVersion: '1.0.0';
  domainDigest: string;
  profileDigest: string;
  reportDigest: string;
  nativeHostExecution: 'passed';
  sourceVerification: 'passed';
  engineeringExecution: 'passed';
  questionsPassed: number;
  engineeringTasksPassed: number;
  adversarialCasesPassed: number;
  foundations: string[];
  unresolvedBlockers: string[];
}

const hashSchema = { type: 'string', pattern: '^[a-f0-9]{64}$' };
const checkApproval = new Ajv2020({ strict: true, allErrors: true }).compile({
  type: 'object', additionalProperties: false, required: ['statement', 'signature'], properties: {
    signature: { type: 'string', pattern: '^[A-Za-z0-9+/]{86}==$' },
    statement: { type: 'object', additionalProperties: false,
      required: ['schemaVersion', 'reviewerId', 'scope', 'subjectDigest', 'evidenceDigest', 'decision', 'issuedAt', 'expiresAt'],
      properties: { schemaVersion: { const: '1.0.0' }, reviewerId: { type: 'string', minLength: 1, maxLength: 200 },
        scope: { enum: ['domain_qa', 'domain', 'asset_rights', 'asset_visual', 'content', 'voice', 'style', 'release'] },
        subjectDigest: hashSchema, evidenceDigest: hashSchema, decision: { enum: ['approve', 'reject'] },
        issuedAt: { type: 'string', pattern: '^\\d{4}-\\d{2}-\\d{2}T\\d{2}:\\d{2}:\\d{2}(?:\\.\\d{3})?Z$' },
        expiresAt: { type: 'string', pattern: '^\\d{4}-\\d{2}-\\d{2}T\\d{2}:\\d{2}:\\d{2}(?:\\.\\d{3})?Z$' }
      }
    }
  }
});

export function verifyApproval(input: unknown, scope: ApprovalScope, subjectDigest: string, evidenceDigest: string,
  policy: ReviewPolicy, now = Date.now()): SignedApproval {
  if (!checkApproval(input)) throw new Error('invalid_approval_contract');
  const approval = input as SignedApproval;
  const statement = approval.statement;
  if (statement.scope !== scope || statement.subjectDigest !== subjectDigest || statement.evidenceDigest !== evidenceDigest) throw new Error('approval_scope_mismatch');
  if (statement.decision !== 'approve') throw new Error('approval_rejected');
  parseDate(statement.issuedAt.slice(0, 10));
  parseDate(statement.expiresAt.slice(0, 10));
  const issued = Date.parse(statement.issuedAt);
  const expires = Date.parse(statement.expiresAt);
  if (![issued, expires, now].every(Number.isFinite) || issued > now || expires <= now || expires <= issued) throw new Error('approval_expired_or_future');
  for (const instant of [statement.issuedAt, statement.expiresAt]) {
    const normalized = instant.includes('.') ? instant : instant.replace('Z', '.000Z');
    if (new Date(instant).toISOString() !== normalized) throw new Error('invalid_approval_time');
  }
  if (policy.revokedSignatures.includes(digest(approval))) throw new Error('approval_revoked');
  if (policy.reviewers.length !== new Set(policy.reviewers.map((reviewer) => reviewer.reviewerId)).size) throw new Error('ambiguous_reviewer_policy');
  const reviewer = policy.reviewers.find((entry) => entry.reviewerId === statement.reviewerId);
  if (!reviewer || reviewer.reviewerId === policy.producerId || !reviewer.scopes.includes(scope)) throw new Error('untrusted_reviewer');
  const key = createPublicKey(reviewer.publicKey);
  if (key.asymmetricKeyType !== 'ed25519' || !verify(null, Buffer.from(canonicalJson(statement)), key, Buffer.from(approval.signature, 'base64'))) throw new Error('invalid_approval_signature');
  return approval;
}

export function certifyDomain(input: unknown, review: DomainReview, approvals: unknown[], policy: ReviewPolicy, now = Date.now()) {
  const domain: DomainPack = validate('DomainPack', input);
  if (domain.state !== 'verifying' || !domain.claims.length || domain.claims.some((claim) => claim.disposition !== 'supported')) throw new Error('domain_not_reviewed');
  if (review.schemaVersion !== '1.0.0' || review.domainDigest !== digest(domain) || !/^[a-f0-9]{64}$/.test(review.profileDigest)
    || !/^[a-f0-9]{64}$/.test(review.reportDigest) || review.nativeHostExecution !== 'passed' || review.sourceVerification !== 'passed'
    || review.engineeringExecution !== 'passed' || review.unresolvedBlockers.length || domain.knownGaps.length
    || !Number.isInteger(review.questionsPassed) || review.questionsPassed < 20
    || !Number.isInteger(review.engineeringTasksPassed) || review.engineeringTasksPassed < 3
    || !Number.isInteger(review.adversarialCasesPassed) || review.adversarialCasesPassed < 8) throw new Error('domain_review_incomplete');
  if (new Date(now).toISOString().slice(0, 10) !== domain.asOf) throw new Error('domain_review_requires_current_date');
  if (review.foundations.length !== new Set(review.foundations).size || review.foundations.some((id) => !domain.sources.some((source) => source.sourceId === id))) throw new Error('invalid_foundation_review');
  for (const source of domain.sources) {
    const date = source.publicationDate ?? source.modifiedDate;
    if (date && date > domain.asOf) throw new Error('future_source');
    if ((!date || date < domain.windowStart) && !review.foundations.includes(source.sourceId)) throw new Error('foundation_review_required');
  }
  const subjectDigest = digest({ domainDigest: digest(domain), profileDigest: review.profileDigest });
  const evidenceDigest = digest(review);
  function decision(scope: ApprovalScope) {
    const candidates = approvals.filter((approval) => (approval as SignedApproval)?.statement?.scope === scope);
    if (candidates.length !== 1) throw new Error('unique_approval_required');
    return verifyApproval(candidates[0], scope, subjectDigest, evidenceDigest, policy, now);
  }
  const qa = decision('domain_qa');
  const human = decision('domain');
  const qaReviewer = policy.reviewers.find((entry) => entry.reviewerId === qa.statement.reviewerId)!;
  const humanReviewer = policy.reviewers.find((entry) => entry.reviewerId === human.statement.reviewerId)!;
  const qaKey = createPublicKey(qaReviewer.publicKey).export({ format: 'der', type: 'spki' });
  const humanKey = createPublicKey(humanReviewer.publicKey).export({ format: 'der', type: 'spki' });
  if (qa.statement.reviewerId === human.statement.reviewerId || qaKey.equals(humanKey)) throw new Error('independent_review_required');
  return { schemaVersion: '1.0.0', domainDigest: digest(domain), profileDigest: review.profileDigest, reviewDigest: evidenceDigest,
    approvals: [qa, human], status: 'ready' as const, evaluatedAt: new Date(now).toISOString() };
}