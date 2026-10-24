import { spawn } from 'node:child_process';
import { existsSync } from 'node:fs';
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createCanvas, GlobalFonts } from '@napi-rs/canvas';
import { blend, paletteRoles } from './brand.ts';
import { digest, sha256File } from './canonical.ts';

const ROOT = fileURLToPath(new URL('../../../', import.meta.url));
const FONT = path.join(ROOT, 'template/public/fonts/NotoSansSC.ttf');
let fontReady = false;
export type RegenerationStyle = 'editorial' | 'studio';
export interface RecompositionDesign {
  schemaVersion: '1.0.0';
  method: 'reference-recomposition';
  style: RegenerationStyle;
  sourceDigest: string;
  title: string;
  revision: string;
  palette: ReturnType<typeof paletteRoles>;
  geometry: { x: number; y: number; width: number; height: number };
  frame: { width: 1920; height: 1080; fps: number; duration: number };
  preservation: { originalPicture: 'contained-without-crop'; audio: 'codec-copy'; timing: 'unchanged' };
  engine: { name: 'ffmpeg-canvas-recomposition'; version: '1'; preset: 'veryfast'; crf: 21; fontDigest: string };
}

export async function recompositionDesign(input: {
  style: RegenerationStyle; sourceDigest: string; title: string; revision: string;
  primary: string; accent?: string; fps: number; duration: number;
}): Promise<RecompositionDesign> {
  return {
    schemaVersion: '1.0.0', method: 'reference-recomposition', style: input.style,
    sourceDigest: input.sourceDigest, title: input.title, revision: input.revision,
    palette: paletteRoles({ primary: input.primary, accent: input.accent }),
    geometry: input.style === 'editorial' ? { x: 112, y: 112, width: 1696, height: 954 }
      : { x: 400, y: 160, width: 1456, height: 820 },
    frame: { width: 1920, height: 1080, fps: input.fps, duration: input.duration },
    preservation: { originalPicture: 'contained-without-crop', audio: 'codec-copy', timing: 'unchanged' },
    engine: { name: 'ffmpeg-canvas-recomposition', version: '1', preset: 'veryfast', crf: 21, fontDigest: await sha256File(FONT) }
  };
}

/** Brand-led stage around the intact archived picture; never substitutes today's facts for historical content. */
export async function writeRecompositionStage(design: RecompositionDesign, file: string): Promise<void> {
  if (!fontReady) {
    if (!existsSync(FONT) || !GlobalFonts.registerFromPath(FONT, 'A2SWE Recomposition')) throw new Error('regeneration_font_missing');
    fontReady = true;
  }
  const canvas = createCanvas(1920, 1080);
  const ctx = canvas.getContext('2d');
  const p = design.palette;
  const text = (value: string, x: number, y: number, size: number, color: string, width: number) => {
    ctx.font = `600 ${size}px "A2SWE Recomposition"`;
    ctx.fillStyle = color;
    let fitted = value;
    while (ctx.measureText(fitted).width > width && fitted.length > 1) fitted = fitted.slice(0, -1);
    if (fitted !== value) fitted = `${fitted.slice(0, -1)}…`;
    ctx.fillText(fitted, x, y);
  };
  if (design.style === 'editorial') {
    ctx.fillStyle = p.canvas; ctx.fillRect(0, 0, 1920, 1080);
    ctx.fillStyle = p.primary; ctx.fillRect(0, 0, 24, 1080);
    ctx.fillStyle = p.line; ctx.fillRect(112, 90, 1696, 2);
    text(design.title, 112, 65, 37, p.text, 1280);
    text('EDITORIAL', 1535, 64, 22, p.muted, 274);
    ctx.fillStyle = blend(p.primary, '#FFFFFF', 0.65); ctx.fillRect(88, 112, 8, 954);
  } else {
    ctx.fillStyle = p.header; ctx.fillRect(0, 0, 1920, 1080);
    ctx.fillStyle = p.deep; ctx.fillRect(0, 0, 352, 1080);
    ctx.fillStyle = p.accent; ctx.fillRect(64, 70, 72, 7);
    text('STUDIO', 64, 124, 23, p.accent, 235);
    const words = design.title.split(/\s+/);
    let line = ''; let row = 0;
    ctx.font = '600 43px "A2SWE Recomposition"';
    for (const word of words) {
      const candidate = line ? `${line} ${word}` : word;
      if (ctx.measureText(candidate).width > 240 && line) {
        text(line, 64, 220 + row++ * 63, 43, '#FFFFFF', 244); line = word;
        if (row === 5) break;
      } else line = candidate;
    }
    if (row < 5 && line) text(line, 64, 220 + row * 63, 43, '#FFFFFF', 244);
    text(design.revision, 64, 920, 17, p.accent, 240);
    text('a2swe', 64, 987, 30, '#FFFFFF', 240);
    text(design.title, 400, 100, 34, '#FFFFFF', 1456);
    ctx.fillStyle = p.accent; ctx.fillRect(400, 120, 1456, 3);
    ctx.fillStyle = blend(p.header, '#FFFFFF', 0.22); ctx.fillRect(400, 1008, 1456, 2);
    text('EVIDENCE  /  DECISION  /  ACTION', 400, 1050, 21, p.accent, 1456);
  }
  await mkdir(path.dirname(file), { recursive: true });
  await writeFile(file, canvas.toBuffer('image/png'));
}

export function recompositionFilter(design: RecompositionDesign): string {
  const g = design.geometry;
  // No trim, speed change, crop or audio re-encoding. The original picture and its burned captions remain intact.
  return `[0:v]scale=${g.width}:${g.height}:force_original_aspect_ratio=decrease:flags=lanczos,pad=${g.width}:${g.height}:(ow-iw)/2:(oh-ih)/2:color=${design.palette.deep},setsar=1[reference];[1:v]format=yuv420p,loop=loop=-1:size=1:start=0[stage];[stage][reference]overlay=${g.x}:${g.y}:shortest=1,format=yuv420p[out]`;
}

export async function renderRecomposition(source: string, stage: string, output: string, design: RecompositionDesign): Promise<void> {
  const args = ['-hide_banner', '-loglevel', 'error', '-nostdin', '-y', '-threads', '1', '-i', source,
    '-threads', '1', '-framerate', String(design.frame.fps), '-i', stage, '-filter_complex_threads', '1',
    '-filter_complex', recompositionFilter(design), '-map', '[out]', '-map', '0:a:0',
    '-c:v', 'libx264', '-preset', design.engine.preset, '-crf', String(design.engine.crf), '-threads', '1', '-r', String(design.frame.fps),
    '-c:a', 'copy', '-map_metadata', '0', '-movflags', '+faststart', output];
  await new Promise<void>((resolve, reject) => {
    const child = spawn(process.env.FFMPEG_PATH || 'ffmpeg', args, { windowsHide: true });
    let stderr = '';
    child.stderr.on('data', (chunk) => { stderr = (stderr + chunk).slice(-8000); });
    child.on('error', reject);
    child.on('close', (code) => code === 0 ? resolve() : reject(new Error(`regeneration_render_failed: ${stderr}`)));
  });
}

export const designDigest = (design: RecompositionDesign) => digest(design);
