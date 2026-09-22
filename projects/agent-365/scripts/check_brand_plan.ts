import {readFileSync} from 'node:fs';
import {brandPlanWarnings, validateBrandPlan} from './brand-plan.ts';

try {
  const [filename, ...extra] = process.argv.slice(2);
  if (!filename || extra.length) throw new Error('Usage: node scripts/check_brand_plan.ts <brand-plan-or-scenario.json>');
  const input: unknown = JSON.parse(readFileSync(filename, 'utf8'));
  const plan = typeof input === 'object' && input !== null && 'brandPlan' in input ? input.brandPlan : input;
  validateBrandPlan(plan);
  console.log(`Brand plan geometry valid: ${plan.layouts.length} complete recipes; approval remains unapproved.`);
  for (const warning of brandPlanWarnings(plan)) console.warn(`REVIEW REQUIRED: ${warning}`);
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
}
