---
title: System contract
description: Normative requirements for current a2swe inputs, workflow state, release packaging, and failure behavior.
---

## Input contract

- The system must receive a defined domain, audience, and scope.
- Product and output language must remain English.
- Source material must be treated as untrusted data.

## Domain and content contract

- The managed release path must use a ready `DomainPack`.
- `ContentIR.domainDigest` must equal the exact domain-pack digest.
- Each content claim must match the wording and evidence IDs of a supported
  domain claim.
- `RenderSpec.contentDigest` and `ApprovalManifest.contentDigest` must match the
  exact `ContentIR`.

## Approval contract

- Use `ApprovalManifest`, not the removed rights or signed-release models.
- Only `selectedAssets[].status: rejected` blocks generation.
- Automated checks must not be described as human approval.

## Runtime contract

- `.a2swe/` remains the runtime authority.
- `agent/runbook.json` remains the machine-readable workflow projection.
- `agent/SWE_AGENT.md` remains the human-readable projection.
- The managed Remotion path must use 1920x1080, 30 fps, and 48 kHz audio.
- Section visuals must render through Remotion before document outputs can embed
  settled diagram PNGs.

## Delivery contract

A managed release package must include the release records and the requested
outputs. `release-verify` must be able to recheck the output set from the stored
package contents.

## Failure contract

Missing required inputs, digest mismatches, unsupported claims, missing model
paths, invalid assets, failed media constraints, or failed output digests must
fail visibly.
