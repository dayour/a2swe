import { spawnSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { homedir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { sha256File } from './canonical.ts';

// Local sentence embeddings for semantic alignment. The model is pinned by repository revision and file SHA-256 in
// library/assets/semantic/models.json; `semantic-model --install` downloads it once into the Hugging Face cache, and every
// embedding run verifies the files and executes the ONNX graph on the CPU with no network access.

const REPOSITORY_ROOT = fileURLToPath(new URL('../../../', import.meta.url));
const REGISTRY = path.join(REPOSITORY_ROOT, 'library', 'assets', 'semantic', 'models.json');
const EMBED_SCRIPT = fileURLToPath(new URL('./semantic_embed.py', import.meta.url));

interface ModelFile { path: string; sha256: string; source: string }
interface ModelEntry { repository: string; revision: string; license: string; dimensions: number; maxTokens: number; files: { model: ModelFile; tokenizer: ModelFile } }

export const SEMANTIC_MODEL_ID = 'a2swe-sentence-embedding';

function registry(): ModelEntry {
  const entry = (JSON.parse(readFileSync(REGISTRY, 'utf8')) as { models: Record<string, ModelEntry> }).models[SEMANTIC_MODEL_ID];
  if (!entry) throw new Error(`semantic_model_unregistered: ${SEMANTIC_MODEL_ID}`);
  return entry;
}

const resolveHome = (value: string) => (value.startsWith('~/') ? path.join(homedir(), ...value.slice(2).split('/')) : value);

function python(): string {
  if (process.env.A2SWE_PYTHON) {
    if (!path.isAbsolute(process.env.A2SWE_PYTHON)) throw new Error('semantic_python_invalid: A2SWE_PYTHON must be absolute');
    return process.env.A2SWE_PYTHON;
  }
  const candidate = path.join(REPOSITORY_ROOT, '.venv', process.platform === 'win32' ? 'Scripts' : 'bin', process.platform === 'win32' ? 'python.exe' : 'python');
  if (!existsSync(candidate)) throw new Error('semantic_python_missing: create the repository .venv or set absolute A2SWE_PYTHON');
  return candidate;
}

/** Resolves and hash-verifies the registered embedding model; throws with the install command when it is missing or altered. */
export async function semanticModel() {
  const entry = registry();
  const files = { model: resolveHome(entry.files.model.path), tokenizer: resolveHome(entry.files.tokenizer.path) };
  for (const [role, file] of Object.entries(files) as ['model' | 'tokenizer', string][]) {
    if (!existsSync(file)) throw new Error(`semantic_model_unavailable: ${role} missing; run node packages/core/bin/a2swe.mjs semantic-model --install`);
    if (await sha256File(file) !== entry.files[role].sha256) throw new Error(`semantic_model_digest_mismatch: ${role} ${file}`);
  }
  return { id: SEMANTIC_MODEL_ID, repository: entry.repository, revision: entry.revision, license: entry.license,
    dimensions: entry.dimensions, maxTokens: entry.maxTokens, files };
}

/** Downloads the pinned model revision into the Hugging Face cache and verifies every file against the registry digests. */
export async function installSemanticModel() {
  const entry = registry();
  const result = spawnSync(python(), [EMBED_SCRIPT, 'install'], { input: JSON.stringify({ repository: entry.repository, revision: entry.revision, files: entry.files }),
    encoding: 'utf8', timeout: 20 * 60 * 1000, windowsHide: true, maxBuffer: 1024 * 1024 });
  if (result.error || result.status !== 0) throw new Error(`semantic_model_install_failed: ${(result.error?.message ?? result.stderr).trim().slice(-1500)}`);
  return semanticModel();
}

/** Mean-pooled, L2-normalized sentence embeddings; the dot product of two vectors is their cosine similarity. */
export async function embedTexts(texts: string[]): Promise<Float32Array[]> {
  if (!texts.length) return [];
  const model = await semanticModel();
  const result = spawnSync(python(), [EMBED_SCRIPT, 'embed'], { input: JSON.stringify({ model: model.files.model, tokenizer: model.files.tokenizer,
    maxTokens: model.maxTokens, dimensions: model.dimensions, texts }), timeout: 30 * 60 * 1000, windowsHide: true, maxBuffer: 1024 * 1024 * 1024 });
  if (result.error || result.status !== 0) throw new Error(`semantic_embedding_failed: ${(result.error?.message ?? result.stderr?.toString('utf8') ?? '').trim().slice(-1500)}`);
  const bytes = result.stdout as Buffer;
  if (bytes.length !== texts.length * model.dimensions * 4) throw new Error('semantic_embedding_shape_mismatch');
  const all = new Float32Array(bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.length));
  return texts.map((_, index) => all.subarray(index * model.dimensions, (index + 1) * model.dimensions));
}

export function cosine(a: Float32Array, b: Float32Array): number {
  let sum = 0;
  for (let i = 0; i < a.length; i += 1) sum += a[i] * b[i];
  return sum;
}
