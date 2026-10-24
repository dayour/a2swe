import assert from 'node:assert/strict';
import test from 'node:test';
import {visualCatalogFields} from './regeneration-catalog.mjs';

test('visual regeneration catalog groups the original and both designs without merging voices or revisions', () => {
  const revision = {title: 'fixture-2026-01'};
  const original = {path: 'fixture-michael.mp4'};
  const provenance = {variant: 1, sourcePath: original.path, sourceDigest: 'source', designDigest: 'editorial',
    method: 'reference-recomposition', evidencePath: 'qc/regenerations/fixture-2026-01/editorial.json'};
  const first = visualCatalogFields('fixture', revision, original);
  const editorial = visualCatalogFields('fixture', revision, {path: 'fixture-editorial.mp4', visualRegeneration: provenance});
  const studio = visualCatalogFields('fixture', revision, {path: 'fixture-studio.mp4', visualRegeneration: {...provenance, variant: 2}});
  assert.deepEqual([first.visualLabel, editorial.visualLabel, studio.visualLabel], ['Original', 'Editorial', 'Studio']);
  assert.equal(first.visualGroupId, editorial.visualGroupId);
  assert.equal(first.visualGroupId, studio.visualGroupId);
  assert.equal(editorial.originalSource, 'projects/fixture/renders/fixture-2026-01/fixture-michael.mp4');
  assert.deepEqual(editorial.visualRegeneration, provenance);
  assert.equal(first.visualRegeneration, null);
  assert.notEqual(first.visualGroupId, visualCatalogFields('fixture', revision, {path: 'fixture-heart.mp4'}).visualGroupId);
  assert.notEqual(first.visualGroupId, visualCatalogFields('fixture', {title: 'fixture-2026-02'}, original).visualGroupId);
});
