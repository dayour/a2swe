import { createHash, randomBytes, randomUUID } from 'node:crypto';
import { spawn } from 'node:child_process';
import { createReadStream } from 'node:fs';
import { access, mkdir, opendir, readFile, realpath, stat } from 'node:fs/promises';
import http from 'node:http';
import path from 'node:path';
import { readJsonFile, safePath, toRepoRelative } from './helpers.ts';
import type { JsonObject } from './helpers.ts';
import type { ReviewControlAction, ReviewKind, ReviewListItem, ReviewState, ReviewSubtitleCue } from './media-review.types.ts';
export type { ReviewControlAction, ReviewKind, ReviewListItem, ReviewMedia, ReviewState, ReviewSubtitleCue } from './media-review.types.ts';

type EmitEvent = (event: string, data: JsonObject) => void;

const VIDEO_EXTENSIONS = new Set(['.mp4', '.webm', '.mov']);
const AUDIO_EXTENSIONS = new Set(['.wav', '.mp3', '.m4a', '.aac', '.flac', '.ogg']);
const IMAGE_EXTENSIONS = new Set(['.png', '.jpg', '.jpeg', '.webp']);
const SUBTITLE_EXTENSIONS = new Set(['.vtt', '.srt']);
const MAX_WALK_FILES = 4000;
const MAX_IMAGE_BYTES = 8 * 1024 * 1024;

export class MediaReviewService {
  readonly token = randomBytes(32).toString('base64url');
  readonly readGrant = randomBytes(24).toString('base64url');
  private server?: http.Server;
  private port?: number;
  private reviews = new Map<string, ReviewState & { absolutePath?: string; studioRoot?: string }>();
  private assets = new Map<string, { absolutePath: string; mediaType: string; fileName?: string }>();
  private childProcesses = new Set<ReturnType<typeof spawn>>();
  private controlWaiters = new Map<string, { resolve: (state: ReviewState) => void; reject: (error: Error) => void; timer: ReturnType<typeof setTimeout> }>();
  private readonly workspace: string;
  private readonly emit: EmitEvent;

  constructor(workspace: string, emit: EmitEvent = () => undefined) {
    this.workspace = workspace;
    this.emit = emit;
  }

  get baseUrl(): string {
    if (!this.port) throw new Error('media_review_service_not_started');
    return `http://127.0.0.1:${this.port}`;
  }

  async start(): Promise<{ url: string; token: string }> {
    if (this.server?.listening) return { url: this.baseUrl, token: this.token };
    await new Promise<void>((resolve, reject) => {
      this.server = http.createServer((request, response) => {
        void this.route(request, response).catch((error: unknown) => {
          const message = error instanceof Error ? error.message : 'media_review_error';
          response.writeHead(500, { 'content-type': 'application/json' });
          response.end(JSON.stringify({ error: message }));
        });
      });
      this.server.on('error', reject);
      this.server.listen(0, '127.0.0.1', () => {
        const address = this.server!.address();
        if (!address || typeof address === 'string') {
          reject(new Error('media_review_bind_failed'));
          return;
        }
        this.port = address.port;
        resolve();
      });
    });
    return { url: this.baseUrl, token: this.token };
  }

  async close(): Promise<void> {
    for (const child of this.childProcesses) child.kill();
    this.childProcesses.clear();
    await new Promise<void>((resolve) => this.server?.close(() => resolve()) ?? resolve());
  }

  async list(projectId?: string): Promise<{ projectId?: string; items: ReviewListItem[] }> {
    const roots = await this.reviewRoots(projectId);
    const files: string[] = [];
    for (const root of roots) files.push(...await this.walkFiles(root));
    const qcCount = files.filter((file) => /qc|parity|runbook|manifest/i.test(file) && file.endsWith('.json')).length;
    const items: ReviewListItem[] = [];
    // Revision renders are the reviewable history; local package archives, analysis frames and runtime bundles would only duplicate them.
    const excluded = /\/(qc\/revisions|qc\/releases|node_modules|build_production|qc\/analysis\/[^/]+\/[^/]+\/(frames|chunks)|outputs\/remotion\/public|public\/assets)\//;
    const rank = (repoPath: string) => (repoPath.includes('/renders/') ? 0 : repoPath.includes('/release/') ? 1 : 2);
    for (const file of files.sort((a, b) => rank(toRepoRelative(this.workspace, a)) - rank(toRepoRelative(this.workspace, b)) || b.localeCompare(a))) {
      if (excluded.test(`/${toRepoRelative(this.workspace, file)}`)) continue;
      const extension = path.extname(file).toLowerCase();
      let kind: ReviewKind | undefined;
      if (VIDEO_EXTENSIONS.has(extension)) kind = 'video';
      else if (AUDIO_EXTENSIONS.has(extension)) kind = 'audio';
      else if (IMAGE_EXTENSIONS.has(extension)) kind = 'image';
      if (!kind) continue;
      const info = await stat(file);
      const subtitles = await this.findSubtitleTrack(projectId, file);
      const spectrograms = await this.findSpectrograms(projectId, file);
      items.push({ id: toRepoRelative(this.workspace, file), kind, title: path.basename(file), path: toRepoRelative(this.workspace, file),
        mediaType: mediaType(file), byteSize: info.size, hasSubtitles: subtitles.cues.length > 0, hasSpectrogram: spectrograms.length > 0, hasQc: qcCount > 0 });
    }
    const studio = await this.findStudioRoot(projectId);
    if (studio) items.unshift({ id: `studio:${toRepoRelative(this.workspace, studio)}`, kind: 'studio', title: 'Remotion Studio',
      path: toRepoRelative(this.workspace, studio), mediaType: 'text/html', hasSubtitles: false, hasSpectrogram: false, hasQc: qcCount > 0 });
    return { projectId, items };
  }

