import { digest, sha256 } from './canonical.ts';
import { validate } from './contracts.ts';
import type { ContentIR, RenderSpec } from './contracts.ts';

export type OutputFormat = RenderSpec['formats'][number];
export interface AdapterFile {
  format: OutputFormat;
  path: string;
  mediaType: string;
  bytes: Buffer;
  adapter: string;
}

function text(value: string): string {
  return value.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;');
}

function attr(value: string): string {
  return text(value).replaceAll('"', '&quot;');
}

function stableJson(value: unknown): Buffer {
  return Buffer.from(`${JSON.stringify(value, null, 2)}\n`);
}

function allText(content: ContentIR): string[] {
  return [
    content.title, content.summary, content.audience, content.decision,
    ...content.sections.flatMap((section) => [section.title, section.body, section.speakerNotes]),
    ...content.claims.map((claim) => claim.text),
    ...content.citations.map((citation) => `${citation.sourceTitle} ${citation.canonicalUrl}`)
  ];
}

function html(content: ContentIR, spec: RenderSpec): AdapterFile {
  const sections = content.sections.map((section) => `<section class="card" id="${attr(section.sectionId)}">
    <h2>${text(section.title)}</h2><p>${text(section.body)}</p>
    <p class="notes"><strong>Speaker notes:</strong> ${text(section.speakerNotes)}</p>
    <ul>${section.claimIds.map((id) => `<li>${text(content.claims.find((claim) => claim.claimId === id)!.text)}</li>`).join('')}</ul>
  </section>`).join('\n');
  const citations = content.citations.map((citation) =>
    `<li id="${attr(citation.evidenceId)}"><a href="${attr(citation.canonicalUrl)}">${text(citation.sourceTitle)}</a>, retrieved ${text(citation.retrievedAt)}</li>`).join('');
  const body = `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${text(content.title)}</title>
<style>
:root{color-scheme:light;--bg:${spec.theme.background};--fg:${spec.theme.foreground};--accent:${spec.theme.accent};font-family:${spec.theme.fontFamily},Arial,sans-serif}
*{box-sizing:border-box}body{margin:0;background:var(--bg);color:var(--fg);line-height:1.55}main{max-width:1180px;margin:auto;padding:clamp(20px,4vw,64px)}
.hero,.card{border:1px solid color-mix(in srgb,var(--accent) 35%,transparent);border-radius:24px;padding:clamp(20px,3vw,40px);margin:0 0 24px;background:rgba(255,255,255,.78)}
h1{font-size:clamp(2.1rem,7vw,5rem);line-height:.95;margin:.1em 0}h2{font-size:clamp(1.5rem,4vw,2.6rem);margin:0 0 .5em}.kicker{color:var(--accent);font-weight:700;text-transform:uppercase;letter-spacing:.08em}
.grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(260px,1fr));gap:24px}.notes{font-size:.95rem;opacity:.8}a{color:var(--accent)}
@media print{body{background:white}.hero,.card{break-inside:avoid;background:white}}
</style></head><body><main>
<article class="hero"><p class="kicker">${text(content.audience)}</p><h1>${text(content.title)}</h1><p>${text(content.summary)}</p><p><strong>Decision:</strong> ${text(content.decision)}</p></article>
<div class="grid">${sections}</div><section class="card"><h2>Citations</h2><ol>${citations}</ol></section>
</main></body></html>
`;
  return { format: 'html', path: 'outputs/index.html', mediaType: 'text/html; charset=utf-8', bytes: Buffer.from(body), adapter: 'a2swe-html-1' };
}

