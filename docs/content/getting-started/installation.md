---
title: Installation
description: Install the root workspace, shared Python 3.14 environment, and optional documentation site for a2swe.
---

## Supported baseline

The current verified baseline is:

- Node.js 24
- npm lockfile installation
- Python 3.14.7
- one repository `.venv`
- FFmpeg and ffprobe for encoded-media QC

## Install the root workspace

From the repository root:

```powershell
npm ci --ignore-scripts
npm run build
npm run contracts:check
npm test
```

## Install the shared Python environment

```powershell
uv python install 3.14.7
uv venv --python 3.14.7 .venv --seed
Push-Location template
..\.venv\Scripts\python.exe -m pip install -r requirements.lock.txt
Pop-Location
.\.venv\Scripts\python.exe template\scripts\test_pipeline.py -v
```

The lockfile must be installed from the `template/` directory because it uses
template-relative references.

## Optional template install

Install the retained legacy template only when you need that older workflow:

```powershell
npm --prefix template ci
npm --prefix template run build
```

## Optional documentation site install

```powershell
npm --prefix docs ci
npm --prefix docs run build
```

## Model path notes

For the managed 1080p path, configure either:

- `KOKORO_ONNX_MODEL` and `KOKORO_ONNX_VOICES`
- or `A2SWE_KOKORO_CONFIG`, `A2SWE_KOKORO_WEIGHTS`, and
  the shared `KOKORO_ONNX_VOICES` bank

The core reads hash-verified local paths from
`library/assets/speech/models.json` when model environment variables are absent.
Model configuration no longer depends on a root QC directory.

```powershell
npm run a2swe -- voice-profiles
npm run a2swe -- audio-render --root projects\datadog-cowork-plugin --engine both --voice am_michael
```

Both engines use the same voice bank, profile, speed, pronunciation overrides,
and Misaki phonemes. Output and comparison metadata live in the project's
`qc/audio/PROFILE/` folder. Set `ContentIR.voice.profileId` for video production.