  async open(input: { projectId?: string; path?: string; kind?: ReviewKind }): Promise<{ reviewId: string; state: ReviewState; mediaUrl?: string; studioUrl?: string }> {
    await this.start();
    const item = input.path ? await this.resolveReviewPath(input.path) : await this.pickDefaultItem(input.projectId, input.kind);
    const kind = input.kind ?? item.kind;
    const reviewId = randomUUID();
    const subtitleTrack = await this.findSubtitleTrack(input.projectId, item.absolutePath);
    const subtitles = subtitleTrack.path ? [subtitleTrack.path] : [];
    const subtitleCues = subtitleTrack.cues;
    const spectrograms = await this.findSpectrograms(input.projectId, item.absolutePath);
    const qc = await this.findQcReceipts(input.projectId, item.absolutePath);
    const state: ReviewState & { absolutePath?: string; studioRoot?: string } = {
      reviewId,
      projectId: input.projectId ?? projectIdFromPath(this.workspace, item.absolutePath),
      playback: { timeSeconds: 0, playing: false, rate: 1, updatedAt: new Date().toISOString() },
      tracks: { subtitles: subtitles.map((file, index) => ({ id: `subtitles-${index}`, path: toRepoRelative(this.workspace, file),
        url: `${this.baseUrl}/view/${this.readGrant}/subtitles/${reviewId}.vtt`, cueCount: subtitleCues.length, cues: index === 0 ? subtitleCues : undefined })),
        subtitleCues,
        spectrogram: { available: true, url: `${this.baseUrl}/view/${this.readGrant}/spectrogram/${reviewId}.png`, ...(spectrograms[0] ? { path: toRepoRelative(this.workspace, spectrograms[0]) } : {}) } },
      qc: { receipts: qc },
      pendingControls: []
    };
    if (kind === 'studio') {
      state.studioRoot = item.absolutePath;
      state.studio = { available: true, root: toRepoRelative(this.workspace, item.absolutePath), url: `${this.baseUrl}/view/${this.readGrant}/studio/${reviewId}/index.html` };
    } else {
      const info = await stat(item.absolutePath);
      const assetId = this.registerAsset(item.absolutePath, mediaType(item.absolutePath));
      const digest = await sha256File(item.absolutePath);
      state.absolutePath = item.absolutePath;
      state.media = { kind, path: toRepoRelative(this.workspace, item.absolutePath), mediaType: mediaType(item.absolutePath),
        byteSize: info.size, digest, url: `${this.baseUrl}/view/${this.readGrant}/media/${assetId}` };
    }
    this.reviews.set(reviewId, state);
    this.emit('review.opened', { reviewId, projectId: state.projectId, state: this.publicState(state) });
    return { reviewId, state: this.publicState(state), mediaUrl: state.media?.url, studioUrl: state.studio?.url };
  }

  state(reviewId?: string): ReviewState | null {
    const state = reviewId ? this.reviews.get(reviewId) : [...this.reviews.values()].at(-1);
    return state ? this.publicState(state) : null;
  }

  requestControl(reviewId: string, action: ReviewControlAction, timeSeconds?: number): { requestId: string; status: 'requested'; action: ReviewControlAction; timeSeconds?: number } {
    const state = this.requireReview(reviewId);
    const requestId = randomUUID();
    state.pendingControls.push({ requestId, action, timeSeconds, requestedAt: new Date().toISOString(), status: 'pending' });
    this.emit('review.control.requested', { requestId, reviewId, action, timeSeconds });
    setTimeout(() => {
      const control = state.pendingControls.find((entry) => entry.requestId === requestId && entry.status === 'pending');
      if (control) {
        control.status = 'expired';
        control.error = 'native_ui_ack_timeout';
        const waiter = this.controlWaiters.get(requestId);
        if (waiter) {
          clearTimeout(waiter.timer);
          waiter.reject(new Error('native_ui_ack_timeout'));
          this.controlWaiters.delete(requestId);
        }
        this.emit('review.control.expired', { requestId, reviewId, action });
      }
    }, 10_000).unref();
    return { requestId, status: 'requested', action, ...(timeSeconds !== undefined ? { timeSeconds } : {}) };
  }

