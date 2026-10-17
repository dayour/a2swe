import { readFile, writeFile } from 'node:fs/promises';
import sharp from 'sharp';
import type { Sharp, SharpOptions } from 'sharp';

// libvips opens files through Win32 calls that stop at MAX_PATH (260 characters) unless the machine opts into long paths, while
// Node's fs handles any length. Evidence folders nest deeply, so images cross the file boundary as buffers.
export async function readImage(file: string, options?: SharpOptions): Promise<Sharp> {
  return sharp(await readFile(file), options);
}

export async function writeImage(image: Sharp, file: string): Promise<void> {
  await writeFile(file, await image.toBuffer());
}
