---
name: a2swe-project
description: Validate and resume an a2swe project's agent-first runbook and production gates.
---

# a2swe Project

## Prerequisites

Open an a2swe checkout with Node 24.8 or newer. Read its `SKILL.md`,
`docs/AGENT_FIRST_BUILD_SPEC.md`, and `reference/production-rules.md`; this
plugin does not ship a backend, models, renderer, approval service, credential,
or publication channel.

## Current implementation boundary

This packaged skill validates and resumes project projections. It does not create
DomainReady status, approve a brand, synthesize narration, encode a finished MP4,
or prove availability of PPTX, PDF, HTML/AdaptiveDeck, or DOCX release output.
The packaged runbook asset is a pending scaffold seed only.

## Quick Start

1. Read `agent/runbook.json` and `agent/SWE_AGENT.md` in the target project.
2. Run `node packages/core/src/cli.ts validate --schema Runbook --file PROJECT/agent/runbook.json`
   and `node packages/core/src/cli.ts runbook-verify --root PROJECT` from the checkout.
   The second command checks paths and hashes, not approval signatures.
3. Obtain cited domain QA, user decisions, and selected-asset approval before
   approved core release production. No runbook flag can confer approval.
4. Record native output QA and limitations. Never report unimplemented MP4 or
   unsupported format output as a finished deliverable.

## Expected output

Return the exact command evidence, pending gates, stale or missing artifact paths,
explicit blockers, and earliest safe resumption stage.

## Troubleshooting

Missing runbook, renderer, approval, or model weights are explicit blockers.
Do not bypass a missing gate through a standalone script.
