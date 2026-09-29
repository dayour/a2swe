---
name: a2swe-project
description: Inspect and resume a2swe agent-first projects with a validated runbook and approved multi-format production gates.
---

# a2swe Project

## Prerequisites

Use an a2swe checkout with Node 24.8 or newer. Read the repository `SKILL.md`,
`docs/AGENT_FIRST_BUILD_SPEC.md`, and `reference/production-rules.md`. No
installed agent, model, or toolkit license is supplied by this library entry.

## Current implementation boundary

This skill resumes or inspects an a2swe agent-first project. It does not create
DomainReady status, approve a brand, synthesize narration, encode a finished MP4,
or enable unsupported PPTX, PDF, HTML/AdaptiveDeck, or DOCX release output by
itself. The local core validates contracts and records projections; human and
independent reviewer gates remain external approvals.

Related first-party entries:

- `library/agents/a2swe-conductor.agent.md` coordinates approved transitions.
- `library/plugins/a2swe/` packages the conductor, this runbook skill, and its
  starter asset for portable discovery.
- `library/assets/runbook/runbook-starter.json` is a pending scaffold seed, not
  evidence of a completed or approved project.

## Quick Start

1. Read the project `agent/runbook.json` and `agent/SWE_AGENT.md`; if either is
   absent, report that the project needs migration rather than inventing state.
2. From the repository root run
   `node packages/core/src/cli.ts validate --schema Runbook --file PROJECT/agent/runbook.json`.
3. Run `node packages/core/src/cli.ts runbook-verify --root PROJECT` to compare recorded
   paths and hashes to actual artifacts. Stale or absent evidence leaves the
   corresponding gate pending. This verifies references, not signatures.
4. Build a cited domain agent first. Validate content and render specifications
   with the same CLI before requesting signed approvals.
5. Produce only through the approved core release path; record native-renderer
   QA separately for each requested output. Report formats not implemented.

The runbook is a projection, not a credential, authorization token, or approval.
For revisions, refresh time-sensitive claims and resume at the earliest affected
stage. Do not treat a successful command as human acceptance.

## Expected output

Return a concise status report with the validated command results, pending gates,
missing or stale artifacts, exact blockers, and the earliest safe resumption
stage. If a format adapter is unavailable, say so directly instead of silently
falling back to a different output.

## Troubleshooting

If the CLI rejects a contract, correct the source data rather than weakening
validation. If native renderers, Python model weights, or approval are missing,
record the precise blocker and leave the associated deliverable unfinished.
