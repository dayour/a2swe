---
title: Render and quality control
description: Render and verify legacy template videos and core-managed 1080p candidates.
---

## Build checks

```powershell
npm run typecheck
python scripts\selfcheck.py
python scripts\render_storyboard.py
```

Run commands from the generated project unless otherwise noted.

## Legacy template render

```powershell
npx remotion render src\index.ts Video renders\<slug>-v2.mp4
```

Use versioned outputs and preserve the released original. Extract or render frame sequences for visual QC.

For a core release-candidate package with `outputs/remotion/`, run from that
generated directory after staging approved audio and assets:

```powershell
npm install --ignore-scripts
npm run audio
npm run typecheck
npm run render
npm run qc  
```

The generated adapter targets 1920x1080, 30fps, and 48 kHz audio. It checks for
local Remotion, FFmpeg and ffprobe. `npm run audio` requires Python 3.14 and
the pinned local Kokoro/Misaki or Kokoro ONNX dependencies from
`requirements.lock.txt`. It never installs packages, downloads models, calls
cloud speech, or substitutes fake audio.

Set one of these local model configurations before audio synthesis:

```powershell
$env:A2SWE_TTS_ENGINE = "kokoro"
$env:A2SWE_KOKORO_CONFIG = "C:\absolute\path\config.json"
$env:A2SWE_KOKORO_WEIGHTS = "C:\absolute\path\kokoro-v1_0.pth"
$env:A2SWE_KOKORO_VOICE_MODEL = "C:\absolute\path\am_liam.pt"
```

```powershell
$env:A2SWE_TTS_ENGINE = "kokoro_onnx"
$env:KOKORO_ONNX_MODEL = "C:\absolute\path\kokoro.onnx"
$env:KOKORO_ONNX_VOICES = "C:\absolute\path\voices.bin"
```

The generated render gate invokes `npm run audio` when the approved WAV or its
metadata is missing or stale. It verifies the narration text digest, WAV digest,
48 kHz stereo format, exact timeline duration within one frame, selected asset
digests from `asset-manifest.json`, and propagates failures with
`A2SWE_MP4_AUDIO_FAILED`, `A2SWE_MP4_RENDER_FAILED`, or `A2SWE_MP4_QC_FAILED`.
It uses the installed local JavaScript CLI entry points on Windows and other
platforms rather than invoking `.cmd` shims. `npm run render` also runs
`verify-mp4.mjs` before reporting success; `npm run qc` re-verifies an existing
render. The render invalidates the old QC report before encoding, refuses to
overwrite an existing movie unless `A2SWE_OVERWRITE_MP4=1`, and records a
digest-bound render receipt and QC report. A failed QC is a failed render.

The core-generated composition displays bounded excerpts of the approved
ContentIR. The source project retains the complete narration, notes, claims,
citations, and assets. Scene durations are distributed evenly, not aligned
to spoken sentences. A passing probe checks encoded stream properties and
frame count, not motion, audible content, synchronization, layout quality,
rights, or human approval. Inspect the full movie with sound before delivery.

## Motion checks

`motion_check.py` can render a named group or consume an existing frame directory. It reports stillness and hold behavior per shot.

```powershell
python scripts\motion_check.py G2 --out qc\motion-g2.md
python scripts\motion_check.py --frames fin_frames --out qc\motion.md
```

The checker flags low mean-frame differences and extended holds; frame-directory mode can add changed-pixel classification.

## Frame metrics

`frame_metrics.py` evaluates shot windows for hero scale, glow, color fragments, background fragments, and long still runs.

```powershell
python scripts\frame_metrics.py --frames fin_frames --out qc\frame-metrics.md
```

Metrics guide inspection; they do not replace watching the movie.

## Legacy encoded media verification

`verify_video.py` validates the expected pilot contract: H.264, 1280×720, 30 fps, 900 frames, AAC 48 kHz stereo, audio correlation above 0.98, lag no greater than 1024 samples, nonclipped audio, complete frames, and nonblank sampled scenes.

```powershell
python scripts\verify_video.py . --version v2 --ffmpeg <ffmpeg> --ffprobe <ffprobe>
```

It writes a media JSON report and visual contact sheets under `qc/`.
The core-generated 1080p project uses `npm run qc` instead. Do not substitute
the legacy 720p checker for its digest-bound `qc/mp4-qc.json` report.

## Audio alignment

Use `align_audio.py` only for a small measured encoder offset. It requires similarity above 0.98 and an absolute offset under 0.1 seconds, refuses destructive output paths, remuxes with FFmpeg, and emits an alignment sidecar.

## Human review

Watch the entire result with audio. Verify transitions, facts, text, subtitle readability, motion continuity, asset use, and ending behavior. Repair defects, rerender, and rerun affected checks.
