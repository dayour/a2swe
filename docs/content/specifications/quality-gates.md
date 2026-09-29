---
title: Quality gates
description: Approval and automated verification requirements for all output adapters.
---

## Gate 1 — Scope

Evidence: audience, target duration, topic boundaries, and intended outcome. Narration remains blocked until approval.

## Gate 2 — Narration

Evidence: complete script, chapters, word count, estimated duration, and explicit sign-off. Synthesis remains blocked until approval.

## Gate 3 — Voice and transfer

Evidence: selected engine, voice/model, external transfer disclosure, and approval. No silent cloud fallback is permitted.

## Gate 4 — Pilot

Evidence: first 30 seconds or complete shorter movie, plus review of style, readability, pacing, voice, subtitles, and factual representation. Remaining groups remain blocked until approval.

## Automated release checks

The core validates shared ContentIR/RenderSpec digests and references, verifies
selected asset bytes and approval, and checks signed reviewer approvals before
creating a production package. Release verification re-renders retained
inputs and compares output bytes. The core-generated 1080p Remotion project
requires local Python 3.14 speech dependencies and models, checks approved WAV
provenance and image digests, encodes H.264, and runs ffprobe QC for:

- decoded frame count, 1920x1080 at 30 fps, and yuv420p pixel format;
- AAC 48 kHz stereo audio with bounded duration drift;
- output digest matching the render receipt.

The core does not currently enforce speech-to-scene alignment, audible
content, nonblank frames, motion, or visual layout scores. The separate legacy
720p Remotion/Python video template has its own checks:

- locked dependency installation;
- TypeScript validation;
- production Remotion bundle;
- Studio or composition availability;
- storyboard-token resolution;
- shot-range and coverage validation;
- motion and frame metrics;
- H.264 1280×720 at 30 fps;
- expected frame count;
- AAC 48 kHz stereo;
- audio correlation and lag thresholds;
- nonblank frame samples;
- asset and subtitle presence.

For evaluation-only asset proofs, checks cover request/asset schema validity, raster dimensions, recorded hashes, quality metadata, and `manifest.json` tamper verification. These checks do not approve subject branding, approval, or production release.

## Human release checks

A reviewer MUST watch the complete output with audio and inspect transitions, facts, visible text, motion, subtitles, assets, credits, and ending. Automated metrics are supporting evidence, not a substitute.
