"""Local sentence embeddings for a2swe semantic alignment.

packages/core/src/semantic.ts runs this script with a JSON request on stdin:
  install  download the pinned model revision into the Hugging Face cache and print the file paths as JSON
  embed    write mean-pooled, L2-normalized little-endian float32 embeddings for the request texts to stdout
"""
import json
import sys


def read_request() -> dict:
    # Windows pipes default to the ANSI code page; requests are always UTF-8 JSON.
    return json.loads(sys.stdin.buffer.read().decode("utf-8"))


def install(request: dict) -> None:
    from huggingface_hub import hf_hub_download

    paths = {role: hf_hub_download(request["repository"], spec["source"], revision=request["revision"]) for role, spec in request["files"].items()}
    print(json.dumps(paths))


def embed(request: dict) -> None:
    import numpy as np
    import onnxruntime as ort
    from tokenizers import Tokenizer

    tokenizer = Tokenizer.from_file(request["tokenizer"])
    tokenizer.enable_truncation(max_length=request["maxTokens"])
    tokenizer.enable_padding(pad_id=0, pad_token="[PAD]")
    options = ort.SessionOptions()
    options.intra_op_num_threads = 1
    options.inter_op_num_threads = 1
    session = ort.InferenceSession(request["model"], sess_options=options, providers=["CPUExecutionProvider"])
    names = {item.name for item in session.get_inputs()}
    texts = request["texts"]
    chunks = []
    for start in range(0, len(texts), 32):
        batch = tokenizer.encode_batch(texts[start : start + 32])
        ids = np.array([item.ids for item in batch], dtype=np.int64)
        mask = np.array([item.attention_mask for item in batch], dtype=np.int64)
        feed = {"input_ids": ids, "attention_mask": mask}
        if "token_type_ids" in names:
            feed["token_type_ids"] = np.zeros_like(ids)
        hidden = session.run(None, feed)[0]
        weights = mask[..., None].astype(np.float32)
        pooled = (hidden * weights).sum(axis=1) / np.clip(weights.sum(axis=1), 1e-9, None)
        pooled = pooled / np.clip(np.linalg.norm(pooled, axis=1, keepdims=True), 1e-12, None)
        chunks.append(pooled.astype("<f4"))
    vectors = np.concatenate(chunks) if chunks else np.zeros((0, request["dimensions"]), dtype="<f4")
    sys.stdout.buffer.write(vectors.tobytes())


if __name__ == "__main__":
    commands = {"install": install, "embed": embed}
    if len(sys.argv) != 2 or sys.argv[1] not in commands:
        sys.exit("usage: semantic_embed.py install|embed < request.json")
    commands[sys.argv[1]](read_request())
