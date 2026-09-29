---
title: Skill library
---

# Skill library

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
project runbooks. Inventory reports these entries as pending and disabled
until review: catalog presence never grants approval, runtime execution, or
production approval. The a2swe production rules remain authoritative for
narration approval, storyboard syntax, Remotion implementation, media QC,
and delivery.
