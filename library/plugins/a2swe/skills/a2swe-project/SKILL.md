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

1. Read `agent/runbook.json` and `agent/SWE_AGENT.md`.
2. Validate the runbook and verify recorded files:
   `node packages/core/src/cli.ts validate --schema Runbook --file PROJECT/agent/runbook.json`
   and `node packages/core/src/cli.ts runbook-verify --root PROJECT`.
3. Validate domain, content, render, and approval inputs before production.
4. Use the managed core release path for output generation.
5. Treat missing evidence, model paths, or assets as blockers.

## Expected output

Return exact command evidence, blockers, and the earliest safe resumption stage.
