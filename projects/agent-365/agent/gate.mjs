import {createHash} from 'node:crypto';
import {readFileSync} from 'node:fs';

const project = new URL('../', import.meta.url);
const lifecycle = JSON.parse(readFileSync(new URL('agent/lifecycle.json', project), 'utf8'));
const sha256 = (value) => createHash('sha256').update(value).digest('hex');
const blockers = [];
if (lifecycle.media.authorized !== true) blockers.push(lifecycle.media.reason || 'media authorization is absent');
if (lifecycle.evidence.acceptedByUser !== true) blockers.push('evidence snapshot is not accepted');
if (lifecycle.agent.acceptedByUser !== true) blockers.push('SWE-agent behavior/scope is not accepted');
if (lifecycle.narration.acceptedByUser !== true) blockers.push('narration is not accepted');
if (lifecycle.voice.acceptedByUser !== true) blockers.push('voice is not accepted');
if (blockers.length) {
  console.error(`MEDIA BLOCKED:\n- ${[...new Set(blockers)].join('\n- ')}`);
  process.exit(1);
}

const report = JSON.parse(readFileSync(new URL(lifecycle.agent.evaluation, project), 'utf8'));
const evidence = readFileSync(new URL(lifecycle.evidence.path, project));
if (report.exitCode !== 0 || report.results?.some((item) => !item.passed)) throw new Error('current native evaluation is not passing');
if (report.evidenceSha256 !== sha256(evidence)) throw new Error('evaluation does not bind the current evidence bytes');
if (report.humanApproved || report.domainReadyCertified || report.liveTenantVerified) {
  throw new Error('evaluation contains an invalid self-granted approval or tenant-verification state');
}
console.log('Media authorization gate passed.');
