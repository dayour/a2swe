import { readFileSync } from 'node:fs';
import { Ajv2020 } from 'ajv/dist/2020.js';
import { digest, parseDate, safeRelativePath, sha256, windowStart } from './canonical.ts';
import type { AssetInventory, AssetRecord, AssetRequest, ContentIR, DomainPack, FormatParityManifest, GenerationRequest, LibraryEntry, ReleasePlan, RenderSpec, ApprovalManifest, Runbook, SourceDocument, TaskResult, WorkItem } from './contracts.generated.d.ts';

export type { ArtifactRef, AssetInventory, AssetRecord, AssetRequest, ContentIR, DomainPack, FormatParityManifest, GenerationRequest, LibraryEntry, ReleasePlan, RenderSpec, ApprovalManifest, Runbook, SourceDocument, TaskResult, WorkItem } from './contracts.generated.d.ts';
const schema = JSON.parse(readFileSync(new URL('../schemas/contracts.schema.json', import.meta.url), 'utf8'));
const validator = new Ajv2020({ allErrors: true, strict: true });
validator.addSchema(schema);

type Contracts = {
  AssetRequest: AssetRequest; AssetRecord: AssetRecord; AssetInventory: AssetInventory; ContentIR: ContentIR; DomainPack: DomainPack;
  FormatParityManifest: FormatParityManifest; LibraryEntry: LibraryEntry; ReleasePlan: ReleasePlan; RenderSpec: RenderSpec; ApprovalManifest: ApprovalManifest;
  Runbook: Runbook; SourceDocument: SourceDocument; TaskResult: TaskResult; WorkItem: WorkItem; GenerationRequest: GenerationRequest
};

export function isContractName(name: string): name is keyof Contracts {
  return schema.oneOf.some((entry: { $ref: string }) => entry.$ref === `#/$defs/${name}`);
}

export function validate<Name extends keyof Contracts>(name: Name, value: unknown): Contracts[Name] {
  const check = validator.getSchema(`${schema.$id}#/$defs/${name}`);
  if (!check || !check(value)) throw new Error(`invalid_contract: ${name}: ${validator.errorsText(check?.errors)}`);
  if (name === 'SourceDocument') validateSource(value as SourceDocument);
  if (name === 'DomainPack') validateDomain(value as DomainPack);
  if (name === 'ContentIR') validateContent(value as ContentIR);
  if (name === 'RenderSpec') validateRenderSpec(value as RenderSpec);
  if (name === 'ApprovalManifest') validateApprovalManifest(value as ApprovalManifest);
  if (name === 'FormatParityManifest') validateParity(value as FormatParityManifest);
  if (name === 'AssetInventory') validateInventory(value as AssetInventory);
  if (name === 'ReleasePlan') validateReleasePlan(value as ReleasePlan);
  if (name === 'Runbook') validateRunbook(value as Runbook);
  if (name === 'GenerationRequest') {
    const request = value as GenerationRequest;
    if (!request.name.trim() || !request.brief.trim()) throw new Error('empty_generation_request');
    if (!safeRelativePath(`projects/${request.id}`) || request.libraryPaths.some(filename => !safeRelativePath(filename))) {
      throw new Error('unsafe_generation_path');
    }
    for (const source of request.sources) {
      const url = new URL(source);
      if (!['https:', 'http:'].includes(url.protocol) || url.username || url.password) throw new Error('invalid_generation_source');
    }
  }
  if (name === 'AssetRequest') {
    const request = value as AssetRequest;
    validateAltText(request.alt);
    if (request.role === 'official_mark' && request.method !== 'import') throw new Error('official_mark_requires_import');
    if (request.method === 'diagram' && (request.role !== 'diagram' || request.nodes.length < 2 || request.width < 960 || request.height < 540
      || request.width * 9 !== request.height * 16)) throw new Error('invalid_diagram_layout');
    if (request.method !== 'diagram' && request.nodes.length) throw new Error('unexpected_diagram_nodes');
  }
  if (name === 'AssetRecord') {
    const record = value as AssetRecord;
    validateAltText(record.alt);
    if (record.role === 'official_mark' && record.origin.method !== 'import') throw new Error('official_mark_requires_import');
    if (record.artifact.mediaType !== 'image/png') throw new Error('invalid_asset_media_type');
    if (!Number.isFinite(Date.parse(record.createdAt))) throw new Error('invalid_asset_date');
    if (record.origin.method === 'import' && !record.origin.sourceUrl) throw new Error('missing_asset_source_url');
    if (record.origin.method !== 'import' && record.origin.sourceUrl !== null) throw new Error('unexpected_asset_source_url');
    if (record.origin.sourceUrl) {
      const url = new URL(record.origin.sourceUrl);
      if (url.username || url.password || url.protocol !== 'https:') throw new Error('invalid_source_url');
    }
    if (record.quality && (record.quality.nonTransparentPixelRatio <= 0 || record.quality.luminanceRange < 8)) throw new Error('invalid_asset_quality');
  }
  return value as Contracts[Name];
}

