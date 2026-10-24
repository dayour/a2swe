import assert from 'node:assert/strict';
import test from 'node:test';
import { sha256 } from '../../packages/core/src/canonical.ts';
import { validate } from '../../packages/core/src/contracts.ts';
import type { RenderRevision } from '../../packages/core/src/contracts.ts';

test('asset requests enforce evaluation scope, bounded dimensions and authentic marks', () => {
  const request = { schemaVersion: '1.0.0', assetId: 'flow', domainDigest: sha256('fixture'), purpose: 'evaluation',
    method: 'diagram', role: 'diagram', prompt: 'Synthetic flow', alt: 'Two synthetic steps', width: 1920, height: 1080,
    seed: 42, palette: ['#ffffff', '#111111', '#008877'], nodes: [{ label: 'Build', detail: 'Local artifact' }, { label: 'Test', detail: 'Review result' }] };
  assert.equal(validate('AssetRequest', request), request);
  assert.throws(() => validate('AssetRequest', { ...request, purpose: 'production' }), /invalid_contract/);
  assert.throws(() => validate('AssetRequest', { ...request, width: 100000 }), /invalid_contract/);
  assert.throws(() => validate('AssetRequest', { ...request, role: 'official_mark' }), /official_mark/);
  assert.throws(() => validate('AssetRequest', { ...request, nodes: [] }), /invalid_diagram/);
  assert.throws(() => validate('AssetRequest', { ...request, nodes: [{ label: '<script>', detail: 'x' }] }), /invalid_contract/);
  assert.throws(() => validate('AssetRequest', { ...request, alt: 'Image of two synthetic steps' }), /alt_text/);
});

function candidate() {
  return {
    schemaVersion: '1.0.0', domainId: 'fixture', kind: 'repository', canonicalName: 'Synthetic fixture',
    asOf: '2026-09-17', windowStart: '2025-12-17', timezone: 'UTC', state: 'draft',
    sources: [{ schemaVersion: '1.0.0', sourceId: 'source-1', domainId: 'fixture', canonicalUrl: 'https://example.com/docs',
      publisher: 'Fixture', title: 'Synthetic', publicationDate: '2026-01-01', modifiedDate: null,
      retrievedAt: '2026-09-17T00:00:00Z', dateEvidence: 'synthetic fixture date', contentHash: sha256('source') }],
    evidence: [{ evidenceId: 'span-1', sourceId: 'source-1', sourceDigest: sha256('source'), locator: 'line 1', quote: 'Example', quoteDigest: sha256('Example') }],
    claims: [{ claimId: 'claim-1', wording: 'Synthetic example', evidenceIds: ['span-1'], disposition: 'unreviewed' }],
    knownGaps: ['Synthetic test fixture; not live evidence']
  };
}

test('strict contracts round-trip and reject unknown majors, fields and missing digests', () => {
  const fixture = candidate();
  assert.deepEqual(validate('DomainPack', JSON.parse(JSON.stringify(fixture))), fixture);
  assert.throws(() => validate('DomainPack', { ...fixture, schemaVersion: '2.0.0' }), /invalid_contract/);
  assert.throws(() => validate('DomainPack', { ...fixture, approved: true }), /invalid_contract/);
  fixture.sources[0].contentHash = '';
  assert.throws(() => validate('DomainPack', fixture), /invalid_contract/);
});

test('domain references, date window, quote hashes and readiness fail closed', () => {
  let fixture = candidate();
  fixture.sources[0].domainId = 'other';
  assert.throws(() => validate('DomainPack', fixture), /cross_domain/);
  fixture = candidate();
  fixture.evidence[0].quote = 'Changed quote';
  assert.throws(() => validate('DomainPack', fixture), /quote_digest/);
  fixture = candidate();
  fixture.claims[0].evidenceIds = ['missing'];
  assert.throws(() => validate('DomainPack', fixture), /evidence_reference/);
  fixture = candidate();
  assert.throws(() => validate('DomainPack', { ...fixture, windowStart: '2025-12-16' }), /freshness_window/);
  assert.throws(() => validate('DomainPack', { ...fixture, state: 'ready' }), /supported_evidence/);
  fixture = candidate();
  fixture.claims[0].disposition = 'supported';
  assert.equal(validate('DomainPack', { ...fixture, state: 'ready' }).state, 'ready');
  fixture.sources[0].publicationDate = '2026-02-30';
  assert.throws(() => validate('DomainPack', fixture), /invalid_date/);
});

