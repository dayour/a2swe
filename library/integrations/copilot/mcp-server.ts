import { parseArgs } from 'node:util';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { z } from 'zod';
import { mediaReviewClientFromEnv } from './media-review.ts';
import {
  CORE_COMMANDS,
  CALLABLE_TOOL_NAMES,
  discoverLibrary,
  discoverLibraryResources,
  discoverProjects,
  intake,
  jsonContent,
  loadKnowledgeCatalog,
  redact,
  resolveWorkspace,
  runCoreCommand,
  searchKnowledge,
  toolsCatalog,
  workspaceList,
  workspaceRead,
  workspaceWrite
} from './helpers.ts';
import type { JsonObject } from './helpers.ts';

const jsonObjectSchema = z.record(z.string(), z.unknown()).default({});
const READ_ONLY_TOOL = { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: false } as const;
const MUTATING_TOOL = { readOnlyHint: false, destructiveHint: false, idempotentHint: false, openWorldHint: false } as const;

function asString(value: unknown, name: string): string {
  if (typeof value !== 'string' || !value.trim()) throw new Error(`missing_string: ${name}`);
  return value;
}

function asObject(value: unknown): JsonObject {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return {};
  return value as JsonObject;
}

export async function createA2sweMcpServer(workspace: string) {
  const server = new McpServer({ name: 'a2swe-core', version: '0.1.0' });
  const mediaReview = mediaReviewClientFromEnv();
  for (const resource of await discoverLibraryResources(workspace)) {
    server.registerResource(`library.${resource.kind}.${resource.id}`, resource.uri, {
      title: resource.title,
      description: `${resource.kind} markdown resource. Context only; markdown is not autonomously executed.`,
      mimeType: 'text/markdown',
      annotations: { audience: ['assistant'], priority: 0.5 }
    }, async () => {
      const file = await workspaceRead(workspace, resource.path);
      return { contents: [{ uri: resource.uri, mimeType: 'text/markdown', text: file.text }] };
    });
  }

  server.registerTool('a2swe.status', {
    title: 'a2swe status',
    description: 'Return bounded local a2swe MCP backend status and workspace.',
    inputSchema: z.object({}),
    annotations: READ_ONLY_TOOL
  }, async () => jsonContent({ connected: true, workspace, coreCommands: CORE_COMMANDS }));

  server.registerTool('a2swe.projects', {
    title: 'List a2swe projects',
    description: 'List local projects as {projects:[{id,name,path,hasCanonical,hasQc}]}.',
    inputSchema: z.object({}),
    annotations: READ_ONLY_TOOL
  }, async () => jsonContent(await discoverProjects(workspace)));

  server.registerTool('a2swe.context', {
    title: 'Refresh a2swe context',
    description: 'Freshly read workspace, projects, library resources, tools, and core command schemas.',
    inputSchema: z.object({}),
    annotations: READ_ONLY_TOOL
  }, async () => jsonContent(await callLocalTool(workspace, 'context')));

  server.registerTool('a2swe.library', {
    title: 'List a2swe library',
    description: 'List local library agents, skills, plugins, assets, documents, and profiles.',
    inputSchema: z.object({}),
    annotations: READ_ONLY_TOOL
  }, async () => jsonContent(await discoverLibrary(workspace)));

  server.registerTool('a2swe.knowledge_search', {
    title: 'Search a2swe knowledge catalog',
    description: 'Search the local knowledge catalog created at library/assets/knowledge/catalog.json.',
    inputSchema: z.object({ query: z.string(), limit: z.number().int().min(1).max(50).optional() }),
    annotations: READ_ONLY_TOOL
  }, async (args) => jsonContent(await searchKnowledge(workspace, args.query, args.limit ?? 10)));

  server.registerTool('a2swe.knowledge_catalog', {
    title: 'Read a2swe knowledge catalog',
    description: 'Return document and asset metadata from the local knowledge catalog without expanding private source files.',
    inputSchema: z.object({}),
    annotations: READ_ONLY_TOOL
  }, async () => jsonContent(await loadKnowledgeCatalog(workspace)));

  server.registerTool('a2swe.workspace_list', {
    title: 'List workspace files',
    description: 'List non-secret, non-.git, non-symlink files inside the configured workspace.',
    inputSchema: z.object({ path: z.string().default('.'), depth: z.number().int().min(0).max(5).default(2) }),
    annotations: READ_ONLY_TOOL
  }, async (args) => jsonContent(await workspaceList(workspace, args.path, args.depth)));

  server.registerTool('a2swe.workspace_read', {
    title: 'Read workspace text file',
    description: 'Read a bounded text file confined to the workspace. Rejects .git, secrets, and symlinks outside the workspace.',
    inputSchema: z.object({ path: z.string() }),
    annotations: READ_ONLY_TOOL
  }, async (args) => jsonContent(await workspaceRead(workspace, args.path)));

  server.registerTool('a2swe.workspace_write', {
    title: 'Write workspace text file',
    description: 'Write a bounded text file confined to the workspace. Rejects .git, secrets, and symlinks outside the workspace.',
    inputSchema: z.object({ path: z.string(), text: z.string(), overwrite: z.boolean().default(false) }),
    annotations: MUTATING_TOOL
  }, async (args) => jsonContent(await workspaceWrite(workspace, args.path, args.text, args.overwrite)));

  server.registerTool('a2swe.core_command', {
    title: 'Run a2swe core command',
    description: 'Run one of the advertised a2swe core CLI operations with path arguments confined to the workspace. This is not a general shell.',
    inputSchema: z.object({ command: z.enum(CORE_COMMANDS), options: jsonObjectSchema.optional() }),
    annotations: MUTATING_TOOL
  }, async (args, extra) => {
    const result = await runCoreCommand(workspace, args.command, args.options ?? {}, extra.signal);
    const payload = { command: args.command, exitCode: result.exitCode, stdout: result.stdout, stderr: result.stderr };
    return result.exitCode === 0 ? jsonContent(payload) : { isError: true, ...jsonContent(payload) };
  });

  server.registerTool('a2swe.intake', {
    title: 'Intake source or draft domain query',
    description: 'Store URL/company/product/document intake with provenance. URL intake is read-only public fetch with SSRF guards; free-text intake stores a draft query with no invented claims.',
    inputSchema: z.object({ input: z.string(), projectId: z.string().optional(), name: z.string().optional(), kind: z.string().optional(), sources: z.array(z.string()).optional() }),
    annotations: MUTATING_TOOL
  }, async (args) => jsonContent(await intake(workspace, args)));

  server.registerTool('a2swe.tools_list', {
    title: 'List bridge-callable a2swe tools',
    description: 'Return a concise list of local MCP tools advertised by this backend.',
    inputSchema: z.object({}),
    annotations: READ_ONLY_TOOL
  }, async () => jsonContent(toolsCatalog()));

  server.registerTool('a2swe.tools_call', {
    title: 'Call a2swe backend tool by name',
    description: 'Convenience dispatcher for simple clients. Prefer direct tool calls where possible.',
    inputSchema: z.object({ name: z.string(), arguments: jsonObjectSchema.optional() }),
    annotations: MUTATING_TOOL
  }, async (args, extra) => {
    const result = await callLocalTool(workspace, args.name, args.arguments ?? {}, extra.signal);
    return jsonContent(result);
  });

  const reviewUnavailable = () => {
    if (!mediaReview) throw new Error('media_review_service_unavailable');
    return mediaReview;
  };
  server.registerTool('review.list', { title: 'List review media', description: 'List selected project reviewable media and Studio bundles.', inputSchema: z.object({ projectId: z.string().optional() }), annotations: READ_ONLY_TOOL },
    async (args) => jsonContent(await reviewUnavailable().request(`/v1/reviews${args.projectId ? `?projectId=${encodeURIComponent(args.projectId)}` : ''}`)));
  server.registerTool('review.open', { title: 'Open review media', description: 'Open shared native/MCP media review state.', inputSchema: z.object({ projectId: z.string().optional(), path: z.string().optional(), kind: z.enum(['video', 'audio', 'image', 'studio']).optional() }), annotations: MUTATING_TOOL },
    async (args) => jsonContent(await reviewUnavailable().request('/v1/reviews/open', { method: 'POST', body: JSON.stringify(args), headers: { 'content-type': 'application/json' } })));
  server.registerTool('review.state', { title: 'Read review state', description: 'Read current shared review state.', inputSchema: z.object({ reviewId: z.string().optional() }), annotations: READ_ONLY_TOOL },
    async (args) => jsonContent(await reviewUnavailable().request(args.reviewId ? `/v1/reviews/${encodeURIComponent(args.reviewId)}/state` : '/v1/reviews/current/state')));
  for (const action of ['seek', 'play', 'pause'] as const) {
    server.registerTool(`review.${action}`, { title: `Review ${action}`, description: `Request native UI ${action}; state changes only after native ack.`, inputSchema: z.object({ reviewId: z.string(), timeSeconds: z.number().optional() }), annotations: MUTATING_TOOL },
      async (args) => jsonContent(await reviewUnavailable().request(`/v1/reviews/${encodeURIComponent(args.reviewId)}/control`, { method: 'POST', body: JSON.stringify({ action, timeSeconds: args.timeSeconds, wait: true }), headers: { 'content-type': 'application/json' } })));
  }
  server.registerTool('review.frame', { title: 'Extract review frame', description: 'Return a PNG frame from the opened video.', inputSchema: z.object({ reviewId: z.string(), timeSeconds: z.number().optional() }), annotations: READ_ONLY_TOOL },
    async (args, extra) => {
      if (extra._meta?.progressToken) await extra.sendNotification({ method: 'notifications/progress', params: { progressToken: extra._meta.progressToken, progress: 0, total: 1, message: 'Extracting frame' } });
      const client = reviewUnavailable();
      const response = await fetch(new URL(`/frame/${encodeURIComponent(args.reviewId)}.png?timeSeconds=${encodeURIComponent(String(args.timeSeconds ?? 0))}`, (client as unknown as { url: string }).url), { headers: { authorization: `Bearer ${(client as unknown as { token: string }).token}` }, signal: extra.signal });
      if (!response.ok) throw new Error(`review_frame_failed: ${response.status}`);
      const data = Buffer.from(await response.arrayBuffer()).toString('base64');
      if (extra._meta?.progressToken) await extra.sendNotification({ method: 'notifications/progress', params: { progressToken: extra._meta.progressToken, progress: 1, total: 1, message: 'Frame ready' } });
      return { content: [{ type: 'image' as const, data, mimeType: 'image/png' }] };
    });
  server.registerTool('review.subtitles', { title: 'Read subtitles', description: 'Return subtitle cues for the current review.', inputSchema: z.object({ reviewId: z.string() }), annotations: READ_ONLY_TOOL },
    async (args) => jsonContent(await reviewUnavailable().request(`/subtitles/${encodeURIComponent(args.reviewId)}.json`)));
  server.registerTool('review.spectrogram', { title: 'Extract spectrogram', description: 'Return PNG spectrogram from current review media.', inputSchema: z.object({ reviewId: z.string(), startSeconds: z.number().optional(), endSeconds: z.number().optional() }), annotations: READ_ONLY_TOOL },
    async (args, extra) => {
      if (extra._meta?.progressToken) await extra.sendNotification({ method: 'notifications/progress', params: { progressToken: extra._meta.progressToken, progress: 0, total: 1, message: 'Rendering spectrogram' } });
      const client = reviewUnavailable();
      const url = new URL(`/spectrogram/${encodeURIComponent(args.reviewId)}.png`, (client as unknown as { url: string }).url);
      if (args.startSeconds !== undefined) url.searchParams.set('startSeconds', String(args.startSeconds));
      if (args.endSeconds !== undefined) url.searchParams.set('endSeconds', String(args.endSeconds));
      const response = await fetch(url, { headers: { authorization: `Bearer ${(client as unknown as { token: string }).token}` }, signal: extra.signal });
      if (!response.ok) throw new Error(`review_spectrogram_failed: ${response.status}`);
      const data = Buffer.from(await response.arrayBuffer()).toString('base64');
      if (extra._meta?.progressToken) await extra.sendNotification({ method: 'notifications/progress', params: { progressToken: extra._meta.progressToken, progress: 1, total: 1, message: 'Spectrogram ready' } });
      return { content: [{ type: 'image' as const, data, mimeType: 'image/png' }] };
    });
  server.registerTool('review.studio', { title: 'Open Studio', description: 'Open static Remotion Studio bundle if available.', inputSchema: z.object({ projectId: z.string().optional() }), annotations: MUTATING_TOOL },
    async (args) => jsonContent(await reviewUnavailable().request('/v1/reviews/open', { method: 'POST', body: JSON.stringify({ projectId: args.projectId, kind: 'studio' }), headers: { 'content-type': 'application/json' } })));

  return server;
}

