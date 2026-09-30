import assert from 'node:assert/strict';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import sharp from 'sharp';
import { digest, sha256, windowStart } from '../../packages/core/src/canonical.ts';
import { renderFiles } from '../../packages/core/src/adapters.ts';
import { createAsset, writeAssetBundle } from '../../packages/core/src/assets.ts';
import { createReleasePlan, verifyRelease, writeRelease } from '../../packages/core/src/release.ts';
import { validate } from '../../packages/core/src/contracts.ts';

const cli = fileURLToPath(new URL('../../packages/core/src/cli.ts', import.meta.url));
const run = (args: string[]) => spawnSync(process.execPath, [cli, ...args], { encoding: 'utf8' });
const sourceQuote = 'Every format is generated from one ContentIR digest.';
const domainPack = {
  schemaVersion: '1.0.0', domainId: 'release-domain', kind: 'topic', canonicalName: 'Release fixture', asOf: '2026-09-18',
  windowStart: windowStart('2026-09-18'), timezone: 'UTC', state: 'ready',
  sources: [{ schemaVersion: '1.0.0', sourceId: 'src-1', domainId: 'release-domain', canonicalUrl: 'https://example.com/source', publisher: 'Fixture',
    title: 'Fixture source', publicationDate: null, modifiedDate: null, retrievedAt: '2026-09-18T00:00:00Z', dateEvidence: '', contentHash: sha256('source') }],
  evidence: [{ evidenceId: 'ev-1', sourceId: 'src-1', sourceDigest: sha256('source'), locator: 'section 1', quote: sourceQuote, quoteDigest: sha256(sourceQuote) }],
  claims: [{ claimId: 'claim-1', wording: sourceQuote, evidenceIds: ['ev-1'], disposition: 'supported' }],
  knownGaps: []
};
const domainDigest = digest(domainPack);
const assetDigest = sha256('asset');

function zipEntries(bytes: Buffer): Map<string, string> {
  const entries = new Map<string, string>();
  const crcTable = new Uint32Array(256);
  for (let i = 0; i < 256; i += 1) {
    let c = i;
    for (let bit = 0; bit < 8; bit += 1) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    crcTable[i] = c >>> 0;
  }
  const crc32 = (value: Buffer) => {
    let crc = 0xffffffff;
    for (const byte of value) crc = crcTable[(crc ^ byte) & 0xff] ^ (crc >>> 8);
    return (crc ^ 0xffffffff) >>> 0;
  };
  let eocd = -1;
  for (let offset = bytes.length - 22; offset >= Math.max(0, bytes.length - 65558); offset -= 1) {
    if (bytes.readUInt32LE(offset) === 0x06054b50) {
      eocd = offset;
      break;
    }
  }
  assert.notEqual(eocd, -1, 'zip end-of-central-directory record must be present');
  const entryCount = bytes.readUInt16LE(eocd + 10);
  const centralSize = bytes.readUInt32LE(eocd + 12);
  const centralOffset = bytes.readUInt32LE(eocd + 16);
  assert.ok(centralOffset + centralSize <= eocd, 'central directory must be inside the archive');
  let offset = centralOffset;
  for (let i = 0; i < entryCount; i += 1) {
    assert.equal(bytes.readUInt32LE(offset), 0x02014b50, 'central directory entry signature must be valid');
    const method = bytes.readUInt16LE(offset + 10);
    const expectedCrc = bytes.readUInt32LE(offset + 16);
    const compressedSize = bytes.readUInt32LE(offset + 20);
    const uncompressedSize = bytes.readUInt32LE(offset + 24);
    const nameLength = bytes.readUInt16LE(offset + 28);
    const extraLength = bytes.readUInt16LE(offset + 30);
    const commentLength = bytes.readUInt16LE(offset + 32);
    const localOffset = bytes.readUInt32LE(offset + 42);
    const name = bytes.subarray(offset + 46, offset + 46 + nameLength).toString('utf8');
    assert.equal(method, 0, `${name} must use stored ZIP entries for deterministic package validation`);
    assert.equal(bytes.readUInt32LE(localOffset), 0x04034b50, `${name} local header signature must be valid`);
    const localCrc = bytes.readUInt32LE(localOffset + 14);
    const localCompressedSize = bytes.readUInt32LE(localOffset + 18);
    const localUncompressedSize = bytes.readUInt32LE(localOffset + 22);
    const localNameLength = bytes.readUInt16LE(localOffset + 26);
    const localExtraLength = bytes.readUInt16LE(localOffset + 28);
    const localName = bytes.subarray(localOffset + 30, localOffset + 30 + localNameLength).toString('utf8');
    const start = localOffset + 30 + localNameLength + localExtraLength;
    const payload = bytes.subarray(start, start + compressedSize);
    assert.equal(localName, name, `${name} central and local names must match`);
    assert.equal(localCrc, expectedCrc, `${name} local and central CRC must match`);
    assert.equal(localCompressedSize, compressedSize, `${name} compressed size must match`);
    assert.equal(localUncompressedSize, uncompressedSize, `${name} uncompressed size must match`);
    assert.equal(payload.length, compressedSize, `${name} payload size must match central directory`);
    assert.equal(payload.length, uncompressedSize, `${name} stored size must match uncompressed size`);
    assert.equal(crc32(payload), expectedCrc, `${name} payload CRC must verify`);
    entries.set(name, payload.toString('utf8'));
    offset += 46 + nameLength + extraLength + commentLength;
  }
  assert.equal(offset, centralOffset + centralSize, 'central directory size must match parsed entries');
  return entries;
}

