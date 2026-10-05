---
title: Production lifecycle
description: Runbook stages and evidence-backed workflow states for the current a2swe release process.
---

## Canonical stages

The shared runbook uses these stages:

| Stage | Objective | Required evidence |
| --- | --- | --- |
| scaffold | Create the project inputs and runbook | Initialized records and validated paths |
| research | Build the domain evidence base | Sources, evidence spans, supported claims, known gaps |
| narration | Finalize release narration | Stored narration text and any measured speech evidence |
| storyboard | Define section and scene intent | Section structure, speaker notes, and any legacy storyboard files |
| visuals | Prepare visual assets and section visuals | Asset bundles, visual source, or settled visual PNGs |
| pilot | Verify an initial render slice when used | Render evidence and QC notes |
| build | Assemble the full release inputs | Validated content, render, and approval inputs |
| render | Produce outputs | Release package and generated files |
| qc | Verify outputs | Release verification and media QC |
| delivery | Hand off the package | Final package paths, digests, and limitations |

## Gate model

Each project has a `qc/` directory. `audio-render` stores matched-voice audio and
metadata there; `qc-index --root PROJECT` inventories evidence with file hashes.
Project initialization creates the index, and core release production refreshes
it. An index is not a passing quality verdict.

Loose Datadog audit releases are under `qc/releases/`. Complete release packages
keep internal QC paths intact because their parity manifests bind those paths
and hashes. Project indexes link to that evidence instead of moving files out of
an immutable package. Shared model configuration belongs in
`library/assets/speech/models.json`, not project QC.

`agent/runbook.json` records gates as:

- `pending`
- `blocked`
- `passed`

Each passed gate needs an `evidencePath` and `evidenceDigest`.

Automated checks can satisfy evidence requirements. They are not human review.

## Workflow rules

- Facts require cited evidence.
- Unknowns remain unknowns.
- Recent claims use the trailing nine-calendar-month freshness window.
- Narration changes can invalidate downstream timing and render outputs.
- Reuse keeps provenance attached.

## Copilot SDK assistance

Copilot SDK sessions can assist a lifecycle stage, but they do not replace the
stage evidence. Use `node library/integrations/copilot/session.ts --capabilities` to
confirm the local integration shape, then use `--doctor`, `--sessions`,
`--catalogs`, or `--prompt` only in an authenticated environment.

Record Copilot SDK output as advisory working material until the affected stage
has its normal evidence path and digest. The SDK bridge reports when native CLI
help was not probed, so do not treat unprobed native options as available.

## Human review

Human review remains optional and external. The workflow does not stop at
mandatory human sign-off checkpoints before TTS, pilot, or final render.
