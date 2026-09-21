import assert from 'node:assert/strict';
import { generateKeyPairSync, sign } from 'node:crypto';
import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { canonicalJson, digest, sha256 } from '../../packages/core/src/canonical.ts';
import { renderFiles } from '../../packages/core/src/adapters.ts';
import { createReleasePlan, releaseSubject, verifyReleaseCandidate, writeReleaseCandidate } from '../../packages/core/src/release.ts';
import { validate } from '../../packages/core/src/contracts.ts';
import type { ApprovalScope, ApprovalStatement, ReviewPolicy } from '../../packages/core/src/approvals.ts';

const cli = fileURLToPath(new URL('../../packages/core/src/cli.ts', import.meta.url));
const run = (args: string[]) => spawnSync(process.execPath, [cli, ...args], { encoding: 'utf8' });
const domainDigest = sha256('domain');
const assetDigest = sha256('asset');

function content() {
  return {
    schemaVersion: '1.0.0', contentId: 'release-fixture', domainDigest, title: 'Verified release fixture',
    audience: 'Engineering leaders', decision: 'Adopt the verified release candidate only after gates pass',
    language: 'en', summary: 'A deterministic ContentIR used to verify all output adapters.',
    claims: [{ claimId: 'claim-1', text: 'Every format is generated from one ContentIR digest.', evidenceIds: ['ev-1'] }],
    citations: [{ evidenceId: 'ev-1', sourceTitle: 'Fixture source', canonicalUrl: 'https://example.com/source', retrievedAt: '2026-09-18T00:00:00Z' }],
    assets: [{ assetId: 'diagram-1', digest: assetDigest, mediaType: 'image/png', alt: 'Diagram showing one verified release flow', role: 'diagram' }],
    sections: [{ sectionId: 'section-1', title: 'Shared facts', body: 'Adapters preserve the same claim, citation and note text.',
      claimIds: ['claim-1'], assetIds: ['diagram-1'], speakerNotes: 'Narrate the shared digest and cite the fixture source.' }],
    voice: { style: 'clear executive narration', narration: 'Every output is generated from the same approved ContentIR.', externalTransfer: false }
  };
}

function renderSpec(contentDigest = digest(content())) {
  return {
    schemaVersion: '1.0.0', renderId: 'render-fixture', contentDigest,
    formats: ['html', 'adaptiveDeck', 'pptx', 'docx', 'pdf', 'remotion'],
    theme: { name: 'fixture', background: '#ffffff', foreground: '#111111', accent: '#0066aa', fontFamily: 'Arial' },
    viewport: { width: 1280, height: 720 },
    video: { width: 1920, height: 1080, fps: 30, durationSeconds: 30, sampleRate: 48000 }
  };
}

function rights(contentDigest = digest(content())) {
  return {
    schemaVersion: '1.0.0', manifestId: 'rights-fixture', domainDigest, contentDigest, reviewedAt: '2026-09-18T00:00:00Z',
    selectedAssets: [{ assetId: 'diagram-1', assetDigest, grantBasis: 'Synthetic fixture owned by test author',
      useScope: 'Automated release candidate tests', redistribution: 'permitted_with_attribution', expiresAt: '2099-01-01',
      attribution: 'Synthetic a2swe fixture', reviewerId: 'rights-reviewer', evidenceDigest: sha256('rights-evidence'), status: 'approved' }]
  };
}

function policyAndApprovals(plan = createReleasePlan(content(), renderSpec(), rights())) {
  const producer = generateKeyPairSync('ed25519');
  const editor = generateKeyPairSync('ed25519');
  const qa = generateKeyPairSync('ed25519');
  const policy: ReviewPolicy = { producerId: 'producer', revokedSignatures: [], reviewers: [
    { reviewerId: 'editor', publicKey: editor.publicKey.export({ type: 'spki', format: 'pem' }).toString(), scopes: ['content', 'style', 'voice'] },
    { reviewerId: 'qa', publicKey: qa.publicKey.export({ type: 'spki', format: 'pem' }).toString(), scopes: ['release'] },
    { reviewerId: 'producer', publicKey: producer.publicKey.export({ type: 'spki', format: 'pem' }).toString(), scopes: ['content', 'style', 'voice', 'release'] }
  ] };
  const evidenceDigest = sha256('approval-evidence');
  function approval(scope: ApprovalScope, reviewerId: 'editor' | 'qa' | 'producer' = scope === 'release' ? 'qa' : 'editor') {
    const key = reviewerId === 'qa' ? qa.privateKey : reviewerId === 'producer' ? producer.privateKey : editor.privateKey;
    const statement: ApprovalStatement = { schemaVersion: '1.0.0', reviewerId, scope, subjectDigest: releaseSubject(plan), evidenceDigest,
      decision: 'approve', issuedAt: '2020-01-01T00:00:00Z', expiresAt: '2099-01-01T00:00:00Z' };
    return { statement, signature: sign(null, Buffer.from(canonicalJson(statement)), key).toString('base64') };
  }
  return { policy, bundle: { schemaVersion: '1.0.0', bundleId: 'approval-fixture', producerId: 'producer', domainDigest: plan.domainDigest,
    contentDigest: plan.contentDigest, styleDigest: plan.styleDigest, voiceDigest: plan.voiceDigest, releaseDigest: plan.releaseDigest,
    evidenceDigest, approvals: [approval('content'), approval('style'), approval('voice'), approval('release')] }, producerApproval: approval };
}