function pdfPageCount(pdf: string): number {
  return (pdf.match(/\/Type \/Page\b/g) ?? []).length;
}

function pngDimensions(bytes: Buffer): { width: number; height: number } {
  assert.ok(bytes.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])));
  return { width: bytes.readUInt32BE(16), height: bytes.readUInt32BE(20) };
}

function jpegDimensions(bytes: Buffer): { width: number; height: number } {
  assert.equal(bytes[0], 255);
  assert.equal(bytes[1], 216);
  let offset = 2;
  while (offset + 4 < bytes.length) {
    while (bytes[offset] === 255) offset += 1;
    const marker = bytes[offset];
    offset += 1;
    const length = bytes.readUInt16BE(offset);
    if (marker >= 0xc0 && marker <= 0xc3) return { height: bytes.readUInt16BE(offset + 3), width: bytes.readUInt16BE(offset + 5) };
    offset += length;
  }
  throw new Error('missing_jpeg_dimensions');
}

function content() {
  return {
    schemaVersion: '1.0.0', contentId: 'release-fixture', domainDigest, title: 'Verified release fixture',
    audience: 'Engineering leaders', decision: 'Adopt the verified release candidate only after gates pass',
    language: 'en', summary: 'A deterministic ContentIR used to verify all output adapters.',
    claims: [{ claimId: 'claim-1', text: 'Every format is generated from one ContentIR digest.', evidenceIds: ['ev-1'] }],
    citations: [{ evidenceId: 'ev-1', sourceTitle: 'Fixture source', canonicalUrl: 'https://example.com/source', retrievedAt: '2026-09-18T00:00:00Z' }],
    assets: [{ assetId: 'diagram-1', digest: assetDigest, mediaType: 'image/png', alt: 'Diagram showing one verified release flow', role: 'diagram' }],
    sections: [{ sectionId: 'section-1', title: 'Shared facts', body: 'Adapters preserve the same claim, citation and note text.',
      claimIds: ['claim-1'], assetIds: ['diagram-1'], speakerNotes: 'Narrate the shared digest and cite the fixture source.' }],
    voice: { style: 'clear executive narration', narration: 'Every output is generated from the same approved ContentIR.', externalTransfer: false }
  };
}

function longContent() {
  const base = content();
  return {
    ...base,
    contentId: 'long-release-fixture',
    title: 'Verified long release fixture',
    summary: 'A longer deterministic ContentIR used to verify that PDF pagination is driven by real content volume.',
    sections: Array.from({ length: 12 }, (_, index) => ({
      sectionId: `long-section-${index + 1}`,
      title: `Detailed evidence section ${index + 1}`,
      body: `This section contains enough real narrative content to require natural pagination in the PDF adapter. It explains adapter behavior, preserves searchable text, and keeps the generated page count tied to actual available page height instead of synthetic filler. Section ${index + 1} repeats implementation-specific validation language for visual QA and text extraction checks.`,
      claimIds: ['claim-1'],
      assetIds: index === 0 ? ['diagram-1'] : [],
      speakerNotes: `Speaker notes for detailed evidence section ${index + 1} describe what the reviewer should inspect on this page, including citation continuity, readable hierarchy, and absence of artificial continuation text.`
    }))
  };
}

function renderSpec(contentDigest = digest(content())) {
  return {
    schemaVersion: '1.0.0', renderId: 'render-fixture', contentDigest,
    formats: ['html', 'adaptiveDeck', 'pptx', 'docx', 'pdf', 'remotion'],
    theme: { name: 'fixture', background: '#ffffff', foreground: '#111111', accent: '#0066aa', fontFamily: 'Arial' },
    viewport: { width: 1280, height: 720 },
    video: { width: 1920, height: 1080, fps: 30, durationSeconds: 30, sampleRate: 48000 }
  };
}