function visualRevision(): RenderRevision {
  const original = {path: 'fixture-original.mp4', role: 'video' as const, digest: sha256('original'), byteSize: 100, mediaType: 'video/mp4',
    package: 'release', releaseDigest: sha256('original release')};
  const regenerated = (variant: 1 | 2) => ({path: `fixture-visual-${variant}.mp4`, role: 'video' as const, digest: sha256(`video ${variant}`),
    byteSize: 120, mediaType: 'video/mp4', visualRegeneration: {variant, sourcePath: original.path, sourceDigest: original.digest,
      designDigest: sha256(`design ${variant}`), method: 'reference-recomposition' as const,
      evidencePath: `qc/regenerations/fixture-2026-01/visual-${variant}.json`}});
  return {schemaVersion: '1.0.0', projectId: 'fixture', title: 'fixture-2026-01', year: 2026, number: 1,
    createdAt: '2026-10-24T00:00:00Z', pipeline: 'core-release', status: 'superseded', source: 'release',
    outputs: [original, regenerated(1), regenerated(2)], notes: ['Synthetic visual comparison fixture']};
}

test('visual regenerations retain an original release and distinguish two source-bound designs', () => {
  const fixture = visualRevision();
  const snapshot = structuredClone(fixture);
  assert.equal(validate('RenderRevision', fixture), fixture);
  assert.deepEqual(fixture, snapshot);
  assert.equal(validate('RenderRevision', {...fixture, outputs: fixture.outputs.slice(0, 1)}).outputs.length, 1);
  assert.equal(validate('RenderRevision', {...fixture, outputs: fixture.outputs.slice(0, 2)}).outputs.length, 2);
});

test('visual regeneration provenance rejects invalid sources, duplicate designs and inherited release authority', () => {
  const rejects = (change: (revision: RenderRevision) => void, message: RegExp) => {
    const fixture = visualRevision(); change(fixture); assert.throws(() => validate('RenderRevision', fixture), message);
  };
  rejects((r) => { r.outputs[1].visualRegeneration!.sourcePath = 'missing.mp4'; }, /invalid_regeneration_source/);
  rejects((r) => { r.outputs[1].visualRegeneration!.sourceDigest = sha256('changed'); }, /invalid_regeneration_source/);
  rejects((r) => { r.outputs[2].visualRegeneration!.sourcePath = r.outputs[1].path;
    r.outputs[2].visualRegeneration!.sourceDigest = r.outputs[1].digest; }, /invalid_regeneration_source/);
  rejects((r) => { r.outputs[1].visualRegeneration!.sourcePath = r.outputs[1].path; }, /invalid_regeneration_source/);
  rejects((r) => { r.outputs[1].role = 'metadata'; }, /invalid_regeneration_source/);
  rejects((r) => { r.outputs[1].package = 'release'; }, /regeneration_is_not_release_package/);
  rejects((r) => { r.outputs[1].releaseDigest = sha256('release'); }, /regeneration_is_not_release_package/);
  rejects((r) => { r.outputs[1].visualRegeneration!.evidencePath = '../outside.json'; }, /invalid_contract/);
  rejects((r) => { r.outputs[1].visualRegeneration!.evidencePath = 'qc/con/evidence.json'; }, /unsafe_regeneration_evidence/);
  rejects((r) => { r.outputs[2].visualRegeneration!.variant = 1; }, /duplicate_regeneration_variant/);
  rejects((r) => { r.outputs[1].digest = r.outputs[0].digest; }, /regeneration_variants_not_distinct/);
  rejects((r) => { r.outputs[2].digest = r.outputs[1].digest; }, /regeneration_variants_not_distinct/);
  rejects((r) => { r.outputs[2].visualRegeneration!.designDigest = r.outputs[1].visualRegeneration!.designDigest; }, /regeneration_variants_not_distinct/);
  const fixture = visualRevision();
  assert.throws(() => validate('RenderRevision', {...fixture, outputs: [fixture.outputs[0], {...fixture.outputs[1],
    visualRegeneration: {...fixture.outputs[1].visualRegeneration, variant: 3}}]}), /invalid_contract/);
});