function validateAltText(alt: string): void {
  const trimmed = alt.trim();
  if (trimmed !== alt || !/[A-Za-z0-9]/.test(alt) || /^((image|picture|photo|graphic) of|todo|n\/a$)/i.test(alt)) throw new Error('invalid_alt_text');
}

function validateInstant(value: string): void {
  const normalized = value.includes('.') ? value : value.replace('Z', '.000Z');
  if (!Number.isFinite(Date.parse(value)) || new Date(value).toISOString() !== normalized) throw new Error('invalid_instant');
}

function validateSource(source: SourceDocument): void {
  if (source.publicationDate) parseDate(source.publicationDate);
  if (source.modifiedDate) parseDate(source.modifiedDate);
  const url = new URL(source.canonicalUrl);
  if (url.protocol !== 'https:' || url.username || url.password) throw new Error('invalid_source_url');
  if (!Number.isFinite(Date.parse(source.retrievedAt))) throw new Error('invalid_retrieval_date');
  validateInstant(source.retrievedAt);
  if (source.publicationDate && !source.dateEvidence.trim()) throw new Error('missing_date_evidence');
}

function uniqueBy<Value>(values: Value[], key: (value: Value) => string): Map<string, Value> {
  const map = new Map(values.map((value) => [key(value), value]));
  if (map.size !== values.length) throw new Error('duplicate_reference');
  return map;
}

function validateDomain(domain: DomainPack): void {
  if (windowStart(domain.asOf) !== domain.windowStart) throw new Error('invalid_freshness_window');
  const sources = uniqueBy(domain.sources, (source) => source.sourceId);
  for (const source of domain.sources) {
    validateSource(source);
    if (source.domainId !== domain.domainId) throw new Error('cross_domain_reference');
  }
  const evidence = uniqueBy(domain.evidence, (span) => span.evidenceId);
  for (const span of domain.evidence) {
    if (sources.get(span.sourceId)?.contentHash !== span.sourceDigest) throw new Error('invalid_source_reference');
    if (sha256(span.quote) !== span.quoteDigest) throw new Error('invalid_quote_digest');
  }
  uniqueBy(domain.claims, (claim) => claim.claimId);
  for (const claim of domain.claims) {
    if (claim.evidenceIds.some((id) => !evidence.has(id))) throw new Error('invalid_evidence_reference');
  }
  if (domain.state === 'ready' && (!sources.size || !evidence.size || !domain.claims.length
    || domain.claims.some((claim) => claim.disposition !== 'supported' || !claim.evidenceIds.length))) {
    throw new Error('domain_ready_requires_supported_evidence');
  }
}

function validateContent(content: ContentIR): void {
  const claims = uniqueBy(content.claims, (claim) => claim.claimId);
  const citations = uniqueBy(content.citations, (citation) => citation.evidenceId);
  const assets = uniqueBy(content.assets, (asset) => asset.assetId);
  for (const citation of content.citations) {
    validateSource({ schemaVersion: '1.0.0', sourceId: citation.evidenceId, domainId: content.contentId,
      canonicalUrl: citation.canonicalUrl, publisher: 'content-citation', title: citation.sourceTitle,
      publicationDate: null, modifiedDate: null, retrievedAt: citation.retrievedAt, dateEvidence: '', contentHash: sha256(citation.sourceTitle) });
  }
  for (const asset of content.assets) validateAltText(asset.alt);
  for (const claim of content.claims) {
    if (claim.evidenceIds.some((id) => !citations.has(id))) throw new Error('invalid_content_evidence_reference');
  }
  uniqueBy(content.sections, (section) => section.sectionId);
  for (const section of content.sections) {
    if (section.claimIds.some((id) => !claims.has(id))) throw new Error('invalid_content_claim_reference');
    if (section.assetIds.some((id) => !assets.has(id))) throw new Error('invalid_content_asset_reference');
    if (section.visual) validateVisual(section.visual);
  }
}

