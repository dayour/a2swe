import { readFileSync } from 'node:fs';
import { Ajv2020 } from 'ajv/dist/2020.js';
import { digest, parseDate, sha256, windowStart } from './canonical.ts';
import type { ApprovalBundle, AssetRecord, AssetRequest, ContentIR, DomainPack, FormatParityManifest, LibraryEntry, ReleasePlan, RenderSpec, RightsManifest, SourceDocument, TaskResult, WorkItem } from './contracts.generated.d.ts';

export type { ApprovalBundle, ArtifactRef, AssetRecord, AssetRequest, ContentIR, DomainPack, FormatParityManifest, LibraryEntry, ReleasePlan, RenderSpec, RightsManifest, SourceDocument, TaskResult, WorkItem } from './contracts.generated.d.ts';
const schema = JSON.parse(readFileSync(new URL('../schemas/contracts.schema.json', import.meta.url), 'utf8'));
const validator = new Ajv2020({ allErrors: true, strict: true });
validator.addSchema(schema);

type Contracts = {
  ApprovalBundle: ApprovalBundle; AssetRequest: AssetRequest; AssetRecord: AssetRecord; ContentIR: ContentIR; DomainPack: DomainPack;
  FormatParityManifest: FormatParityManifest; LibraryEntry: LibraryEntry; ReleasePlan: ReleasePlan; RenderSpec: RenderSpec; RightsManifest: RightsManifest;
  SourceDocument: SourceDocument; TaskResult: TaskResult; WorkItem: WorkItem
};

export function validate<Name extends keyof Contracts>(name: Name, value: unknown): Contracts[Name] {
  const check = validator.getSchema(`${schema.$id}#/$defs/${name}`);
  if (!check || !check(value)) throw new Error(`invalid_contract: ${name}: ${validator.errorsText(check?.errors)}`);
  if (name === 'SourceDocument') validateSource(value as SourceDocument);
  if (name === 'DomainPack') validateDomain(value as DomainPack);
  if (name === 'ContentIR') validateContent(value as ContentIR);
  if (name === 'RenderSpec') validateRenderSpec(value as RenderSpec);
  if (name === 'RightsManifest') validateRightsManifest(value as RightsManifest);
  if (name === 'ApprovalBundle') validateApprovalBundleShape(value as ApprovalBundle);
  if (name === 'FormatParityManifest') validateParity(value as FormatParityManifest);
  if (name === 'ReleasePlan') validateReleasePlan(value as ReleasePlan);
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
  if (domain.state === 'ready') throw new Error('approval_required: readiness certification is not implemented');
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
  }
}

function validateRenderSpec(spec: RenderSpec): void {
  if (spec.contentDigest === digest(spec)) throw new Error('render_spec_self_digest');
  if (spec.video.width * 9 !== spec.video.height * 16) throw new Error('invalid_video_aspect_ratio');
}

function validateRightsManifest(manifest: RightsManifest): void {
  uniqueBy(manifest.selectedAssets, (asset) => asset.assetId);
  validateInstant(manifest.reviewedAt);
  for (const asset of manifest.selectedAssets) {
    if (!asset.grantBasis.trim() || !asset.useScope.trim() || !asset.attribution.trim()) throw new Error('incomplete_rights_grant');
    if (asset.expiresAt !== null) parseDate(asset.expiresAt);
  }
}

function validateApprovalBundleShape(bundle: ApprovalBundle): void {
  const scopes = new Set(bundle.approvals.map((approval) => approval.statement.scope));
  for (const scope of ['content', 'style', 'voice', 'release'] as const) {
    if (!scopes.has(scope)) throw new Error('approval_bundle_missing_scope');
  }
  for (const approval of bundle.approvals) {
    validateInstant(approval.statement.issuedAt);
    validateInstant(approval.statement.expiresAt);
  }
}

function validateParity(manifest: FormatParityManifest): void {
  const paths = uniqueBy(manifest.outputs, (output) => output.path);
  if (paths.size !== manifest.outputs.length) throw new Error('duplicate_output_path');
  for (const output of manifest.outputs) {
    if (output.contentDigest !== manifest.contentDigest) throw new Error('format_parity_content_mismatch');
  }
}

function validateReleasePlan(plan: ReleasePlan): void {
  const expected = digest({ contentDigest: plan.contentDigest, domainDigest: plan.domainDigest, formats: plan.formats,
    renderSpecDigest: plan.renderSpecDigest, rightsDigest: plan.rightsDigest, schemaVersion: plan.schemaVersion,
    styleDigest: plan.styleDigest, voiceDigest: plan.voiceDigest });
  if (plan.releaseDigest !== expected) throw new Error('release_digest_mismatch');
}