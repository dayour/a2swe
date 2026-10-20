'use strict';

// Routes @remotion/renderer's per-launch browser profile through scripts/remotion_profile.cjs, so renders reuse a
// persistent per-project profile instead of creating (and, on Windows, leaking) os.tmpdir()/puppeteer_dev_chrome_profile-*
// folders.
//
//   node scripts/patch_remotion_profile.cjs [project-or-renderer-dir] [--check]
//
// Runs as the template postinstall hook; rerun it by hand after `npm install --ignore-scripts`. Every edit is
// anchor-checked before anything is written, and rerunning is a no-op. --check exits 1 when the renderer is missing
// or not fully patched; the default mode only warns, so it never fails an install.

const fs = require('node:fs');
const path = require('node:path');

const MARK = '/* a2swe:profile */';
const HELPER = 'a2swe-profile.js';
const TESTED_VERSION = '4.0.523';
const ACQUIRE = /^([ \t]*)const userDataDir = await [^\n]*$/gm;
const WS_ENDPOINT = /^([ \t]*)const browserWSEndpoint = await waitForWSEndpoint\(\{/gm;
const SPAWN = 'const proc = childProcess.spawn(';
const CJS_DELETE = /^([ \t]*)\(0, delete_directory_1\.deleteDirectory\)\(userDataDir\);$/gm;
const ESM_DELETE = /^([ \t]*)deleteDirectory\(userDataDir\);$/gm;
const ESM_REQUIRE = /var (\w+) = \/\* @__PURE__ \*\/ createRequire\(import\.meta\.url\);/g;

class AnchorError extends Error {}

const args = process.argv.slice(2);
const check = args.includes('--check');
const target = path.resolve(args.find((arg) => !arg.startsWith('--')) ?? path.join(__dirname, '..'));

const count = (text, pattern) => (typeof pattern === 'string' ? text.split(pattern).length - 1 : (text.match(pattern) || []).length);
const expect = (ok, message) => {
  if (!ok) throw new AnchorError(message);
};

// mkdtemp(tmpdir()/puppeteer_dev_chrome_profile-) -> acquire() of a persistent profile slot.
const patchAcquire = (text, loader, file) => {
  const line = `const userDataDir = ${loader}.acquire(); ${MARK}`;
  const stock = count(text, ACQUIRE);
  const patched = count(text, line);
  if (stock === 0 && patched === 1) return text;
  expect(stock === 1 && patched === 0, `${file}: expected 1 profile mkdtemp line, found ${stock} (${patched} patched)`);
  return text.replace(ACQUIRE, (_, indent) => `${indent}${line}`);
};

// Record the browser pid right after spawn, so the slot stays claimed until that browser has exited.
const patchAttach = (text, loader, file) => {
  const line = `${loader}.attach(userDataDir, proc); ${MARK}`;
  const patched = count(text, line);
  if (patched === 1) return text;
  expect(patched === 0 && count(text, WS_ENDPOINT) === 1 && count(text, SPAWN) === 1, `${file}: browser spawn / waitForWSEndpoint anchors changed`);
  return text.replace(WS_ENDPOINT, (whole, indent) => `${indent}${line}\n${whole}`);
};

// deleteDirectory(userDataDir) on close -> release() of the slot; the profile itself is kept.
const patchRelease = (text, loader, pattern, file) => {
  const line = `${loader}.release(userDataDir, proc.pid); ${MARK}`;
  const stock = count(text, pattern);
  const patched = count(text, line);
  if (stock === 0 && patched === 2) return text;
  expect(stock + patched === 2, `${file}: expected 2 profile deleteDirectory calls, found ${stock} (${patched} patched)`);
  return text.replace(pattern, (_, indent) => `${indent}${line}`);
};

const findUp = (start, relative) => {
  for (let dir = start; ; dir = path.dirname(dir)) {
    const candidate = path.join(dir, relative);
    if (fs.existsSync(candidate)) return fs.realpathSync(candidate);
    if (path.dirname(dir) === dir) return undefined;
  }
};

const isRenderer = (dir) => Boolean(dir) && fs.existsSync(path.join(dir, 'dist', 'open-browser.js'));

// Resolve the renderer the way @remotion/cli does, following the junctions release runtimes use.
const locate = (start) => {
  if (isRenderer(start)) return start;
  const cli = findUp(start, path.join('node_modules', '@remotion', 'cli'));
  const viaCli = cli && findUp(cli, path.join('node_modules', '@remotion', 'renderer'));
  if (isRenderer(viaCli)) return viaCli;
  const direct = findUp(start, path.join('node_modules', '@remotion', 'renderer'));
  return isRenderer(direct) ? direct : undefined;
};

// Compute every edit up front; an AnchorError here means nothing is written.
const plan = (renderer) => {
  const dist = path.join(renderer, 'dist');
  const helper = fs.readFileSync(path.join(__dirname, 'remotion_profile.cjs'));
  const helperFile = path.join(dist, HELPER);
  const items = [{label: HELPER, file: helperFile, data: helper, pending: !fs.existsSync(helperFile) || !fs.readFileSync(helperFile).equals(helper)}];
  const edit = (relative, transform) => {
    const file = path.join(dist, relative);
    const raw = fs.readFileSync(file, 'utf8');
    const eol = raw.includes('\r\n') ? '\r\n' : '\n';
    const next = transform(raw.replace(/\r\n/g, '\n'), relative);
    const data = eol === '\n' ? next : next.replace(/\n/g, eol);
    items.push({label: relative, file, data, pending: data !== raw});
  };
  const cjs = (from) => `require('${from}${HELPER}')`;
  // The close path is patched before the launch path, so a patched acquire never meets a stock delete.
  edit(path.join('browser', 'BrowserRunner.js'), (text, file) => patchRelease(patchAttach(text, cjs('../'), file), cjs('../'), CJS_DELETE, file));
  edit('open-browser.js', (text, file) => patchAcquire(text, cjs('./'), file));
  edit(path.join('esm', 'index.mjs'), (text, file) => {
    const bindings = [...text.matchAll(ESM_REQUIRE)];
    expect(bindings.length === 1, `${file}: createRequire(import.meta.url) binding not found`);
    const loader = `${bindings[0][1]}("../${HELPER}")`;
    return patchRelease(patchAttach(patchAcquire(text, loader, file), loader, file), loader, ESM_DELETE, file);
  });
  return items;
};

const writeAtomic = (file, data) => {
  const temp = `${file}.a2swe-${process.pid}.tmp`;
  fs.writeFileSync(temp, data);
  for (let attempt = 0; ; attempt++) {
    try {
      fs.renameSync(temp, file);
      return;
    } catch (error) {
      if (attempt >= 20 || !['EPERM', 'EACCES', 'EBUSY'].includes(error.code)) {
        fs.rmSync(temp, {force: true});
        throw error;
      }
      Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, 50);
    }
  }
};

const main = () => {
  const renderer = locate(target);
  if (!renderer) {
    console.log(`a2swe: @remotion/renderer not found from ${target}; persistent browser profile patch skipped.`);
    return check ? 1 : 0;
  }
  const {version} = JSON.parse(fs.readFileSync(path.join(renderer, 'package.json'), 'utf8'));
  if (version !== TESTED_VERSION) {
    console.warn(`a2swe: @remotion/renderer ${version} differs from the tested ${TESTED_VERSION}; applying anchor-checked patches.`);
  }
  let items;
  try {
    items = plan(renderer);
  } catch (error) {
    if (!(error instanceof AnchorError)) throw error;
    console.warn(`a2swe: WARNING: cannot patch @remotion/renderer ${version}: ${error.message}. Nothing was written; renders keep creating temporary puppeteer_dev_chrome_profile-* folders.`);
    return check ? 1 : 0;
  }
  const pending = items.filter((item) => item.pending);
  if (check) {
    console.log(pending.length === 0
      ? `a2swe: @remotion/renderer ${version} uses persistent browser profiles (${renderer}).`
      : `a2swe: persistent browser profile patch pending for ${pending.map((item) => item.label).join(', ')} (${renderer}).`);
    return pending.length === 0 ? 0 : 1;
  }
  for (const item of pending) writeAtomic(item.file, item.data);
  console.log(pending.length === 0
    ? `a2swe: @remotion/renderer ${version} already uses persistent browser profiles.`
    : `a2swe: patched @remotion/renderer ${version} for persistent browser profiles (${pending.length} file(s)).`);
  return 0;
};

try {
  process.exitCode = main();
} catch (error) {
  console.warn(`a2swe: WARNING: persistent browser profile patch failed: ${error.message}`);
  process.exitCode = check ? 1 : 0;
}