const MERMAID_DIAGRAMS = /^(flowchart|graph|sequenceDiagram|classDiagram|stateDiagram(-v2)?|erDiagram|journey|gantt|pie|mindmap|timeline|gitGraph|quadrantChart|requirementDiagram|sankey-beta|xychart-beta|block-beta|architecture-beta|packet-beta|kanban|C4Context|C4Container|C4Component|C4Dynamic|C4Deployment)\b/;
const EXCALIDRAW_ELEMENTS = new Set(['rectangle', 'diamond', 'ellipse', 'arrow', 'line', 'text', 'freedraw', 'image', 'frame', 'magicframe', 'embeddable', 'iframe']);

function validateVisual(visual: NonNullable<ContentIR['sections'][number]['visual']>): void {
  if (visual.caption.trim() !== visual.caption) throw new Error('invalid_visual_caption');
  if (visual.kind === 'mermaid') {
    const first = visual.source.split(/\r?\n/).map((line) => line.trim()).find((line) => line && !line.startsWith('%%'));
    if (!first || !MERMAID_DIAGRAMS.test(first)) throw new Error('invalid_mermaid_visual');
    if (/<\s*script|javascript:/i.test(visual.source)) throw new Error('unsafe_visual_source');
  } else if (visual.kind === 'excalidraw') {
    let parsed: unknown;
    try { parsed = JSON.parse(visual.source); } catch { throw new Error('invalid_excalidraw_visual'); }
    const elements = Array.isArray(parsed) ? parsed : (parsed as { elements?: unknown })?.elements;
    if (!Array.isArray(elements) || !elements.length || elements.length > 500) throw new Error('invalid_excalidraw_visual');
    for (const element of elements) {
      const type = (element as { type?: unknown })?.type;
      if (typeof type !== 'string' || !EXCALIDRAW_ELEMENTS.has(type) || type === 'image' || type === 'embeddable' || type === 'iframe') throw new Error('invalid_excalidraw_visual');
    }
  } else {
    if (/^\s*---/.test(visual.source) || /<\s*(script|iframe|object)|javascript:/i.test(visual.source)) throw new Error('unsafe_visual_source');
  }
}

export function validateContentAgainstDomain(contentInput: unknown, domainInput: unknown): { content: ContentIR; domain: DomainPack } {
  const content = validate('ContentIR', contentInput);
  const domain = validate('DomainPack', domainInput);
  if (domain.state !== 'ready' || digest(domain) !== content.domainDigest) throw new Error('release_domain_not_ready_or_mismatched');
  const claims = new Map(domain.claims.map((claim) => [claim.claimId, claim]));
  const evidence = new Map(domain.evidence.map((span) => [span.evidenceId, span]));
  const sources = new Map(domain.sources.map((source) => [source.sourceId, source]));
  const cited = new Set<string>();
  for (const claim of content.claims) {
    const sourceClaim = claims.get(claim.claimId);
    if (!sourceClaim || sourceClaim.disposition !== 'supported' || sourceClaim.wording !== claim.text
      || claim.evidenceIds.length !== sourceClaim.evidenceIds.length
      || claim.evidenceIds.some((id) => !sourceClaim.evidenceIds.includes(id))) throw new Error(`release_claim_not_supported: ${claim.claimId}`);
    for (const id of claim.evidenceIds) cited.add(id);
  }
  if (cited.size !== content.citations.length) throw new Error('release_citation_scope_mismatch');
  for (const citation of content.citations) {
    const span = evidence.get(citation.evidenceId);
    const source = span && sources.get(span.sourceId);
    if (!cited.has(citation.evidenceId) || !source || citation.canonicalUrl !== source.canonicalUrl
      || citation.sourceTitle !== source.title || citation.retrievedAt !== source.retrievedAt) {
      throw new Error(`release_citation_mismatch: ${citation.evidenceId}`);
    }
  }
  return { content, domain };
}

