import { readFile, writeFile, mkdir } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseDocument } from 'yaml';
import { digest, sha256, windowStart, freshness } from '../../packages/core/src/canonical.ts';
import { validate } from '../../packages/core/src/contracts.ts';

const project = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(project, '../..');
const input = JSON.parse(await readFile(path.join(project, 'research/sources.json'), 'utf8'));
const draft = JSON.parse(await readFile(path.join(project, 'domain/draft.json'), 'utf8'));
const cases = JSON.parse(await readFile(path.join(project, 'qc/evaluation-cases.json'), 'utf8'));
const profilePath = '.github/agents/power-platform-swe.agent.md';
const profileText = await readFile(path.join(root, profilePath), 'utf8');
const match = /^---\r?\n([\s\S]*?)\r?\n---/.exec(profileText);
if (!match) throw new Error('missing_agent_frontmatter');
const profile = parseDocument(match[1]);
if (profile.errors.length || profile.warnings.length) throw new Error('invalid_agent_frontmatter');
const metadata = profile.toJS();
if (JSON.stringify(metadata.tools) !== JSON.stringify(['read', 'search']) || !Array.isArray(metadata.agents) || metadata.agents.length) throw new Error('unexpected_agent_capabilities');
if (metadata['disable-model-invocation'] !== true || metadata['user-invocable'] !== true) throw new Error('unexpected_agent_invocation_policy');
if (cases.questions.length !== 20 || cases.engineeringTasks.length !== 3 || cases.adversarialCases.length !== 8) throw new Error('incomplete_case_matrix');

const sources = [];
const evidence = [];
const claims = [];
const sourceDigests = [];
for (const source of input.sources) {
  const url = new URL(source.url);
  if (url.protocol !== 'https:' || url.hostname !== 'learn.microsoft.com' || url.username || url.password) throw new Error('unexpected_source');
  const status = freshness(source.documentDate, input.asOf);
  if ((status === 'stale') !== (source.freshnessDisposition === 'foundation_exception_pending')) throw new Error('incorrect_freshness_disposition');
  if (['future', 'unverifiable'].includes(status)) throw new Error('unsupported_document_date');
  const localExcerptHash = digest(source);
  sourceDigests.push({ sourceId: source.sourceId, digest: localExcerptHash, hashScope: 'local excerpt record; not full page', publicationDate: null,
    documentationDate: source.documentDate, dateEvidence: 'Microsoft Learn ms.date metadata', substantiveUpdateVerified: false, disposition: source.freshnessDisposition });
  sources.push({ schemaVersion: '1.0.0', sourceId: source.sourceId, domainId: input.domainId, canonicalUrl: source.url,
    publisher: 'Microsoft Learn', title: source.title, publicationDate: null, modifiedDate: source.documentDate,
    retrievedAt: `${input.observedOn}T00:00:00Z`,
    dateEvidence: `ms.date=${source.documentDate}; retrievedAt is day-normalized from observedOn, not a recorded time of day; updated_at is not treated as publication. See research/sources.json.`,
    contentHash: localExcerptHash });
  const quoteWords = source.spans.reduce((count, span) => count + span.quote.trim().split(/\s+/).length, 0);
  if (quoteWords > 200) throw new Error(`excerpt_budget_exceeded: ${source.sourceId}`);
  for (const span of source.spans) {
    evidence.push({ evidenceId: span.evidenceId, sourceId: source.sourceId, sourceDigest: localExcerptHash,
      locator: span.locator, quote: span.quote, quoteDigest: sha256(span.quote) });
    claims.push({ claimId: span.claimId, wording: span.claim, evidenceIds: [span.evidenceId], disposition: 'unreviewed' });
  }
}
const candidate = validate('DomainPack', { ...draft, sources, evidence, claims,
  knownGaps: [
    'Two foundational source exceptions require user approval; recent ms.date values are documentation dates, not feature GA evidence.',
    'Excerpts were inspected using the assistant fetch tool, not a completed a2swe ingestion service; full remote snapshots and exact retrieval instants are absent.',
    'Public repository code, PCF/Power Fx and detailed API signatures remain outside this candidate pack.',
    'Official icon source/terms inspected; no asset archive extracted, sanitized or rendered; no approved brand pack.',
    'Native VS Code profile created, but host invocation and engineering execution are not proven by file validation.',
    'Instruction replay was reviewed, but native-host evaluation, user approval and all production/content/voice/style gates remain pending.',
    'Copilot SDK runner, ACP/MCP and DomainReady certification remain unimplemented.'
  ] });
