import { readFile, writeFile, mkdir, rename, rm } from 'node:fs/promises';
import { randomUUID } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { userInfo } from 'node:os';
import path from 'node:path';
import { parseArgs } from 'node:util';
import { canonicalJson, digest, sha256, windowStart } from './canonical.ts';
import { validate } from './contracts.ts';
import { inventory } from './registry.ts';

async function writeJson(filename: string, data: unknown, exclusive = false): Promise<void> {
  const destination = path.resolve(filename);
  await mkdir(path.dirname(destination), { recursive: true });
  const text = `${JSON.stringify(data, null, 2)}\n`;
  if (exclusive) {
    await writeFile(destination, text, { flag: 'wx', mode: 0o600 });
    return;
  }
  const staging = `${destination}.${randomUUID()}.tmp`;
  try {
    await writeFile(staging, text, { flag: 'wx', mode: 0o600 });
    await rename(staging, destination);
  } finally { await rm(staging, { force: true }); }
}

function git(root: string, args: string[]): string {
  const result = spawnSync('git', ['-C', root, ...args], { encoding: 'utf8', maxBuffer: 16 * 1024 * 1024, timeout: 30000, windowsHide: true });
  if (result.error || result.status !== 0) throw new Error('git_snapshot_unavailable');
  return result.stdout;
}

