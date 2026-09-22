import assert from 'node:assert/strict';
import { generateKeyPairSync, sign } from 'node:crypto';
import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { canonicalJson, digest, sha256 } from '../../packages/core/src/canonical.ts';
import { renderFiles } from '../../packages/core/src/adapters.ts';
import { createReleasePlan, releaseSubject, verifyReleaseCandidate, writeReleaseCandidate } from '../../packages/core/src/release.ts';
import { validate } from '../../packages/core/src/contracts.ts';
import type { ApprovalScope, ApprovalStatement, ReviewPolicy } from '../../packages/core/src/approvals.ts';

const cli = fileURLToPath(new URL('../../packages/core/src/cli.ts', import.meta.url));
const run = (args: string[]) => spawnSync(process.execPath, [cli, ...args], { encoding: 'utf8' });
const domainDigest = sha256('domain');
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

function rights(contentDigest = digest(content())) {
  return {
    schemaVersion: '1.0.0', manifestId: 'rights-fixture', domainDigest, contentDigest, reviewedAt: '2026-09-18T00:00:00Z',
    selectedAssets: [{ assetId: 'diagram-1', assetDigest, grantBasis: 'Synthetic fixture owned by test author',
      useScope: 'Automated release candidate tests', redistribution: 'permitted_with_attribution', expiresAt: '2099-01-01',
      attribution: 'Synthetic a2swe fixture', reviewerId: 'rights-reviewer', evidenceDigest: sha256('rights-evidence'), status: 'approved' }]
  };
}

function policyAndApprovals(plan = createReleasePlan(content(), renderSpec(), rights())) {
  const producer = generateKeyPairSync('ed25519');
  const editor = generateKeyPairSync('ed25519');
  const qa = generateKeyPairSync('ed25519');
  const policy: ReviewPolicy = { producerId: 'producer', revokedSignatures: [], reviewers: [
    { reviewerId: 'editor', publicKey: editor.publicKey.export({ type: 'spki', format: 'pem' }).toString(), scopes: ['content', 'style', 'voice'] },
    { reviewerId: 'qa', publicKey: qa.publicKey.export({ type: 'spki', format: 'pem' }).toString(), scopes: ['release'] },
    { reviewerId: 'producer', publicKey: producer.publicKey.export({ type: 'spki', format: 'pem' }).toString(), scopes: ['content', 'style', 'voice', 'release'] }
  ] };
  const evidenceDigest = sha256('approval-evidence');
  function approval(scope: ApprovalScope, reviewerId: 'editor' | 'qa' | 'producer' = scope === 'release' ? 'qa' : 'editor') {
    const key = reviewerId === 'qa' ? qa.privateKey : reviewerId === 'producer' ? producer.privateKey : editor.privateKey;
    const statement: ApprovalStatement = { schemaVersion: '1.0.0', reviewerId, scope, subjectDigest: releaseSubject(plan), evidenceDigest,
      decision: 'approve', issuedAt: '2020-01-01T00:00:00Z', expiresAt: '2099-01-01T00:00:00Z' };
    return { statement, signature: sign(null, Buffer.from(canonicalJson(statement)), key).toString('base64') };
  }
  return { policy, bundle: { schemaVersion: '1.0.0', bundleId: 'approval-fixture', producerId: 'producer', domainDigest: plan.domainDigest,
    contentDigest: plan.contentDigest, styleDigest: plan.styleDigest, voiceDigest: plan.voiceDigest, releaseDigest: plan.releaseDigest,
    evidenceDigest, approvals: [approval('content'), approval('style'), approval('voice'), approval('release')] }, producerApproval: approval };
}

test('ContentIR and RenderSpec contracts reject dangling references and digest drift', () => {
  assert.equal(validate('ContentIR', content()).contentId, 'release-fixture');
  assert.throws(() => validate('ContentIR', { ...content(), sections: [{ ...content().sections[0], claimIds: ['missing'] }] }), /claim_reference/);
  assert.throws(() => validate('ContentIR', { ...content(), claims: [{ ...content().claims[0], evidenceIds: ['missing'] }] }), /evidence_reference/);
  assert.equal(validate('RenderSpec', renderSpec()).renderId, 'render-fixture');
  assert.throws(() => renderFiles(content(), renderSpec(sha256('changed'))), /content_digest_mismatch/);
});

