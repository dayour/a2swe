import { existsSync } from 'node:fs';
import { mkdir, readdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { parseArgs } from 'node:util';
import { regenerateRevisions } from '../packages/core/src/regenerations.ts';

const { values } = parseArgs({ options: { root: { type: 'string', default: '.' }, jobs: { type: 'string', default: '2' }, scope: { type: 'string', default: 'primary' } } });
const root = path.resolve(values.root);
const jobs = Number(values.jobs);
if (!Number.isSafeInteger(jobs) || jobs < 1 || jobs > 4) throw new Error('jobs must be between 1 and 4');
if (!['primary', 'all'].includes(values.scope)) throw new Error('scope must be primary or all');
const projects = (await readdir(path.join(root, 'projects'), { withFileTypes: true }))
  .filter((entry) => entry.isDirectory() && !entry.isSymbolicLink() && existsSync(path.join(root, 'projects', entry.name, 'renders')))
  .map((entry) => path.join(root, 'projects', entry.name)).sort();
if (!projects.length) throw new Error('no_matching_regeneration_projects');
let next = 0;
const results = [];
await Promise.all(Array.from({ length: Math.min(jobs, projects.length) }, async () => {
  for (;;) {
    const project = projects[next++];
    if (!project) return;
    try {
      const result = await regenerateRevisions(project, { scope: values.scope, onProgress: (message) => console.log(message) });
      results.push({ project: path.basename(project), ...result });
    } catch (error) { results.push({ project: path.basename(project), failures: [{ message: String(error) }] }); }
  }
}));
const directory = path.join(root, '.a2swe', 'regenerations');
await mkdir(directory, { recursive: true });
await writeFile(path.join(directory, 'archive.json'), `${JSON.stringify({ schemaVersion: '1.0.0', scope: values.scope, projects: projects.length,
  finishedProjects: results.length, results: results.slice().sort((a, b) => a.project.localeCompare(b.project)) }, null, 2)}\n`);
const failures = results.flatMap((result) => result.failures ?? []);
console.log(JSON.stringify({ projects: results.length, revisions: results.reduce((sum, result) => sum + (result.revisions ?? 0), 0),
  variations: results.reduce((sum, result) => sum + (result.variations ?? 0), 0), failures }));
if (failures.length) process.exitCode = 1;
