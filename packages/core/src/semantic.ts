import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { createReadStream, existsSync, readFileSync } from 'node:fs';
import { homedir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

// Local sentence embeddings for semantic alignment. The model is pinned by repository revision and file SHA-256 in
// library/assets/semantic/models.json; `semantic-model --install` downloads it once into the Hugging Face cache, and every
// embedding run verifies the files and executes the ONNX graph on the CPU with no network access.

const REPOSITORY_ROOT = fileURLToPath(new URL('../../../', import.meta.url));
const REGISTRY = path.join(REPOSITORY_ROOT, 'library', 'assets', 'semantic', 'models.json');

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

async function sha256File(file: string): Promise<string> {
  const hash = createHash('sha256');
  for await (const chunk of createReadStream(file)) hash.update(chunk);
  return hash.digest('hex');
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

const INSTALL = `
import json, sys
from huggingface_hub import hf_hub_download
request = json.loads(sys.stdin.buffer.read().decode('utf-8'))
paths = {role: hf_hub_download(request['repository'], spec['source'], revision=request['revision']) for role, spec in request['files'].items()}
print(json.dumps(paths))
`;

/** Downloads the pinned model revision into the Hugging Face cache and verifies every file against the registry digests. */
export async function installSemanticModel() {
  const entry = registry();
  const result = spawnSync(python(), ['-c', INSTALL], { input: JSON.stringify({ repository: entry.repository, revision: entry.revision, files: entry.files }),
    encoding: 'utf8', timeout: 20 * 60 * 1000, windowsHide: true, maxBuffer: 1024 * 1024 });
  if (result.error || result.status !== 0) throw new Error(`semantic_model_install_failed: ${(result.error?.message ?? result.stderr).trim().slice(-1500)}`);
  return semanticModel();
}

const EMBED = `
import json, sys
import numpy as np
import onnxruntime as ort
from tokenizers import Tokenizer
request = json.loads(sys.stdin.buffer.read().decode('utf-8'))
tokenizer = Tokenizer.from_file(request['tokenizer'])
tokenizer.enable_truncation(max_length=request['maxTokens'])
tokenizer.enable_padding(pad_id=0, pad_token='[PAD]')
options = ort.SessionOptions()
options.intra_op_num_threads = 1
options.inter_op_num_threads = 1
session = ort.InferenceSession(request['model'], sess_options=options, providers=['CPUExecutionProvider'])
names = {item.name for item in session.get_inputs()}
texts = request['texts']
chunks = []
for start in range(0, len(texts), 32):
    batch = tokenizer.encode_batch(texts[start:start + 32])
    ids = np.array([item.ids for item in batch], dtype=np.int64)
    mask = np.array([item.attention_mask for item in batch], dtype=np.int64)
    feed = {'input_ids': ids, 'attention_mask': mask}
    if 'token_type_ids' in names:
        feed['token_type_ids'] = np.zeros_like(ids)
    hidden = session.run(None, feed)[0]
    weights = mask[..., None].astype(np.float32)
    pooled = (hidden * weights).sum(axis=1) / np.clip(weights.sum(axis=1), 1e-9, None)
    pooled = pooled / np.clip(np.linalg.norm(pooled, axis=1, keepdims=True), 1e-12, None)
    chunks.append(pooled.astype('<f4'))
vectors = np.concatenate(chunks) if chunks else np.zeros((0, request['dimensions']), dtype='<f4')
sys.stdout.buffer.write(vectors.tobytes())
`;

/** Mean-pooled, L2-normalized sentence embeddings; the dot product of two vectors is their cosine similarity. */
export async function embedTexts(texts: string[]): Promise<Float32Array[]> {
  if (!texts.length) return [];
  const model = await semanticModel();
  const result = spawnSync(python(), ['-c', EMBED], { input: JSON.stringify({ model: model.files.model, tokenizer: model.files.tokenizer,
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
