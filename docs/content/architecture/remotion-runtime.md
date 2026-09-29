---
title: Remotion runtime
description: Core-generated 1080p Remotion project behavior and the retained legacy template runtime.
---

## Core-generated runtime

`release-produce` can emit a generated Remotion project under `outputs/remotion/`.
That project is the managed video runtime for the current core release path.

It includes:

- `render-plan.json`
- `timeline.json`
- `asset-manifest.json`
- `speech/narration-manifest.json`
- `audio/narration-metadata.json`
- `public/assets/<contentId>/audio.wav`
- `public/assets/<contentId>/...`
- render, audio, and QC scripts

The generated project requires:

- 1920x1080 video
- 30 fps
- 48 kHz stereo audio
- local Remotion dependencies
- FFmpeg and ffprobe
- local Python 3.14 speech dependencies

## Scene timing

The generated runtime measures narration WAV duration and paragraph timings.
When narration paragraph count matches scene count, those measured paragraph
segments drive scene timing. Otherwise scene cuts fall back to proportional text
length while the measured WAV still defines total duration.

## Section visuals

The generated runtime supports `ContentSection.visual` with:

- Mermaid
- Excalidraw element JSON
- one Marp slide

It writes editable visual sources to `outputs/remotion/visuals/` and renders one
settled PNG per visual. Those PNGs become the shared diagram image for every
document adapter.

## Captions and layout

The generated 1080p scenes use:

- a dark backdrop
- animated glow and grid treatment
- a kinetic headline
- claim cards with source labels
- a progress bar
- burned-in captions
- a sources footer

Caption and document text normalize spoken forms such as `H I P A A` and
`O Auth` to written forms.

## Legacy template runtime

The older template still exposes `Video`, `Overlay`, and `G1` through `G8`
compositions at 1280x720 and 30 fps. Keep that path for legacy branded-video
projects only.