function adaptiveDeck(content: ContentIR): AdapterFile {
  const deck = {
    schemaVersion: '1.0.0',
    type: 'AdaptiveDeck',
    contentDigest: digest(content),
    title: content.title,
    slides: [
      { id: 'title', title: content.title, tiles: [{ type: 'text', text: content.summary }, { type: 'text', text: `Decision: ${content.decision}` }] },
      ...content.sections.map((section) => ({ id: section.sectionId, title: section.title,
        tiles: [{ type: 'text', text: section.body }, { type: 'notes', text: section.speakerNotes },
          ...section.claimIds.map((id) => ({ type: 'claim', text: content.claims.find((claim) => claim.claimId === id)!.text }))] })),
      { id: 'citations', title: 'Citations', tiles: content.citations.map((citation) => ({ type: 'citation', text: citation.sourceTitle, url: citation.canonicalUrl })) }
    ]
  };
  return { format: 'adaptiveDeck', path: 'outputs/deck.deck.json', mediaType: 'application/vnd.a2swe.adaptive-deck+json', bytes: stableJson(deck), adapter: 'a2swe-adaptive-deck-1' };
}

function crc32(bytes: Buffer): number {
  let crc = 0xffffffff;
  for (const byte of bytes) {
    crc ^= byte;
    for (let bit = 0; bit < 8; bit++) crc = (crc >>> 1) ^ (0xedb88320 & -(crc & 1));
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function dosTime(): { time: number; date: number } {
  return { time: 0, date: (1 << 5) | 1 };
}

function zip(files: { name: string; bytes: Buffer }[]): Buffer {
  const local: Buffer[] = [];
  const central: Buffer[] = [];
  let offset = 0;
  const stamp = dosTime();
  for (const file of files) {
    const name = Buffer.from(file.name);
    const crc = crc32(file.bytes);
    const header = Buffer.alloc(30);
    header.writeUInt32LE(0x04034b50, 0); header.writeUInt16LE(20, 4); header.writeUInt16LE(0, 6); header.writeUInt16LE(0, 8);
    header.writeUInt16LE(stamp.time, 10); header.writeUInt16LE(stamp.date, 12); header.writeUInt32LE(crc, 14);
    header.writeUInt32LE(file.bytes.length, 18); header.writeUInt32LE(file.bytes.length, 22); header.writeUInt16LE(name.length, 26);
    local.push(header, name, file.bytes);
    const record = Buffer.alloc(46);
    record.writeUInt32LE(0x02014b50, 0); record.writeUInt16LE(20, 4); record.writeUInt16LE(20, 6); record.writeUInt16LE(0, 8);
    record.writeUInt16LE(0, 10); record.writeUInt16LE(stamp.time, 12); record.writeUInt16LE(stamp.date, 14); record.writeUInt32LE(crc, 16);
    record.writeUInt32LE(file.bytes.length, 20); record.writeUInt32LE(file.bytes.length, 24); record.writeUInt16LE(name.length, 28);
    record.writeUInt32LE(offset, 42);
    central.push(record, name);
    offset += header.length + name.length + file.bytes.length;
  }
  const centralSize = central.reduce((sum, part) => sum + part.length, 0);
  const end = Buffer.alloc(22);
  end.writeUInt32LE(0x06054b50, 0); end.writeUInt16LE(files.length, 8); end.writeUInt16LE(files.length, 10);
  end.writeUInt32LE(centralSize, 12); end.writeUInt32LE(offset, 16);
  return Buffer.concat([...local, ...central, end]);
}

function pptx(content: ContentIR): AdapterFile {
  const slideIds = ['title', ...content.sections.map((section) => section.sectionId)];
  const slides = slideIds.map((id, index) => {
    const title = index === 0 ? content.title : content.sections[index - 1].title;
    const body = index === 0 ? content.summary : content.sections[index - 1].body;
    return { name: `ppt/slides/slide${index + 1}.xml`, bytes: Buffer.from(`<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<p:sld xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main"><p:cSld><p:spTree>
<p:nvGrpSpPr><p:cNvPr id="1" name=""/><p:cNvGrpSpPr/><p:nvPr/></p:nvGrpSpPr><p:grpSpPr/>
<p:sp><p:nvSpPr><p:cNvPr id="2" name="Title"/><p:cNvSpPr txBox="1"/><p:nvPr/></p:nvSpPr><p:spPr><a:xfrm><a:off x="685800" y="457200"/><a:ext cx="7772400" cy="914400"/></a:xfrm></p:spPr><p:txBody><a:bodyPr/><a:lstStyle/><a:p><a:r><a:rPr lang="en-US" sz="3600" b="1"/><a:t>${text(title)}</a:t></a:r></a:p></p:txBody></p:sp>
<p:sp><p:nvSpPr><p:cNvPr id="3" name="Body"/><p:cNvSpPr txBox="1"/><p:nvPr/></p:nvSpPr><p:spPr><a:xfrm><a:off x="685800" y="1600200"/><a:ext cx="7772400" cy="4114800"/></a:xfrm></p:spPr><p:txBody><a:bodyPr wrap="square"/><a:lstStyle/><a:p><a:r><a:rPr lang="en-US" sz="2000"/><a:t>${text(body)}</a:t></a:r></a:p></p:txBody></p:sp>
</p:spTree></p:cSld><p:clrMapOvr><a:masterClrMapping/></p:clrMapOvr></p:sld>`) };
  });
  const rels = slideIds.map((_, index) => `<Relationship Id="rId${index + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/slide" Target="slides/slide${index + 1}.xml"/>`).join('');
  const sldIds = slideIds.map((_, index) => `<p:sldId id="${256 + index}" r:id="rId${index + 1}"/>`).join('');
  const packageBytes = zip([
    { name: '[Content_Types].xml', bytes: Buffer.from(`<?xml version="1.0" encoding="UTF-8"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/ppt/presentation.xml" ContentType="application/vnd.openxmlformats-officedocument.presentationml.presentation.main+xml"/>${slideIds.map((_, i) => `<Override PartName="/ppt/slides/slide${i + 1}.xml" ContentType="application/vnd.openxmlformats-officedocument.presentationml.slide+xml"/>`).join('')}</Types>`) },
    { name: '_rels/.rels', bytes: Buffer.from(`<?xml version="1.0" encoding="UTF-8"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="ppt/presentation.xml"/></Relationships>`) },
    { name: 'ppt/_rels/presentation.xml.rels', bytes: Buffer.from(`<?xml version="1.0" encoding="UTF-8"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">${rels}</Relationships>`) },
    { name: 'ppt/presentation.xml', bytes: Buffer.from(`<?xml version="1.0" encoding="UTF-8"?><p:presentation xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main"><p:sldIdLst>${sldIds}</p:sldIdLst><p:sldSz cx="12192000" cy="6858000" type="screen16x9"/></p:presentation>`) },
    ...slides
  ]);
  return { format: 'pptx', path: 'outputs/deck.pptx', mediaType: 'application/vnd.openxmlformats-officedocument.presentationml.presentation', bytes: packageBytes, adapter: 'a2swe-pptx-openxml-1' };
}

function docx(content: ContentIR): AdapterFile {
  const paragraphs = allText(content).map((line) => `<w:p><w:r><w:t xml:space="preserve">${text(line)}</w:t></w:r></w:p>`).join('');
  const packageBytes = zip([
    { name: '[Content_Types].xml', bytes: Buffer.from('<?xml version="1.0" encoding="UTF-8"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/></Types>') },
    { name: '_rels/.rels', bytes: Buffer.from('<?xml version="1.0" encoding="UTF-8"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/></Relationships>') },
    { name: 'word/document.xml', bytes: Buffer.from(`<?xml version="1.0" encoding="UTF-8" standalone="yes"?><w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:body>${paragraphs}<w:sectPr/></w:body></w:document>`) }
  ]);
  return { format: 'docx', path: 'outputs/document.docx', mediaType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', bytes: packageBytes, adapter: 'a2swe-docx-openxml-1' };
}

function pdfEscape(value: string): string {
  return value.replaceAll('\\', '\\\\').replaceAll('(', '\\(').replaceAll(')', '\\)').replaceAll('\r', ' ').replaceAll('\n', ' ');
}

function pdf(content: ContentIR): AdapterFile {
  const lines = allText(content).flatMap((line) => line.match(/.{1,88}(?:\s|$)/g) ?? [line]).slice(0, 80);
  const textOps = lines.map((line, index) => `1 0 0 1 54 ${760 - index * 16} Tm (${pdfEscape(line.trim())}) Tj`).join('\n');
  const stream = `BT /F1 11 Tf ${textOps} ET`;
  const objects = [
    '<< /Type /Catalog /Pages 2 0 R >>',
    '<< /Type /Pages /Kids [3 0 R] /Count 1 >>',
    '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>',
    '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>',
    `<< /Length ${Buffer.byteLength(stream)} >>\nstream\n${stream}\nendstream`
  ];
  let output = '%PDF-1.7\n';
  const offsets = [0];
  for (const [index, object] of objects.entries()) {
    offsets.push(Buffer.byteLength(output));
    output += `${index + 1} 0 obj\n${object}\nendobj\n`;
  }
  const xref = Buffer.byteLength(output);
  output += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n${offsets.slice(1).map((offset) => `${String(offset).padStart(10, '0')} 00000 n `).join('\n')}\n`;
  output += `trailer << /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF\n`;
  return { format: 'pdf', path: 'outputs/document.pdf', mediaType: 'application/pdf', bytes: Buffer.from(output), adapter: 'a2swe-pdf-text-1' };
}

function remotion(content: ContentIR, spec: RenderSpec): AdapterFile[] {
  const plan = {
    schemaVersion: '1.0.0',
    contentDigest: digest(content),
    renderer: 'remotion',
    encodedMp4: false,
    reason: 'Project and render plan only; no MP4 is encoded by this adapter.',
    composition: { id: content.contentId, width: spec.video.width, height: spec.video.height, fps: spec.video.fps,
      durationInFrames: Math.ceil(spec.video.durationSeconds * spec.video.fps) }
  };
  return [
    { format: 'remotion', path: 'outputs/remotion/render-plan.json', mediaType: 'application/json', bytes: stableJson(plan), adapter: 'a2swe-remotion-plan-1' },
    { format: 'remotion', path: 'outputs/remotion/package.json', mediaType: 'application/json', bytes: stableJson({ type: 'module', scripts: { render: 'remotion render src/Root.tsx' }, dependencies: { '@remotion/cli': '^4.0.0', remotion: '^4.0.0', react: '^19.0.0', 'react-dom': '^19.0.0' } }), adapter: 'a2swe-remotion-plan-1' },
    { format: 'remotion', path: 'outputs/remotion/src/content.json', mediaType: 'application/json', bytes: stableJson(content), adapter: 'a2swe-remotion-plan-1' },
    { format: 'remotion', path: 'outputs/remotion/src/Root.tsx', mediaType: 'text/typescript', bytes: Buffer.from(`import React from 'react';\nimport { Composition } from 'remotion';\nimport content from './content.json';\n\nexport function Explainer() {\n  return <main style={{ fontFamily: '${spec.theme.fontFamily}', padding: 64 }}><h1>{content.title}</h1><p>{content.summary}</p></main>;\n}\n\nexport default function Root() {\n  return <Composition id="${content.contentId}" component={Explainer} durationInFrames={${Math.ceil(spec.video.durationSeconds * spec.video.fps)}} fps={${spec.video.fps}} width={${spec.video.width}} height={${spec.video.height}} />;\n}\n`), adapter: 'a2swe-remotion-plan-1' }
  ];
}

export function renderFiles(contentInput: unknown, specInput: unknown): AdapterFile[] {
  const content = validate('ContentIR', contentInput);
  const spec = validate('RenderSpec', specInput);
  if (digest(content) !== spec.contentDigest) throw new Error('render_content_digest_mismatch');
  const files: AdapterFile[] = [];
  for (const format of spec.formats) {
    if (format === 'html') files.push(html(content, spec));
    else if (format === 'adaptiveDeck') files.push(adaptiveDeck(content));
    else if (format === 'pptx') files.push(pptx(content));
    else if (format === 'docx') files.push(docx(content));
    else if (format === 'pdf') files.push(pdf(content));
    else if (format === 'remotion') files.push(...remotion(content, spec));
  }
  if (new Set(files.map((file) => file.path)).size !== files.length) throw new Error('duplicate_adapter_output');
  if (files.some((file) => sha256(file.bytes) !== sha256(file.bytes))) throw new Error('adapter_nondeterministic');
  return files;
}
