---
title: Datadog Cowork plugin project companion
description: Verified inputs, release workflow, and remaining review boundaries for the Datadog explainer.
---

## Project context

The project explains the Datadog plugin and official connector for Claude
Cowork to platform and SRE engineers. The editorial decision is to pilot with
one team, keep Datadog permissions scoped, and treat Preview status as a rollout
risk. The dated source record and supported claims are in
`canonical/domain-pack.json`; the actual narration, sections, and visual
references are in `canonical/content-ir.json`. Do not substitute the removed
legacy template narration for these release inputs.

## Authoring and release

`canonical/render-spec.json` requests HTML, AdaptiveDeck, PPTX, DOCX, PDF,
PNG, JPEG, and a 1920x1080 MP4 at 30 fps. The selected `mcp-flow` raster bundle
is in `canonical/assets/mcp-flow/`. The other section visuals are generated
from the content's Mermaid, Excalidraw, and Marp descriptions during release
production. `release/asset-inventory.json` distinguishes selected inputs from
generated stills and binds them to the parity manifest.

Produce a new release in a new directory and verify it before replacing the
existing release. Use the core CLI's `release-produce` and `release-verify`
commands with the four canonical JSON inputs and `canonical/assets/`.
`release/outputs/remotion/` is a single generated build workspace with
runtime, visuals, audio, QA evidence, and the encoded video; it is not a
separate authoring project.

## Evidence and review

The machine-readable state is `agent/runbook.json`. Verify its recorded paths
and digests with `runbook-verify` after each change. The core's generated
`qc/audio-qa.json` and spectrogram measure source and encoded audio; no manual
noise reduction is justified without evidence that it improves intelligibility.
File hashes and structural checks do not confer human approval or permission
to distribute anything. Refresh time-sensitive sources and review the rendered
video and documents before external use. Record unknowns rather than inventing
sign-offs or shipping a stale projection.