if (candidate.windowStart !== windowStart(input.asOf) || candidate.state !== 'draft') throw new Error('unexpected_candidate_state');
let readyRejected = false;
try { validate('DomainPack', { ...candidate, state: 'ready' }); }
catch (error) { if (error.message.includes('approval_required')) readyRejected = true; else throw error; }
if (!readyRejected) throw new Error('readiness_guard_failed');
await writeFile(path.join(project, 'domain/candidate.json'), `${JSON.stringify(candidate, null, 2)}\n`);

const baselinePaths = [
  'template/agent/SWE_AGENT.md',
  'projects/copilot/agent/SWE_AGENT.md', 'projects/copilot/research/research.md',
  'projects/copilot/src/shots/G1/Scene.tsx', 'projects/copilot/qc/overview-v6.jpg',
  'projects/copilot/qc/media-v6.json', 'projects/copilot/renders/copilot-v6.mp4',
  'projects/microsoft/research/research.md', 'projects/microsoft/src/shots/G1/Scene.tsx',
  'projects/microsoft/qc/overview-v3.jpg', 'projects/microsoft/qc/media-v3.json', 'projects/microsoft/renders/microsoft-v3.mp4'
];
const baseline = [];
for (const relative of baselinePaths) {
  const bytes = await readFile(path.join(root, relative));
  baseline.push({ path: relative, byteSize: bytes.length, sha256: sha256(bytes) });
}
await mkdir(path.join(project, 'qc'), { recursive: true });
const baselineFile = path.join(project, 'qc/baseline.json');
try {
  const original = JSON.parse(await readFile(baselineFile, 'utf8'));
  if (digest(original.files) !== digest(baseline)) throw new Error('baseline_changed: originals were modified since first capture');
} catch (error) {
  if (error.code !== 'ENOENT') throw error;
  await writeFile(baselineFile, `${JSON.stringify({ schemaVersion: '1.0.0', capturedOn: input.observedOn, files: baseline }, null, 2)}\n`, { flag: 'wx' });
}
const brief = await readFile(path.join(project, 'brief.md'), 'utf8');
const narration = brief.split('\n').filter((line) => line.startsWith('> ')).map((line) => line.slice(2)).join(' ');
const wordCount = narration.trim().split(/\s+/).length;
const artifacts = [];
for (const relative of [profilePath, 'projects/power-platform/domain/draft.json', 'projects/power-platform/domain/candidate.json',
  'projects/power-platform/research/sources.json', 'projects/power-platform/brief.md',
  'projects/power-platform/qc/evaluation-cases.json', 'projects/power-platform/build-review.mjs',
  'projects/power-platform/delivery.md', 'projects/power-platform/qc/comparison.md',
  'projects/power-platform/qc/instruction-replay-initial.txt', 'projects/power-platform/qc/instruction-replay-refined.txt']) {
  const bytes = await readFile(path.join(root, relative));
  artifacts.push({ path: relative, sha256: sha256(bytes), byteSize: bytes.length });
}
const manifest = { schemaVersion: '1.0.0', domainDigest: digest(candidate), sources: sourceDigests, artifacts,
  checks: { contract: 'passed', sourceAndClaimReferences: 'passed', declaredAgentToolBoundary: 'passed', baselineUnchanged: 'passed',
    unauthorizedReadyTransition: 'rejected_as_expected',
    instructionReplay: { initialCases: 31, initialBlanketPassRejected: true, refinedCases: 12,
      mode: 'assisted_instruction_replay_not_native_host', adjudication: 'projects/power-platform/qc/comparison.md' },
    evaluationCaseCount: 31, liveAgentEvaluation: 'not_run', mediaRender: 'not_run', humanApproval: 'pending' },
  narration: { status: 'proposal_not_approved', wordCount, estimatedSecondsAt125To150Wpm: [wordCount / 150 * 60, wordCount / 125 * 60], actualAudioDuration: null },
  limitations: ['Structural checks are not factual certification or live agent tests.', 'No rendered Power Platform movie exists.', 'HMAC/local hashes are not human approval.'] };
await writeFile(path.join(project, 'qc/manifest.json'), `${JSON.stringify(manifest, null, 2)}\n`);
console.log(JSON.stringify({ candidateDigest: manifest.domainDigest, sources: sources.length, claims: claims.length,
  evaluationCases: 31, narrationWordCount: wordCount, baselineFiles: baseline.length, ready: false, video: 'not_rendered' }, null, 2));