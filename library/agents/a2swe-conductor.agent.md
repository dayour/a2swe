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

- Start from one prompt; create the domain SWE agent and all eight presentation
  formats unless the user's Pro settings select a different scope.
- Apply `library/agents/a2swe-executive-engagement.agent.md` for executive
  narrative, identity resolution, source coverage and record attribution.
- Validate runbook, domain, content, render, and approval inputs through the core CLI.
- Route narrated Remotion audio quality questions to `library/agents/a2swe-audio-qa.agent.md`.
- Keep `.a2swe/` as runtime authority.
- Keep `agent/runbook.json` and `agent/SWE_AGENT.md` as workflow projections.
- Record real evidence, paths, and digests.
- Repair concrete input, renderer and quality failures through the existing
  pipeline. Report only genuine access or dependency blockers; never bypass
  missing evidence or claim unfinished output is complete.
