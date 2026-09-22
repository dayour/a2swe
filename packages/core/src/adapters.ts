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

export interface AdapterRenderOptions {
  reviewCandidate?: boolean;
}

type ZipFile = { name: string; bytes: Buffer };

const REL_NS = 'http://schemas.openxmlformats.org/package/2006/relationships';
const OFFICE_REL = 'http://schemas.openxmlformats.org/officeDocument/2006/relationships';
const PPT_NS = 'http://schemas.openxmlformats.org/presentationml/2006/main';
const WORD_NS = 'http://schemas.openxmlformats.org/wordprocessingml/2006/main';
const DRAWING_NS = 'http://schemas.openxmlformats.org/drawingml/2006/main';

function text(value: string): string {
  return value.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;');
}

function attr(value: string): string {
  return text(value).replaceAll('"', '&quot;');
}

function stableJson(value: unknown): Buffer {
  return Buffer.from(`${JSON.stringify(value, null, 2)}\n`);
}

function words(value: string, limit: number): string {
  const normalized = value.replace(/\s+/g, ' ').trim();
  if (normalized.length <= limit) return normalized;
  return `${normalized.slice(0, Math.max(0, limit - 1)).replace(/\s+\S*$/, '')}…`;
}

function slug(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 80) || 'item';
}

function allText(content: ContentIR): string[] {
  return [
    content.title, content.summary, content.audience, content.decision,
    ...content.sections.flatMap((section) => [section.title, section.body, section.speakerNotes]),
    ...content.claims.map((claim) => claim.text),
    ...content.citations.map((citation) => `${citation.sourceTitle} ${citation.canonicalUrl}`)
  ];
}

function citationFor(content: ContentIR, evidenceId: string): ContentIR['citations'][number] {
  const citation = content.citations.find((item) => item.evidenceId === evidenceId);
  if (!citation) throw new Error('missing_citation');
  return citation;
}

function claimFor(content: ContentIR, claimId: string): ContentIR['claims'][number] {
  const claim = content.claims.find((item) => item.claimId === claimId);
  if (!claim) throw new Error('missing_claim');
  return claim;
}

function theme(deck: RenderSpec['theme']): { name: string; primaryColor: string; accentColor: string; backgroundColor: string; fontFamily: string; darkMode: boolean } {
  return {
    name: deck.name,
    primaryColor: deck.accent,
    accentColor: deck.accent,
    backgroundColor: deck.background,
    fontFamily: deck.fontFamily,
    darkMode: contrast(deck.background) < 128
  };
}

function contrast(hex: string): number {
  const rgb = hex.slice(1).match(/../g)?.map((part) => Number.parseInt(part, 16)) ?? [255, 255, 255];
  return Math.round((rgb[0] * 299 + rgb[1] * 587 + rgb[2] * 114) / 1000);
}

function html(content: ContentIR, spec: RenderSpec): AdapterFile {
  const colorScheme = contrast(spec.theme.background) < 128 ? 'dark' : 'light';
  const claims = new Map(content.claims.map((claim) => [claim.claimId, claim]));
  const citations = content.citations.map((citation, index) =>
    `<li id="${attr(citation.evidenceId)}"><a href="${attr(citation.canonicalUrl)}" rel="noreferrer">${text(citation.sourceTitle)}</a><span aria-label="retrieval date"> retrieved ${text(citation.retrievedAt)}</span></li>`).join('');
  const assets = content.assets.map((asset) =>
    `<li><span class="asset-role">${text(asset.role)}</span> <code>${text(asset.assetId)}</code>: ${text(asset.alt)} <span class="digest">${text(asset.digest.slice(0, 12))}</span></li>`).join('');
  const sections = content.sections.map((section, index) => {
    const sectionClaims = section.claimIds.map((id) => {
      const claim = claims.get(id)!;
      const refs = claim.evidenceIds.map((evidenceId) => `<a href="#${attr(evidenceId)}" aria-label="Citation ${attr(evidenceId)}">[${text(evidenceId)}]</a>`).join(' ');
      return `<li>${text(claim.text)} ${refs}</li>`;
    }).join('');
    const assetRefs = section.assetIds.length
      ? `<aside class="assets" aria-label="Assets for ${attr(section.title)}"><h3>Assets</h3><ul>${section.assetIds.map((id) => {
        const asset = content.assets.find((item) => item.assetId === id)!;
        return `<li>${text(asset.alt)} <code>${text(asset.assetId)}</code></li>`;
      }).join('')}</ul></aside>` : '';
    return `<section class="card" id="${attr(section.sectionId)}" aria-labelledby="${attr(section.sectionId)}-title">
      <p class="kicker">Section ${index + 1}</p>
      <h2 id="${attr(section.sectionId)}-title">${text(section.title)}</h2>
      <p>${text(section.body)}</p>
      <h3>Supported claims</h3><ul>${sectionClaims}</ul>
      ${assetRefs}
      <details><summary>Speaker notes</summary><p>${text(section.speakerNotes)}</p></details>
    </section>`;
  }).join('\n');
  const body = `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${text(content.title)}</title>
<style>
:root{color-scheme:${colorScheme};--bg:${spec.theme.background};--fg:${spec.theme.foreground};--accent:${spec.theme.accent};--card:color-mix(in srgb,var(--bg) 88%,var(--fg) 12%);font-family:${spec.theme.fontFamily},Arial,sans-serif}
*{box-sizing:border-box;min-width:0}html{scroll-behavior:smooth}body{margin:0;background:radial-gradient(circle at top left,color-mix(in srgb,var(--accent) 18%,transparent),transparent 34rem),var(--bg);color:var(--fg);line-height:1.6;overflow-x:hidden}
a{color:var(--accent)}a:focus-visible,button:focus-visible,summary:focus-visible{outline:3px solid var(--accent);outline-offset:3px}
.skip{position:absolute;left:-999px;top:1rem;background:var(--fg);color:var(--bg);padding:.75rem 1rem;border-radius:.5rem}.skip:focus{left:1rem;z-index:10}
main{max-width:1180px;margin:auto;padding:clamp(20px,4vw,64px)}.hero,.card,.manifest{border:1px solid color-mix(in srgb,var(--accent) 38%,transparent);border-radius:24px;padding:clamp(20px,3vw,40px);margin:0 0 24px;background:var(--card);box-shadow:0 18px 60px rgba(0,0,0,.18);max-width:100%;overflow-wrap:anywhere}
h1{font-size:clamp(2.1rem,7vw,5rem);line-height:.95;margin:.1em 0;overflow-wrap:anywhere;word-break:break-word;max-width:100%}h2{font-size:clamp(1.5rem,4vw,2.6rem);margin:0 0 .5em;overflow-wrap:anywhere;word-break:break-word;max-width:100%}h3{margin-top:1.25rem;overflow-wrap:anywhere;word-break:break-word}.kicker{color:var(--accent);font-weight:700;text-transform:uppercase;letter-spacing:.08em}
p,li,summary,a,code{overflow-wrap:anywhere;word-break:break-word}.grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(min(280px,100%),1fr));gap:24px}.asset-role,.digest{font-size:.85rem;opacity:.72}code{background:color-mix(in srgb,var(--accent) 10%,transparent);padding:.1rem .35rem;border-radius:.35rem}
@media (prefers-reduced-motion:reduce){html{scroll-behavior:auto}*{transition:none!important;animation:none!important}}
@media print{body{background:white}.hero,.card,.manifest{break-inside:avoid;background:white;box-shadow:none}}
</style></head><body><a class="skip" href="#content">Skip to content</a><main id="content">
<article class="hero" aria-labelledby="title"><p class="kicker">${text(content.audience)}</p><h1 id="title">${text(content.title)}</h1><p>${text(content.summary)}</p><p><strong>Decision:</strong> ${text(content.decision)}</p></article>
<div class="grid">${sections}</div>
<section class="manifest" aria-labelledby="asset-heading"><h2 id="asset-heading">Assets and alt text</h2><ul>${assets || '<li>No external assets selected.</li>'}</ul></section>
<section class="manifest" aria-labelledby="citation-heading"><h2 id="citation-heading">Citations</h2><ol>${citations}</ol></section>
</main></body></html>
`;
  return { format: 'html', path: 'outputs/index.html', mediaType: 'text/html; charset=utf-8', bytes: Buffer.from(body), adapter: 'a2swe-html-accessible-2' };
}

