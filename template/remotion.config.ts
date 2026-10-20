import {Config} from '@remotion/cli/config';
import {existsSync, readdirSync} from 'node:fs';
import {homedir} from 'node:os';
import {join, resolve} from 'node:path';

if (process.env.REMOTION_CACHE === '0') {
  Config.setCachingEnabled(false);
}

// Persistent browser profile: renders reuse <project>/.remotion/chrome-profile instead of creating (and, on Windows,
// leaking) a temp puppeteer_dev_chrome_profile-* folder per launch; concurrent renders claim chrome-profile-1, -2, ….
// Profiles are never deleted, only their caches are trimmed. Override with REMOTION_USER_DATA_DIR.
// Applied by the postinstall patch (scripts/patch_remotion_profile.cjs): after an `--ignore-scripts` install run
// `npm run postinstall`; `node scripts/patch_remotion_profile.cjs --check` reports whether it is in place.
process.env.REMOTION_USER_DATA_DIR ||= join(process.cwd(), '.remotion', 'chrome-profile');

// Linux / ARM (e.g. Raspberry Pi) support.
// Chrome-for-Testing has no linux-arm64 build, so Remotion can't download a browser there.
// Point it at a system Chromium via env, e.g.:
//   export REMOTION_BROWSER_EXECUTABLE=/usr/bin/chromium
// On a GPU-less headless box also set software GL (default 'swangle'); override with REMOTION_GL.
// When REMOTION_BROWSER_EXECUTABLE is unset, the Playwright headless shell below is used, falling back to Remotion's own browser.
const GL_RENDERERS = ['swangle', 'angle', 'egl', 'swiftshader', 'vulkan', 'angle-egl'] as const;
type GlRenderer = (typeof GL_RENDERERS)[number];
const isGlRenderer = (v: string | undefined): v is GlRenderer => (GL_RENDERERS as readonly string[]).includes(v ?? '');

// Default browser backend: Playwright's chromium headless shell (`npx playwright install chromium-headless-shell`).
// Override with REMOTION_BROWSER_EXECUTABLE; set REMOTION_BROWSER=remotion to use Remotion's own Chrome-for-Testing.
// Searched as Playwright resolves its cache, newest completed revision first, in the chrome-win/headless_shell layout of older
// Playwright releases and the chrome-headless-shell-<platform> layout of newer ones.
const findPlaywrightHeadlessShell = (): string | undefined => {
  const root =
    process.env.PLAYWRIGHT_BROWSERS_PATH && process.env.PLAYWRIGHT_BROWSERS_PATH !== '0'
      ? resolve(process.env.INIT_CWD || process.cwd(), process.env.PLAYWRIGHT_BROWSERS_PATH)
      : process.platform === 'win32'
        ? join(process.env.LOCALAPPDATA || join(homedir(), 'AppData', 'Local'), 'ms-playwright')
        : process.platform === 'darwin'
          ? join(homedir(), 'Library', 'Caches', 'ms-playwright')
          : join(process.env.XDG_CACHE_HOME || join(homedir(), '.cache'), 'ms-playwright');
  if (!existsSync(root)) return undefined;
  const arch = process.arch === 'arm64' ? 'arm64' : 'x64';
  const layouts: Record<string, string[][]> = {
    win32: [['chrome-win', 'headless_shell.exe'], ['chrome-headless-shell-win64', 'chrome-headless-shell.exe']],
    darwin: [['chrome-mac', 'headless_shell'], ['chrome-headless-shell-mac-' + arch, 'chrome-headless-shell']],
    linux: [['chrome-linux', 'headless_shell'], ['chrome-headless-shell-linux64', 'chrome-headless-shell']],
  };
  const candidates = layouts[process.platform];
  if (!candidates) return undefined;
  const revisions = readdirSync(root)
    .filter((d) => /^chromium_headless_shell-\d+$/.test(d))
    .sort((a, b) => Number(b.split('-')[1]) - Number(a.split('-')[1]));
  for (const rev of revisions) {
    if (!existsSync(join(root, rev, 'INSTALLATION_COMPLETE'))) continue;
    for (const parts of candidates) {
      const candidate = join(root, rev, ...parts);
      if (existsSync(candidate)) return candidate;
    }
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