  requestControlAndWait(reviewId: string, action: ReviewControlAction, timeSeconds?: number): Promise<ReviewState> {
    const requested = this.requestControl(reviewId, action, timeSeconds);
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        this.controlWaiters.delete(requested.requestId);
        reject(new Error('native_ui_ack_timeout'));
      }, 10_500);
      timer.unref();
      this.controlWaiters.set(requested.requestId, { resolve, reject, timer });
    });
  }

  ack(input: { reviewId: string; requestId: string; timeSeconds?: number; playing?: boolean; error?: string }): ReviewState {
    const state = this.requireReview(input.reviewId);
    const control = state.pendingControls.find((entry) => entry.requestId === input.requestId);
    if (!control) throw new Error('review_control_not_found');
    control.status = input.error ? 'failed' : 'applied';
    control.error = input.error;
    if (!input.error) {
      if (typeof input.timeSeconds === 'number') state.playback.timeSeconds = input.timeSeconds;
      if (typeof input.playing === 'boolean') state.playback.playing = input.playing;
      state.playback.updatedAt = new Date().toISOString();
    }
    const waiter = this.controlWaiters.get(input.requestId);
    if (waiter) {
      clearTimeout(waiter.timer);
      this.controlWaiters.delete(input.requestId);
      if (input.error) waiter.reject(new Error(input.error));
      else waiter.resolve(this.publicState(state));
    }
    this.emit('review.state', { reviewId: input.reviewId, state: this.publicState(state) });
    return this.publicState(state);
  }

  updatePlayback(input: { reviewId: string; timeSeconds: number; playing: boolean; rate?: number }): ReviewState {
    const state = this.requireReview(input.reviewId);
    state.playback.timeSeconds = input.timeSeconds;
    state.playback.playing = input.playing;
    if (typeof input.rate === 'number') state.playback.rate = input.rate;
    state.playback.updatedAt = new Date().toISOString();
    this.emit('review.state', { reviewId: input.reviewId, state: this.publicState(state) });
    return this.publicState(state);
  }

  async frame(reviewId: string, timeSeconds = 0, signal?: AbortSignal): Promise<{ data: string; mimeType: 'image/png'; path?: string }> {
    const state = this.requireReview(reviewId);
    if (!state.absolutePath) throw new Error('review_media_not_video_or_audio');
    this.emit('review.progress', { reviewId, action: 'frame', status: 'running', timeSeconds });
    const bytes = await this.ffmpeg(['-hide_banner', '-loglevel', 'error', '-ss', String(Math.max(0, timeSeconds)), '-i', state.absolutePath,
      '-frames:v', '1', '-vcodec', 'png', '-f', 'image2pipe', 'pipe:1'], signal);
    this.emit('review.progress', { reviewId, action: 'frame', status: 'complete', bytes: bytes.length });
    return { data: bytes.toString('base64'), mimeType: 'image/png', path: state.media?.path };
  }

  async subtitles(reviewId: string): Promise<{ reviewId: string; cues: ReviewSubtitleCue[]; vtt: string }> {
    const state = this.requireReview(reviewId);
    const cues = state.tracks.subtitleCues ?? [];
    return { reviewId, cues, vtt: cuesToVtt(cues) };
  }

  async spectrogram(reviewId: string, startSeconds = 0, endSeconds?: number, signal?: AbortSignal): Promise<{ data: string; mimeType: 'image/png' }> {
    const state = this.requireReview(reviewId);
    if (!state.absolutePath) throw new Error('review_media_missing');
    const args = ['-hide_banner', '-loglevel', 'error', '-ss', String(Math.max(0, startSeconds))];
    if (endSeconds !== undefined && endSeconds > startSeconds) args.push('-t', String(endSeconds - startSeconds));
    args.push('-i', state.absolutePath, '-lavfi', 'showspectrumpic=s=1280x720:legend=disabled', '-frames:v', '1', '-vcodec', 'png', '-f', 'image2pipe', 'pipe:1');
    this.emit('review.progress', { reviewId, action: 'spectrogram', status: 'running' });
    const bytes = await this.ffmpeg(args, signal);
    this.emit('review.progress', { reviewId, action: 'spectrogram', status: 'complete', bytes: bytes.length });
    return { data: bytes.toString('base64'), mimeType: 'image/png' };
  }

  async studio(projectId?: string): Promise<{ available: boolean; studioUrl?: string; reason?: string; state?: ReviewState }> {
    const root = await this.findStudioRoot(projectId);
    if (!root) return { available: false, reason: 'studio_bundle_not_found' };
    const opened = await this.open({ projectId, path: toRepoRelative(this.workspace, root), kind: 'studio' });
    return { available: true, studioUrl: opened.studioUrl, state: opened.state };
  }

  private async route(request: http.IncomingMessage, response: http.ServerResponse): Promise<void> {
    const url = new URL(request.url ?? '/', this.baseUrl);
    const token = request.headers.authorization?.replace(/^Bearer\s+/i, '');
    const viewMatch = /^\/view\/([^/]+)(\/.*)$/.exec(url.pathname);
    const pathName = viewMatch ? viewMatch[2] : url.pathname;
    const grant = viewMatch?.[1] ?? url.searchParams.get('grant');
    const control = token === this.token;
    const readOnly = grant === this.readGrant;
    if (!control && !readOnly) {
      response.writeHead(401, { 'content-type': 'application/json' });
      response.end(JSON.stringify({ error: 'unauthorized' }));
      return;
    }
    if (pathName.startsWith('/media/')) return this.serveAsset(pathName.slice('/media/'.length), request, response);
    if (pathName.startsWith('/studio/')) return this.serveStudio(pathName.slice('/studio/'.length), request, response);
    if (pathName.startsWith('/subtitles/')) return this.serveSubtitles(pathName.split('/')[2], response);
    if (pathName.startsWith('/frame/')) return this.serveGeneratedImage('frame', pathName.split('/')[2]?.replace(/\.png$/, ''), url, response);
    if (pathName.startsWith('/spectrogram/')) return this.serveGeneratedImage('spectrogram', pathName.split('/')[2]?.replace(/\.png$/, ''), url, response);
    if (!control) {
      response.writeHead(401, { 'content-type': 'application/json' });
      response.end(JSON.stringify({ error: 'control_token_required' }));
      return;
    }
    if (url.pathname === '/v1/reviews' && request.method === 'GET') {
      response.writeHead(200, { 'content-type': 'application/json' });
      response.end(JSON.stringify(await this.list(url.searchParams.get('projectId') ?? undefined)));
      return;
    }
    if (url.pathname === '/v1/reviews/open' && request.method === 'POST') {
      const result = await this.open(await readJsonBody(request) as { projectId?: string; path?: string; kind?: ReviewKind });
      response.writeHead(200, { 'content-type': 'application/json' });
      response.end(JSON.stringify(result));
      return;
    }
    if (url.pathname === '/v1/reviews/current/state') {
      response.writeHead(200, { 'content-type': 'application/json' });
      response.end(JSON.stringify(this.state()));
      return;
    }
    if (url.pathname.startsWith('/v1/reviews/') && url.pathname.endsWith('/state')) {
      response.writeHead(200, { 'content-type': 'application/json' });
      response.end(JSON.stringify(this.state(url.pathname.split('/')[3])));
      return;
    }
    const controlMatch = /^\/v1\/reviews\/([^/]+)\/control$/.exec(url.pathname);
    if (controlMatch && request.method === 'POST') {
      const body = await readJsonBody(request) as { action: ReviewControlAction; timeSeconds?: number; wait?: boolean };
      const result = body.wait ? await this.requestControlAndWait(controlMatch[1], body.action, body.timeSeconds)
        : this.requestControl(controlMatch[1], body.action, body.timeSeconds);
      response.writeHead(200, { 'content-type': 'application/json' });
      response.end(JSON.stringify(result));
      return;
    }
    const updateMatch = /^\/v1\/reviews\/([^/]+)\/playback$/.exec(url.pathname);
    if (updateMatch && request.method === 'POST') {
      const body = await readJsonBody(request) as { timeSeconds: number; playing: boolean; rate?: number };
      const result = this.updatePlayback({ reviewId: updateMatch[1], ...body });
      response.writeHead(200, { 'content-type': 'application/json' });
      response.end(JSON.stringify(result));
      return;
    }
    const ackMatch = /^\/v1\/reviews\/([^/]+)\/control\/([^/]+)\/ack$/.exec(url.pathname);
    if (ackMatch && request.method === 'POST') {
      const body = await readJsonBody(request) as { timeSeconds?: number; playing?: boolean; error?: string };
      const result = this.ack({ reviewId: ackMatch[1], requestId: ackMatch[2], ...body });
      response.writeHead(200, { 'content-type': 'application/json' });
      response.end(JSON.stringify(result));
      return;
    }
    response.writeHead(404, { 'content-type': 'application/json' });
    response.end(JSON.stringify({ error: 'not_found' }));
  }

  private async serveAsset(assetId: string, request: http.IncomingMessage, response: http.ServerResponse) {
    const asset = this.assets.get(assetId);
    if (!asset) throw new Error('asset_not_found');
    return serveFile(asset.absolutePath, asset.mediaType, request, response);
  }

  private async serveStudio(remainder: string, request: http.IncomingMessage, response: http.ServerResponse) {
    const [reviewId, ...parts] = remainder.split('/');
    const state = this.requireReview(reviewId);
    if (!state.studioRoot) throw new Error('studio_not_open');
    const relative = decodeURIComponent(parts.join('/') || 'index.html');
    const file = await safeChildPath(state.studioRoot, relative);
    return serveFile(file, mediaType(file), request, response);
  }

  private async serveSubtitles(reviewIdWithExtension: string | undefined, response: http.ServerResponse) {
    const reviewId = reviewIdWithExtension?.replace(/\.(vtt|json)$/i, '');
    const state = this.requireReview(reviewId);
    if (reviewIdWithExtension?.endsWith('.json')) {
      response.writeHead(200, { 'content-type': 'application/json' });
      response.end(JSON.stringify({ reviewId, cues: state.tracks.subtitleCues ?? [] }));
      return;
    }
    response.writeHead(200, { 'content-type': 'text/vtt; charset=utf-8' });
    response.end(cuesToVtt(state.tracks.subtitleCues ?? []));
  }

  private async serveGeneratedImage(kind: 'frame' | 'spectrogram', reviewId: string | undefined, url: URL, response: http.ServerResponse) {
    const result = kind === 'frame'
      ? await this.frame(reviewId ?? '', Number(url.searchParams.get('timeSeconds') ?? url.searchParams.get('time') ?? 0))
      : await this.spectrogram(reviewId ?? '', Number(url.searchParams.get('startSeconds') ?? 0), url.searchParams.has('endSeconds') ? Number(url.searchParams.get('endSeconds')) : undefined);
    response.writeHead(200, { 'content-type': result.mimeType, 'cache-control': 'no-store' });
    response.end(Buffer.from(result.data, 'base64'));
  }

  private requireReview(reviewId: string | undefined): ReviewState & { absolutePath?: string; studioRoot?: string } {
    if (!reviewId) throw new Error('missing_review_id');
    const state = this.reviews.get(reviewId);
    if (!state) throw new Error('review_not_found');
    return state;
  }

  private publicState(state: ReviewState & { absolutePath?: string; studioRoot?: string }): ReviewState {
    const { absolutePath: _absolutePath, studioRoot: _studioRoot, ...publicState } = state;
    return structuredClone(publicState);
  }

  private registerAsset(absolutePath: string, type: string): string {
    const id = randomUUID();
    this.assets.set(id, { absolutePath, mediaType: type, fileName: path.basename(absolutePath) });
    return id;
  }

  private async reviewRoots(projectId?: string): Promise<string[]> {
    const roots = projectId ? [path.join('projects', projectId)] : ['projects', 'template'];
    const resolved: string[] = [];
    for (const root of roots) {
      try {
        const absolute = await safePath(this.workspace, root, { mustExist: true });
        const info = await stat(absolute);
        if (info.isDirectory()) resolved.push(absolute);
      } catch { /* absent roots are fine */ }
    }
    return resolved;
  }

  private async resolveReviewPath(repoPath: string): Promise<{ absolutePath: string; kind: ReviewKind }> {
    const absolute = await safePath(this.workspace, repoPath, { mustExist: true });
    const info = await stat(absolute);
    if (info.isDirectory()) return { absolutePath: absolute, kind: 'studio' };
    const extension = path.extname(absolute).toLowerCase();
    if (VIDEO_EXTENSIONS.has(extension)) return { absolutePath: absolute, kind: 'video' };
    if (AUDIO_EXTENSIONS.has(extension)) return { absolutePath: absolute, kind: 'audio' };
    if (IMAGE_EXTENSIONS.has(extension)) return { absolutePath: absolute, kind: 'image' };
    throw new Error('unsupported_review_media');
  }

  private async pickDefaultItem(projectId?: string, preferred?: ReviewKind): Promise<{ absolutePath: string; kind: ReviewKind }> {
    const list = await this.list(projectId);
    const item = list.items.find((entry) => !preferred || entry.kind === preferred) ?? list.items.find((entry) => entry.kind !== 'studio');
    if (!item) throw new Error('review_media_not_found');
    return this.resolveReviewPath(item.path);
  }

  private async findStudioRoot(projectId?: string): Promise<string | undefined> {
    const candidates = [
      ...(projectId ? [
        path.join('projects', projectId, 'build_production'),
        path.join('projects', projectId, 'release', 'outputs', 'remotion'),
        path.join('projects', projectId, 'outputs', 'remotion')
      ] : []),
      path.join('template', 'build_production')
    ];
    for (const candidate of candidates) {
      const absolute = await safePath(this.workspace, candidate, { mustExist: true }).catch(() => undefined);
      if (!absolute) continue;
      const index = path.join(absolute, 'index.html');
      if (await exists(index)) return absolute;
    }
    return undefined;
  }

  private async walkFiles(root: string): Promise<string[]> {
    const files: string[] = [];
    async function walk(directory: string) {
      if (files.length >= MAX_WALK_FILES) return;
      const dir = await opendir(directory);
      for await (const entry of dir) {
        if (entry.name.startsWith('.') || entry.name === 'node_modules') continue;
        const absolute = path.join(directory, entry.name);
        const info = await stat(absolute);
        if (info.isDirectory()) await walk(absolute);
        else if (info.isFile()) files.push(absolute);
      }
    }
    await walk(root);
    return files;
  }

  private async findSubtitleTrack(projectId: string | undefined, nearFile: string): Promise<{ path?: string; cues: ReviewSubtitleCue[] }> {
    const remotionRoot = await this.findRemotionRoot(nearFile);
    if (remotionRoot) {
      const timeline = path.join(remotionRoot, 'timeline.json');
      const timelineCues = await this.cuesFromTimeline(timeline);
      if (timelineCues.length) return { path: timeline, cues: timelineCues };
      const metadata = path.join(remotionRoot, 'audio', 'narration-metadata.json');
      const metadataCues = await this.cuesFromNarrationMetadata(metadata);
      if (metadataCues.length) return { path: metadata, cues: metadataCues };
    }
    const all: string[] = [];
    const dir = path.dirname(nearFile);
    for (const file of await this.walkFiles(dir)) {
      if (SUBTITLE_EXTENSIONS.has(path.extname(file).toLowerCase())) all.push(file);
    }
    const stem = path.basename(nearFile, path.extname(nearFile)).toLowerCase();
    const file = all.sort((a, b) => subtitleScore(b, stem) - subtitleScore(a, stem)).find((candidate) => subtitleScore(candidate, stem) > 0);
    return file ? { path: file, cues: await this.parseSubtitleFile(file) } : { cues: [] };
  }

  private async findRemotionRoot(nearFile: string): Promise<string | undefined> {
    let directory = path.dirname(nearFile);
    const root = await realpath(this.workspace);
    for (;;) {
      if (await exists(path.join(directory, 'timeline.json')) || await exists(path.join(directory, 'remotion.config.ts')) || path.basename(directory) === 'remotion') return directory;
      const parent = path.dirname(directory);
      if (parent === directory || path.relative(root, parent).startsWith('..')) return undefined;
      directory = parent;
    }
  }

  private async cuesFromTimeline(file: string): Promise<ReviewSubtitleCue[]> {
    const value = await readJsonFile<JsonObject | undefined>(file, undefined);
    if (!value) return [];
    const raw = Array.isArray(value.subtitleCues) ? value.subtitleCues
      : Array.isArray(value.cues) ? value.cues
      : Array.isArray(value.subtitles) ? value.subtitles
      : [];
    return raw.map((cue, index) => cueFromUnknown(cue, index, toRepoRelative(this.workspace, file), numberValue(value.fps))).filter((cue): cue is ReviewSubtitleCue => Boolean(cue));
  }

  private async cuesFromNarrationMetadata(file: string): Promise<ReviewSubtitleCue[]> {
    const value = await readJsonFile<{ segments?: unknown[] } | undefined>(file, undefined);
    return (value?.segments ?? []).map((segment, index) => cueFromUnknown(segment, index, toRepoRelative(this.workspace, file))).filter((cue): cue is ReviewSubtitleCue => Boolean(cue));
  }

  private async findSpectrograms(_projectId: string | undefined, nearFile: string): Promise<string[]> {
    const roots = [path.dirname(nearFile), path.resolve(path.dirname(nearFile), '..')];
    const revision = /^(.*[\\/]projects[\\/][^\\/]+)[\\/]renders[\\/]([^\\/]+)[\\/]([^\\/]+)$/.exec(nearFile);
    if (revision) roots.unshift(path.join(revision[1], 'qc', 'analysis', revision[2], path.basename(revision[3], path.extname(revision[3]))));
    const files: string[] = [];
    for (const root of roots) {
      try {
        for (const file of await this.walkFiles(root)) {
          if (/spectrogram(-speech)?\.(svg|png|jpg|jpeg)$/i.test(file)) files.push(file);
        }
      } catch { /* ignore */ }
    }
    return [...new Set(files)].slice(0, 4);
  }

  private async findQcReceipts(projectId: string | undefined, nearFile: string): Promise<Array<{ kind: string; path: string; summary?: string }>> {
    const roots = await this.reviewRoots(projectId ?? projectIdFromPath(this.workspace, nearFile));
    const receipts: Array<{ kind: string; path: string; summary?: string }> = [];
    for (const root of roots) {
      for (const file of await this.walkFiles(root)) {
        if (!file.endsWith('.json') || !/qc|parity|manifest|runbook/i.test(file)) continue;
        receipts.push({ kind: path.basename(file, '.json'), path: toRepoRelative(this.workspace, file) });
        if (receipts.length >= 20) return receipts;
      }
    }
    return receipts;
  }

  private async parseSubtitleFile(file: string): Promise<ReviewSubtitleCue[]> {
    const text = await readFile(file, 'utf8');
    if (file.endsWith('.srt')) return parseSrt(text, toRepoRelative(this.workspace, file));
    return parseVtt(text, toRepoRelative(this.workspace, file));
  }

  private ffmpeg(args: string[], signal?: AbortSignal): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      const child = spawn(process.env.FFMPEG_PATH || 'ffmpeg', args, { windowsHide: true });
      this.childProcesses.add(child);
      const chunks: Buffer[] = [];
      const errors: Buffer[] = [];
      const abort = () => {
        child.kill();
        reject(new Error('ffmpeg_cancelled'));
      };
      if (signal?.aborted) return abort();
      signal?.addEventListener('abort', abort, { once: true });
      child.stdout.on('data', (chunk: Buffer) => {
        const size = chunks.reduce((sum, item) => sum + item.length, 0) + chunk.length;
        if (size > MAX_IMAGE_BYTES) child.kill();
        else chunks.push(chunk);
      });
      child.stderr.on('data', (chunk: Buffer) => errors.push(chunk));
      child.on('error', reject);
      child.on('close', (code) => {
        this.childProcesses.delete(child);
        signal?.removeEventListener('abort', abort);
        if (code !== 0) {
          reject(new Error(`ffmpeg_failed: ${Buffer.concat(errors).toString('utf8') || code}`));
          return;
        }
        resolve(Buffer.concat(chunks));
      });
    });
  }
}

