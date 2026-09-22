import assert from 'node:assert/strict';
import {mkdtempSync, readFileSync, rmSync, writeFileSync} from 'node:fs';
import {spawnSync} from 'node:child_process';
import os from 'node:os';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import test from 'node:test';
import {brandInstructions, brandPlanWarnings, createBrandPlan, validateBrandPlan, validateSlideRecipe} from '../../template/scripts/brand-plan.ts';

const recipes = JSON.parse(readFileSync(new URL('../../template/brand-recipes.json', import.meta.url), 'utf8'));
const plan = () => createBrandPlan(structuredClone(recipes), ['pptx', 'video']);
const cli = fileURLToPath(new URL('../../template/scripts/check_brand_plan.ts', import.meta.url));

test('complete recipes have explicit intent, density, theme roles, and safe geometry', () => {
  validateBrandPlan(plan());
  for (const recipe of recipes) validateSlideRecipe(recipe);
  assert.deepEqual([...new Set(recipes.map((recipe) => recipe.density))].sort(), ['heavy', 'light', 'medium']);
  const catalog = JSON.parse(readFileSync(new URL('../src/data/library.json', import.meta.url), 'utf8'));
  assert.deepEqual(catalog.templates.filter((entry) => entry.recipe).map((entry) => entry.recipe.id).sort(), recipes.map((recipe) => recipe.id).sort());
});

test('negative space, decoration overlap, reserved video bands, and invalid geometry are rejected', () => {
  const cases = [
    (recipe) => { recipe.objects[1].box.y = 270; },
    (recipe) => { recipe.objects[1].type = 'decoration'; recipe.objects[1].themeRole = 'accent'; recipe.objects[1].box.y = 180; },
    (recipe) => { recipe.objects[1].box.y = 637; },
    (recipe) => { recipe.objects[1].box.width = 0; },
    (recipe) => { recipe.objects[1].box.x = NaN; },
    (recipe) => { recipe.objects[1].clearance = -1; },
    (recipe) => { recipe.objects[1].clearance = Infinity; },
    (recipe) => { recipe.objects[1].id = recipe.objects[0].id; },
    (recipe) => { recipe.objects[1].themeRole = 'heading'; },
    (recipe) => { recipe.objects[1].fontSize = 8; },
  ];
  for (const mutate of cases) {
    const recipe = structuredClone(recipes[0]);
    mutate(recipe);
    assert.throws(() => validateSlideRecipe(recipe), /Brand plan:/);
  }
});

test('arbitrary or misleading plan contracts fail explicitly', () => {
  for (const value of [null, [], {}, {...plan(), approvalState: 'approved'}, {...plan(), layouts: []},
    {...plan(), layouts: [recipes[0], recipes[0]]}, {...plan(), formats: ['pptx', 'pptx']},
    {...plan(), selectionOrder: ['slide-master', 'layouts', 'representative-sample-slides']},
    {...plan(), themeBindings: {...plan().themeBindings, body: 'Arial'}},
    {...plan(), placeholderTextIsInstruction: true}, {...plan(), overflow: 'shrink'}, {...plan(), approved: true},
    {...plan(), safeArea: {...plan().safeArea, height: 680}}]) {
    assert.throws(() => validateBrandPlan(value), /Brand plan:/);
  }
});

test('coverage is advisory, not a mandatory twelve-layout quota or brand approval', () => {
  const selected = createBrandPlan([recipes[0]], ['pptx'], 'brand.potx slides 2 and 5');
  validateBrandPlan(selected);
  const warnings = brandPlanWarnings(selected).join('\n');
  assert.match(warnings, /not been opened, hashed, or approved/);
  assert.match(warnings, /No heavy-density/);
  const instructions = brandInstructions(selected);
  for (const fragment of ['sample slides', 'SHA-256', 'never an instruction', 'do not shrink', 'C2PA', 'manual']) {
    assert.ok(instructions.includes(fragment));
  }
});

test('scaffolded CLI accepts a scenario sidecar and exits nonzero for unsafe layouts', () => {
  const directory = mkdtempSync(path.join(os.tmpdir(), 'a2swe-brand-plan-'));
  const filename = path.join(directory, 'scenario.json');
  try {
    writeFileSync(filename, JSON.stringify({brandPlan: plan()}));
    const success = spawnSync(process.execPath, [cli, filename], {encoding: 'utf8'});
    assert.equal(success.status, 0, success.stderr);
    assert.match(success.stdout, /approval remains unapproved/);
    assert.match(success.stderr, /REVIEW REQUIRED/);
    const invalid = plan();
    invalid.layouts[0].objects[1].box.y = 637;
    writeFileSync(filename, JSON.stringify({brandPlan: invalid}));
    const failed = spawnSync(process.execPath, [cli, filename], {encoding: 'utf8'});
    assert.equal(failed.status, 1);
    assert.match(failed.stderr, /safe area/);
    assert.doesNotMatch(failed.stdout, /valid/);
  } finally {
    rmSync(directory, {recursive: true});
  }
});
