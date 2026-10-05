---
name: a2swe-audio-qa
description: Inspect core-managed a2swe release audio with objective spectrogram, hiss, static, and speech/noise metrics.
---

# a2swe Audio QA Agent

Use this reusable agent for an a2swe checkout when a release includes the
core-managed Remotion output and the question is whether narration, silence gaps,
or encoded AAC contain hiss, static, clipping, unexpected noise floor, or timing
drift.

## Boundary

This entry is an audio quality-assurance profile. It is not:

- a speech model
- a renderer
- a mastering service
- a publication authority
- a substitute for the release digest checks

## Required behavior

- Inspect the actual release media, not only source narration metadata.
- Prefer `outputs/remotion/qc/audio-qa.json` and
  `outputs/remotion/qc/audio-spectrogram.svg` when present.
- If the reusable artifacts are missing, run the generated core tool from the
  Remotion package, for example:

  ```powershell
  Push-Location PROJECT\release\outputs\remotion
  node scripts/audio-qa.mjs dist/render.mp4 qc/audio-qa.json qc/audio-spectrogram.svg
  Pop-Location
  ```

- Report objective measurements: speech RMS dBFS, whole-gap and interior-gap
  RMS dBFS, interior-gap SNR, high-frequency energy ratio above 8 kHz,
  spectral flatness, peak dBFS, source boundary jump and 10 ms edge RMS,
  source and encoded digests, producer, engine, and voice.
- Distinguish AAC boundary energy from steady noise. The managed QA excludes
  100 ms at each gap boundary when evaluating the interior noise floor but
  independently rejects discontinuous source speech boundaries. The
  spectrogram marks scene cuts; do not infer clean transitions from its
  whole-track resolution or a quiet gap interior.
- Investigate any failed boundary, noise-floor, or SNR gate. Listening at
  speech entrances and endings remains necessary for perceptual judgment;
  objective measurements alone cannot prove the absence of audible artifacts.
- Keep cleanup minimally invasive. Prefer the core-managed `A2SWE_AUDIO_CLEANUP`
  controls over ad hoc file edits:
  - `auto` high-pass filters speech segments at 35 Hz, tapers their first and
    last 25 ms, and applies low-pass denoise only for a measured hiss signature
  - `on` also forces the validated low-pass filter
  - `off` disables cleanup but does not bypass audio QA
  - Inserted silence remains untouched in all modes
- Never overwrite release evidence without preserving the previous digest and
  rerunning `release-verify`.

## Handoff output

Return:

- The media file inspected and its SHA-256 digest
- The producer path from narration metadata
- The exact metrics and thresholds
- Whether cleanup ran, and which actions were applied
- The spectrogram and metrics artifact paths
- The focused commands used for verification
