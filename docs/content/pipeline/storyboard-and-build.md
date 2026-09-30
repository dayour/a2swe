---
title: Storyboard and build
description: Storyboard expectations for sectioned content and the retained legacy template build path.
---

## Managed release path

The core-managed release path does not require the old template shot-group scaffold.
Its primary content structure comes from:

- `ContentIR.sections`
- `ContentIR.voice.narration`
- `ContentIR.claims`
- `ContentIR.citations`
- optional `ContentSection.visual`

Speaker notes remain the per-section authoring field for downstream adapters.
Copilot SDK sessions may draft or critique this structure, but the managed build
still consumes checked-in release inputs and evidence-backed records rather than
chat history.

## Legacy template path

The retained template workflow still uses:

- `script/storyboard_src.md`
- `storyboard.md`
- `src/shots/G1` through `G8`
- `render_storyboard.py`
- `selfcheck.py`

Keep that path only for the older hand-built 720p branded-video workflow.

## Build rules

- Keep claims tied to evidence.
- Regenerate downstream timing when narration changes.
- Treat render and QC receipts as evidence, not as publication authorization.
