---
name: a2swe-project
description: Validate and resume an a2swe project's runbook, release inputs, and managed output package.
---

# a2swe Project

## Prerequisites

Use this packaged skill inside an a2swe checkout. Read:

- `README.md`
- `docs/AGENT_FIRST_BUILD_SPEC.md`
- `reference/production-rules.md`

## Boundary

This skill is packaged metadata only. It does not ship a backend, models, a
renderer, or publication authority.

## Required workflow

1. Read the persisted generation request and `agent/runbook.json`. Create or
   maintain the project-specific `agent/SWE_AGENT.md`; use the executive
   engagement profile for decision-focused narration and source attribution.
2. Validate the runbook and verify recorded files:
   `node packages/core/src/cli.ts validate --schema Runbook --file PROJECT/agent/runbook.json`
   and `node packages/core/src/cli.ts runbook-verify --root PROJECT`.
3. Validate domain, content, render, and approval inputs before production.
4. Use the managed core release path for output generation.
5. Review the actual video, subtitles, audio, assets and presentations. Fix
   concrete failures through the core, then rerun release and runbook checks.
   Do not add duplicate pipelines or lower quality thresholds.

## Expected output

Return verified output paths/digests and the repairs performed. Surface genuine
access or dependency failures explicitly rather than inventing completed output.