export class MediaReviewClient {
  readonly url: string;
  readonly token: string;

  constructor(url: string, token: string) {
    this.url = url;
    this.token = token;
  }

  available(): boolean {
    return Boolean(this.url && this.token);
  }

  async request(pathname: string, init: RequestInit = {}): Promise<unknown> {
    if (!this.available()) throw new Error('media_review_service_unavailable');
    const response = await fetch(new URL(pathname, this.url), { ...init, headers: { ...(init.headers ?? {}), authorization: `Bearer ${this.token}` } });
    if (!response.ok) throw new Error(`media_review_request_failed: ${response.status} ${await response.text()}`);
    const contentType = response.headers.get('content-type') ?? '';
    return contentType.includes('application/json') ? response.json() : response.text();
  }
}

export function mediaReviewClientFromEnv(): MediaReviewClient | undefined {
  const url = process.env.A2SWE_MEDIA_REVIEW_URL;
  const token = process.env.A2SWE_MEDIA_REVIEW_TOKEN;
  return url && token ? new MediaReviewClient(url, token) : undefined;
}

async function readJsonBody(request: http.IncomingMessage): Promise<unknown> {
  const chunks: Buffer[] = [];
  let size = 0;
  for await (const chunk of request) {
    const buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
    size += buffer.length;
    if (size > 1024 * 1024) throw new Error('request_body_too_large');
    chunks.push(buffer);
  }
  return chunks.length ? JSON.parse(Buffer.concat(chunks).toString('utf8')) : {};
}

