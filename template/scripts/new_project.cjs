const path = require('node:path');
const {spawnSync} = require('node:child_process');

// Compatibility entry point: scaffolds a core-managed project through `project-init`.
const [destination, slug, ...flags] = process.argv.slice(2);
const options = {};
for (let index = 0; index < flags.length; index++) {
  const flag = flags[index];
  if (['--name', '--kind', '--as-of'].includes(flag) && flags[index + 1] && !flags[index + 1].startsWith('--')) {
    options[flag] = flags[++index];
  } else {
    console.error(`Invalid or incomplete option: ${flag}`);
    process.exit(1);
  }
}
if (!destination || !slug || !/^[a-z0-9][a-z0-9-]{0,79}$/.test(slug)) {
  console.error('Usage: node template/scripts/new_project.cjs <new-directory> <slug> [--name NAME --kind KIND --as-of YYYY-MM-DD]');
  process.exit(1);
}
const cli = path.resolve(__dirname, '../../packages/core/src/cli.ts');
const name = options['--name'] || slug.split('-').map(part => part[0].toUpperCase() + part.slice(1)).join(' ');
const result = spawnSync(process.execPath, [cli, 'project-init', '--id', slug, '--name', name,
  '--kind', options['--kind'] || 'topic', '--as-of', options['--as-of'] || new Date().toISOString().slice(0, 10),
  '--out', destination], {stdio: 'inherit'});
process.exit(result.error || result.status !== 0 ? result.status || 1 : 0);
