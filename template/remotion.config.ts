import {Config} from '@remotion/cli/config';
import {existsSync, readdirSync} from 'node:fs';
import {homedir} from 'node:os';
import {join} from 'node:path';

if (process.env.REMOTION_CACHE === '0') {
  Config.setCachingEnabled(false);
}

// Linux / ARM (e.g. Raspberry Pi) support.
// Chrome-for-Testing has no linux-arm64 build, so Remotion can't download a browser there.
// Point it at a system Chromium via env, e.g.:
//   export REMOTION_BROWSER_EXECUTABLE=/usr/bin/chromium
// On a GPU-less headless box also set software GL (default 'swangle'); override with REMOTION_GL.
// Both are unset on macOS / x86 → this file is a no-op and Remotion uses its own browser.
const GL_RENDERERS = ['swangle', 'angle', 'egl', 'swiftshader', 'vulkan', 'angle-egl'] as const;
type GlRenderer = (typeof GL_RENDERERS)[number];
const isGlRenderer = (v: string | undefined): v is GlRenderer => (GL_RENDERERS as readonly string[]).includes(v ?? '');

// Default browser backend: Playwright's chromium headless shell (`npx playwright install chromium-headless-shell`).
// Override with REMOTION_BROWSER_EXECUTABLE; set REMOTION_BROWSER=remotion to use Remotion's own Chrome-for-Testing.
const findPlaywrightHeadlessShell = (): string | undefined => {
  const root =
    process.env.PLAYWRIGHT_BROWSERS_PATH && process.env.PLAYWRIGHT_BROWSERS_PATH !== '0'
      ? process.env.PLAYWRIGHT_BROWSERS_PATH
      : process.platform === 'win32'
        ? join(process.env.LOCALAPPDATA ?? '', 'ms-playwright')
        : process.platform === 'darwin'
          ? join(homedir(), 'Library', 'Caches', 'ms-playwright')
          : join(homedir(), '.cache', 'ms-playwright');
  if (!existsSync(root)) return undefined;
  const exeParts: Record<string, string[]> = {
    win32: ['chrome-win', 'headless_shell.exe'],
    darwin: ['chrome-headless-shell-mac-' + (process.arch === 'arm64' ? 'arm64' : 'x64'), 'chrome-headless-shell'],
    linux: ['chrome-linux', 'headless_shell'],
  };
  const parts = exeParts[process.platform];
  if (!parts) return undefined;
  const revisions = readdirSync(root)
    .filter((d) => /^chromium_headless_shell-\d+$/.test(d))
    .sort((a, b) => Number(b.split('-')[1]) - Number(a.split('-')[1]));
  for (const rev of revisions) {
    const candidate = join(root, rev, ...parts);
    if (existsSync(candidate)) return candidate;
  }
  return undefined;
};

const browser =
  process.env.REMOTION_BROWSER_EXECUTABLE ||
  (process.env.REMOTION_BROWSER === 'remotion' ? undefined : findPlaywrightHeadlessShell());
if (browser) {
  Config.setBrowserExecutable(browser);
  const gl = process.env.REMOTION_GL;
  if (gl && !isGlRenderer(gl)) {
    throw new Error(`REMOTION_GL=${gl} is not a valid renderer; use one of: ${GL_RENDERERS.join(' / ')}`);
  }
  Config.setChromiumOpenGlRenderer(isGlRenderer(gl) ? gl : 'swangle');
}