function approval(contentDigest = digest(content())) {
  return {
    schemaVersion: '1.0.0', manifestId: 'approval-fixture', domainDigest, contentDigest, reviewedAt: '2026-09-18T00:00:00Z',
    selectedAssets: [{ assetId: 'diagram-1', assetDigest, basis: 'Synthetic fixture generated by the test',
      reviewerId: 'approval-reviewer', evidenceDigest: sha256('approval-evidence'), status: 'approved' }]
  };
}
async function releaseFixture(root: string) {
  const request = validate('AssetRequest', {
    schemaVersion: '1.0.0', assetId: 'diagram-1', domainDigest, purpose: 'evaluation',
    method: 'import', role: 'diagram', prompt: 'Release fixture raster with verified source bytes',
    alt: 'Diagram showing one verified release flow', width: 512, height: 288, seed: 1,
    palette: ['#ffffff', '#182322', '#00786b'], nodes: []
  });
  const raster = await sharp(Buffer.from('<svg width="512" height="288"><rect width="512" height="288" fill="#ffffff"/><rect x="50" y="50" width="200" height="180" fill="#182322"/><circle cx="355" cy="144" r="88" fill="#00786b"/></svg>')).png().toBuffer();
  const asset = await createAsset(request, raster, {
    method: 'import', provider: 'local-raster-import', version: 'fixture',
    inputDigest: sha256(raster), sourceUrl: 'https://example.com/diagram.png'
  });
  const bundles = path.join(root, 'bundles');
  mkdirSync(bundles);
  await writeAssetBundle(path.join(bundles, request.assetId), request, asset);
  const item = { ...content(), assets: content().assets.map((value) => ({ ...value, digest: asset.record.artifact.digest })) };
  const spec = renderSpec(digest(item));
  const grants = { ...approval(digest(item)), selectedAssets: approval().selectedAssets.map((value) =>
    ({ ...value, assetDigest: asset.record.artifact.digest })) };
  return { item, spec, grants, bundles };
}

test('ContentIR and RenderSpec contracts reject dangling references and digest drift', () => {
  assert.equal(validate('ContentIR', content()).contentId, 'release-fixture');
  assert.throws(() => validate('ContentIR', { ...content(), sections: [{ ...content().sections[0], claimIds: ['missing'] }] }), /claim_reference/);
  assert.throws(() => validate('ContentIR', { ...content(), claims: [{ ...content().claims[0], evidenceIds: ['missing'] }] }), /evidence_reference/);
  const withVisual = (visual: unknown) => ({ ...content(), sections: [{ ...content().sections[0], visual }] });
  const mermaidVisual = { kind: 'mermaid', source: 'flowchart LR\n  A --> B', caption: 'A flows to B' };
  assert.equal(validate('ContentIR', withVisual(mermaidVisual)).sections[0].visual?.kind, 'mermaid');
  assert.throws(() => validate('ContentIR', withVisual({ ...mermaidVisual, source: 'A --> B' })), /invalid_mermaid_visual/);
  assert.throws(() => validate('ContentIR', withVisual({ kind: 'excalidraw', source: '{"elements":[{"type":"image"}]}', caption: 'x' })), /invalid_excalidraw_visual/);
  assert.throws(() => validate('ContentIR', withVisual({ kind: 'marp', source: '<script>alert(1)</script>', caption: 'x' })), /unsafe_visual_source/);
  const visualPng = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR4nGP4z8DwHwAFAAH/iZk9HQAAAABJRU5ErkJggg==', 'base64');
  const visualItem = { ...content(), assets: [], sections: [{ ...content().sections[0], assetIds: [], visual: mermaidVisual }] };
  const visualFiles = renderFiles(visualItem, { ...renderSpec(digest(visualItem)), formats: ['pdf', 'pptx'] }, { visualImages: [{ sectionId: 'section-1', bytes: visualPng }] });
  assert.match(visualFiles.find((file) => file.format === 'pdf')!.bytes.toString('binary'), /mermaid diagram/);  assert.equal(validate('RenderSpec', renderSpec()).renderId, 'render-fixture');
  assert.throws(() => renderFiles(content(), renderSpec(sha256('changed'))), /content_digest_mismatch/);
});

test('adapters deterministically produce editable/searchable/self-contained foundations with one content digest', () => {
  const files = renderFiles(content(), renderSpec());
  assert.deepEqual(files.map((file) => file.path), ['outputs/index.html', 'outputs/deck.deck.json', 'outputs/deck.pptx',
    'outputs/document.docx', 'outputs/document.pdf', 'outputs/remotion/render-plan.json', 'outputs/remotion/package.json',
    'outputs/remotion/requirements.lock.txt', 'outputs/remotion/timeline.json', 'outputs/remotion/asset-manifest.json',
    'outputs/remotion/speech/narration-manifest.json', 'outputs/remotion/tsconfig.json', 'outputs/remotion/remotion.config.ts',
    'outputs/remotion/scripts/synthesize-audio.mjs', 'outputs/remotion/scripts/synthesize-audio.py',
    'outputs/remotion/scripts/audio-qa.mjs',
    'outputs/remotion/scripts/render-mp4.mjs', 'outputs/remotion/scripts/verify-mp4.mjs',
    'outputs/remotion/src/content.json', 'outputs/remotion/src/index.tsx', 'outputs/remotion/src/Root.tsx', 'outputs/remotion/src/palette.ts', 'outputs/remotion/src/Visuals.tsx']);
  assert.deepEqual(files.map((file) => sha256(file.bytes)), renderFiles(content(), renderSpec()).map((file) => sha256(file.bytes)));
  assert.match(files.find((file) => file.format === 'html')!.bytes.toString('utf8'), /<meta name="viewport"/);
  assert.match(files.find((file) => file.format === 'pdf')!.bytes.toString('utf8'), /Every format is generated/);
  assert.match(files.find((file) => file.path.endsWith('render-plan.json'))!.bytes.toString('utf8'), /"encodedMp4": "core-managed-on-render"/);
});