test('adapters deterministically produce editable/searchable/self-contained foundations with one content digest', () => {
  const files = renderFiles(content(), renderSpec());
  assert.deepEqual(files.map((file) => file.path), ['outputs/index.html', 'outputs/deck.deck.json', 'outputs/deck.pptx',
    'outputs/document.docx', 'outputs/document.pdf', 'outputs/remotion/render-plan.json', 'outputs/remotion/package.json',
    'outputs/remotion/timeline.json', 'outputs/remotion/tsconfig.json', 'outputs/remotion/remotion.config.ts',
    'outputs/remotion/src/content.json', 'outputs/remotion/src/index.tsx', 'outputs/remotion/src/Root.tsx']);
  assert.deepEqual(files.map((file) => sha256(file.bytes)), renderFiles(content(), renderSpec()).map((file) => sha256(file.bytes)));
  assert.match(files.find((file) => file.format === 'html')!.bytes.toString('utf8'), /<meta name="viewport"/);
  assert.match(files.find((file) => file.format === 'pdf')!.bytes.toString('utf8'), /Every format is generated/);
  assert.match(files.find((file) => file.path.endsWith('render-plan.json'))!.bytes.toString('utf8'), /"encodedMp4": false/);
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
  assert.equal(remotionPlan.template, 'a2swe-production-template-v2');
  assert.equal('approvalState' in remotionPlan, false);
  assert.equal('watermark' in remotionPlan, false);
  assert.equal(remotionPlan.encodedMp4, false);
  assert.deepEqual(remotionPlan.commands, { preview: 'npm run preview', render: 'npm run render', qc: 'npm run qc' });
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
  assert.match(remotionPackage.scripts.render, /^remotion render src\/index\.tsx release-fixture dist\/render\.mp4$/);
  assert.equal(remotionPackage.scripts.typecheck, 'tsc --noEmit');
  assert.match(remotionPackage.scripts.qc, /timeline\.json/);
  const remotionTimeline = JSON.parse(files.find((file) => file.path.endsWith('timeline.json'))!.bytes.toString('utf8'));
  assert.equal(remotionTimeline.durationInFrames, renderSpec().video.durationSeconds * renderSpec().video.fps);
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
  const remotionRoot = files.find((file) => file.path.endsWith('Root.tsx'))!.bytes.toString('utf8');
  assert.match(remotionRoot, /SceneView/);
  assert.match(remotionRoot, /Decision/);
  assert.match(remotionRoot, /Claims and citations/);
  assert.doesNotMatch(remotionRoot, /Math\.floor\(frame \/ \(fps \* 5\)\)|slides\[index\]/);
  assert.match(files.find((file) => file.path.endsWith('index.tsx'))!.bytes.toString('utf8'), /registerRoot\(Root\)/);
  assert.doesNotMatch(remotionRoot, /UNAPPROVED REVIEW CANDIDATE|review_candidate_unapproved|review-candidate/i);
  for (const file of files) assert.doesNotMatch(file.bytes.toString('utf8'), /UNAPPROVED REVIEW CANDIDATE|review_candidate_unapproved|review-candidate/i);
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
  assert.match(slide2, /vertOverflow="clip" horzOverflow="clip"/);
  assert.match(slide2, /<a:off x="685800" y="571500"\/><a:ext cx="10668000" cy="960000"\/>/);
  assert.match(slide2, /<a:off x="685800" y="1660000"\/><a:ext cx="7315200" cy="2580000"\/>/);
  assert.ok((slide2.match(/<a:p>/g) ?? []).length <= 24, 'visible slide text should be bounded to prevent overlap');
  assert.doesNotMatch(slide2, new RegExp(longBody.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
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

test('explicit review adapter mode adds review-only AdaptiveDeck and Remotion markers', () => {
  const files = renderFiles(content(), renderSpec(), { reviewCandidate: true });
  const adaptive = JSON.parse(files.find((file) => file.format === 'adaptiveDeck')!.bytes.toString('utf8'));
  assert.deepEqual(adaptive.metadata.tags, ['a2swe', 'canonical', 'review-candidate']);
  const remotionPlan = JSON.parse(files.find((file) => file.path.endsWith('render-plan.json'))!.bytes.toString('utf8'));
  assert.equal(remotionPlan.approvalState, 'review_candidate_unapproved');
  assert.equal(remotionPlan.watermark, 'UNAPPROVED REVIEW CANDIDATE');
  assert.match(files.find((file) => file.path.endsWith('Root.tsx'))!.bytes.toString('utf8'), /UNAPPROVED REVIEW CANDIDATE/);
});

test('release candidate fails closed on rights and approvals, then verifies exact output digests', async () => {
  const plan = createReleasePlan(content(), renderSpec(), rights());
  const { policy, bundle, producerApproval } = policyAndApprovals(plan);
  const root = mkdtempSync(path.join(os.tmpdir(), 'a2swe-release-'));
  rmSync(root, { recursive: true, force: true });
  const pending = { ...rights(), selectedAssets: [{ ...rights().selectedAssets[0], status: 'pending' }] };
  await assert.rejects(() => writeReleaseCandidate(root, content(), renderSpec(), pending, bundle, policy), /rights/);
  assert.equal(existsSync(root), false);
  const selfCertified = { ...bundle, approvals: [producerApproval('content', 'producer'), producerApproval('style', 'producer'),
    producerApproval('voice', 'producer'), producerApproval('release', 'producer')] };
  await assert.rejects(() => writeReleaseCandidate(root, content(), renderSpec(), rights(), selfCertified, policy), /untrusted|independent/);
  const parity = await writeReleaseCandidate(root, content(), renderSpec(), rights(), bundle, policy);
  assert.equal(parity.releaseDigest, plan.releaseDigest);
  assert.equal((await verifyReleaseCandidate(root, policy)).outputs.length, 13);
  writeFileSync(path.join(root, 'outputs', 'index.html'), 'tampered');
  await assert.rejects(() => verifyReleaseCandidate(root, policy), /output_mismatch/);
  rmSync(root, { recursive: true, force: true });
});

test('CLI plans, produces and verifies release candidates without claiming MP4 encoding', () => {
  const root = mkdtempSync(path.join(os.tmpdir(), 'a2swe-cli-release-'));
  try {
    const contentFile = path.join(root, 'content.json');
    const renderFile = path.join(root, 'render.json');
    const rightsFile = path.join(root, 'rights.json');
    const planFile = path.join(root, 'plan.json');
    writeFileSync(contentFile, JSON.stringify(content()));
    writeFileSync(renderFile, JSON.stringify(renderSpec()));
    writeFileSync(rightsFile, JSON.stringify(rights()));
    const planned = run(['release-plan', '--content', contentFile, '--render', renderFile, '--rights', rightsFile, '--out', planFile]);
    assert.equal(planned.status, 0, planned.stderr);
    const plan = JSON.parse(readFileSync(planFile, 'utf8'));
    const { policy, bundle } = policyAndApprovals(plan);
    const approvalsFile = path.join(root, 'approvals.json');
    const trustFile = path.join(root, 'trust.json');
    const out = path.join(root, 'candidate');
    writeFileSync(approvalsFile, JSON.stringify(bundle));
    writeFileSync(trustFile, JSON.stringify(policy));
    const produced = run(['release-produce', '--content', contentFile, '--render', renderFile, '--rights', rightsFile,
      '--approvals', approvalsFile, '--trust', trustFile, '--out', out]);
    assert.equal(produced.status, 0, produced.stderr);
    const productionArtifacts = [
      path.join(out, 'outputs', 'index.html'),
      path.join(out, 'outputs', 'deck.deck.json'),
      path.join(out, 'outputs', 'document.pdf'),
      path.join(out, 'outputs', 'remotion', 'render-plan.json'),
      path.join(out, 'outputs', 'remotion', 'src', 'Root.tsx')
    ].map((file) => readFileSync(file, 'utf8')).join('\n');
    assert.match(productionArtifacts, /"encodedMp4": false/);
    assert.doesNotMatch(productionArtifacts, /UNAPPROVED REVIEW CANDIDATE|review_candidate_unapproved|review-candidate/i);
    const verified = run(['release-verify', '--root', out, '--trust', trustFile]);
    assert.equal(verified.status, 0, verified.stderr);
    assert.equal(JSON.parse(verified.stdout).outputs, 13);
  } finally { rmSync(root, { recursive: true, force: true }); }
});

test('CLI emits visibly unapproved pre-approval review candidates without accepting fabricated signatures', () => {
  const root = mkdtempSync(path.join(os.tmpdir(), 'a2swe-cli-review-candidate-'));
  try {
    const contentFile = path.join(root, 'content.json');
    const renderFile = path.join(root, 'render.json');
    const rightsFile = path.join(root, 'rights.json');
    const out = path.join(root, 'review-candidate');
    writeFileSync(contentFile, JSON.stringify(content()));
    writeFileSync(renderFile, JSON.stringify(renderSpec()));
    writeFileSync(rightsFile, JSON.stringify({ ...rights(), selectedAssets: [{ ...rights().selectedAssets[0], status: 'pending' }] }));
    const produced = run(['release-review-candidate', '--content', contentFile, '--render', renderFile, '--rights', rightsFile, '--out', out]);
    assert.equal(produced.status, 0, produced.stderr);
    const response = JSON.parse(produced.stdout);
    assert.equal(response.approvalState, 'unapproved');
    assert.equal(response.productionEligible, false);
    const manifest = JSON.parse(readFileSync(path.join(out, 'review-candidate-manifest.json'), 'utf8'));
    assert.equal(manifest.productionEligible, false);
    const reviewDeck = JSON.parse(readFileSync(path.join(out, 'outputs', 'deck.deck.json'), 'utf8'));
    assert.ok(reviewDeck.metadata.tags.includes('review-candidate'));
    assert.match(readFileSync(path.join(out, 'outputs', 'remotion', 'render-plan.json'), 'utf8'), /review_candidate_unapproved/);
    assert.match(readFileSync(path.join(out, 'outputs', 'remotion', 'src', 'Root.tsx'), 'utf8'), /UNAPPROVED REVIEW CANDIDATE/);
    assert.match(readFileSync(path.join(out, 'outputs', 'index.html'), 'utf8'), /UNAPPROVED REVIEW CANDIDATE/);
    assert.match(readFileSync(path.join(out, 'outputs', 'document.pdf'), 'utf8'), /UNAPPROVED REVIEW CANDIDATE/);
    assert.equal(run(['release-verify', '--root', out]).status, 1);
  } finally { rmSync(root, { recursive: true, force: true }); }
});
