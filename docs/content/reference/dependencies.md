---
title: Dependencies
description: Runtime, package, model, and media-tool dependencies for the current a2swe core and retained template path.
---

## JavaScript runtime

The template package pins:

- Remotion 4.0.523
- `@remotion/cli` 4.0.523
- React 19.3.0
- React DOM 19.3.0
- TypeScript 7.0.2
- Mermaid 12.0.0
- `@excalidraw/excalidraw` 0.18.1
- `@marp-team/marp-core` 4.4.0

## Python runtime

Use one repository `.venv` on Python 3.14.7.

`template/requirements.lock.txt` pins the dayour fork wheels for:

- `kokoro`
- `kokoro-onnx`
- `misaki`

It also pins the supporting runtime packages needed by the speech pipeline.

## System dependencies

FFmpeg and ffprobe are required for the managed MP4 render and QC path.

## Model dependencies

The managed 1080p path requires local model files through either:

- `KOKORO_ONNX_MODEL` and `KOKORO_ONNX_VOICES`
- or `A2SWE_KOKORO_CONFIG`, `A2SWE_KOKORO_WEIGHTS`, and
  `A2SWE_KOKORO_VOICE_MODEL`

## Legacy note

The older template workflow remains available, but it is separate from the managed
core release path.