function adaptiveDeck(content: ContentIR, spec: RenderSpec, options: AdapterRenderOptions): AdapterFile {
  const deckTheme = theme(spec.theme);
  const tags = options.reviewCandidate ? ['a2swe', 'canonical', 'review-candidate'] : ['a2swe', 'canonical'];
  const deck = {
    $schema: 'https://darbotlm.github.io/adaptive-slide/schemas/deck.schema.json',
    type: 'AdaptiveDeck',
    version: '1.0',
    metadata: {
      title: content.title,
      author: 'a2swe',
      description: content.summary,
      tags,
      contentDigest: digest(content)
    },
    theme: deckTheme,
    defaults: { layout: 'stack', transition: 'fade', padding: 'large' },
    slides: [
      {
        type: 'AdaptiveSlide',
        id: 'title',
        title: content.title,
        notes: content.voice.narration,
        background: { gradient: { type: 'linear', angle: 135, colors: [spec.theme.accent, spec.theme.background] } },
        layout: { mode: 'stack', horizontalAlignment: 'center', verticalAlignment: 'center', gap: 'large' },
        body: [
          { type: 'Tile.Text', text: content.title, style: 'heading', size: 'extraLarge', weight: 'bolder', color: 'light', horizontalAlignment: 'center' },
          { type: 'Tile.Text', text: content.summary, style: 'subheading', color: 'light', horizontalAlignment: 'center' },
          { type: 'Tile.Container', style: 'accent', items: [{ type: 'Tile.Text', text: `Decision: ${content.decision}`, style: 'body', weight: 'bolder', color: 'light' }] }
        ]
      },
      ...content.sections.map((section, index) => ({
        type: 'AdaptiveSlide',
        id: section.sectionId,
        title: section.title,
        notes: section.speakerNotes,
        background: { color: spec.theme.background },
        layout: { mode: 'grid', columns: 2, gap: 'large' },
        body: [
          { type: 'Tile.Container', style: 'accent', gridPosition: { column: 1, row: 1, columnSpan: 2 }, items: [
            { type: 'Tile.Text', text: section.title, style: 'heading', color: deckTheme.darkMode ? 'light' : 'dark' },
            { type: 'Tile.Text', text: section.body, style: 'body', color: deckTheme.darkMode ? 'light' : 'dark' }
          ] },
          { type: 'Tile.Container', style: 'emphasis', gridPosition: { column: 1, row: 2 }, items: [
            { type: 'Tile.Text', text: 'Claims', style: 'subheading', weight: 'bolder', color: deckTheme.darkMode ? 'light' : 'dark' },
            ...section.claimIds.map((id) => ({ type: 'Tile.Text', text: claimFor(content, id).text, style: 'body', color: deckTheme.darkMode ? 'light' : 'dark' }))
          ] },
          { type: 'Tile.Container', style: 'emphasis', gridPosition: { column: 2, row: 2 }, items: [
            { type: 'Tile.Text', text: 'Citations and notes', style: 'subheading', weight: 'bolder', color: deckTheme.darkMode ? 'light' : 'dark' },
            ...section.claimIds.flatMap((id) => claimFor(content, id).evidenceIds).map((evidenceId) => citationFor(content, evidenceId)).map((citation) =>
              ({ type: 'Tile.Text', text: `[${citation.evidenceId}] ${citation.sourceTitle}`, style: 'caption', color: deckTheme.darkMode ? 'light' : 'dark' })),
            { type: 'Tile.Text', text: section.speakerNotes, style: 'caption', color: deckTheme.darkMode ? 'light' : 'dark' }
          ] },
          ...(section.assetIds.length ? [{ type: 'Tile.Text', text: `Assets: ${section.assetIds.join(', ')}`, style: 'caption', color: deckTheme.darkMode ? 'light' : 'dark', gridPosition: { column: 1, row: 3, columnSpan: 2 } }] : [])
        ]
      })),
      {
        type: 'AdaptiveSlide',
        id: 'citations',
        title: 'Citations',
        notes: 'Review source links and retrieval timestamps before external distribution.',
        background: { color: spec.theme.background },
        layout: { mode: 'stack', gap: 'large' },
        body: [
          { type: 'Tile.Text', text: 'Citations', style: 'heading', color: deckTheme.darkMode ? 'light' : 'dark' },
          ...content.citations.map((citation) => ({
            type: 'Tile.Text',
            text: `[${citation.evidenceId}] ${citation.sourceTitle} - ${citation.canonicalUrl} retrieved ${citation.retrievedAt}`,
            style: 'body',
            color: deckTheme.darkMode ? 'light' : 'dark'
          }))
        ]
      }
    ]
  };
  return { format: 'adaptiveDeck', path: 'outputs/deck.deck.json', mediaType: 'application/vnd.adaptive-deck+json; charset=utf-8', bytes: stableJson(deck), adapter: 'a2swe-adaptive-deck-schema-2' };
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

function zip(files: ZipFile[]): Buffer {
  const local: Buffer[] = [];
  const central: Buffer[] = [];
  let offset = 0;
  const stamp = dosTime();
  for (const file of files.sort((a, b) => a.name.localeCompare(b.name))) {
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

function rels(relationships: { id: string; type: string; target: string; targetMode?: 'External' }[]): string {
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="${REL_NS}">${relationships.map((rel) =>
    `<Relationship Id="${attr(rel.id)}" Type="${attr(rel.type)}" Target="${attr(rel.target)}"${rel.targetMode ? ` TargetMode="${rel.targetMode}"` : ''}/>`).join('')}</Relationships>`;
}

function pptRun(value: string, size = 1800, bold = false, color = '111111'): string {
  return `<a:r><a:rPr lang="en-US" sz="${size}"${bold ? ' b="1"' : ''}><a:solidFill><a:srgbClr val="${attr(color)}"/></a:solidFill></a:rPr><a:t>${text(value)}</a:t></a:r>`;
}

function pptTextbox(id: number, name: string, x: number, y: number, cx: number, cy: number, paragraphs: string[], size = 1800, boldFirst = false, color = '111111'): string {
  return `<p:sp><p:nvSpPr><p:cNvPr id="${id}" name="${attr(name)}"/><p:cNvSpPr txBox="1"/><p:nvPr/></p:nvSpPr><p:spPr><a:xfrm><a:off x="${x}" y="${y}"/><a:ext cx="${cx}" cy="${cy}"/></a:xfrm><a:prstGeom prst="rect"><a:avLst/></a:prstGeom><a:noFill/><a:ln><a:noFill/></a:ln></p:spPr><p:txBody><a:bodyPr wrap="square" anchor="t" vertOverflow="clip" horzOverflow="clip"/><a:lstStyle/>${paragraphs.map((paragraph, index) => `<a:p>${pptRun(paragraph, size, boldFirst && index === 0, color)}</a:p>`).join('')}</p:txBody></p:sp>`;
}

function pptWrap(value: string, maxChars: number, maxLines: number): string[] {
  const tokens = value.replace(/\s+/g, ' ').trim().split(' ').filter(Boolean);
  const lines: string[] = [];
  let current = '';
  let truncated = false;
  const pushCurrent = () => {
    if (current) {
      lines.push(current);
      current = '';
    }
  };
  for (const token of tokens) {
    if (lines.length >= maxLines) {
      truncated = true;
      break;
    }
    const pieces = token.length > maxChars ? token.match(new RegExp(`.{1,${Math.max(1, maxChars - 1)}}`, 'g')) ?? [token] : [token];
    for (const piece of pieces) {
      const next = current ? `${current} ${piece}` : piece;
      if (next.length <= maxChars) {
        current = next;
      } else {
        pushCurrent();
        if (lines.length >= maxLines) {
          truncated = true;
          break;
        }
        current = piece;
      }
    }
  }
  pushCurrent();
  if (lines.length > maxLines) {
    lines.length = maxLines;
    truncated = true;
  }
  if (truncated && lines.length > 0) {
    const finalLine = words(lines[lines.length - 1], Math.max(2, maxChars - 1));
    lines[lines.length - 1] = finalLine.endsWith('…') ? finalLine : `${finalLine}…`;
  }
  return lines.length ? lines : [''];
}

function pptBulletLines(values: string[], maxChars: number, maxLines: number): string[] {
  const lines: string[] = [];
  for (const value of values) {
    const wrapped = pptWrap(value, Math.max(8, maxChars - 2), Math.max(1, maxLines - lines.length));
    for (const [index, line] of wrapped.entries()) lines.push(`${index === 0 ? '• ' : '  '}${line}`);
    if (lines.length >= maxLines) break;
  }
  return lines;
}

function pptSlideXml(title: string, body: string, claims: string[], citations: string[], spec: RenderSpec, index: number): string {
  const accent = spec.theme.accent.slice(1).toUpperCase();
  const foreground = spec.theme.foreground.slice(1).toUpperCase();
  const background = spec.theme.background.slice(1).toUpperCase();
  const titleLines = pptWrap(title, 46, 2);
  const bodyLines = pptWrap(body, 82, 8);
  const claimLines = pptBulletLines(claims, 40, 7);
  const citationLines = pptBulletLines(citations, 96, 3);
  const titleSize = titleLines.length > 1 || title.length > 70 ? 2400 : 3600;
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<p:sld xmlns:a="${DRAWING_NS}" xmlns:r="${OFFICE_REL}" xmlns:p="${PPT_NS}"><p:cSld><p:bg><p:bgPr><a:solidFill><a:srgbClr val="${background}"/></a:solidFill><a:effectLst/></p:bgPr></p:bg><p:spTree>
<p:nvGrpSpPr><p:cNvPr id="1" name=""/><p:cNvGrpSpPr/><p:nvPr/></p:nvGrpSpPr><p:grpSpPr/>
<p:sp><p:nvSpPr><p:cNvPr id="2" name="Accent band"/><p:cNvSpPr/><p:nvPr/></p:nvSpPr><p:spPr><a:xfrm><a:off x="0" y="0"/><a:ext cx="12192000" cy="365760"/></a:xfrm><a:prstGeom prst="rect"><a:avLst/></a:prstGeom><a:solidFill><a:srgbClr val="${accent}"/></a:solidFill><a:ln><a:noFill/></a:ln></p:spPr></p:sp>
${pptTextbox(3, 'Title', 685800, 571500, 10668000, 960000, titleLines, titleSize, true, foreground)}
${pptTextbox(4, 'Body', 685800, 1660000, 7315200, 2580000, bodyLines, 1650, false, foreground)}
${pptTextbox(5, 'Claims', 8382000, 1660000, 3048000, 2580000, ['Claims', ...claimLines], 1320, true, foreground)}
${pptTextbox(6, 'Citations', 685800, 4800600, 10668000, 914400, ['Citations', ...citationLines], 1120, true, foreground)}
${pptTextbox(7, 'Footer', 685800, 6248400, 10668000, 342900, [`${spec.renderId} · slide ${index}`], 1000, false, foreground)}
</p:spTree></p:cSld><p:clrMapOvr><a:masterClrMapping/></p:clrMapOvr></p:sld>`;
}

function notesXml(title: string, body: string, notes: string, citations: string[]): string {
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><p:notes xmlns:a="${DRAWING_NS}" xmlns:r="${OFFICE_REL}" xmlns:p="${PPT_NS}"><p:cSld><p:spTree><p:nvGrpSpPr><p:cNvPr id="1" name=""/><p:cNvGrpSpPr/><p:nvPr/></p:nvGrpSpPr><p:grpSpPr/>${pptTextbox(2, 'Notes', 685800, 685800, 7772400, 4572000, [title, body, notes, 'Citations', ...citations], 1400, true, '111111')}</p:spTree></p:cSld><p:clrMapOvr><a:masterClrMapping/></p:clrMapOvr></p:notes>`;
}

function pptTextStyleXml(): string {
  return '<a:lvl1pPr algn="l" defTabSz="914400" marL="0" indent="0"><a:defRPr sz="1800" kern="1200"><a:solidFill><a:schemeClr val="tx1"/></a:solidFill><a:latin typeface="+mn-lt"/><a:ea typeface="+mn-ea"/><a:cs typeface="+mn-cs"/></a:defRPr></a:lvl1pPr>';
}

function pptThemeXml(spec: RenderSpec): string {
  const name = attr(spec.theme.name);
  const accent = spec.theme.accent.slice(1).toUpperCase();
  const background = spec.theme.background.slice(1).toUpperCase();
  const foreground = spec.theme.foreground.slice(1).toUpperCase();
  const font = attr(spec.theme.fontFamily);
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><a:theme xmlns:a="${DRAWING_NS}" name="${name}"><a:themeElements><a:clrScheme name="${name}"><a:dk1><a:srgbClr val="${foreground}"/></a:dk1><a:lt1><a:srgbClr val="${background}"/></a:lt1><a:dk2><a:srgbClr val="1F1F1F"/></a:dk2><a:lt2><a:srgbClr val="F8F8F8"/></a:lt2><a:accent1><a:srgbClr val="${accent}"/></a:accent1><a:accent2><a:srgbClr val="5B9BD5"/></a:accent2><a:accent3><a:srgbClr val="70AD47"/></a:accent3><a:accent4><a:srgbClr val="FFC000"/></a:accent4><a:accent5><a:srgbClr val="C00000"/></a:accent5><a:accent6><a:srgbClr val="7030A0"/></a:accent6><a:hlink><a:srgbClr val="${accent}"/></a:hlink><a:folHlink><a:srgbClr val="7F7F7F"/></a:folHlink></a:clrScheme><a:fontScheme name="${name}"><a:majorFont><a:latin typeface="${font}"/><a:ea typeface=""/><a:cs typeface=""/></a:majorFont><a:minorFont><a:latin typeface="${font}"/><a:ea typeface=""/><a:cs typeface=""/></a:minorFont></a:fontScheme><a:fmtScheme name="${name}"><a:fillStyleLst><a:solidFill><a:schemeClr val="phClr"/></a:solidFill><a:gradFill rotWithShape="1"><a:gsLst><a:gs pos="0"><a:schemeClr val="phClr"><a:tint val="50000"/><a:satMod val="300000"/></a:schemeClr></a:gs><a:gs pos="100000"><a:schemeClr val="phClr"><a:tint val="37000"/><a:satMod val="300000"/></a:schemeClr></a:gs></a:gsLst><a:lin ang="16200000" scaled="1"/></a:gradFill><a:gradFill rotWithShape="1"><a:gsLst><a:gs pos="0"><a:schemeClr val="phClr"><a:shade val="51000"/><a:satMod val="130000"/></a:schemeClr></a:gs><a:gs pos="100000"><a:schemeClr val="phClr"><a:shade val="93000"/><a:satMod val="130000"/></a:schemeClr></a:gs></a:gsLst><a:lin ang="16200000" scaled="0"/></a:gradFill></a:fillStyleLst><a:lnStyleLst><a:ln w="6350" cap="flat" cmpd="sng" algn="ctr"><a:solidFill><a:schemeClr val="phClr"/></a:solidFill><a:prstDash val="solid"/><a:miter lim="800000"/></a:ln><a:ln w="12700" cap="flat" cmpd="sng" algn="ctr"><a:solidFill><a:schemeClr val="phClr"/></a:solidFill><a:prstDash val="solid"/><a:miter lim="800000"/></a:ln><a:ln w="19050" cap="flat" cmpd="sng" algn="ctr"><a:solidFill><a:schemeClr val="phClr"/></a:solidFill><a:prstDash val="solid"/><a:miter lim="800000"/></a:ln></a:lnStyleLst><a:effectStyleLst><a:effectStyle><a:effectLst/></a:effectStyle><a:effectStyle><a:effectLst/></a:effectStyle><a:effectStyle><a:effectLst><a:outerShdw blurRad="57150" dist="19050" dir="5400000" algn="ctr" rotWithShape="0"><a:srgbClr val="000000"><a:alpha val="63000"/></a:srgbClr></a:outerShdw></a:effectLst></a:effectStyle></a:effectStyleLst><a:bgFillStyleLst><a:solidFill><a:schemeClr val="phClr"/></a:solidFill><a:solidFill><a:schemeClr val="phClr"><a:tint val="95000"/><a:satMod val="170000"/></a:schemeClr></a:solidFill><a:gradFill rotWithShape="1"><a:gsLst><a:gs pos="0"><a:schemeClr val="phClr"><a:tint val="93000"/><a:satMod val="150000"/><a:shade val="98000"/></a:schemeClr></a:gs><a:gs pos="100000"><a:schemeClr val="phClr"><a:shade val="63000"/><a:satMod val="120000"/></a:schemeClr></a:gs></a:gsLst><a:lin ang="5400000" scaled="0"/></a:gradFill></a:bgFillStyleLst></a:fmtScheme></a:themeElements><a:objectDefaults/><a:extraClrSchemeLst/></a:theme>`;
}

function pptx(content: ContentIR, spec: RenderSpec): AdapterFile {
  const slideModels = [
    { id: 'title', title: content.title, body: `${content.summary}\nDecision: ${content.decision}`, claims: content.claims.map((claim) => claim.text), notes: content.voice.narration },
    ...content.sections.map((section) => ({ id: section.sectionId, title: section.title, body: section.body,
      claims: section.claimIds.map((id) => claimFor(content, id).text), notes: section.speakerNotes })),
    { id: 'citations', title: 'Citations', body: 'Source links and retrieval timestamps for all claims.', claims: content.citations.map((citation) => citation.sourceTitle), notes: 'Citations slide for release review.' }
  ];
  const slideRelIds = slideModels.map((_, i) => `rId${i + 2}`);
  const themeRelId = `rId${slideModels.length + 2}`;
  const presPropsRelId = `rId${slideModels.length + 3}`;
  const viewPropsRelId = `rId${slideModels.length + 4}`;
  const tableStylesRelId = `rId${slideModels.length + 5}`;
  const files: ZipFile[] = [
    { name: '[Content_Types].xml', bytes: Buffer.from(`<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/docProps/app.xml" ContentType="application/vnd.openxmlformats-officedocument.extended-properties+xml"/><Override PartName="/docProps/core.xml" ContentType="application/vnd.openxmlformats-package.core-properties+xml"/><Override PartName="/ppt/presentation.xml" ContentType="application/vnd.openxmlformats-officedocument.presentationml.presentation.main+xml"/><Override PartName="/ppt/theme/theme1.xml" ContentType="application/vnd.openxmlformats-officedocument.theme+xml"/><Override PartName="/ppt/presProps.xml" ContentType="application/vnd.openxmlformats-officedocument.presentationml.presProps+xml"/><Override PartName="/ppt/viewProps.xml" ContentType="application/vnd.openxmlformats-officedocument.presentationml.viewProps+xml"/><Override PartName="/ppt/tableStyles.xml" ContentType="application/vnd.openxmlformats-officedocument.presentationml.tableStyles+xml"/><Override PartName="/ppt/slideMasters/slideMaster1.xml" ContentType="application/vnd.openxmlformats-officedocument.presentationml.slideMaster+xml"/><Override PartName="/ppt/slideLayouts/slideLayout1.xml" ContentType="application/vnd.openxmlformats-officedocument.presentationml.slideLayout+xml"/>${slideModels.map((_, i) => `<Override PartName="/ppt/slides/slide${i + 1}.xml" ContentType="application/vnd.openxmlformats-officedocument.presentationml.slide+xml"/><Override PartName="/ppt/notesSlides/notesSlide${i + 1}.xml" ContentType="application/vnd.openxmlformats-officedocument.presentationml.notesSlide+xml"/>`).join('')}</Types>`) },
    { name: '_rels/.rels', bytes: Buffer.from(rels([{ id: 'rId1', type: `${OFFICE_REL}/officeDocument`, target: 'ppt/presentation.xml' }, { id: 'rId2', type: 'http://schemas.openxmlformats.org/package/2006/relationships/metadata/core-properties', target: 'docProps/core.xml' }, { id: 'rId3', type: `${OFFICE_REL}/extended-properties`, target: 'docProps/app.xml' }])) },
    { name: 'docProps/core.xml', bytes: Buffer.from(`<?xml version="1.0" encoding="UTF-8" standalone="yes"?><cp:coreProperties xmlns:cp="http://schemas.openxmlformats.org/package/2006/metadata/core-properties" xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:dcterms="http://purl.org/dc/terms/" xmlns:dcmitype="http://purl.org/dc/dcmitype/" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"><dc:title>${text(content.title)}</dc:title><dc:creator>a2swe</dc:creator><cp:lastModifiedBy>a2swe</cp:lastModifiedBy><dcterms:created xsi:type="dcterms:W3CDTF">2020-01-01T00:00:00Z</dcterms:created><dcterms:modified xsi:type="dcterms:W3CDTF">2020-01-01T00:00:00Z</dcterms:modified></cp:coreProperties>`) },
    { name: 'docProps/app.xml', bytes: Buffer.from(`<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Properties xmlns="http://schemas.openxmlformats.org/officeDocument/2006/extended-properties" xmlns:vt="http://schemas.openxmlformats.org/officeDocument/2006/docPropsVTypes"><Application>a2swe</Application><Slides>${slideModels.length}</Slides><Notes>${slideModels.length}</Notes></Properties>`) },
    { name: 'ppt/theme/theme1.xml', bytes: Buffer.from(pptThemeXml(spec)) },
    { name: 'ppt/presProps.xml', bytes: Buffer.from(`<?xml version="1.0" encoding="UTF-8" standalone="yes"?><p:presentationPr xmlns:p="${PPT_NS}"><p:showPr><p:present/></p:showPr></p:presentationPr>`) },
    { name: 'ppt/viewProps.xml', bytes: Buffer.from(`<?xml version="1.0" encoding="UTF-8" standalone="yes"?><p:viewPr xmlns:a="${DRAWING_NS}" xmlns:p="${PPT_NS}"><p:normalViewPr><p:restoredLeft sz="15620"/><p:restoredTop sz="94660"/></p:normalViewPr><p:slideViewPr><p:cSldViewPr><p:cViewPr varScale="1"><p:scale><a:sx n="100" d="100"/><a:sy n="100" d="100"/></p:scale><p:origin x="0" y="0"/></p:cViewPr><p:guideLst/></p:cSldViewPr></p:slideViewPr><p:notesTextViewPr><p:cViewPr><p:scale><a:sx n="100" d="100"/><a:sy n="100" d="100"/></p:scale><p:origin x="0" y="0"/></p:cViewPr></p:notesTextViewPr><p:gridSpacing cx="78028800" cy="78028800"/></p:viewPr>`) },
    { name: 'ppt/tableStyles.xml', bytes: Buffer.from(`<?xml version="1.0" encoding="UTF-8" standalone="yes"?><a:tblStyleLst xmlns:a="${DRAWING_NS}" def="{5C22544A-7EE6-4342-B048-85BDC9FD1C3A}"/>`) },
    { name: 'ppt/slideLayouts/slideLayout1.xml', bytes: Buffer.from(`<?xml version="1.0" encoding="UTF-8" standalone="yes"?><p:sldLayout xmlns:a="${DRAWING_NS}" xmlns:r="${OFFICE_REL}" xmlns:p="${PPT_NS}" type="blank" preserve="1"><p:cSld name="Blank"><p:spTree><p:nvGrpSpPr><p:cNvPr id="1" name=""/><p:cNvGrpSpPr/><p:nvPr/></p:nvGrpSpPr><p:grpSpPr/></p:spTree></p:cSld><p:clrMapOvr><a:masterClrMapping/></p:clrMapOvr></p:sldLayout>`) },
    { name: 'ppt/slideLayouts/_rels/slideLayout1.xml.rels', bytes: Buffer.from(rels([{ id: 'rId1', type: `${OFFICE_REL}/slideMaster`, target: '../slideMasters/slideMaster1.xml' }])) },
    { name: 'ppt/slideMasters/slideMaster1.xml', bytes: Buffer.from(`<?xml version="1.0" encoding="UTF-8" standalone="yes"?><p:sldMaster xmlns:a="${DRAWING_NS}" xmlns:r="${OFFICE_REL}" xmlns:p="${PPT_NS}"><p:cSld><p:bg><p:bgRef idx="1001"><a:schemeClr val="bg1"/></p:bgRef></p:bg><p:spTree><p:nvGrpSpPr><p:cNvPr id="1" name=""/><p:cNvGrpSpPr/><p:nvPr/></p:nvGrpSpPr><p:grpSpPr/></p:spTree></p:cSld><p:clrMap bg1="lt1" tx1="dk1" bg2="lt2" tx2="dk2" accent1="accent1" accent2="accent2" accent3="accent3" accent4="accent4" accent5="accent5" accent6="accent6" hlink="hlink" folHlink="folHlink"/><p:sldLayoutIdLst><p:sldLayoutId id="2147483649" r:id="rId1"/></p:sldLayoutIdLst><p:txStyles><p:titleStyle>${pptTextStyleXml()}</p:titleStyle><p:bodyStyle>${pptTextStyleXml()}</p:bodyStyle><p:otherStyle>${pptTextStyleXml()}</p:otherStyle></p:txStyles></p:sldMaster>`) },
    { name: 'ppt/slideMasters/_rels/slideMaster1.xml.rels', bytes: Buffer.from(rels([{ id: 'rId1', type: `${OFFICE_REL}/slideLayout`, target: '../slideLayouts/slideLayout1.xml' }, { id: 'rId2', type: `${OFFICE_REL}/theme`, target: '../theme/theme1.xml' }])) }
  ];
  files.push({ name: 'ppt/_rels/presentation.xml.rels', bytes: Buffer.from(rels([
    { id: 'rId1', type: `${OFFICE_REL}/slideMaster`, target: 'slideMasters/slideMaster1.xml' },
    ...slideModels.map((_, i) => ({ id: slideRelIds[i], type: `${OFFICE_REL}/slide`, target: `slides/slide${i + 1}.xml` })),
    { id: themeRelId, type: `${OFFICE_REL}/theme`, target: 'theme/theme1.xml' },
    { id: presPropsRelId, type: `${OFFICE_REL}/presProps`, target: 'presProps.xml' },
    { id: viewPropsRelId, type: `${OFFICE_REL}/viewProps`, target: 'viewProps.xml' },
    { id: tableStylesRelId, type: `${OFFICE_REL}/tableStyles`, target: 'tableStyles.xml' }
  ])) });
  files.push({ name: 'ppt/presentation.xml', bytes: Buffer.from(`<?xml version="1.0" encoding="UTF-8" standalone="yes"?><p:presentation xmlns:a="${DRAWING_NS}" xmlns:r="${OFFICE_REL}" xmlns:p="${PPT_NS}" saveSubsetFonts="1"><p:sldMasterIdLst><p:sldMasterId id="2147483648" r:id="rId1"/></p:sldMasterIdLst><p:sldIdLst>${slideModels.map((_, i) => `<p:sldId id="${256 + i}" r:id="${slideRelIds[i]}"/>`).join('')}</p:sldIdLst><p:sldSz cx="12192000" cy="6858000" type="screen16x9"/><p:notesSz cx="6858000" cy="9144000"/><p:defaultTextStyle><a:defPPr><a:defRPr lang="en-US"/></a:defPPr></p:defaultTextStyle></p:presentation>`) });
  slideModels.forEach((slide, index) => {
    const citations = index === 0
      ? content.citations.map((citation) => `[${citation.evidenceId}] ${citation.sourceTitle}`)
      : slide.id === 'citations'
        ? content.citations.map((citation) => `${citation.sourceTitle}: ${citation.canonicalUrl}`)
        : content.sections.find((section) => section.sectionId === slide.id)?.claimIds.flatMap((id) => claimFor(content, id).evidenceIds).map((evidenceId) => {
          const citation = citationFor(content, evidenceId);
          return `[${citation.evidenceId}] ${citation.sourceTitle}: ${citation.canonicalUrl}`;
        }) ?? [];
    files.push({ name: `ppt/slides/slide${index + 1}.xml`, bytes: Buffer.from(pptSlideXml(slide.title, slide.body, slide.claims, citations, spec, index + 1)) });
    files.push({ name: `ppt/slides/_rels/slide${index + 1}.xml.rels`, bytes: Buffer.from(rels([{ id: 'rIdLayout', type: `${OFFICE_REL}/slideLayout`, target: '../slideLayouts/slideLayout1.xml' }, { id: 'rIdNotes', type: `${OFFICE_REL}/notesSlide`, target: `../notesSlides/notesSlide${index + 1}.xml` }])) });
    files.push({ name: `ppt/notesSlides/notesSlide${index + 1}.xml`, bytes: Buffer.from(notesXml(slide.title, slide.body, slide.notes, citations)) });
    files.push({ name: `ppt/notesSlides/_rels/notesSlide${index + 1}.xml.rels`, bytes: Buffer.from(rels([{ id: 'rIdSlide', type: `${OFFICE_REL}/slide`, target: `../slides/slide${index + 1}.xml` }])) });
  });
  return { format: 'pptx', path: 'outputs/deck.pptx', mediaType: 'application/vnd.openxmlformats-officedocument.presentationml.presentation', bytes: zip(files), adapter: 'a2swe-pptx-ooxml-2' };
}

function wp(textValue: string, style?: string): string {
  return `<w:p>${style ? `<w:pPr><w:pStyle w:val="${style}"/></w:pPr>` : ''}<w:r><w:t xml:space="preserve">${text(textValue)}</w:t></w:r></w:p>`;
}

function hyperlink(textValue: string, relId: string): string {
  return `<w:p><w:hyperlink r:id="${relId}" w:history="1"><w:r><w:rPr><w:rStyle w:val="Hyperlink"/></w:rPr><w:t>${text(textValue)}</w:t></w:r></w:hyperlink></w:p>`;
}

function docx(content: ContentIR): AdapterFile {
  const citationRels = content.citations.map((citation, index) => ({ id: `rId${index + 2}`, type: `${OFFICE_REL}/hyperlink`, target: citation.canonicalUrl, targetMode: 'External' as const }));
  const body = [
    wp(content.title, 'Title'),
    wp('Table of Contents', 'Heading1'),
    '<w:p><w:r><w:fldChar w:fldCharType="begin"/></w:r><w:r><w:instrText xml:space="preserve"> TOC \\o "1-2" \\h \\z \\u </w:instrText></w:r><w:r><w:fldChar w:fldCharType="separate"/></w:r><w:r><w:t>Update fields in Word to refresh this table of contents.</w:t></w:r><w:r><w:fldChar w:fldCharType="end"/></w:r></w:p>',
    wp('Executive Summary', 'Heading1'),
    wp(content.summary),
    wp(`Audience: ${content.audience}`),
    wp(`Decision: ${content.decision}`),
    ...content.sections.flatMap((section) => [
      wp(section.title, 'Heading1'),
      wp(section.body),
      wp('Claims', 'Heading2'),
      ...section.claimIds.map((id) => wp(claimFor(content, id).text)),
      wp('Speaker notes', 'Heading2'),
      wp(section.speakerNotes),
      ...(section.assetIds.length ? [wp('Assets and alt text', 'Heading2'), ...section.assetIds.map((id) => {
        const asset = content.assets.find((item) => item.assetId === id)!;
        return wp(`${asset.assetId}: ${asset.alt}`);
      })] : [])
    ]),
    wp('Citations', 'Heading1'),
    ...content.citations.map((citation, index) => hyperlink(`${citation.sourceTitle} (${citation.retrievedAt})`, `rId${index + 2}`)),
    '<w:sectPr><w:pgSz w:w="12240" w:h="15840"/><w:pgMar w:top="1440" w:right="1440" w:bottom="1440" w:left="1440" w:header="720" w:footer="720" w:gutter="0"/></w:sectPr>'
  ].join('');
  const files: ZipFile[] = [
    { name: '[Content_Types].xml', bytes: Buffer.from(`<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/><Override PartName="/word/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.styles+xml"/><Override PartName="/docProps/core.xml" ContentType="application/vnd.openxmlformats-package.core-properties+xml"/></Types>`) },
    { name: '_rels/.rels', bytes: Buffer.from(rels([{ id: 'rId1', type: `${OFFICE_REL}/officeDocument`, target: 'word/document.xml' }, { id: 'rId2', type: `${OFFICE_REL}/metadata/core-properties`, target: 'docProps/core.xml' }])) },
    { name: 'docProps/core.xml', bytes: Buffer.from(`<?xml version="1.0" encoding="UTF-8" standalone="yes"?><cp:coreProperties xmlns:cp="http://schemas.openxmlformats.org/package/2006/metadata/core-properties" xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:dcterms="http://purl.org/dc/terms/" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"><dc:title>${text(content.title)}</dc:title><dc:creator>a2swe</dc:creator><dcterms:created xsi:type="dcterms:W3CDTF">2020-01-01T00:00:00Z</dcterms:created><dcterms:modified xsi:type="dcterms:W3CDTF">2020-01-01T00:00:00Z</dcterms:modified></cp:coreProperties>`) },
    { name: 'word/_rels/document.xml.rels', bytes: Buffer.from(rels([{ id: 'rId1', type: `${OFFICE_REL}/styles`, target: 'styles.xml' }, ...citationRels])) },
    { name: 'word/styles.xml', bytes: Buffer.from(`<?xml version="1.0" encoding="UTF-8" standalone="yes"?><w:styles xmlns:w="${WORD_NS}"><w:style w:type="paragraph" w:styleId="Normal"><w:name w:val="Normal"/></w:style><w:style w:type="paragraph" w:styleId="Title"><w:name w:val="Title"/><w:basedOn w:val="Normal"/><w:pPr><w:jc w:val="center"/></w:pPr><w:rPr><w:b/><w:sz w:val="44"/></w:rPr></w:style><w:style w:type="paragraph" w:styleId="Heading1"><w:name w:val="heading 1"/><w:basedOn w:val="Normal"/><w:pPr><w:outlineLvl w:val="0"/></w:pPr><w:rPr><w:b/><w:sz w:val="32"/></w:rPr></w:style><w:style w:type="paragraph" w:styleId="Heading2"><w:name w:val="heading 2"/><w:basedOn w:val="Normal"/><w:pPr><w:outlineLvl w:val="1"/></w:pPr><w:rPr><w:b/><w:sz w:val="26"/></w:rPr></w:style><w:style w:type="character" w:styleId="Hyperlink"><w:name w:val="Hyperlink"/><w:rPr><w:color w:val="0563C1"/><w:u w:val="single"/></w:rPr></w:style></w:styles>`) },
    { name: 'word/document.xml', bytes: Buffer.from(`<?xml version="1.0" encoding="UTF-8" standalone="yes"?><w:document xmlns:w="${WORD_NS}" xmlns:r="${OFFICE_REL}"><w:body>${body}</w:body></w:document>`) }
  ];
  return { format: 'docx', path: 'outputs/document.docx', mediaType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', bytes: zip(files), adapter: 'a2swe-docx-ooxml-2' };
}

function pdfEscape(value: string): string {
  return value.replaceAll('\\', '\\\\').replaceAll('(', '\\(').replaceAll(')', '\\)').replaceAll('\r', ' ').replaceAll('\n', ' ');
}

type PdfLine = { text: string; font: 'F1' | 'F2'; size: number; leading: number; indent: number; gapBefore: number };
type PositionedPdfLine = PdfLine & { y: number };

const PDF_WIDTH = 612;
const PDF_HEIGHT = 792;
const PDF_MARGIN = 54;
const PDF_TOP = PDF_HEIGHT - PDF_MARGIN;
const PDF_BOTTOM = PDF_MARGIN;

function pdfMaxChars(size: number, indent = 0): number {
  const availableWidth = PDF_WIDTH - PDF_MARGIN * 2 - indent;
  return Math.max(24, Math.floor(availableWidth / (size * 0.52)));
}

function wrapPdfText(value: string, size: number, indent = 0): string[] {
  const maxChars = pdfMaxChars(size, indent);
  const words = value.replace(/\s+/g, ' ').trim().split(' ').filter(Boolean);
  const lines: string[] = [];
  let current = '';
  for (const word of words) {
    if (!current) {
      current = word;
    } else if (`${current} ${word}`.length <= maxChars) {
      current = `${current} ${word}`;
    } else {
      lines.push(current);
      current = word;
    }
    while (current.length > maxChars) {
      lines.push(current.slice(0, maxChars));
      current = current.slice(maxChars);
    }
  }
  if (current) lines.push(current);
  return lines.length ? lines : [''];
}

function pushPdfBlock(lines: PdfLine[], value: string, options: Partial<PdfLine> = {}): void {
  const size = options.size ?? 11;
  const indent = options.indent ?? 0;
  const wrapped = wrapPdfText(value, size, indent);
  wrapped.forEach((line, index) => lines.push({
    text: line,
    font: options.font ?? 'F1',
    size,
    leading: options.leading ?? Math.ceil(size * 1.45),
    indent,
    gapBefore: index === 0 ? options.gapBefore ?? 0 : 0
  }));
}

function paginatePdfLines(lines: PdfLine[]): PositionedPdfLine[][] {
  const pages: PositionedPdfLine[][] = [[]];
  let y = PDF_TOP;
  for (const line of lines) {
    const requiredHeight = line.gapBefore + line.leading;
    if (pages.at(-1)!.length > 0 && y - requiredHeight < PDF_BOTTOM) {
      pages.push([]);
      y = PDF_TOP;
    }
    y -= line.gapBefore;
    pages.at(-1)!.push({ ...line, y });
    y -= line.leading;
  }
  return pages.filter((page) => page.length > 0);
}

function pdf(content: ContentIR): AdapterFile {
  const lines: PdfLine[] = [];
  pushPdfBlock(lines, content.title, { font: 'F2', size: 18, leading: 24 });
  pushPdfBlock(lines, `Audience: ${content.audience}`, { gapBefore: 12 });
  pushPdfBlock(lines, `Decision: ${content.decision}`);
  pushPdfBlock(lines, 'Executive Summary', { font: 'F2', size: 14, leading: 19, gapBefore: 14 });
  pushPdfBlock(lines, content.summary);
  pushPdfBlock(lines, 'Narration', { font: 'F2', size: 12, leading: 17, gapBefore: 10 });
  pushPdfBlock(lines, content.voice.narration);
  content.sections.forEach((section, index) => {
    pushPdfBlock(lines, `${index + 1}. ${section.title}`, { font: 'F2', size: 14, leading: 19, gapBefore: 14 });
    pushPdfBlock(lines, section.body);
    pushPdfBlock(lines, 'Claims', { font: 'F2', size: 12, leading: 17, gapBefore: 8 });
    section.claimIds.forEach((id) => pushPdfBlock(lines, `• ${claimFor(content, id).text}`, { indent: 18 }));
    if (section.assetIds.length) {
      pushPdfBlock(lines, 'Assets and alt text', { font: 'F2', size: 12, leading: 17, gapBefore: 8 });
      section.assetIds.forEach((id) => {
        const asset = content.assets.find((item) => item.assetId === id)!;
        pushPdfBlock(lines, `• ${asset.assetId}: ${asset.alt}`, { indent: 18 });
      });
    }
    pushPdfBlock(lines, 'Speaker notes', { font: 'F2', size: 12, leading: 17, gapBefore: 8 });
    pushPdfBlock(lines, section.speakerNotes);
  });
  pushPdfBlock(lines, 'Citations', { font: 'F2', size: 14, leading: 19, gapBefore: 14 });
  content.citations.forEach((citation) => pushPdfBlock(lines,
    `[${citation.evidenceId}] ${citation.sourceTitle} ${citation.canonicalUrl} retrieved ${citation.retrievedAt}`));
  const pages = paginatePdfLines(lines);
  const objects: string[] = ['<< /Type /Catalog /Pages 2 0 R >>'];
  const pageObjectNumbers = pages.map((_, index) => 3 + index * 2);
  const regularFontObject = 3 + pages.length * 2;
  const boldFontObject = regularFontObject + 1;
  objects.push(`<< /Type /Pages /Kids [${pageObjectNumbers.map((num) => `${num} 0 R`).join(' ')}] /Count ${pages.length} >>`);
  pages.forEach((pageLines, index) => {
    const pageNumber = 3 + index * 2;
    const contentNumber = pageNumber + 1;
    const stream = pageLines.map((line) => `BT /${line.font} ${line.size} Tf ${PDF_MARGIN + line.indent} ${line.y} Td (${pdfEscape(line.text)}) Tj ET`).join('\n');
    objects.push(`<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${PDF_WIDTH} ${PDF_HEIGHT}] /Resources << /Font << /F1 ${regularFontObject} 0 R /F2 ${boldFontObject} 0 R >> >> /Contents ${contentNumber} 0 R >>`);
    objects.push(`<< /Length ${Buffer.byteLength(stream)} >>\nstream\n${stream}\nendstream`);
  });
  objects.push('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>');
  objects.push('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >>');
  let output = '%PDF-1.7\n%\xE2\xE3\xCF\xD3\n';
  const offsets = [0];
  for (const [index, object] of objects.entries()) {
    offsets.push(Buffer.byteLength(output, 'binary'));
    output += `${index + 1} 0 obj\n${object}\nendobj\n`;
  }
  const xref = Buffer.byteLength(output, 'binary');
  output += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n${offsets.slice(1).map((offset) => `${String(offset).padStart(10, '0')} 00000 n `).join('\n')}\n`;
  output += `trailer << /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF\n`;
  return { format: 'pdf', path: 'outputs/document.pdf', mediaType: 'application/pdf', bytes: Buffer.from(output, 'binary'), adapter: 'a2swe-pdf-searchable-2' };
}

function remotionTimeline(content: ContentIR, spec: RenderSpec): { schemaVersion: string; fps: number; durationInFrames: number; scenes: { id: string; kind: string; title: string; body: string; decision: string; claims: string[]; citations: { evidenceId: string; sourceTitle: string; canonicalUrl: string }[]; startFrame: number; durationInFrames: number; endFrame: number }[] } {
  const durationInFrames = Math.max(1, Math.ceil(spec.video.durationSeconds * spec.video.fps));
  const sceneInputs = [
    {
      id: 'title',
      kind: 'title',
      title: content.title,
      body: `${content.summary}\n\nNarration: ${content.voice.narration}`,
      claims: content.claims.map((claim) => claim.text),
      citations: content.citations
    },
    ...content.sections.map((section) => {
      const claims = section.claimIds.map((id) => claimFor(content, id));
      const evidenceIds = [...new Set(claims.flatMap((claim) => claim.evidenceIds))];
      return {
        id: section.sectionId,
        kind: 'section',
        title: section.title,
        body: `${section.body}\n\nSpeaker notes: ${section.speakerNotes}`,
        claims: claims.map((claim) => claim.text),
        citations: evidenceIds.map((id) => citationFor(content, id))
      };
    })
  ];
  const base = Math.floor(durationInFrames / sceneInputs.length);
  const remainder = durationInFrames % sceneInputs.length;
  let startFrame = 0;
  const scenes = sceneInputs.map((scene, index) => {
    const sceneDuration = base + (index < remainder ? 1 : 0);
    const output = {
      ...scene,
      decision: content.decision,
      citations: scene.citations.map((citation) => ({
        evidenceId: citation.evidenceId,
        sourceTitle: citation.sourceTitle,
        canonicalUrl: citation.canonicalUrl
      })),
      startFrame,
      durationInFrames: sceneDuration,
      endFrame: startFrame + sceneDuration
    };
    startFrame += sceneDuration;
    return output;
  });
  return { schemaVersion: '1.0.0', fps: spec.video.fps, durationInFrames, scenes };
}

function remotion(content: ContentIR, spec: RenderSpec, options: AdapterRenderOptions): AdapterFile[] {
  const timeline = remotionTimeline(content, spec);
  const renderOutput = options.reviewCandidate ? 'dist/review-candidate.mp4' : 'dist/render.mp4';
  const reviewPlan = options.reviewCandidate ? {
    approvalState: 'review_candidate_unapproved',
    watermark: 'UNAPPROVED REVIEW CANDIDATE',
    template: 'a2swe-review-candidate-template-v2'
  } : {
    template: 'a2swe-production-template-v2'
  };
  const plan = {
    schemaVersion: '1.0.0',
    contentDigest: digest(content),
    renderer: 'remotion',
    encodedMp4: false,
    reason: 'Project scaffold, timeline and render/QC commands only; no MP4 is encoded by this adapter.',
    composition: { id: content.contentId, width: spec.video.width, height: spec.video.height, fps: spec.video.fps, durationInFrames: timeline.durationInFrames },
    paths: {
      entryPoint: 'src/index.tsx',
      rootComponent: 'src/Root.tsx',
      content: 'src/content.json',
      timeline: 'timeline.json',
      tsconfig: 'tsconfig.json',
      remotionConfig: 'remotion.config.ts',
      qcReport: 'qc/timeline-qc.json',
      renderOutput
    },
    commands: {
      preview: 'npm run preview',
      render: 'npm run render',
      qc: 'npm run qc'
    },
    ...reviewPlan
  };
  const watermark = options.reviewCandidate
    ? "    <div style={{ position: 'absolute', top: 24, right: 32, color: theme.accent, fontWeight: 800 }}>UNAPPROVED REVIEW CANDIDATE</div>"
    : '';
  const root = `import React from 'react';
import { AbsoluteFill, Composition, interpolate, useCurrentFrame } from 'remotion';
import content from './content.json';
import timeline from '../timeline.json';

const theme = ${JSON.stringify(spec.theme)};
type TimelineScene = typeof timeline.scenes[number];

function SceneView({ scene, index }: { scene: TimelineScene; index: number }) {
  const frame = useCurrentFrame();
  const localFrame = frame - scene.startFrame;
  const opacity = interpolate(localFrame, [0, 20], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  const citations = scene.citations.slice(0, 3);
  return <AbsoluteFill style={{ background: theme.background, color: theme.foreground, fontFamily: theme.fontFamily, padding: 72, opacity }}>
${watermark}
    <p style={{ color: theme.accent, textTransform: 'uppercase', letterSpacing: 4 }}>{scene.kind} · Scene {index + 1}</p>
    <h1 style={{ fontSize: 72, lineHeight: 1, margin: '16px 0 32px', maxWidth: 1500 }}>{scene.title}</h1>
    <p style={{ fontSize: 30, lineHeight: 1.35, maxWidth: 1320, whiteSpace: 'pre-line' }}>{scene.body}</p>
    <div style={{ display: 'grid', gridTemplateColumns: '1.2fr .8fr', gap: 32, marginTop: 36 }}>
      <section style={{ borderLeft: '6px solid ' + theme.accent, paddingLeft: 24 }}>
        <h2 style={{ fontSize: 30, margin: '0 0 12px' }}>Decision</h2>
        <p style={{ fontSize: 24, lineHeight: 1.3 }}>{scene.decision}</p>
      </section>
      <section>
        <h2 style={{ fontSize: 30, margin: '0 0 12px' }}>Claims and citations</h2>
        {scene.claims.slice(0, 3).map((claim) => <p key={claim} style={{ fontSize: 20, lineHeight: 1.25, margin: '0 0 10px' }}>• {claim}</p>)}
        {citations.map((citation) => <p key={citation.evidenceId} style={{ fontSize: 16, lineHeight: 1.2, opacity: .86, margin: '8px 0 0' }}>[{citation.evidenceId}] {citation.sourceTitle} — {citation.canonicalUrl}</p>)}
      </section>
    </div>
  </AbsoluteFill>;
}

export function Explainer() {
  const frame = useCurrentFrame();
  const sceneIndex = Math.max(0, timeline.scenes.findIndex((scene) => frame >= scene.startFrame && frame < scene.endFrame));
  const scene = timeline.scenes[sceneIndex] ?? timeline.scenes[timeline.scenes.length - 1];
  return <SceneView scene={scene} index={sceneIndex} />;
}

export function Root() {
  return <Composition id="${content.contentId}" component={Explainer} durationInFrames={timeline.durationInFrames} fps={timeline.fps} width={${spec.video.width}} height={${spec.video.height}} defaultProps={{ contentTitle: content.title }} />;
}

export default Root;
`;
  const remotionIndex = `import { registerRoot } from 'remotion';
import { Root } from './Root';

registerRoot(Root);
`;
  const remotionConfig = `import { Config } from '@remotion/cli/config';

Config.setOverwriteOutput(true);
Config.setVideoImageFormat('png');
Config.setChromiumOpenGlRenderer('angle');
`;
  const tsconfig = {
    compilerOptions: {
      target: 'ES2022',
      module: 'ESNext',
      moduleResolution: 'Bundler',
      jsx: 'react-jsx',
      strict: true,
      esModuleInterop: true,
      resolveJsonModule: true,
      isolatedModules: true,
      skipLibCheck: true,
      noEmit: true
    },
    include: ['src/**/*.ts', 'src/**/*.tsx', 'timeline.json', 'remotion.config.ts']
  };
  return [
    { format: 'remotion', path: 'outputs/remotion/render-plan.json', mediaType: 'application/json', bytes: stableJson(plan), adapter: 'a2swe-remotion-review-template-2' },
    { format: 'remotion', path: 'outputs/remotion/package.json', mediaType: 'application/json', bytes: stableJson({ type: 'module', private: true, scripts: { preview: 'remotion preview src/index.tsx', render: `remotion render src/index.tsx ${content.contentId} ${renderOutput}`, typecheck: 'tsc --noEmit', qc: 'node --input-type=module -e "import fs from \\"node:fs\\";const t=JSON.parse(fs.readFileSync(\\"timeline.json\\",\\"utf8\\"));if(t.scenes.at(-1).endFrame!==t.durationInFrames)process.exit(1);console.log(JSON.stringify({durationInFrames:t.durationInFrames,scenes:t.scenes.length,coverage:\\"ok\\"}))"' }, dependencies: { '@remotion/cli': '4.0.523', remotion: '4.0.523', react: '19.3.0', 'react-dom': '19.3.0' }, devDependencies: { '@types/react': '19.3.0', '@types/react-dom': '19.3.0', typescript: '7.0.2' } }), adapter: 'a2swe-remotion-review-template-2' },
    { format: 'remotion', path: 'outputs/remotion/timeline.json', mediaType: 'application/json', bytes: stableJson(timeline), adapter: 'a2swe-remotion-review-template-2' },
    { format: 'remotion', path: 'outputs/remotion/tsconfig.json', mediaType: 'application/json', bytes: stableJson(tsconfig), adapter: 'a2swe-remotion-review-template-2' },
    { format: 'remotion', path: 'outputs/remotion/remotion.config.ts', mediaType: 'text/typescript', bytes: Buffer.from(remotionConfig), adapter: 'a2swe-remotion-review-template-2' },
    { format: 'remotion', path: 'outputs/remotion/src/content.json', mediaType: 'application/json', bytes: stableJson(content), adapter: 'a2swe-remotion-review-template-2' },
    { format: 'remotion', path: 'outputs/remotion/src/index.tsx', mediaType: 'text/typescript', bytes: Buffer.from(remotionIndex), adapter: 'a2swe-remotion-review-template-2' },
    { format: 'remotion', path: 'outputs/remotion/src/Root.tsx', mediaType: 'text/typescript', bytes: Buffer.from(root), adapter: 'a2swe-remotion-review-template-2' }
  ];
}

export function renderFiles(contentInput: unknown, specInput: unknown, options: AdapterRenderOptions = {}): AdapterFile[] {
  const content = validate('ContentIR', contentInput);
  const spec = validate('RenderSpec', specInput);
  if (digest(content) !== spec.contentDigest) throw new Error('render_content_digest_mismatch');
  const files: AdapterFile[] = [];
  for (const format of spec.formats) {
    if (format === 'html') files.push(html(content, spec));
    else if (format === 'adaptiveDeck') files.push(adaptiveDeck(content, spec, options));
    else if (format === 'pptx') files.push(pptx(content, spec));
    else if (format === 'docx') files.push(docx(content));
    else if (format === 'pdf') files.push(pdf(content));
    else if (format === 'remotion') files.push(...remotion(content, spec, options));
  }
  if (new Set(files.map((file) => file.path)).size !== files.length) throw new Error('duplicate_adapter_output');
  if (files.some((file) => sha256(file.bytes) !== sha256(file.bytes))) throw new Error('adapter_nondeterministic');
  return files;
}