function validateRenderSpec(spec: RenderSpec): void {
  if (spec.contentDigest === digest(spec)) throw new Error('render_spec_self_digest');
  if (spec.video.width * 9 !== spec.video.height * 16) throw new Error('invalid_video_aspect_ratio');
}

function validateApprovalManifest(manifest: ApprovalManifest): void {
  uniqueBy(manifest.selectedAssets, (asset) => asset.assetId);
  validateInstant(manifest.reviewedAt);
  for (const asset of manifest.selectedAssets) {
    if (!asset.basis.trim()) throw new Error('incomplete_asset_approval');
  }
}
function validateInventory(inventory: AssetInventory): void {
  uniqueBy(inventory.entries, (entry) => entry.path);
  for (const entry of inventory.entries) {
    if (!safeRelativePath(entry.path)) throw new Error('unsafe_asset_inventory_path');
    if ((entry.kind === 'selected') !== (entry.sectionId === null)) throw new Error('invalid_asset_inventory_origin');
  }
}
function validateParity(manifest: FormatParityManifest): void {
  const paths = uniqueBy(manifest.outputs, (output) => output.path);
  if (paths.size !== manifest.outputs.length) throw new Error('duplicate_output_path');
  for (const output of manifest.outputs) {
    if (!safeRelativePath(output.path)) throw new Error('unsafe_output_path');
    if (output.contentDigest !== manifest.contentDigest) throw new Error('format_parity_content_mismatch');
  }
}

function validateRunbook(runbook: Runbook): void {
  validateInstant(runbook.updatedAt);
  const stages = uniqueBy(runbook.stages, (stage) => stage.name);
  if (!stages.has(runbook.stage)) throw new Error('unknown_runbook_stage');
  const gates = uniqueBy(runbook.gates, (gate) => gate.name);
  const artifacts = uniqueBy(runbook.artifacts, (artifact) => artifact.path);
  for (const gate of gates.values()) {
    if (gate.status === 'passed' ? !gate.evidencePath || !gate.evidenceDigest : gate.evidencePath !== null || gate.evidenceDigest !== null) {
      throw new Error('invalid_runbook_gate_evidence');
    }
    if (gate.evidencePath && !safeRelativePath(gate.evidencePath)) throw new Error('unsafe_runbook_path');
    if (gate.status === 'passed' && artifacts.get(gate.evidencePath!)?.digest !== gate.evidenceDigest) {
      throw new Error('runbook_untracked_gate_evidence');
    }
  }
  for (const [index, stage] of runbook.stages.entries()) {
    if (stage.dependencies.some((name) => !stages.has(name) || runbook.stages.findIndex((item) => item.name === name) >= index)) {
      throw new Error('invalid_runbook_dependency');
    }
    if (stage.status === 'complete' && (!stage.evidencePaths.length || stage.dependencies.some((name) => stages.get(name)?.status !== 'complete'))) {
      throw new Error('runbook_stage_missing_evidence_or_dependency');
    }
    for (const evidencePath of stage.evidencePaths) {
      if (!safeRelativePath(evidencePath)) throw new Error('unsafe_runbook_path');
      if (stage.status === 'complete' && !artifacts.has(evidencePath)) throw new Error('runbook_untracked_evidence');
    }
  }
  for (const artifact of artifacts.values()) {
    if (!safeRelativePath(artifact.path)) throw new Error('unsafe_runbook_path');
    if (!stages.has(artifact.stage)) throw new Error('runbook_unknown_artifact_stage');
  }
}
function validateReleasePlan(plan: ReleasePlan): void {
  const expected = digest({ contentDigest: plan.contentDigest, domainDigest: plan.domainDigest, formats: plan.formats,
    renderSpecDigest: plan.renderSpecDigest, approvalDigest: plan.approvalDigest, schemaVersion: plan.schemaVersion,
    styleDigest: plan.styleDigest, voiceDigest: plan.voiceDigest });
  if (plan.releaseDigest !== expected) throw new Error('release_digest_mismatch');
}