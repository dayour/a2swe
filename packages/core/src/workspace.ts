import { existsSync } from 'node:fs';
import { readFile, rename, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { projectIdOf } from './release.ts';

const REPOSITORY_ROOT = fileURLToPath(new URL('../../../', import.meta.url));
const DEFAULT_VARIANTS = 'am_michael:kokoro_onnx,af_heart:kokoro_onnx,af_bella:kokoro_onnx,am_michael:kokoro';

/**
 * Writes <project>/<projectId>.code-workspace: one VS Code workspace per project whose tasks run each a2swe pipeline stage
 * (brand, bind, produce, analyze, native Office QA, runbook, verify) through the core CLI with the engine root resolved relative to
 * the project, so the file works wherever the repository is checked out.
 */
export async function writeProjectWorkspace(projectDirectory: string): Promise<{ projectId: string; workspace: string; changed: boolean }> {
  const project = path.resolve(projectDirectory);
  if (!existsSync(path.join(project, 'canonical', 'domain-pack.json'))) throw new Error('workspace_requires_project_domain_pack');
  const projectId = projectIdOf(project);
  const engine = path.relative(project, REPOSITORY_ROOT).split(path.sep).join('/').replace(/\/$/, '') || '.';
  if (path.isAbsolute(engine) || /^[A-Za-z]:/.test(engine)) throw new Error('workspace_project_outside_repository');
  const folder = `\${workspaceFolder:${projectId}}`;
  // Tasks go through the launcher so a default `node` outside the engines range falls back to A2SWE_NODE or reports the mismatch.
  const run = (label: string, detail: string, args: string[], extra: Record<string, unknown> = {}) => ({
    label: `a2swe: ${label}`, detail, type: 'process', command: 'node', args: ['packages/core/bin/a2swe.mjs', ...args],
    options: { cwd: `${folder}/${engine}` }, problemMatcher: [], ...extra
  });
  const steps = [
    run('canonical-bind', 'Rebind content, render spec and approvals after editing canonical files.', ['canonical-bind', '--root', folder]),
    run('revision-produce', 'Render a new revision (all formats and narrated 1080p video) per voice variant and promote the first.', ['revision-produce', '--root', folder, '--variants', '${input:variants}']),
    run('revisions-analyze', 'Spectrogram, loudness and frame analysis for every revision video.', ['revisions-analyze', '--root', folder]),
    run('office-render', 'Native Microsoft Office QA for the release PowerPoint and Word outputs (Windows).', ['office-render', '--root', folder]),
    run('runbook-project', 'Project agent/runbook.json from the verified release and review evidence.', ['runbook-project', '--root', folder]),
    run('release-verify', 'Regenerate and digest-compare every release output.', ['release-verify', '--root', `${folder}/release`]),
    run('runbook-verify', 'Verify the project runbook against its evidence.', ['runbook-verify', '--root', folder])
  ];
  const workspace = {
    folders: [{ name: projectId, path: '.' }],
    settings: {
      'files.exclude': { '**/.a2swe': true, '**/*.tmp': true },
      'files.associations': { '*.deck.json': 'json', '*.excalidraw': 'json' },
      'search.exclude': { 'renders/**': true, 'qc/analysis/**': true, 'qc/revisions/**': true, 'release/outputs/remotion/public/**': true, '**/*.mp4': true, '**/*.wav': true },
      'files.watcherExclude': { '**/renders/**': true, '**/qc/analysis/**': true, '**/qc/revisions/**': true, '**/release/outputs/remotion/**': true }
    },
    tasks: {
      version: '2.0.0',
      tasks: [
        run('brand-theme from site', 'Install the brand theme (colors, fonts) from an official brand site; weak evidence fails instead of misbranding.', ['brand-theme', '--root', folder, '--url', '${input:brandUrl}']),
        ...steps,
        { label: 'a2swe: produce, review and verify', detail: 'Full pipeline for this project in order.', dependsOrder: 'sequence',
          dependsOn: steps.map((step) => step.label), group: { kind: 'build', isDefault: true }, problemMatcher: [] }
      ],
      inputs: [
        { id: 'brandUrl', type: 'promptString', description: 'Official brand site URL (https://...)' },
        { id: 'variants', type: 'pickString', description: 'Voice variants (PROFILE:ENGINE, comma separated)', default: DEFAULT_VARIANTS,
          options: [DEFAULT_VARIANTS, 'am_michael:kokoro_onnx', 'af_heart:kokoro_onnx'] }
      ]
    },
    extensions: { recommendations: ['bierner.markdown-mermaid', 'marp-team.marp-vscode', 'pomdtr.excalidraw-editor', 'ms-vscode.live-server'] }
  };
  const filename = path.join(project, `${projectId}.code-workspace`);
  const text = `${JSON.stringify(workspace, null, 2)}\n`;
  if (existsSync(filename) && (await readFile(filename, 'utf8')).replace(/\r\n/g, '\n') === text) return { projectId, workspace: filename, changed: false };
  const staging = `${filename}.tmp`;
  await writeFile(staging, text);
  await rename(staging, filename);
  return { projectId, workspace: filename, changed: true };
}