async function main(): Promise<void> {
  const { values, positionals } = parseArgs({ allowPositionals: true, options: {
    root: { type: 'string' }, source: { type: 'string' }, kind: { type: 'string' }, out: { type: 'string' },
    file: { type: 'string' }, schema: { type: 'string' }, id: { type: 'string' }, name: { type: 'string' },
    'as-of': { type: 'string' }, state: { type: 'string' }, help: { type: 'boolean' },
    endpoint: { type: 'string' }, checkpoint: { type: 'string' }, url: { type: 'string' }, domain: { type: 'string' },
    review: { type: 'string' }, approvals: { type: 'string' }, trust: { type: 'string' },
    content: { type: 'string' }, render: { type: 'string' }, rights: { type: 'string' }
  } });
  const command = positionals[0];
  function required(name: keyof typeof values): string {
    const value = values[name];
    if (typeof value !== 'string' || !value.trim()) throw new Error(`missing_argument: --${name}`);
    return value;
  }
  if (!command || values.help) {
    console.log([
      'a2swe local CLI', '', 'Commands:',
      '  capabilities',
      '  inventory --root PATH --source ALIAS --kind repository|installed --out FILE',
      '  snapshot --root PATH --out FILE',
      '  validate --schema DomainPack|SourceDocument|WorkItem|TaskResult|LibraryEntry|AssetRequest|AssetRecord|RightsManifest|ContentIR|RenderSpec|ApprovalBundle|FormatParityManifest|ReleasePlan --file FILE',
      '  domain-init --id SLUG --name NAME --kind company|customer|topic|framework|repository|tool --as-of YYYY-MM-DD [--out FILE]',
      '  domain-certify --file DOMAIN --review REPORT --approvals SIGNATURES --trust POLICY [--out NEW_FILE]',
      '  job-submit --file FILE [--state DIRECTORY]',
      '  job-status --id TASK [--state DIRECTORY]',
      '  job-events --id TASK [--state DIRECTORY]',
      '  asset-generate --file REQUEST --out NEW_DIRECTORY',
      '  asset-import --file REQUEST --source RASTER --url HTTPS_PROVENANCE --out NEW_DIRECTORY',
      '  asset-fetch --file REQUEST --url HTTPS_RASTER --out NEW_DIRECTORY',
      '  asset-verify --root DIRECTORY',
      '  release-plan --content CONTENT_IR --render RENDER_SPEC --rights RIGHTS_MANIFEST --out NEW_FILE',
      '  release-produce --content CONTENT_IR --render RENDER_SPEC --rights RIGHTS_MANIFEST --approvals APPROVAL_BUNDLE --trust POLICY --out NEW_DIRECTORY',
      '  release-verify --root DIRECTORY [--trust POLICY]',
      '  asset-job-submit --file REQUEST --domain DOMAIN [--state DIRECTORY]',
      '  asset-job-run --id TASK [--state DIRECTORY]',
      '  asset-job-export --id TASK --out NEW_DIRECTORY [--state DIRECTORY]',
      '  asset-diffusion-submit --file REQUEST --endpoint http://127.0.0.1:8188 --checkpoint MODEL.safetensors --out NEW_RECEIPT',
      '  asset-diffusion-collect --file RECEIPT --out NEW_DIRECTORY', '',
      'Assets are evaluation candidates, never approved production. Output parent directories must exist.',
      'Diffusion uses a fixed loopback workflow; no cloud service or model download is invoked.',
      'Certification verifies configured reviewer keys, not arbitrary ready flags. Release production fails closed on pending rights or approvals.'
    ].join('\n'));
    return;
  }
  if (positionals.length !== 1) throw new Error('unexpected_positional_argument');
  if (command === 'domain-certify') {
    const { certifyDomain } = await import('./approvals.ts');
    const domain = JSON.parse(await readFile(required('file'), 'utf8'));
    const review = JSON.parse(await readFile(required('review'), 'utf8'));
    const approvals = JSON.parse(await readFile(required('approvals'), 'utf8'));
    const policy = JSON.parse(await readFile(required('trust'), 'utf8'));
    const certificate = certifyDomain(domain, review, approvals, policy);
    if (values.out) await writeJson(values.out, { domain, review, certificate }, true);
    console.log(JSON.stringify({ status: certificate.status, domainDigest: certificate.domainDigest, profileDigest: certificate.profileDigest,
      output: values.out ?? null, trustBoundary: 'Local configured reviewer keys; reverify on each use. Production jobs remain disabled.' }));
    return;
  }
  if (['asset-job-submit', 'asset-job-run', 'asset-job-export'].includes(command)) {
    const { submitAssetJob, runAssetJob, exportAssetJob } = await import('./asset-jobs.ts');
    const root = values.state ?? '.a2swe';
    const principal = userInfo().username;
    if (command === 'asset-job-submit') {
      const job = submitAssetJob(root, principal, JSON.parse(await readFile(required('file'), 'utf8')), JSON.parse(await readFile(required('domain'), 'utf8')));
      console.log(JSON.stringify({ taskId: job.taskId, state: job.state, inputDigest: job.inputDigest }));
    } else if (command === 'asset-job-run') {
      const job = await runAssetJob(root, principal, required('id'));
      console.log(JSON.stringify({ taskId: job.taskId, state: job.state, outputs: job.result?.outputs }));
    } else {
      await exportAssetJob(root, principal, required('id'), required('out'));
      console.log(JSON.stringify({ output: required('out'), status: 'evaluation_only' }));
    }
    return;
  }
  if (command === 'capabilities') {
    console.log(JSON.stringify({ schemaVersion: '1.0.0', node: process.version,
      implemented: ['passive_inventory', 'contract_validation', 'draft_intake', 'local_job_receipts', 'leases', 'checkpoints', 'artifact_hashes',
        'evaluation_asset_contracts', 'raster_normalization', 'semantic_diagram_generation', 'comfyui_loopback_adapter', 'asset_bundle_verification',
        'rights_manifest_contracts', 'approval_bundle_verification', 'content_ir_contracts', 'render_spec_contracts',
        'html_adapter', 'adaptive_deck_adapter', 'pptx_adapter', 'docx_adapter', 'pdf_adapter', 'remotion_render_plan_adapter', 'release_candidate_verification'],
      partial: ['bounded_public_raster_fetch', 'local_signed_domain_certification', 'durable_diagram_worker', 'optional_restricted_copilot_sdk_query'],
      unavailable: ['public_fetch', 'archive_import', 'copilot_reasoning', 'domain_ready', 'acp', 'mcp', 'media_approval', 'mp4_encoding'],
      trustBoundary: 'Trusted local OS user only; no network authentication or sandbox', sqlite: 'Node built-in experimental API' }, null, 2));
    return;
  }
  if (command === 'inventory' || command === 'snapshot') {
    const root = path.resolve(required('root'));
    const kind = command === 'snapshot' ? 'repository' : required('kind');
    if (kind !== 'repository' && kind !== 'installed') throw new Error('invalid_source_kind');
    const report = await inventory({ id: command === 'snapshot' ? 'repository' : required('source'), path: root, kind });
    if (command === 'snapshot') {
      const raw = git(root, ['status', '--porcelain=v1', '-z', '--untracked-files=all']).split('\0');
      const changes: { status: string; path: string; contentHash: string | null; originalPath?: string }[] = [];
      for (let index = 0; index < raw.length; index++) {
        const record = raw[index];
        if (!record) continue;
        const status = record.slice(0, 2);
        const relative = record.slice(3).replaceAll('\\', '/');
        const change: typeof changes[number] = { status, path: relative, contentHash: report.files.find((file) => file.path === relative)?.contentHash ?? null };
        if (/[RC]/.test(status)) change.originalPath = raw[++index];
        changes.push(change);
      }
      const snapshot = { schemaVersion: '1.0.0', recordedAt: new Date().toISOString(),
        description: 'Current implementation checkpoint; not a pre-edit or clean-tree certification',
        commit: git(root, ['rev-parse', 'HEAD']).trim(), changes, inventory: report };
      await writeJson(required('out'), { ...snapshot, digest: digest(snapshot) });
    } else await writeJson(required('out'), report);
    console.log(JSON.stringify({ source: report.sourceRoot, files: report.files.length, entries: report.entries.length,
      findings: report.findings.length, digest: report.digest, output: required('out'), execution: 'none' }, null, 2));
    return;
  }
  if (command === 'validate') {
    const name = required('schema');
    if (!['DomainPack', 'SourceDocument', 'WorkItem', 'TaskResult', 'LibraryEntry', 'AssetRequest', 'AssetRecord',
      'RightsManifest', 'ContentIR', 'RenderSpec', 'ApprovalBundle', 'FormatParityManifest', 'ReleasePlan'].includes(name)) throw new Error('unknown_schema');
    const data = validate(name as Parameters<typeof validate>[0], JSON.parse(await readFile(required('file'), 'utf8')));
    console.log(JSON.stringify({ valid: true, schema: name, digest: digest(data) }));
    return;
  }
  if (['release-plan', 'release-produce', 'release-verify'].includes(command)) {
    const release = await import('./release.ts');
    if (command === 'release-verify') {
      const policy = values.trust ? JSON.parse(await readFile(values.trust, 'utf8')) : undefined;
      const parity = await release.verifyReleaseCandidate(required('root'), policy);
      console.log(JSON.stringify({ valid: true, releaseDigest: parity.releaseDigest, contentDigest: parity.contentDigest, outputs: parity.outputs.length }));
      return;
    }
    const content = JSON.parse(await readFile(required('content'), 'utf8'));
    const render = JSON.parse(await readFile(required('render'), 'utf8'));
    const rights = JSON.parse(await readFile(required('rights'), 'utf8'));
    if (command === 'release-plan') {
      const plan = release.createReleasePlan(content, render, rights);
      await writeJson(required('out'), plan, true);
      console.log(JSON.stringify({ releaseDigest: plan.releaseDigest, contentDigest: plan.contentDigest, output: required('out'), ready: false }));
      return;
    }
    const approvals = JSON.parse(await readFile(required('approvals'), 'utf8'));
    const policy = JSON.parse(await readFile(required('trust'), 'utf8'));
    const parity = await release.writeReleaseCandidate(required('out'), content, render, rights, approvals, policy);
    console.log(JSON.stringify({ releaseDigest: parity.releaseDigest, contentDigest: parity.contentDigest, output: required('out'), outputs: parity.outputs.length }));
    return;
  }
  if (['asset-generate', 'asset-import', 'asset-fetch', 'asset-verify'].includes(command)) {
    const assets = await import('./assets.ts');
    if (command === 'asset-verify') {
      const record = await assets.verifyAssetBundle(required('root'));
      console.log(JSON.stringify({ valid: true, assetId: record.assetId, digest: record.artifact.digest, review: record.review }));
      return;
    }
    const request = validate('AssetRequest', JSON.parse(await readFile(required('file'), 'utf8')));
    if (command !== 'asset-generate' && request.method !== 'import') throw new Error('import_request_required');
    if (command !== 'asset-generate') {
      const source = new URL(required('url'));
      if (source.protocol !== 'https:' || source.username || source.password) throw new Error('invalid_source_url');
    }
    const fetched = command === 'asset-fetch' ? await (await import('./public-raster.ts')).fetchPublicRaster(required('url')) : null;
    const bytes = fetched?.bytes ?? (command === 'asset-generate' ? await assets.generateDiagram(request) : await assets.readRasterFile(required('source')));
    const origin = command === 'asset-generate' ? assets.diagramOrigin(request)
      : { method: 'import' as const, provider: fetched ? 'public-https-raster' : 'local-raster-import',
        version: fetched ? `1;retrieved=${fetched.retrievedAt}` : '1;source-url-user-declared-not-fetched', inputDigest: sha256(bytes), sourceUrl: fetched?.finalUrl ?? required('url') };
    const asset = await assets.createAsset(request, bytes, origin);
    await assets.writeAssetBundle(required('out'), request, asset);
    console.log(JSON.stringify({ assetId: request.assetId, output: required('out'), digest: asset.record.artifact.digest, review: 'pending', rights: 'pending' }));
    return;
  }
  if (command === 'asset-diffusion-submit' || command === 'asset-diffusion-collect') {
    const diffusion = await import('./diffusion.ts');
    if (command === 'asset-diffusion-submit') {
      const request = JSON.parse(await readFile(required('file'), 'utf8'));
      const receipt = await diffusion.submitDiffusion(request, required('endpoint'), required('checkpoint'), required('out'));
      console.log(JSON.stringify({ promptId: receipt.promptId, state: receipt.state, receipt: required('out'), action: 'Collect this receipt; do not automatically resubmit.' }));
    } else {
      const result = await diffusion.collectDiffusion(required('file'));
      if (result.state === 'succeeded') {
        const { writeAssetBundle } = await import('./assets.ts');
        await writeAssetBundle(required('out'), result.request, result.asset);
        console.log(JSON.stringify({ state: result.state, output: required('out'), digest: result.asset.record.artifact.digest, review: 'pending' }));
      } else console.log(JSON.stringify(result));
    }
    return;
  }
  if (command === 'domain-init') {
    const id = required('id');
    if (!/^[a-z0-9][a-z0-9-]{0,79}$/.test(id)) throw new Error('invalid_domain_slug');
    const asOf = required('as-of');
    const candidate = validate('DomainPack', { schemaVersion: '1.0.0', domainId: id, kind: required('kind'), canonicalName: required('name'),
      asOf, windowStart: windowStart(asOf), timezone: 'UTC', state: 'draft', sources: [], evidence: [], claims: [],
      knownGaps: ['Public evidence not collected', 'Engineering context and source applicability not reviewed',
        'Brand assets and rights not reviewed', 'Reasoning backend not configured', 'Independent evaluation and human approval pending'] });
    const output = values.out ?? `.a2swe/domains/${id}.json`;
    await writeJson(output, candidate, true);
    console.log(JSON.stringify({ domainId: id, state: 'draft', digest: digest(candidate), output, ready: false }, null, 2));
    return;
  }
  if (['job-submit', 'job-status', 'job-events'].includes(command)) {
    const { Store } = await import('./store.ts');
    const store = new Store(values.state ?? '.a2swe', { principalId: userInfo().username, role: 'coordinator', capabilities: new Set() });
    try {
      const result = command === 'job-submit' ? store.submit(JSON.parse(await readFile(required('file'), 'utf8')))
        : command === 'job-status' ? store.get(required('id')) : store.events(required('id'));
      console.log(canonicalJson(result));
    } finally { store.close(); }
    return;
  }
  throw new Error(`unknown_command: ${command}`);
}

main().catch((error: unknown) => {
  console.error(JSON.stringify({ error: error instanceof Error ? error.message : 'unknown_error' }));
  process.exitCode = 1;
});