---
title: Quality gates
description: Evidence-backed runbook gates and automated verification requirements for current a2swe outputs.
---

## Runbook gates

The shared runbook gate set is:

- domain
- scope
- narration
- voice
- brand
- pilot
- release

Each gate records:

- `name`
- `status`
- `evidencePath`
- `evidenceDigest`

`status` can be `pending`, `blocked`, or `passed`.

## Gate rules

- A passed gate needs a real evidence file and matching digest.
- Automated checks can satisfy evidence requirements.
- Automated checks are not human approval.
- Human review is optional and external.

## Release checks

The core verifies:

- domain, content, render, and approval digest matches
- exact content-to-domain claim and citation matching
- selected asset digests in the approval manifest
- output digests and media types in the parity manifest

Only a rejected asset in `ApprovalManifest.selectedAssets` blocks generation.

## MP4 checks

The managed Remotion path verifies:

- 1920x1080 output
- 30 fps
- H.264 video
- AAC 48 kHz stereo audio
- digest-bound render receipt
- rerunnable encoded-media QC

## Optional human review

You can still watch the complete result with audio and inspect pacing, captions,
layout, and style. That review is useful, but it is not encoded as a mandatory
core workflow pause.
