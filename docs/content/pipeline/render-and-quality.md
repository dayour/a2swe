---
title: Render and quality control
description: Produce and verify the managed 1080p release, master its audio, and measure every revision.
---

## Managed release render

Generate the release package first:

```powershell
node packages/core/src/cli.ts release-produce --domain domain-pack.json --content content-ir.json --render render-spec.json --approval approval-manifest.json --assets asset-bundles --out release
node packages/core/src/cli.ts release-verify --root release
```

When the release includes `remotion`, the package contains a generated Remotion
project under `release/outputs/remotion/`.

Inside that project, the managed render commands are:

```powershell
npm install --ignore-scripts
npm run audio
npm run typecheck
npm run render
npm run qc
```

The generated project enforces:

- 1920x1080 video
- 30 fps
- 48 kHz stereo audio
- local Python 3.14 speech dependencies
- local model paths
- local Remotion dependencies
- FFmpeg and ffprobe

`npm run render` synthesizes missing or stale audio, renders the MP4, and reruns
encoded-media QC. `npm run qc` rechecks an existing render.

Captions use measured narration segments and sentence boundaries that preserve
decimal versions such as `1.0`. The desktop review player and documentation
library read the resulting frame-based timeline cues, so previews use the same
text and timing as the video rather than a separately reconstructed transcript.

Managed renders reuse installed packages but keep each project's mutable
Webpack cache isolated. Concurrent releases do not clear another render's cache,
and each render binds its own bundle-server port from 20000-29999 after checking
it on every loopback host, so parallel renders never load each other's chunks.

## Audio mastering

Kokoro produces 24 kHz speech. The producer resamples it to 48 kHz with a steep
Kaiser anti-imaging filter, then masters it to -16 LUFS integrated (ITU-R
BS.1770-4) through a 4x-oversampled true-peak limiter at -1.5 dBTP. The
narration metadata records the gain and limiter activity. Audio QA fails a
render outside -16 ±1 LU or above -1 dBTP, in addition to its noise-floor,
signal-to-noise, high-frequency and boundary checks.

## Managed QC

The managed MP4 QC verifies:

- expected width, height, frame rate, and pixel format
- expected AAC sample rate and channel count
- bounded duration drift
- output digest binding through the render receipt

`release-verify` also rechecks the package digests and reruns MP4 QC.

## Revision analysis

`revisions-analyze` measures every video in `renders/` and writes
`qc/analysis/`. For each video it records:

- EBU R128 integrated loudness, loudness range and true peak
- speech activity, pause lengths, noise floor and speech-to-silence ratio
- Welch spectrum metrics, including high-frequency energy above 8 kHz
- mains hum prominence and stereo correlation
- scene cuts, black frames and frozen frames
- per-zone layer motion and edge detail

It also writes full and speech-band spectrograms with legends, per-section
spectrogram chunks, a contact sheet, a proportional frame strip, and a layer
activity image. `qc/analysis/report.md` compares every revision, with stacked
spectrogram, frame and layer images.

## Native Office QA

`office-render` opens the release PPTX and DOCX in Microsoft PowerPoint and Word
on Windows, exports slides and pages, and reports any text frame whose rendered
text exceeds its shape. The project runbook passes the `native-office` gate only
when the rendered file digests match the release and no text overflows. Slides
show readable source titles; evidence IDs stay in the speaker notes.

## Visual output coupling

When sections include `visual` blocks and the release requests `remotion`, the
renderer produces settled PNG diagrams. HTML, AdaptiveDeck, PPTX, DOCX, PDF, and
overview images then embed those PNGs.

## Human review

Human review remains useful for readability, pacing, and style. It is optional and
separate from the automated verification path.