test('ContentIR and RenderSpec contracts reject dangling references and digest drift', () => {
  assert.equal(validate('ContentIR', content()).contentId, 'release-fixture');
  assert.throws(() => validate('ContentIR', { ...content(), sections: [{ ...content().sections[0], claimIds: ['missing'] }] }), /claim_reference/);
  assert.throws(() => validate('ContentIR', { ...content(), claims: [{ ...content().claims[0], evidenceIds: ['missing'] }] }), /evidence_reference/);
  assert.equal(validate('RenderSpec', renderSpec()).renderId, 'render-fixture');
  assert.throws(() => renderFiles(content(), renderSpec(sha256('changed'))), /content_digest_mismatch/);
});

test('adapters deterministically produce editable/searchable/self-contained foundations with one content digest', () => {
  const files = renderFiles(content(), renderSpec());
  assert.deepEqual(files.map((file) => file.path), ['outputs/index.html', 'outputs/deck.deck.json', 'outputs/deck.pptx',
    'outputs/document.docx', 'outputs/document.pdf', 'outputs/remotion/render-plan.json', 'outputs/remotion/package.json',
    'outputs/remotion/src/content.json', 'outputs/remotion/src/Root.tsx']);
  assert.deepEqual(files.map((file) => sha256(file.bytes)), renderFiles(content(), renderSpec()).map((file) => sha256(file.bytes)));
  assert.match(files.find((file) => file.format === 'html')!.bytes.toString('utf8'), /<meta name="viewport"/);
  assert.match(files.find((file) => file.format === 'pdf')!.bytes.toString('utf8'), /Every format is generated/);
  assert.match(files.find((file) => file.path.endsWith('render-plan.json'))!.bytes.toString('utf8'), /"encodedMp4": false/);
});

test('release candidate fails closed on rights and approvals, then verifies exact output digests', async () => {
  const plan = createReleasePlan(content(), renderSpec(), rights());
  const { policy, bundle, producerApproval } = policyAndApprovals(plan);
  const root = mkdtempSync(path.join(os.tmpdir(), 'a2swe-release-'));
  rmSync(root, { recursive: true, force: true });
  const pending = { ...rights(), selectedAssets: [{ ...rights().selectedAssets[0], status: 'pending' }] };
  await assert.rejects(() => writeReleaseCandidate(root, content(), renderSpec(), pending, bundle, policy), /rights/);
  assert.equal(existsSync(root), false);
  const selfCertified = { ...bundle, approvals: [producerApproval('content', 'producer'), producerApproval('style', 'producer'),
    producerApproval('voice', 'producer'), producerApproval('release', 'producer')] };
  await assert.rejects(() => writeReleaseCandidate(root, content(), renderSpec(), rights(), selfCertified, policy), /untrusted|independent/);
  const parity = await writeReleaseCandidate(root, content(), renderSpec(), rights(), bundle, policy);
  assert.equal(parity.releaseDigest, plan.releaseDigest);
  assert.equal((await verifyReleaseCandidate(root, policy)).outputs.length, 9);
  writeFileSync(path.join(root, 'outputs', 'index.html'), 'tampered');
  await assert.rejects(() => verifyReleaseCandidate(root, policy), /output_mismatch/);
  rmSync(root, { recursive: true, force: true });
});

test('CLI plans, produces and verifies release candidates without claiming MP4 encoding', () => {
  const root = mkdtempSync(path.join(os.tmpdir(), 'a2swe-cli-release-'));
  try {
    const contentFile = path.join(root, 'content.json');
    const renderFile = path.join(root, 'render.json');
    const rightsFile = path.join(root, 'rights.json');
    const planFile = path.join(root, 'plan.json');
    writeFileSync(contentFile, JSON.stringify(content()));
    writeFileSync(renderFile, JSON.stringify(renderSpec()));
    writeFileSync(rightsFile, JSON.stringify(rights()));
    const planned = run(['release-plan', '--content', contentFile, '--render', renderFile, '--rights', rightsFile, '--out', planFile]);
    assert.equal(planned.status, 0, planned.stderr);
    const plan = JSON.parse(readFileSync(planFile, 'utf8'));
    const { policy, bundle } = policyAndApprovals(plan);
    const approvalsFile = path.join(root, 'approvals.json');
    const trustFile = path.join(root, 'trust.json');
    const out = path.join(root, 'candidate');
    writeFileSync(approvalsFile, JSON.stringify(bundle));
    writeFileSync(trustFile, JSON.stringify(policy));
    const produced = run(['release-produce', '--content', contentFile, '--render', renderFile, '--rights', rightsFile,
      '--approvals', approvalsFile, '--trust', trustFile, '--out', out]);
    assert.equal(produced.status, 0, produced.stderr);
    assert.match(readFileSync(path.join(out, 'outputs', 'remotion', 'render-plan.json'), 'utf8'), /"encodedMp4": false/);
    const verified = run(['release-verify', '--root', out, '--trust', trustFile]);
    assert.equal(verified.status, 0, verified.stderr);
    assert.equal(JSON.parse(verified.stdout).outputs, 9);
  } finally { rmSync(root, { recursive: true, force: true }); }
});