async function serveFile(file: string, type: string, request: http.IncomingMessage, response: http.ServerResponse) {
  const info = await stat(file);
  const range = request.headers.range;
  if (range) {
    const match = /^bytes=(\d*)-(\d*)$/.exec(range);
    if (!match) {
      response.writeHead(416);
      response.end();
      return;
    }
    const start = match[1] ? Number(match[1]) : 0;
    const end = match[2] ? Math.min(Number(match[2]), info.size - 1) : info.size - 1;
    if (start > end || start >= info.size) {
      response.writeHead(416, { 'content-range': `bytes */${info.size}` });
      response.end();
      return;
    }
    response.writeHead(206, { 'content-type': type, 'accept-ranges': 'bytes', 'content-length': end - start + 1, 'content-range': `bytes ${start}-${end}/${info.size}` });
    createReadStream(file, { start, end }).pipe(response);
    return;
  }
  response.writeHead(200, { 'content-type': type, 'accept-ranges': 'bytes', 'content-length': info.size });
  createReadStream(file).pipe(response);
}

async function safeChildPath(root: string, relative: string): Promise<string> {
  const cleaned = relative || 'index.html';
  if (cleaned.includes('\0')) throw new Error('invalid_path');
  const absolute = await realpath(path.resolve(root, cleaned));
  const realRoot = await realpath(root);
  const rel = path.relative(realRoot, absolute);
  if (rel.startsWith('..') || path.isAbsolute(rel)) throw new Error('path_outside_studio_root');
  return absolute;
}