test('production output adapters meet canonical schema, OOXML, PDF, accessibility and neutral Remotion gates', () => {
  const files = renderFiles(content(), renderSpec());
  const adaptive = JSON.parse(files.find((file) => file.format === 'adaptiveDeck')!.bytes.toString('utf8'));
  assert.equal(adaptive.$schema, 'https://darbotlm.github.io/adaptive-slide/schemas/deck.schema.json');
  assert.equal(adaptive.type, 'AdaptiveDeck');
  assert.equal(adaptive.version, '1.0');
  assert.equal(adaptive.slides[0].type, 'AdaptiveSlide');
  assert.equal(adaptive.slides[0].body[0].type, 'Tile.Text');
  assert.equal(adaptive.slides.at(-1).id, 'citations');
  assert.deepEqual(adaptive.metadata.tags, ['a2swe', 'canonical']);
  const adaptiveText = JSON.stringify(adaptive);
  assert.match(adaptiveText, /Fixture source/);
  assert.match(adaptiveText, /https:\/\/example\.com\/source/);
  assert.doesNotMatch(adaptiveText, /\[[^\]]+\]\(https:\/\/[^)]+\)/);
  assert.doesNotMatch(adaptiveText, /\]\(/);

  const pptxEntries = zipEntries(files.find((file) => file.format === 'pptx')!.bytes);
  assert.match(pptxEntries.get('[Content_Types].xml')!, /presentationml\.presentation\.main\+xml/);
  assert.match(pptxEntries.get('[Content_Types].xml')!, /presentationml\.presProps\+xml/);
  assert.match(pptxEntries.get('[Content_Types].xml')!, /presentationml\.viewProps\+xml/);
  assert.match(pptxEntries.get('[Content_Types].xml')!, /presentationml\.tableStyles\+xml/);
  assert.match(pptxEntries.get('ppt\/_rels\/presentation.xml.rels')!, /relationships\/theme/);
  assert.match(pptxEntries.get('ppt\/_rels\/presentation.xml.rels')!, /relationships\/presProps/);
  assert.match(pptxEntries.get('ppt\/theme\/theme1.xml')!, /<a:fillStyleLst>[\s\S]*<a:gradFill/);
  assert.match(pptxEntries.get('ppt\/theme\/theme1.xml')!, /<a:lnStyleLst>[\s\S]*<a:ln /);
  assert.match(pptxEntries.get('ppt\/theme\/theme1.xml')!, /<a:effectStyleLst>[\s\S]*<a:effectStyle>/);
  assert.match(pptxEntries.get('ppt\/slides\/_rels\/slide1.xml.rels')!, /notesSlide/);
  assert.match(pptxEntries.get('ppt\/notesSlides\/notesSlide2.xml')!, /Narrate the shared digest/);
  assert.match(pptxEntries.get('ppt\/theme\/theme1.xml')!, /fixture/);
  assert.match(pptxEntries.get('ppt\/slides\/slide1.xml')!, /<a:rPr\b[^>]*><a:solidFill><a:srgbClr val="111111"\/><\/a:solidFill><\/a:rPr>/);

  const docxEntries = zipEntries(files.find((file) => file.format === 'docx')!.bytes);
  assert.match(docxEntries.get('word\/document.xml')!, /TOC \\o/);
  assert.match(docxEntries.get('word\/document.xml')!, /Diagram showing one verified release flow/);
  assert.match(docxEntries.get('word\/document.xml')!, /<w:pgMar\b(?=[^>]*w:top="1440")(?=[^>]*w:right="1440")(?=[^>]*w:bottom="1440")(?=[^>]*w:left="1440")(?=[^>]*w:header="720")(?=[^>]*w:footer="720")(?=[^>]*w:gutter="0")/);
  assert.match(docxEntries.get('word\/_rels\/document.xml.rels')!, /TargetMode="External"/);
  assert.match(docxEntries.get('word\/styles.xml')!, /Heading1/);

  const pdf = files.find((file) => file.format === 'pdf')!.bytes.toString('binary');
  assert.equal(pdfPageCount(pdf), 1);
  assert.match(pdf, /Fixture source https:\/\/example.com\/source/);
  assert.doesNotMatch(pdf, /Continuation for|intentionally preserves searchable multipage validation structure/);

  const html = files.find((file) => file.format === 'html')!.bytes.toString('utf8');
  assert.match(html, /<a class="skip" href="#content">Skip to content/);
  assert.match(html, /aria-labelledby="section-1-title"/);
  assert.match(html, /Diagram showing one verified release flow/);
  assert.match(html, /--card:color-mix\(in srgb,var\(--bg\) 88%,var\(--fg\) 12%\)/);
  assert.match(html, /overflow-wrap:anywhere/);
  assert.match(html, /word-break:break-word/);
  assert.match(html, /grid-template-columns:repeat\(auto-fit,minmax\(min\(280px,100%\),1fr\)\)/);

  const remotionPlan = JSON.parse(files.find((file) => file.path.endsWith('render-plan.json'))!.bytes.toString('utf8'));
  assert.equal(remotionPlan.template, 'a2swe-production-template-v3');
  assert.equal('approvalState' in remotionPlan, false);
  assert.equal('watermark' in remotionPlan, false);
  assert.equal(remotionPlan.encodedMp4, 'core-managed-on-render');
  assert.equal(remotionPlan.encodedMp4Path, 'dist/render.mp4');
  assert.equal(remotionPlan.paths.audio, 'public/assets/release-fixture/audio.wav');
  assert.equal(remotionPlan.paths.assetManifest, 'asset-manifest.json');
  assert.deepEqual(remotionPlan.commands, { install: 'npm install --ignore-scripts', preview: 'npm run preview', typecheck: 'npm run typecheck',
    audio: 'npm run audio', audioQa: 'npm run audio:qa', render: 'npm run render', qc: 'npm run qc' });
  assert.equal(remotionPlan.paths.entryPoint, 'src/index.tsx');
  assert.equal(remotionPlan.paths.rootComponent, 'src/Root.tsx');
  assert.equal(remotionPlan.paths.timeline, 'timeline.json');
  const remotionPackage = JSON.parse(files.find((file) => file.path.endsWith('package.json'))!.bytes.toString('utf8'));
  assert.equal(remotionPackage.dependencies['@remotion/cli'], '4.0.523');
  assert.equal(remotionPackage.dependencies.remotion, '4.0.523');
  assert.equal(remotionPackage.dependencies.react, '19.3.0');
  assert.equal(remotionPackage.dependencies['react-dom'], '19.3.0');
  assert.equal(remotionPackage.devDependencies.typescript, '7.0.2');
  assert.equal(remotionPackage.devDependencies['@types/react'], '19.3.0');
  assert.equal(remotionPackage.devDependencies['@types/react-dom'], '19.3.0');
  assert.match(remotionPackage.scripts.preview, /^remotion preview src\/index\.tsx$/);
  assert.equal(remotionPackage.scripts.render, 'node scripts/render-mp4.mjs');
  assert.equal(remotionPackage.scripts['audio:qa'], 'node scripts/audio-qa.mjs');
  assert.equal(remotionPackage.scripts.typecheck, 'tsc --noEmit');
  assert.equal(remotionPackage.scripts.qc, 'node scripts/verify-mp4.mjs');
  const remotionTimeline = JSON.parse(files.find((file) => file.path.endsWith('timeline.json'))!.bytes.toString('utf8'));
  assert.equal(remotionTimeline.durationInFrames, renderSpec().video.durationSeconds * renderSpec().video.fps);
  assert.equal(remotionTimeline.width, 1920);
  assert.equal(remotionTimeline.height, 1080);
  assert.equal(remotionTimeline.sampleRate, 48000);
  assert.equal(remotionTimeline.scenes.length, 1 + content().sections.length);
  assert.equal(remotionTimeline.scenes[0].startFrame, 0);
  assert.equal(remotionTimeline.scenes.at(-1).endFrame, remotionTimeline.durationInFrames);
  for (let i = 1; i < remotionTimeline.scenes.length; i += 1) {
    assert.equal(remotionTimeline.scenes[i].startFrame, remotionTimeline.scenes[i - 1].endFrame);
  }
  assert.equal(remotionTimeline.scenes[0].durationInFrames, 450);
  assert.equal(remotionTimeline.scenes[1].durationInFrames, 450);
  assert.match(remotionTimeline.scenes[0].decision, /Adopt the verified/);
  assert.match(remotionTimeline.scenes[1].citations[0].canonicalUrl, /https:\/\/example.com\/source/);
  assert.match(files.find((file) => file.path.endsWith('tsconfig.json'))!.bytes.toString('utf8'), /"resolveJsonModule": true/);
  assert.match(files.find((file) => file.path.endsWith('remotion.config.ts'))!.bytes.toString('utf8'), /Config\.setOverwriteOutput\(true\)/);
  const assetManifest = JSON.parse(files.find((file) => file.path.endsWith('asset-manifest.json'))!.bytes.toString('utf8'));
  assert.equal(assetManifest.audio.path, 'public/assets/release-fixture/audio.wav');
  assert.equal(assetManifest.audio.sampleRate, 48000);
  assert.equal(assetManifest.assets[0].path, 'public/assets/release-fixture/diagram-1.png');
  assert.equal(assetManifest.assets[0].digest, assetDigest);
  const renderScript = files.find((file) => file.path.endsWith('render-mp4.mjs'))!.bytes.toString('utf8');
  assert.match(renderScript, /A2SWE_MP4_RENDER_FAILED/);
  assert.match(renderScript, /core MP4 adapter requires 1920x1080/);
  assert.match(renderScript, /asset digest mismatch/);
  assert.match(renderScript, /Remotion render/);
  const verifyScript = files.find((file) => file.path.endsWith('verify-mp4.mjs'))!.bytes.toString('utf8');
  assert.match(verifyScript, /A2SWE_MP4_QC_FAILED/);
  assert.match(verifyScript, /expected H\.264 video/);
  const remotionRoot = files.find((file) => file.path.endsWith('Root.tsx'))!.bytes.toString('utf8');
  assert.match(remotionRoot, /SceneView/);
  assert.match(remotionRoot, /<Audio src=\{audioPath\}/);
  assert.match(remotionRoot, /Decision/);
  assert.match(remotionRoot, /ClaimCard/);
  assert.match(remotionRoot, /captionAt/);
  assert.doesNotMatch(remotionRoot, /Math\.floor\(frame \/ \(fps \* 5\)\)|slides\[index\]/);
  assert.match(files.find((file) => file.path.endsWith('index.tsx'))!.bytes.toString('utf8'), /registerRoot\(Root\)/);
  assert.doesNotMatch(remotionRoot, /UNAPPROVED REVIEW CANDIDATE|review_candidate_unapproved|review-candidate/i);
  for (const file of files) assert.doesNotMatch(file.bytes.toString('utf8'), /UNAPPROVED REVIEW CANDIDATE|review_candidate_unapproved|review-candidate/i);
});

