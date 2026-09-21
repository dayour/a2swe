---
title: Quality gates
---

# Quality gate specification

## Gate 1 — Scope

Evidence: audience, target duration, topic boundaries, and intended outcome. Narration remains blocked until approval.

## Gate 2 — Narration

Evidence: complete script, chapters, word count, estimated duration, and explicit sign-off. Synthesis remains blocked until approval.

## Gate 3 — Voice and transfer

Evidence: selected engine, voice/model, external transfer disclosure, and approval. No silent cloud fallback is permitted.

## Gate 4 — Pilot

Evidence: first 30 seconds or complete shorter movie, plus review of style, readability, pacing, voice, subtitles, and factual representation. Remaining groups remain blocked until approval.

## Automated release checks

For agent-first production, automated checks are format-adapter specific and remain incomplete until ContentIR, RenderSpec, adapter, rights, and release gates are implemented. For the active 720p Remotion/Python video adapter, checks include:

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

For evaluation-only asset proofs, checks cover request/asset schema validity, raster dimensions, recorded hashes, optional quality metadata, and `manifest.json` tamper verification. These checks do not approve subject branding, rights, or production release.

## Human release checks

A reviewer MUST watch the complete output with audio and inspect transitions, facts, visible text, motion, subtitles, assets, credits, and ending. Automated metrics are supporting evidence, not a substitute.
