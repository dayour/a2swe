---
title: Render and quality control
description: Produce and verify the managed 1080p release path and keep the older template checks separate.
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
Webpack cache isolated. Concurrent releases do not clear another render's cache.

## Managed QC

The managed MP4 QC verifies:

- expected width, height, frame rate, and pixel format
- expected AAC sample rate and channel count
- bounded duration drift
- output digest binding through the render receipt

`release-verify` also rechecks the package digests and reruns MP4 QC.

## Visual output coupling

When sections include `visual` blocks and the release requests `remotion`, the
renderer produces settled PNG diagrams. HTML, AdaptiveDeck, PPTX, DOCX, PDF, and
overview images then embed those PNGs.

## Human review

Human review remains useful for readability, pacing, and style. It is optional and
separate from the automated verification path.

## Legacy template QC

The older template still retains its own storyboard, motion, frame, and encoded
media scripts for 720p projects. Keep those checks scoped to legacy template
projects.
