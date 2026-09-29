---
name: a2swe-project
description: Validate and resume an a2swe project's runbook, release inputs, and managed output package.
---

# a2swe Project

## Prerequisites

Use this skill inside an a2swe checkout with Node 24 and the repository Python
3.14 environment available.

Read:

- `README.md`
- `docs/AGENT_FIRST_BUILD_SPEC.md`
- `reference/production-rules.md`

## Current implementation boundary

This skill validates and resumes a local a2swe workflow. It does not publish
output, grant reuse rights, or create approval by itself.

## Required workflow

1. Read `agent/runbook.json` and `agent/SWE_AGENT.md`.
2. Validate the runbook and verify its recorded files:
   `node packages/core/src/cli.ts validate --schema Runbook --file PROJECT/agent/runbook.json`
   and `node packages/core/src/cli.ts runbook-verify --root PROJECT`.
3. Validate `DomainPack`, `ContentIR`, `RenderSpec`, and `ApprovalManifest` before
   producing a release.
4. Use `release-plan`, `release-produce`, and `release-verify` for the managed
   release path.
5. Leave missing model paths, stale evidence, unsupported formats, and absent
   assets as explicit blockers.

## Expected output

Return:

- exact command evidence
- pending or blocked gates
- stale or missing artifact paths
- earliest safe resumption stage

Do not invent approvals or publication authority.
