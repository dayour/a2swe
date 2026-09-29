---
title: Artifact contracts
description: Current contract records for domain, content, approval, release, and generated visual artifacts in a2swe.
---

## Domain pack

`domain-pack.json` is the authority for:

- domain identity
- freshness window
- source records
- evidence spans
- supported claims
- known gaps
- ready-state eligibility

## Content

`content-ir.json` is the authority for:

- audience and decision
- narration text
- sections and speaker notes
- content claims
- citations
- selected assets
- optional section visuals

## Approval manifest

`approval-manifest.json` records selected-asset disposition for a release. It
includes:

- `schemaVersion`
- `manifestId`
- `domainDigest`
- `contentDigest`
- `reviewedAt`
- `selectedAssets[]`

Each selected asset includes:

- `assetId`
- `assetDigest`
- `basis`
- `reviewerId`
- `evidenceDigest`
- `status`

Only a rejected asset blocks generation.

## Release records

`release-produce` writes:

- `content-ir.json`
- `domain-pack.json`
- `render-spec.json`
- `approval-manifest.json`
- `release-plan.json`
- `parity-manifest.json`

`parity-manifest.json` is the digest inventory for the output set.

## Visual artifacts

Asset bundles created through the core contain:

- `request.json`
- `asset.json`
- `asset.png`

Managed releases with section visuals and `remotion` output also emit:

- editable visual source files under `outputs/remotion/visuals/`
- settled PNG diagrams under `outputs/remotion/visuals/`

Those PNGs are the diagrams embedded by HTML, AdaptiveDeck, PPTX, DOCX, PDF, and
overview-image outputs.

## Release outputs

The managed path can emit:

- HTML
- AdaptiveDeck JSON
- editable PPTX
- editable DOCX
- searchable PDF
- 1080p PNG and JPEG overviews
- a generated Remotion project

`release-verify` must be able to recheck the package digests and rerun MP4 QC.