function mediaType(file: string): string {
  const extension = path.extname(file).toLowerCase();
  if (extension === '.mp4') return 'video/mp4';
  if (extension === '.webm') return 'video/webm';
  if (extension === '.wav') return 'audio/wav';
  if (extension === '.mp3') return 'audio/mpeg';
  if (extension === '.png') return 'image/png';
  if (extension === '.jpg' || extension === '.jpeg') return 'image/jpeg';
  if (extension === '.webp') return 'image/webp';
  if (extension === '.svg') return 'image/svg+xml';
  if (extension === '.js') return 'text/javascript';
  if (extension === '.css') return 'text/css';
  if (extension === '.ttf') return 'font/ttf';
  if (extension === '.otf') return 'font/otf';
  if (extension === '.woff') return 'font/woff';
  if (extension === '.woff2') return 'font/woff2';
  if (extension === '.html') return 'text/html; charset=utf-8';
  if (extension === '.json') return 'application/json';
  if (extension === '.vtt') return 'text/vtt';
  return 'application/octet-stream';
}

function projectIdFromPath(workspace: string, absolutePath: string): string | undefined {
  const parts = toRepoRelative(workspace, absolutePath).split('/');
  return parts[0] === 'projects' ? parts[1] : undefined;
}

function cueFromUnknown(value: unknown, index: number, sourcePath: string, fps?: number): ReviewSubtitleCue | undefined {
  if (!value || typeof value !== 'object') return undefined;
  const record = value as Record<string, unknown>;
  const frames = record.startFrame !== undefined || record.endFrame !== undefined;
  let start = numberValue(record.startSeconds ?? record.start ?? record.from ?? record.startTime);
  let end = numberValue(record.endSeconds ?? record.end ?? record.to ?? record.endTime);
  if (frames) {
    if (fps === undefined || !Number.isFinite(fps) || fps <= 0) throw new Error(`review_timeline_fps_invalid: ${sourcePath}`);
    start = numberValue(record.startFrame) / fps;
    end = numberValue(record.endFrame) / fps;
  }
  const text = typeof record.text === 'string' ? record.text
    : typeof record.narration === 'string' ? record.narration
    : typeof record.caption === 'string' ? record.caption
    : '';
  if (!Number.isFinite(start) || !Number.isFinite(end) || end <= start || !text.trim()) return undefined;
  return { startSeconds: start, endSeconds: end, text: text.trim(), sourcePath };
}