test('document and deck adapters embed supplied PNG assets and report missing assets truthfully', () => {
  const png = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/p9sAAAAASUVORK5CYII=', 'base64');
  const item = { ...content(), assets: [{ ...content().assets[0], digest: sha256(png), mediaType: 'image/png' }] };
  const spec = { ...renderSpec(digest(item)), formats: ['html', 'adaptiveDeck', 'pptx', 'docx', 'pdf'] };
  const missing = renderFiles(item, spec);
  assert.match(missing.find((file) => file.format === 'html')!.bytes.toString('utf8'), /digest-only reference; raster bytes not supplied/);
  assert.throws(() => renderFiles(item, spec, { strictAssetEmbeds: true }), /asset_embed_missing/);

  const files = renderFiles(item, spec, { assetEmbeds: [{ assetId: 'diagram-1', mediaType: 'image/png', bytes: png }] });
  const html = files.find((file) => file.format === 'html')!.bytes.toString('utf8');
  assert.match(html, /<img src="data:image\/png;base64,/);
  const adaptive = JSON.parse(files.find((file) => file.format === 'adaptiveDeck')!.bytes.toString('utf8'));
  assert.equal(adaptive.slides[1].body.at(-1).type, 'Tile.Image');
  assert.match(adaptive.slides[1].body.at(-1).url, /^data:image\/png;base64,/);
  const pptxEntries = zipEntries(files.find((file) => file.format === 'pptx')!.bytes);
  assert.ok([...pptxEntries.keys()].some((name) => name.startsWith('ppt/media/diagram-1-') && name.endsWith('.png')));
  assert.match(pptxEntries.get('ppt\/slides\/_rels\/slide2.xml.rels')!, /relationships\/image/);
  assert.match(pptxEntries.get('ppt\/slides\/slide2.xml')!, /<p:pic>/);
  const docxEntries = zipEntries(files.find((file) => file.format === 'docx')!.bytes);
  assert.ok([...docxEntries.keys()].some((name) => name.startsWith('word/media/diagram-1-') && name.endsWith('.png')));
  assert.match(docxEntries.get('word\/document.xml')!, /<w:drawing>/);
  const pdf = files.find((file) => file.format === 'pdf')!.bytes.toString('binary');
  assert.match(pdf, /embedded image/);
  assert.match(pdf, /\/Encoding \/WinAnsiEncoding/);
  assert.match(pdf, /\/Subtype \/Image/);
  assert.match(pdf, /\/XObject/);
  assert.match(pdf, /\/FlateDecode/);
});

test('standalone PNG and JPEG adapters render deterministic 1080p raster releases', () => {
  const item = content();
  const spec = { ...renderSpec(digest(item)), formats: ['png', 'jpeg'] };
  const files = renderFiles(item, spec);
  const png = files.find((file) => file.format === 'png')!;
  const jpeg = files.find((file) => file.format === 'jpeg')!;
  assert.equal(png.path, 'outputs/raster.png');
  assert.equal(png.mediaType, 'image/png');
  assert.equal(jpeg.path, 'outputs/raster.jpg');
  assert.equal(jpeg.mediaType, 'image/jpeg');
  assert.deepEqual(pngDimensions(png.bytes), { width: 1920, height: 1080 });
  assert.deepEqual(jpegDimensions(jpeg.bytes), { width: 1920, height: 1080 });
  assert.equal(sha256(renderFiles(item, spec).find((file) => file.format === 'png')!.bytes), sha256(png.bytes));
  assert.equal(sha256(renderFiles(item, spec).find((file) => file.format === 'jpeg')!.bytes), sha256(jpeg.bytes));
  const changed = { ...item, title: 'Verified release fixture changed for raster' };
  const changedSpec = { ...renderSpec(digest(changed)), formats: ['png', 'jpeg'] };
  const changedFiles = renderFiles(changed, changedSpec);
  assert.notEqual(sha256(changedFiles.find((file) => file.format === 'png')!.bytes), sha256(png.bytes));
  assert.notEqual(sha256(changedFiles.find((file) => file.format === 'jpeg')!.bytes), sha256(jpeg.bytes));
});

test('PPTX uses explicit readable run colors and bounded slide layout on dark themes', () => {
  const longTitle = 'Executive readiness review candidate with a deliberately long title that previously overflowed into the slide body on dark navy backgrounds';
  const longBody = 'This body contains a long review narrative that must remain canonical in speaker notes while the visible slide receives deterministic wrapping and clipping safeguards. The slide should use the requested foreground color for every text run so PowerPoint does not fall back to unreadable black text on a dark navy background.';
  const darkContent = {
    ...content(),
    contentId: 'dark-pptx-fixture',
    title: longTitle,
    sections: [{ ...content().sections[0], title: longTitle, body: longBody }]
  };
  const darkSpec = {
    ...renderSpec(digest(darkContent)),
    formats: ['pptx'],
    theme: { name: 'dark-fixture', background: '#0D1B2A', foreground: '#F7FAFC', accent: '#00B4D8', fontFamily: 'Arial' }
  };
  const pptxFile = renderFiles(darkContent, darkSpec).find((file) => file.format === 'pptx')!;
  const entries = zipEntries(pptxFile.bytes);
  const slide1 = entries.get('ppt\/slides\/slide1.xml')!;
  const slide2 = entries.get('ppt\/slides\/slide2.xml')!;
  assert.match(slide1, /<a:srgbClr val="0D1B2A"\/>/);
  assert.match(slide1, /<a:srgbClr val="00B4D8"\/>/);
  assert.match(slide1, /<a:rPr\b[^>]*><a:solidFill><a:srgbClr val="F7FAFC"\/><\/a:solidFill><\/a:rPr>/);
  assert.match(slide2, /<a:rPr\b[^>]*><a:solidFill><a:srgbClr val="F7FAFC"\/><\/a:solidFill><\/a:rPr>/);
  assert.doesNotMatch(slide1, /<a:rPr\b[^>]*\/>/);
  assert.doesNotMatch(slide2, /<a:rPr\b[^>]*\/>/);
  assert.match(slide2, /<a:normAutofit\/>/);
  assert.doesNotMatch(slide2, /vertOverflow=/);
  assert.ok((slide2.match(/<a:p>/g) ?? []).length <= 24, 'visible slide text should be bounded to prevent overlap');
  assert.match(slide2, /<a:rPr lang="en-US" sz="(1[4-9]|2[0-6])00"/);
  assert.match(slide2, new RegExp(longBody.slice(0, 60).replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
  const notes2 = entries.get('ppt\/notesSlides\/notesSlide2.xml')!;
  assert.match(notes2, new RegExp(longTitle.slice(0, 60).replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
  assert.match(notes2, new RegExp(longBody.slice(0, 80).replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
});

test('HTML cards and long headings remain readable and responsive on dark themes', () => {
  const item = {
    ...content(),
    title: 'VerifiedReleaseFixtureWithAnExtremelyLongUnbrokenHeadingThatMustWrapInsideTheHeroCardOnMobile'
  };
  const files = renderFiles(item, {
    ...renderSpec(digest(item)),
    formats: ['html'],
    theme: { name: 'dark-fixture', background: '#0D1B2A', foreground: '#ffffff', accent: '#66D9EF', fontFamily: 'Arial' }
  });
  const html = files.find((file) => file.format === 'html')!.bytes.toString('utf8');
  assert.match(html, /color-scheme:dark/);
  assert.match(html, /--bg:#0D1B2A/);
  assert.match(html, /--fg:#ffffff/);
  assert.match(html, /--card:color-mix\(in srgb,var\(--bg\) 88%,var\(--fg\) 12%\)/);
  assert.doesNotMatch(html, /--card:rgba\(255,255,255,\s*\.88\)/);
  assert.match(html, /h1\{[^}]*overflow-wrap:anywhere;word-break:break-word;max-width:100%/);
  assert.match(html, /\.hero,.card,.manifest\{[^}]*max-width:100%;overflow-wrap:anywhere/);
  assert.match(html, /\*\{box-sizing:border-box;min-width:0\}/);
  assert.match(html, /VerifiedReleaseFixtureWithAnExtremelyLongUnbrokenHeadingThatMustWrapInsideTheHeroCardOnMobile/);
});

test('PDF pagination is content-driven and preserves long content without synthetic filler', () => {
  const item = longContent();
  const files = renderFiles(item, { ...renderSpec(digest(item)), formats: ['pdf'] });
  const pdf = files.find((file) => file.format === 'pdf')!.bytes.toString('binary');
  assert.ok(pdfPageCount(pdf) > 1);
  assert.match(pdf, /Detailed evidence section 12/);
  assert.match(pdf, /Speaker notes for detailed evidence section 12/);
  assert.match(pdf, /Fixture source https:\/\/example.com\/source retrieved 2026-09-18T00:00:00Z/);
  assert.doesNotMatch(pdf, /Continuation for|intentionally preserves searchable multipage validation structure/);
});

test('release fails closed on rejected assets and unready domains, then verifies exact output digests', async () => {
  const workspace = mkdtempSync(path.join(os.tmpdir(), 'a2swe-release-'));
  try {
    const { item, spec, grants, bundles } = await releaseFixture(workspace);
    spec.formats = spec.formats.filter((format) => format !== 'remotion');
    const plan = createReleasePlan(item, spec, grants);
    const root = path.join(workspace, 'output');
    const rejected = { ...grants, selectedAssets: [{ ...grants.selectedAssets[0], status: 'rejected' }] };
    await assert.rejects(() => writeRelease(root, item, spec, rejected, domainPack, bundles), /asset_approval_rejected/);
    await assert.rejects(() => writeRelease(root, item, spec, grants, { ...domainPack, state: 'verifying' }, bundles), /release_domain_not_ready/);
    await assert.rejects(() => writeRelease(root, item, spec, grants, domainPack), /asset_bundles_required/);
    assert.equal(existsSync(root), false);
    const parity = await writeRelease(root, item, spec, grants, domainPack, bundles);
    assert.equal(parity.releaseDigest, plan.releaseDigest);
    assert.equal((await verifyRelease(root)).outputs.length, parity.outputs.length);
    writeFileSync(path.join(root, 'asset-inputs', 'diagram-1.png'), 'tampered');
    await assert.rejects(() => verifyRelease(root), /asset_input_mismatch/);
    writeFileSync(path.join(root, 'asset-inputs', 'diagram-1.png'), readFileSync(path.join(bundles, 'diagram-1', 'asset.png')));
    writeFileSync(path.join(root, 'outputs', 'index.html'), 'tampered');
    await assert.rejects(() => verifyRelease(root), /output_mismatch/);
  } finally { rmSync(workspace, { recursive: true, force: true }); }
});

test('CLI plans, produces and verifies static output sets', async () => {
  const root = mkdtempSync(path.join(os.tmpdir(), 'a2swe-cli-release-'));
  try {
    const { item, spec, grants, bundles } = await releaseFixture(root);
    spec.formats = spec.formats.filter((format) => format !== 'remotion');
    spec.formats.push('png', 'jpeg');
    const contentFile = path.join(root, 'content.json');
    const renderFile = path.join(root, 'render.json');
    const approvalFile = path.join(root, 'approval.json');
    const domainFile = path.join(root, 'domain.json');
    const planFile = path.join(root, 'plan.json');
    writeFileSync(contentFile, JSON.stringify(item));
    writeFileSync(renderFile, JSON.stringify(spec));
    writeFileSync(approvalFile, JSON.stringify(grants));
    writeFileSync(domainFile, JSON.stringify(domainPack));
    const planned = run(['release-plan', '--content', contentFile, '--render', renderFile, '--approval', approvalFile, '--out', planFile]);
    assert.equal(planned.status, 0, planned.stderr);
    const out = path.join(root, 'candidate');
    const produced = run(['release-produce', '--domain', domainFile, '--content', contentFile, '--render', renderFile, '--approval', approvalFile,
      '--assets', bundles, '--out', out]);
    assert.equal(produced.status, 0, produced.stderr);
    const productionArtifacts = [
      path.join(out, 'outputs', 'index.html'),
      path.join(out, 'outputs', 'deck.deck.json'),
      path.join(out, 'outputs', 'document.pdf')
    ].map((file) => readFileSync(file, 'utf8')).join('\n');
    assert.equal(readFileSync(path.join(out, 'outputs', 'raster.png')).subarray(1, 4).toString(), 'PNG');
    assert.equal(readFileSync(path.join(out, 'outputs', 'raster.jpg')).subarray(0, 2).toString('hex'), 'ffd8');
    assert.doesNotMatch(productionArtifacts, /UNAPPROVED|review[-_]candidate|publicationAuthorized/i);
    const verified = run(['release-verify', '--root', out]);
    assert.equal(verified.status, 0, verified.stderr);
    assert.equal(JSON.parse(verified.stdout).outputs, JSON.parse(produced.stdout).outputs);
  } finally { rmSync(root, { recursive: true, force: true }); }
});
