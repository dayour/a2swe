import {mkdirSync, rmSync, writeFileSync} from 'node:fs';
import Module from 'node:module';
import {createRequire} from 'node:module';
import {join} from 'node:path';
import {fileURLToPath} from 'node:url';

const require = createRequire(import.meta.url);
const PptxGenJS = require('pptxgenjs');
const project = fileURLToPath(new URL('../', import.meta.url));
const work = fileURLToPath(new URL('../.pptx-work/', import.meta.url));
const output = fileURLToPath(new URL('../renders/agent-365-presentation-candidate.pptx', import.meta.url));
process.env.COPILOTBROWSER_MODULE_PATH ??= fileURLToPath(new URL('../node_modules/playwright', import.meta.url));
process.env.NODE_PATH = [fileURLToPath(new URL('../node_modules', import.meta.url)), process.env.NODE_PATH]
  .filter(Boolean).join(';');
Module._initPaths();
const converter = process.env.A2SWE_HTML2PPTX
  ?? join(process.env.USERPROFILE ?? '', '.copilot', 'skills', 'office', 'pptx', 'scripts', 'html2pptx.js');
const html2pptx = require(converter);

rmSync(work, {recursive: true, force: true});
mkdirSync(work, {recursive: true});
mkdirSync(fileURLToPath(new URL('../renders/', import.meta.url)), {recursive: true});

const slides = [
  ['One agent. Three questions.', 'Who owns it? What can it access? Can you trace its actions?', ['Engineering leaders + implementers', 'Public Microsoft evidence', 'Unofficial editorial candidate']],
  ['Agent 365 is the control plane', 'Observe, govern, and secure agents across their lifecycle.', ['Complements agent builders and runtimes', 'Does not host or execute the agent', 'Adopt only the capabilities you need']],
  ['Observe', 'Bring inventory and activity into view.', ['Trace agent invocations', 'Correlate tool and inference spans', 'Verify downstream visibility — HTTP 200 is not proof']],
  ['Govern', 'Make ownership and access explicit.', ['Blueprint and agent identity are distinct', 'Choose S2S, OBO, or Agentic-User deliberately', 'Permissions still require consent']],
  ['Secure', 'Connect identity, data protection, and threat detection.', ['Microsoft Entra', 'Microsoft Purview', 'Microsoft Defender']],
  ['Choose the smallest integration', 'Check platform support before adding code.', ['Built-in integration first', 'Registry sync only where explicitly supported', 'Agent 365 SDK for selected capabilities']],
  ['Run one accountable pilot', 'Expand only after evidence survives review.', ['Verify assigned licensing and preview boundaries', 'Test identity, consent, telemetry, and rollback', 'Keep tenant verification separate from offline checks']],
  ['Sources and qualifications', 'Candidate based on the dated public evidence pack.', ['projects/agent-365/research/sources.json', 'Evidence cutoff: 2026-09-21', 'No tenant action, Microsoft endorsement, or DomainReady certification']],
];

const html = (index, [title, lead, items]) => `<!doctype html><html><head><style>
html{background:#F7F9FC}body{width:720pt;height:405pt;margin:0;display:flex;font-family:Arial,sans-serif;color:#101828;background:#F7F9FC}
.page{margin:28pt 36pt;width:648pt;height:349pt;display:flex;flex-direction:column}
.top{display:flex;justify-content:space-between;border-bottom:1.5pt solid #CAD5E3;padding-bottom:12pt}
.brand p,.meta p{margin:0;font-size:10pt;font-weight:700}.brand p{color:#2563EB}.meta p{color:#526173}
.content{display:flex;flex:1;gap:28pt;align-items:center}.copy{width:395pt}.index{width:116pt;height:116pt;border-radius:58pt;background:#E8F0FF;display:flex;align-items:center;justify-content:center}
.index p{font-size:38pt;font-weight:800;color:#2563EB;margin:0}
h1{font-size:${index === 0 ? 38 : 31}pt;line-height:1.04;margin:0 0 17pt 0;letter-spacing:-1pt}
.lead{font-size:18pt;line-height:1.3;color:#526173;margin:0 0 17pt 0}
ul{font-size:14pt;line-height:1.35;margin:0;padding-left:18pt;color:#101828}li{margin-bottom:8pt}
.foot{border-top:1.5pt solid #CAD5E3;padding-top:9pt}.foot p{margin:0;font-size:9pt;color:#526173}
</style></head><body><div class="page"><div class="top"><div class="brand"><p>AGENT 365</p></div><div class="meta"><p>PUBLIC-EVIDENCE EXPLAINER · UNOFFICIAL</p></div></div>
<div class="content"><div class="copy"><h1>${title}</h1><p class="lead">${lead}</p><ul>${items.map((item) => `<li>${item}</li>`).join('')}</ul></div><div class="index"><p>${String(index + 1).padStart(2, '0')}</p></div></div>
<div class="foot"><p>Review candidate · Evidence, visual, rights, tenant, and release approvals remain distinct.</p></div></div></body></html>`;

const pptx = new PptxGenJS();
pptx.defineLayout({name: 'HTML_16_9', width: 10, height: 5.625});
pptx.layout = 'HTML_16_9';
pptx.author = 'a2swe';
pptx.subject = 'Microsoft Agent 365 public-evidence engineering explainer';
pptx.title = 'Agent 365: control with context';
pptx.company = 'Unofficial review candidate';
pptx.lang = 'en-US';
pptx.theme = {
  headFontFace: 'Arial',
  bodyFontFace: 'Arial',
  lang: 'en-US',
};

for (let index = 0; index < slides.length; index++) {
  const path = `${work}slide-${index + 1}.html`;
  writeFileSync(path, html(index, slides[index]), 'utf8');
  await html2pptx(path, pptx, {tmpDir: work});
}
await pptx.writeFile({fileName: output});
rmSync(work, {recursive: true, force: true});
console.log(output);
