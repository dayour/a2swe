import { readFile, writeFile } from 'node:fs/promises';
import { compile } from 'json-schema-to-typescript';

const schemaUrl = new URL('../packages/core/schemas/contracts.schema.json', import.meta.url);
const outputUrl = new URL('../packages/core/src/contracts.generated.d.ts', import.meta.url);
const schema = JSON.parse(await readFile(schemaUrl, 'utf8'));
const output = await compile(schema, 'CoreContract', { bannerComment: '', unreachableDefinitions: true });
if (process.argv.includes('--check')) {
  if (await readFile(outputUrl, 'utf8') !== output) throw new Error('Contract types are stale; run npm run contracts:generate');
} else {
  await writeFile(outputUrl, output);
}