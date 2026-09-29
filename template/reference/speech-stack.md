---
title: Speech stack integration
description: Repository speech-stack rules for the shared Python 3.14 environment, locked Kokoro forks, and core-managed audio generation.
---

## Runtime baseline

Use the repository `.venv` on Python 3.14.7.

The lockfile in `template/requirements.lock.txt` pins the dayour fork wheels for:

- `kokoro`
- `kokoro-onnx`
- `misaki`

Those wheels come from the `py314-2026.09.17` release set. Do not substitute
different packages just because a similarly named upstream build exists.

## Install

```powershell
uv python install 3.14.7
uv venv --python 3.14.7 .venv --seed
Push-Location template
..\.venv\Scripts\python.exe -m pip install -r requirements.lock.txt
Pop-Location
```

If an older environment already exists, resynchronize it from the lockfile rather
than mixing versions.

## Engine selection

The core-managed 1080p release path reads `A2SWE_TTS_ENGINE` or `TTS_ENGINE`.
Supported values are:

- `auto`
- `kokoro`
- `kokoro_onnx`

`auto` prefers Kokoro ONNX when `KOKORO_ONNX_MODEL` and `KOKORO_ONNX_VOICES`
exist. It uses PyTorch Kokoro only when `A2SWE_KOKORO_CONFIG`,
`A2SWE_KOKORO_WEIGHTS`, and `A2SWE_KOKORO_VOICE_MODEL` exist.

`KOKORO_ONNX_VOICE` selects the ONNX voice. The generated project also accepts
`A2SWE_PYTHON` as an absolute interpreter override. Otherwise it discovers the
repository `.venv`.

## Verified model paths

When ONNX paths are not already configured, the generated Remotion project can
hydrate them from `qc/models/verification.json` at the repository root. That file
records the verified ONNX model and voices paths used during model checks.

## Segmentation and captions

Narration is synthesized per blank-line-separated paragraph. The generated project
stores those paragraphs as speech segments and measures each segment duration.

When paragraph count matches scene count, measured speech defines scene timing and
caption timing. Otherwise the renderer keeps measured audio but places scene cuts
proportionally by text length.

Captions and document text normalize spoken-form spellings such as `H I P A A`
and `O Auth` to `HIPAA` and `OAuth`.

## Validation

Use these checks after speech-stack changes:

```powershell
.\.venv\Scripts\python.exe template\scripts\test_pipeline.py -v
npm --prefix template run typecheck
npm --prefix template run build
```

Use `template/scripts/verify_models.py` when you need current model evidence.
Its output can refresh `qc/models/verification.json`.

## Legacy note

The older template path still contains `tts_build.py` and its broader engine support.
The repository's managed 1080p release path is the generated Remotion project from
the core CLI.
