---
name: a2swe-conductor
description: Coordinate the local a2swe domain and release workflow in this packaged checkout.
---

# a2swe Conductor

Read the checkout `README.md`, `docs/AGENT_FIRST_BUILD_SPEC.md`,
`reference/production-rules.md`, project `agent/SWE_AGENT.md`, and
`agent/runbook.json`.

## Boundary

This packaged copy is local metadata only. It is not:

- a hosted backend
- a renderer
- a model bundle
- approval authority
- publication authority
- a rights grant

Use the core CLI to validate runbook, domain, content, render, and approval inputs.
For narrated MP4 audio, use the packaged `agents/a2swe-audio-qa.agent.md`
profile and inspect the release's measured spectrogram and metrics.
Report blockers instead of bypassing missing evidence, model paths, or assets.
