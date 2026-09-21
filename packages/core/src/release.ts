import { mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { digest, sha256 } from './canonical.ts';
import { validate } from './contracts.ts';
import type { ApprovalBundle, ContentIR, FormatParityManifest, ReleasePlan, RenderSpec, RightsManifest } from './contracts.ts';
import { verifyApproval } from './approvals.ts';
import type { ApprovalScope, ReviewPolicy } from './approvals.ts';
import { renderFiles } from './adapters.ts';

function styleDigest(spec: RenderSpec): string {
  return digest(spec.theme);
}

function voiceDigest(content: ContentIR): string {
  return digest(content.voice);
}

export function releaseSubject(plan: ReleasePlan): string {
  return digest({ contentDigest: plan.contentDigest, domainDigest: plan.domainDigest, releaseDigest: plan.releaseDigest,
    styleDigest: plan.styleDigest, voiceDigest: plan.voiceDigest });
}

export function createReleasePlan(contentInput: unknown, renderInput: unknown, rightsInput: unknown): ReleasePlan {
  const content = validate('ContentIR', contentInput);
  const renderSpec = validate('RenderSpec', renderInput);
  const rights = validate('RightsManifest', rightsInput);
  const contentDigest = digest(content);
  const renderSpecDigest = digest(renderSpec);
  const rightsDigest = digest(rights);
  if (renderSpec.contentDigest !== contentDigest || rights.contentDigest !== contentDigest || rights.domainDigest !== content.domainDigest) {
    throw new Error('release_input_digest_mismatch');
  }
  const draft = { schemaVersion: '1.0.0' as const, contentDigest, renderSpecDigest, rightsDigest,
    domainDigest: content.domainDigest, styleDigest: styleDigest(renderSpec), voiceDigest: voiceDigest(content), formats: renderSpec.formats };
  return validate('ReleasePlan', { ...draft, releaseDigest: digest(draft) });
}

function requireApprovedRights(content: ContentIR, rights: RightsManifest, now: number): void {
  const grants = new Map(rights.selectedAssets.map((asset) => [asset.assetId, asset]));
  for (const asset of content.assets) {
    const grant = grants.get(asset.assetId);
    if (!grant || grant.assetDigest !== asset.digest) throw new Error('asset_rights_missing');
    if (grant.status !== 'approved') throw new Error('asset_rights_not_approved');
    if (grant.redistribution === 'not_permitted' || grant.redistribution === 'internal_only') throw new Error('asset_redistribution_not_permitted');
    if (grant.expiresAt && Date.parse(`${grant.expiresAt}T23:59:59.999Z`) < now) throw new Error('asset_rights_expired');
  }
  for (const grant of rights.selectedAssets) {
    if (grant.status === 'pending') throw new Error('asset_rights_pending');
  }
}

export function verifyApprovalBundle(input: unknown, plan: ReleasePlan, policy: ReviewPolicy, now = Date.now()): ApprovalBundle {
  const bundle = validate('ApprovalBundle', input);
  if (bundle.producerId !== policy.producerId || bundle.domainDigest !== plan.domainDigest || bundle.contentDigest !== plan.contentDigest
    || bundle.styleDigest !== plan.styleDigest || bundle.voiceDigest !== plan.voiceDigest || bundle.releaseDigest !== plan.releaseDigest) {
    throw new Error('approval_bundle_digest_mismatch');
  }
  const subject = releaseSubject(plan);
  const verified = new Map<ApprovalScope, string>();
  for (const scope of ['content', 'style', 'voice', 'release'] as const) {
    const candidates = bundle.approvals.filter((approval) => approval.statement.scope === scope);
    if (candidates.length !== 1) throw new Error('unique_approval_required');
    const approval = verifyApproval(candidates[0], scope, subject, bundle.evidenceDigest, policy, now);
    verified.set(scope, approval.statement.reviewerId);
  }
  if (new Set(verified.values()).size < 2 || verified.get('release') === verified.get('content')) throw new Error('independent_review_required');
  return bundle;
}

async function writeJson(filename: string, value: unknown): Promise<void> {
  await writeFile(filename, `${JSON.stringify(value, null, 2)}\n`, { flag: 'wx', mode: 0o600 });
}

function destination(root: string, relative: string): string {
  const resolved = path.resolve(root, ...relative.split('/'));
  const base = path.resolve(root);
  if (resolved !== base && !resolved.startsWith(`${base}${path.sep}`)) throw new Error('unsafe_release_path');
  return resolved;
}

export async function writeReleaseCandidate(directory: string, contentInput: unknown, renderInput: unknown, rightsInput: unknown,
  approvalsInput: unknown, policy: ReviewPolicy, now = Date.now()): Promise<FormatParityManifest> {
  const content = validate('ContentIR', contentInput);
  const renderSpec = validate('RenderSpec', renderInput);
  const rights = validate('RightsManifest', rightsInput);
  const plan = createReleasePlan(content, renderSpec, rights);
  requireApprovedRights(content, rights, now);
  const approvals = verifyApprovalBundle(approvalsInput, plan, policy, now);
  const files = renderFiles(content, renderSpec);
  const root = path.resolve(directory);
  await mkdir(root, { recursive: false, mode: 0o700 });
  try {
    for (const file of files) {
      const target = destination(root, file.path);
      await mkdir(path.dirname(target), { recursive: true });
      await writeFile(target, file.bytes, { flag: 'wx', mode: 0o600 });
    }
    const parity = validate('FormatParityManifest', { schemaVersion: '1.0.0', contentDigest: plan.contentDigest,
      renderSpecDigest: plan.renderSpecDigest, releaseDigest: plan.releaseDigest,
      outputs: files.map((file) => ({ format: file.format, path: file.path, digest: sha256(file.bytes), mediaType: file.mediaType,
        byteSize: file.bytes.length, contentDigest: plan.contentDigest, adapter: file.adapter })) });
    await writeJson(path.join(root, 'content-ir.json'), content);
    await writeJson(path.join(root, 'render-spec.json'), renderSpec);
    await writeJson(path.join(root, 'rights-manifest.json'), rights);
    await writeJson(path.join(root, 'approval-bundle.json'), approvals);
    await writeJson(path.join(root, 'release-plan.json'), plan);
    await writeJson(path.join(root, 'parity-manifest.json'), parity);
    return parity;
  } catch (error) {
    await rm(root, { recursive: true, force: true });
    throw error;
  }
}

export async function verifyReleaseCandidate(directory: string, policy?: ReviewPolicy, now = Date.now()): Promise<FormatParityManifest> {
  const root = path.resolve(directory);
  const content = validate('ContentIR', JSON.parse(await readFile(path.join(root, 'content-ir.json'), 'utf8')));
  const renderSpec = validate('RenderSpec', JSON.parse(await readFile(path.join(root, 'render-spec.json'), 'utf8')));
  const rights = validate('RightsManifest', JSON.parse(await readFile(path.join(root, 'rights-manifest.json'), 'utf8')));
  const plan = validate('ReleasePlan', JSON.parse(await readFile(path.join(root, 'release-plan.json'), 'utf8')));
  const parity = validate('FormatParityManifest', JSON.parse(await readFile(path.join(root, 'parity-manifest.json'), 'utf8')));
  const expected = createReleasePlan(content, renderSpec, rights);
  if (digest(plan) !== digest(expected) || parity.releaseDigest !== plan.releaseDigest || parity.contentDigest !== digest(content)) throw new Error('release_manifest_mismatch');
  requireApprovedRights(content, rights, now);
  if (policy) verifyApprovalBundle(JSON.parse(await readFile(path.join(root, 'approval-bundle.json'), 'utf8')), plan, policy, now);
  for (const output of parity.outputs) {
    const bytes = await readFile(destination(root, output.path));
    if (sha256(bytes) !== output.digest || bytes.length !== output.byteSize || output.contentDigest !== parity.contentDigest) throw new Error('release_output_mismatch');
  }
  return parity;
}
