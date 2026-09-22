import {spawnSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {readFileSync, writeFileSync} from 'node:fs';
import {fileURLToPath} from 'node:url';

const cases = JSON.parse(readFileSync(new URL('./evaluations.json', import.meta.url), 'utf8'));
const prompt = `Read projects/agent-365/research/sources.json, projects/agent-365/qc/source-receipts.json,
and projects/agent-365/agent/README.md.
Answer these five engineering questions. Use exactly the case IDs as level-2 Markdown headings.
Cite claim IDs with exact Microsoft source URLs and headings, include engineering rationale,
and distinguish proposals from execution. Do not modify files or use external tools.
${cases.map((item) => `${item.id}: ${item.prompt}`).join('\n')}`;
const startedAt = new Date().toISOString();
const sha256 = (value) => createHash('sha256').update(value).digest('hex');
const inputFiles = ['research/sources.json', 'qc/source-receipts.json', 'agent/README.md',
  'agent/evaluations.json', 'agent/run.mjs', 'agent/evaluate.mjs', 'agent/preflight.mjs'];
const inputHashes = Object.fromEntries(inputFiles.map((file) => [file, sha256(readFileSync(new URL(`../${file}`, import.meta.url)))]));
const profileBytes = readFileSync(new URL('../../../.github/agents/agent-365-swe.agent.md', import.meta.url));
inputHashes['.github/agents/agent-365-swe.agent.md'] = sha256(profileBytes);
const result = spawnSync(process.execPath, [fileURLToPath(new URL('./run.mjs', import.meta.url)), '--prompt', prompt], {
  encoding: 'utf8', maxBuffer: 2_000_000, windowsHide: true,
});
const response = result.stdout ?? '';
for (const file of inputFiles) {
  if (sha256(readFileSync(new URL(`../${file}`, import.meta.url))) !== inputHashes[file]) throw new Error(`Evaluation input changed during execution: ${file}`);
}
if (!profileBytes.equals(readFileSync(new URL('../../../.github/agents/agent-365-swe.agent.md', import.meta.url)))) {
  throw new Error('Agent profile changed during execution');
}
writeFileSync(new URL('../qc/native-agent-response.txt', import.meta.url), response);
const results = cases.map((item) => {
  const section = response.split(`## ${item.id}`)[1]?.split(/\n## /)[0] ?? '';
  const missing = [...item.mustInclude, ...item.claims].filter((value) => !section.toLowerCase().includes(value.toLowerCase()));
  const unexpected = item.reject.filter((value) => section.toLowerCase().includes(value.toLowerCase()));
  return {id: item.id, passed: Boolean(section) && !missing.length && !unexpected.length,
    missing, unexpected, method: 'Keyword/citation smoke assertions; independent semantic review still required'};
});
const report = {startedAt, completedAt: new Date().toISOString(), runtime: 'Existing native GitHub Copilot CLI',
  profile: '.github/agents/agent-365-swe.agent.md', exitCode: result.status, error: result.error?.message ?? null,
  inputHashes, prompt,
  evidenceSha256: sha256(readFileSync(new URL('../research/sources.json', import.meta.url))),
  profileSha256: sha256(readFileSync(new URL('../../../.github/agents/agent-365-swe.agent.md', import.meta.url))),
  responseSha256: sha256(response), results, liveTenantVerified: false, humanApproved: false,
  domainReadyCertified: false, stderr: result.stderr ?? ''};
writeFileSync(new URL('../qc/agent-evaluation.json', import.meta.url), `${JSON.stringify(report, null, 2)}\n`);
console.log(JSON.stringify({exitCode: report.exitCode, results}, null, 2));
if (result.status !== 0 || results.some((item) => !item.passed)) process.exitCode = 1;
