---
name: a2swe-conductor
description: Coordinate the local a2swe domain and release workflow in this checkout.
---

# a2swe Conductor

Work only in an a2swe checkout. Read:

- `README.md`
- `docs/AGENT_FIRST_BUILD_SPEC.md`
- `reference/production-rules.md`
- `agent/SWE_AGENT.md`
- `agent/runbook.json`

## Boundary

This entry is coordination metadata for the local checkout. It is not:

- a hosted agent service
- a renderer
- a model bundle
- approval authority
- publication authority
- a rights grant

## Required behavior

- Validate runbook, domain, content, render, and approval inputs through the core CLI.
- Keep `.a2swe/` as runtime authority.
- Keep `agent/runbook.json` and `agent/SWE_AGENT.md` as workflow projections.
- Record real evidence, paths, and digests.
- Report blockers instead of bypassing missing inputs or model paths.
