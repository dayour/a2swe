const fs = require('node:fs');
const path = require('node:path');
const {spawnSync} = require('node:child_process');

const [destination, slug, ...flags] = process.argv.slice(2);
const legacy = flags.includes('--legacy');
const noInstall = flags.includes('--no-install');
const options = {};
for (let index = 0; index < flags.length; index++) {
  const flag = flags[index];
  if (['--name', '--kind', '--as-of'].includes(flag) && flags[index + 1] && !flags[index + 1].startsWith('--')) {
    options[flag] = flags[++index];
  } else if (flag !== '--legacy' && flag !== '--no-install') {
    console.error(`Invalid or incomplete option: ${flag}`);
    process.exit(1);
  }
}
if (!destination || !slug || !/^[a-z0-9][a-z0-9-]{0,79}$/.test(slug) || (legacy && Object.keys(options).length)) {
  console.error('Usage: node template/scripts/new_project.cjs <new-directory> <slug> [--name NAME --kind KIND --as-of YYYY-MM-DD] [--legacy] [--no-install]');
  process.exit(1);
}
if (!legacy) {
  const cli = path.resolve(__dirname, '../../packages/core/src/cli.ts');
  const name = options['--name'] || slug.split('-').map(part => part[0].toUpperCase() + part.slice(1)).join(' ');
  const result = spawnSync(process.execPath, [cli, 'project-init', '--id', slug, '--name', name,
    '--kind', options['--kind'] || 'topic', '--as-of', options['--as-of'] || new Date().toISOString().slice(0, 10),
    '--out', destination], {stdio: 'inherit'});
  if (result.error || result.status !== 0) process.exit(result.status || 1);
  process.exit(0);
}
const source = path.resolve(__dirname, '..');
const target = path.resolve(destination);
const runbookStarter = path.resolve(source, '../library/assets/runbook/runbook-starter.json');
if (fs.existsSync(target) || target.startsWith(source + path.sep)) {
  console.error('Destination must be a new directory outside the source template.');
  process.exit(1);
}
if (!fs.existsSync(runbookStarter)) {
  console.error(`Runbook starter missing: ${runbookStarter}`);
  process.exit(1);
}
const runbook = JSON.parse(fs.readFileSync(runbookStarter, 'utf8'));
if (runbook.schemaVersion !== '1.0.0' || !Array.isArray(runbook.gates) || !Array.isArray(runbook.stages)) {
  console.error('Runbook starter is invalid.');
  process.exit(1);
}
const excluded = new Set(['node_modules', 'renders', 'fin_frames', 'stills', 'audio', '__pycache__', '.git']);
fs.cpSync(source, target, {
  recursive: true,
  filter: filename => {
    const relative = path.relative(source, filename);
    const parts = relative.split(path.sep);
    return !parts.some(part => excluded.has(part) || part.startsWith('build')) &&
      !['timeline.json', 'timeline.md', 'storyboard.md', 'render.done', 'fin_count.txt'].includes(path.basename(filename)) &&
      !(parts[0] === 'public' && parts[1] === 'assets');
  },
});
const config = path.join(target, 'src/config.ts');
fs.writeFileSync(config, fs.readFileSync(config, 'utf8').replace(/slug:\s*'[^']*'/, `slug: '${slug}'`));
runbook.runbookId = slug;
runbook.projectId = slug;
runbook.updatedAt = new Date().toISOString();
fs.writeFileSync(path.join(target, 'agent/runbook.json'), `${JSON.stringify(runbook, null, 2)}\n`, {flag: 'wx'});
fs.mkdirSync(path.join(target, 'reference'), {recursive: true});
const rules = [path.join(source, 'reference/production-rules.md'), path.join(source, '../reference/production-rules.md')].find(filename => fs.existsSync(filename));
if (rules) fs.copyFileSync(rules, path.join(target, 'reference/production-rules.md'));
if (!flags.includes('--no-install')) {
  for (const args of [['ci'], ['run', 'typecheck']]) {
    const result = spawnSync('npm', args, {cwd: target, stdio: 'inherit', shell: process.platform === 'win32'});
    if (result.error || result.status !== 0) {
      console.error(result.error?.message || 'Dependency installation or typecheck failed.');
      process.exit(result.status || 1);
    }
  }
}
console.log(`Project ready: ${target} (slug=${slug}, dependencies=${flags.includes('--no-install') ? 'not installed' : 'installed'})`);