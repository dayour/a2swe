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

## Human review

Human review remains optional and external. The workflow does not stop at
mandatory human sign-off checkpoints before TTS, pilot, or final render.
