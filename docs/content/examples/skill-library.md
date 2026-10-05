---
title: Skill library
description: Discover and apply source-linked skills, agents, scripts and knowledge assets through the native workspace and MCP.
---

`library/skills/` contains reusable agent workflows and references. Run the
passive inventory to get current counts; checked-in totals drift as entries are
added or removed.

## Functional families

- Copilot and agent design;
- business and process workflows;
- brand and content production;
- knowledge collection and routing;
- Microsoft 365, SharePoint, and Power Platform;
- analytics, visualization, and reporting;
- media, presentation, and explainer production;
- governance, evaluation, and quality.

## Reusable patterns

1. Precise trigger descriptions define when a skill applies.
2. Source data is separated from executable instruction.
3. Operating loops follow gather, produce, verify, and capture-reuse phases.
4. Long rubrics live in references; templates live in assets; action steps remain in `SKILL.md`.
5. Outputs carry evidence, limitations, and next actions.
6. Workflows avoid silent fallbacks and invented success.
7. Portable state supports revision and continuation.

## Relationship to a2swe

The first-party `library/agents/a2swe-conductor.agent.md` and
`library/skills/a2swe/SKILL.md` expose the agent-first runbook workflow.
`library/plugins/a2swe/plugin.json` packages self-contained Copilot CLI agent
and skill entries, while `library/assets/runbook/runbook-starter.json` seeds
project runbooks. Passive inventory does not itself execute a skill. The native
SDK session loads repository skill, plugin and agent-instruction directories;
MCP also exposes their markdown as resources for targeted retrieval.
Normal SDK permission handling controls actual tool execution.

The native Library tab and `a2swe.library` enumerate the current entries directly
from the checkout. `a2swe.tools_list` exposes executable tool schemas; markdown
instructions remain separate from executable scripts. `a2swe.knowledge_search`
retrieves bounded, source-linked chunks instead of embedding an entire PDF
collection in the session prompt.

Use the [spec-driven command map](../reference/command-line.md#spec-driven-execution)
to connect domain-agent work to audio, video and presentation outputs. Each
output is validated by its core contract and recorded in project QC. Human
review is optional; no skill entry grants publication or distribution rights.
