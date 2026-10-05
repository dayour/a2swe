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

1. Read `canonical/generation-request.json` when present. Create the
   project-specific `agent/SWE_AGENT.md` when beginning a new project; read and
   maintain it with `agent/runbook.json` rather than stopping at a missing
   companion. Default to executive decision-makers and use
   `library/agents/a2swe-executive-engagement.agent.md`.
2. Validate the runbook and verify its recorded files:
   `node packages/core/src/cli.ts validate --schema Runbook --file PROJECT/agent/runbook.json`
   and `node packages/core/src/cli.ts runbook-verify --root PROJECT`.
3. Validate `DomainPack`, `ContentIR`, `RenderSpec`, and `ApprovalManifest` before
   producing a release.
4. Use `release-plan`, `release-produce`, and `release-verify` for the managed
   release path.
5. Inspect real rendered outputs and audio. Repair stale caches, unreadable
   visuals, caption/timing defects and failed quality checks, then rerun existing
   verification. Do not add duplicate pipelines or weaken thresholds. Surface
   genuine access/dependency failures without inventing successful output.

## Expected output

Return:

- exact command evidence
- verified output paths and digests
- repairs made and their verification results
- exact unavoidable access/dependency failures, if any

Do not invent approvals or publication authority.