export const LOCAL_TOOL_NAMES = [
  'status',
  'context',
  'context.refresh',
  'projects',
  'library',
  'knowledge.search',
  'tools.list',
  'tools.call',
  'tools.cancel',
  'intake',
  'workspace.list',
  'workspace.read',
  'workspace.write',
  'core.command'
] as const;

export async function callLocalTool(workspace: string, name: string, args: JsonObject = {}, signal?: AbortSignal) {
  if (!CALLABLE_TOOL_NAMES.has(name)) throw new Error(`unknown_tool: ${name}`);
  switch (name) {
    case 'projects':
      return discoverProjects(workspace);
    case 'library':
      return discoverLibrary(workspace);
    case 'context': {
      const [projects, library] = await Promise.all([discoverProjects(workspace), discoverLibrary(workspace)]);
      return { workspace, projects: projects.projects, tools: toolsCatalog().tools, coreCommands: toolsCatalog().coreCommands, library, refreshedAt: new Date().toISOString() };
    }
    case 'context.refresh':
      return callLocalTool(workspace, 'context', args, signal);
    case 'knowledge.search':
      return searchKnowledge(workspace, asString(args.query, 'query'), typeof args.limit === 'number' ? args.limit : 10);
    case 'intake':
      return intake(workspace, { input: asString(args.input, 'input'), projectId: args.projectId as string | undefined, name: args.name as string | undefined, kind: args.kind as string | undefined, sources: Array.isArray(args.sources) ? args.sources.filter((source): source is string => typeof source === 'string') : undefined });
    case 'workspace.list':
      return workspaceList(workspace, typeof args.path === 'string' ? args.path : '.', typeof args.depth === 'number' ? args.depth : 2);
    case 'workspace.read':
      return workspaceRead(workspace, asString(args.path, 'path'));
    case 'workspace.write':
      return workspaceWrite(workspace, asString(args.path, 'path'), asString(args.text, 'text'), args.overwrite === true);
    case 'core.command': {
      const command = asString(args.command, 'command');
      return runCoreCommand(workspace, command, asObject(args.options), signal);
    }
    default:
      throw new Error(`unknown_tool: ${name}`);
  }
}

async function main() {
  const { values } = parseArgs({ options: { workspace: { type: 'string' }, help: { type: 'boolean' } } });
  if (values.help) {
    process.stderr.write('a2swe MCP server: --workspace PATH\n');
    return;
  }
  const workspace = await resolveWorkspace(values.workspace);
  const server = await createA2sweMcpServer(workspace);
  const transport = new StdioServerTransport();
  await server.connect(transport);
}

if (fileURLToPath(import.meta.url) === path.resolve(process.argv[1] ?? '')) {
  main().catch((error: unknown) => {
    process.stderr.write(`${redact(error instanceof Error ? error.message : 'mcp_server_failed')}\n`);
    process.exitCode = 1;
  });
}