function numberValue(value: unknown): number {
  if (typeof value === 'number') return value;
  if (typeof value === 'string') return Number(value);
  return Number.NaN;
}

async function sha256File(file: string): Promise<string> {
  const hash = createHash('sha256');
  await new Promise<void>((resolve, reject) => {
    const stream = createReadStream(file);
    stream.on('data', (chunk) => { hash.update(chunk); });
    stream.on('error', reject);
    stream.on('end', resolve);
  });
  return hash.digest('hex');
}

function subtitleScore(file: string, mediaStem: string): number {
  const base = path.basename(file, path.extname(file)).toLowerCase();
  if (base === mediaStem) return 100;
  if (base.includes(mediaStem) || mediaStem.includes(base)) return 80;
  if (/^(captions|caption|subtitles|subtitle|subs|closed-captions)$/.test(base)) return 60;
  return 0;
}

async function exists(file: string): Promise<boolean> {
  try { await access(file); return true; } catch { return false; }
}

function parseVtt(text: string, sourcePath: string): ReviewSubtitleCue[] {
  const cues: ReviewSubtitleCue[] = [];
  const blocks = text.replace(/\r/g, '').split(/\n\n+/);
  for (const block of blocks) {
    const lines = block.split('\n').filter(Boolean);
    const timeLine = lines.find((line) => line.includes('-->'));
    if (!timeLine) continue;
    const [start, end] = timeLine.split('-->').map((part) => part.trim().split(/\s+/)[0]);
    const textLines = lines.slice(lines.indexOf(timeLine) + 1);
    cues.push({ startSeconds: parseTimestamp(start), endSeconds: parseTimestamp(end), text: textLines.join('\n'), sourcePath });
  }
  return cues;
}

function parseSrt(text: string, sourcePath: string): ReviewSubtitleCue[] {
  return parseVtt(text.replace(/,/g, '.'), sourcePath);
}

function parseTimestamp(value: string): number {
  const parts = value.split(':').map(Number);
  const seconds = parts.pop() ?? 0;
  const minutes = parts.pop() ?? 0;
  const hours = parts.pop() ?? 0;
  return hours * 3600 + minutes * 60 + seconds;
}

function cuesToVtt(cues: ReviewSubtitleCue[]): string {
  return `WEBVTT\n\n${cues.map((cue, index) => `${index + 1}\n${formatTimestamp(cue.startSeconds)} --> ${formatTimestamp(cue.endSeconds)}\n${cue.text}\n`).join('\n')}`;
}

function formatTimestamp(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const rest = (seconds % 60).toFixed(3).padStart(6, '0');
  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${rest}`;
}
