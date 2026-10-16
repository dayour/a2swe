#!/usr/bin/env node
// Runs the a2swe core CLI on a supported Node. Plain JavaScript so any Node can parse it: the current runtime is used when it satisfies
// the repository engines range, otherwise A2SWE_NODE (the same override the desktop host honors); anything else fails with a clear error.
import { spawnSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { fileURLToPath, pathToFileURL } from 'node:url';

const cli = fileURLToPath(new URL('../src/cli.ts', import.meta.url));
const range = JSON.parse(readFileSync(new URL('../../../package.json', import.meta.url), 'utf8')).engines.node;
const bounds = /^>=(\d+)\.(\d+)\.(\d+)\s*<(\d+)$/.exec(range);
if (!bounds) throw new Error(`unsupported_engines_range: ${range}`);
const [minMajor, minMinor, minPatch, maxMajor] = bounds.slice(1).map(Number);
const supported = (version) => {
  const [major, minor, patch] = version.trim().replace(/^v/, '').split('.').map(Number);
  if (major >= maxMajor || major < minMajor) return false;
  return major > minMajor || minor > minMinor || (minor === minMinor && patch >= minPatch);
};

if (supported(process.version)) {
  await import(pathToFileURL(cli).href);
} else {
  const override = process.env.A2SWE_NODE;
  const probe = override ? spawnSync(override, ['--version'], { encoding: 'utf8' }) : null;
  if (!override || probe.status !== 0 || !supported(probe.stdout)) {
    console.error(JSON.stringify({ error: `node_version_unsupported: a2swe requires Node ${range}; found ${process.version}`
      + `${override ? ` and A2SWE_NODE ${probe?.stdout?.trim() || 'unavailable'}` : ''}. Install a supported Node or set A2SWE_NODE to one.` }));
    process.exit(1);
  }
  const result = spawnSync(override, [cli, ...process.argv.slice(2)], { stdio: 'inherit' });
  process.exit(result.status ?? 1);
}
