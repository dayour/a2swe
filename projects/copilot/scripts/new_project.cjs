const fs = require('node:fs');
const path = require('node:path');
const {spawnSync} = require('node:child_process');

const [destination, slug = 'video', ...flags] = process.argv.slice(2);
if (!destination || !/^[A-Za-z0-9_-]+$/.test(slug) || flags.some(flag => flag !== '--no-install')) {
  console.error('Usage: node scripts/new_project.cjs <new-directory> <slug> [--no-install]');
  process.exit(1);
}
const source = path.resolve(__dirname, '..');
const target = path.resolve(destination);
if (fs.existsSync(target) || target.startsWith(source + path.sep)) {
  console.error('Destination must be a new directory outside the source template.');
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
for (const directory of [`public/assets/${slug}`, 'research', 'qc', 'stills', 'renders', 'reference']) {
  fs.mkdirSync(path.join(target, directory), {recursive: true});
}
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