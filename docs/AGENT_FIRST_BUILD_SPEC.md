---
title: Agent-first build specification
description: Product contract and verified implementation boundary for the a2swe domain-agent and release workflow.
---

## Product contract

Build a runnable domain SWE agent first. Then generate evidence-bound explainer
packages from that domain version.

The repository targets companies, customers, topics, frameworks, repositories,
and tools. It stays English-only. It relies on public evidence and local tooling.

Distribution is outside the product boundary. a2swe does not publish output,
authorize sharing, or perform redistribution checks.

## Current implementation

The current codebase implements a local core in `packages/core/src` with:

- JSON Schema validation for domain, content, render, release, asset, and runbook
  contracts
- draft domain initialization through `domain-init`
- digest-bound asset bundle generation and verification
- release planning through `release-plan`
- release packaging through `release-produce`
- release verification through `release-verify`
- optional signed domain certification through `domain-certify`

The release path requires:

- a ready `DomainPack`
- supported domain claims with evidence
- a `ContentIR` whose claim wording and evidence IDs match the domain claims
- a matching `RenderSpec`
- a matching `ApprovalManifest`

## Contract model

The current release flow centers on these records:

- `DomainPack`
- `ContentIR`
- `RenderSpec`
- `ApprovalManifest`
- `ReleasePlan`
- `FormatParityManifest`

`ApprovalManifest` replaced the older rights manifest model. Its selected assets
record `assetId`, `assetDigest`, `basis`, `reviewerId`, `evidenceDigest`, and
`status`. Only `status: rejected` blocks generation.

`AssetRecord` and `LibraryEntry` no longer carry embedded approval or rights
fields.

Removed from the implementation:

- signed release approval bundles
- release-specific trust policies
- release review candidate packaging
- review-candidate watermarking
- `generation-policy.json`

Remaining signed primitive:

- `domain-certify`, which issues an optional signed domain certificate

## Release outputs

`release-produce` writes:

- `content-ir.json`
- `domain-pack.json`
- `render-spec.json`
- `approval-manifest.json`
- `release-plan.json`
- `parity-manifest.json`

It can emit:

- HTML
- AdaptiveDeck JSON
- editable PPTX
- editable DOCX
- searchable PDF
- 1080p PNG and JPEG overviews
- a core-managed 1080p Remotion project

The generated Remotion project synthesizes narration locally, renders H.264/AAC
MP4, and records encoded-media QC. `release-verify` re-checks the output digests
and reruns MP4 QC.

## Speech and timing

The repository uses one `.venv` on Python 3.14.7. Dependencies are locked in
`template/requirements.lock.txt`, including dayour fork wheels for Kokoro,
Kokoro ONNX, and Misaki from the `py314-2026.09.17` release set.

The core-managed path defaults to Kokoro ONNX when ONNX model paths are available.
PyTorch Kokoro remains optional through the `A2SWE_KOKORO_*` model paths.

Narration is synthesized per blank-line-separated paragraph. When paragraph count
matches scene count, scene timing comes from measured speech. Otherwise scene cuts
fall back to proportional text length. Captions are burned into the output video
and normalized to written form in documents and captions.

## Section visuals

Each content section can carry a `visual` block with:

- `kind: mermaid`
- `kind: excalidraw`
- `kind: marp`

The release flow renders those visuals inside Remotion, emits editable source files,
and captures settled PNG stills. Those PNGs become the shared diagram images for
HTML, AdaptiveDeck, PPTX, DOCX, PDF, and overview images.

## Autonomous workflow

The workflow is autonomous. It records decisions and evidence in
`agent/runbook.json` and proceeds without human sign-off checkpoints before TTS,
pilot, or final render.

Runbook gates are evidence-backed and use `pending`, `blocked`, or `passed` status.
Automated checks are not human approval.

## Legacy note

The older 720p template pipeline remains in `template/` for hand-built branded
videos. The core-managed path is the 1080p release workflow described above.
