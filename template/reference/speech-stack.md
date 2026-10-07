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
exist. Explicit `kokoro` uses `A2SWE_KOKORO_CONFIG`,
`A2SWE_KOKORO_WEIGHTS`, and the same `KOKORO_ONNX_VOICES` bank.

Select the voice with `ContentIR.voice.profileId`, optional `speed`, and optional
`pronunciations`. Profiles live in `library/assets/speech/voice-profiles.json`.
Both engines use the same selected voice tensor and Misaki phoneme chunks.
`Cowork` is spoken as `co-work`; display text and captions remain unchanged.
Old backend-specific voice/language/speed environment overrides now fail with a
migration message rather than silently changing a digest-bound voice profile.
`A2SWE_PYTHON` still selects an absolute interpreter; otherwise the core uses
the repository `.venv`.

```powershell
npm run a2swe -- voice-profiles
npm run a2swe -- audio-render --root projects\datadog-cowork-plugin --engine both --voice am_michael
```

The comparison is written to `PROJECT/qc/audio/PROFILE/`: two WAVs, per-engine
metadata, and `comparison.json`. The command uses the same speech producer as
the MP4 renderer, disables cleanup filters, and checks that both engines used
identical voice tensors and phonemes. Independent stochastic excitation means
sample-for-sample waveform equality is not expected.

## Verified model paths

When ONNX paths are not already configured, the generated Remotion project can
hydrate them from `library/assets/speech/models.json`. The registry records
local native/ONNX models and the shared voice bank as home-relative (`~/...`)
paths with SHA-256 hashes.
Explicit model-path environment variables override the local registry.

The ONNX model must be freshly exported with the corrected real-valued STFT
lowering from the sibling `kokoro-onnx` exporter and corrected `kokoro` source.
Installing a newer runtime wheel does not change the transform inside existing
model bytes. The lowering preserves Fourier weights, Hann window alignment,
reflection padding and overlap normalization; no cleanup filter is required to
correct its reconstruction.

When replacing a registry model, regenerate associated project audio evidence
and update its SHA-256. The core rejects registry model bytes that do not match.
The export receipt lives beside the registry in `onnx-export.json`; it is not
project QC. Historical model comparisons remain under their project's
`qc/models/` and are labeled uncontrolled. Existing videos must be rebuilt to contain newly synthesized
audio.

## Segmentation and captions

Narration is synthesized per blank-line-separated paragraph. The generated project
stores those paragraphs as speech segments and measures each segment duration.

Measured speech drives global subtitle cues for every paragraph. When transcript
text proves a scene mapping, the producer records scene IDs for timed cuts.
Otherwise cuts are proportional and labeled as lacking semantic alignment.
Captions are never disabled merely because paragraph and scene counts differ.

Cached narration is reused only when its engine, models, voice bank, profile,
pronunciations, producer, lockfile and cleanup policy match current inputs.

Captions and document text normalize spoken-form spellings such as `H I P A A`
and `O Auth` to `HIPAA` and `OAuth`.

## Validation

Use these checks after speech-stack changes:

```powershell
.\.venv\Scripts\python.exe template\scripts\test_pipeline.py -v
npm --prefix template run typecheck
npm --prefix template run build
```

`template/scripts/verify_models.py --project PROJECT --voice PROFILE` delegates
to core `audio-render`; it no longer implements a second speech comparison path.
Use `a2swe qc-index --root PROJECT` to refresh the project's evidence inventory.
Its hashes inventory files; they are not a claim that every old file passed QC.
Self-contained release packages retain their internal QC files and are linked
from the project index rather than having digest-bound paths broken by a move.

## Legacy note

The older template path still contains `tts_build.py` and its broader engine support.
The repository's managed 1080p release path is the generated Remotion project from
the core CLI.
