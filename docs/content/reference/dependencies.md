---
title: Dependencies
---

# Dependencies

## JavaScript runtime

The template pins Remotion CLI and media packages at 4.0.523, React and React DOM at 19.3.0, and TypeScript at 7.0.2. Exact versions are recorded in `template/package.json` and `template/package-lock.json`.

## Python runtime

Direct production requirements include:

- `edge-tts`;
- `numpy`;
- `Pillow`;
- `scipy`;
- `soundfile`;
- `piper-tts`;
- `misaki[en]`;
- `en-core-web-sm`;
- `kokoro`;
- `kokoro_onnx`.

The lockfile includes their transitive runtime, model, networking, and NLP dependencies such as Torch, ONNX Runtime, spaCy, Transformers, Phonemizer, Hugging Face Hub, aiohttp, and Typer.

## System dependencies

FFmpeg and ffprobe are required for encoded-media verification and alignment. A Chromium-compatible browser is required by Remotion rendering; the Windows package can supply one, or `REMOTION_BROWSER_EXECUTABLE` can point to an existing installation.

## Model dependencies

Model weights are not toolkit source. Local Kokoro can download required files when absent from cache. Kokoro ONNX and Piper require explicit model configuration. Verify each model’s license and provenance independently.

## Reproducibility

Use `npm ci`, not an unconstrained install, for production projects. Install Python from `requirements.lock.txt` in the expected interpreter environment. Do not silently upgrade dependencies during a release build.
