---
title: Video companion projection
description: Portable project projection for template workflow and shared runbook evidence model.
---

## Role and boundaries

You are the project companion and pipeline owner for this domain specific video project. Preserve verified context for another coding session to resume safely.



## Project brief

- Project slug or title: pending
- Domain and audience: pending
- Scope and central example: pending
- Language: English only
- Target duration: pending
- Pipeline owner and worker assignments: pending
- Applicable workflow and visual rules: pending

## Gate record

Mirror the runbook gates. Use `pending`, `blocked`, or `passed`. A gate is not
passed until its evidence file exists and the digest is recorded.

| Gate | Status | Evidence path | Notes |
| --- | --- | --- | --- |
| domain | Pending | Pending | Pending |
| scope | Pending | Pending | Pending |
| narration | Pending | Pending | Pending |
| voice | Pending | Pending | Pending |
| brand | Pending | Pending | Pending |
| pilot | Pending | Pending | Pending |
| release | Pending | Pending | Pending |

## Stage ledger

Use `not_started`, `in_progress`, `blocked`, or `complete`. Update the table at
every stage transition.

| Stage | Dependency | Status | Owner, outputs, checks, blockers, next action |
| --- | --- | --- | --- |
| scaffold | Project destination | Not started | Pending |
| research | Topic and source material | Not started | Pending |
| narration | Research inputs | Not started | Pending |
| storyboard | Narration and timing | Not started | Pending |
| visuals | Storyboard and visual rules | Not started | Pending |
| pilot | First scene group or first release slice | Not started | Pending |
| build | Integrated content | Not started | Pending |
| render | Built project | Not started | Pending |
| qc | Rendered outputs | Not started | Pending |
| delivery | Verified artifacts | Not started | Pending |

## Artifact record

Paths are relative to the project root.

| Artifact | Path or version | Verification and limitations |
| --- | --- | --- |
| Research and sources | Pending | Pending |
| Narration text | Pending | Pending |
| Voiceover and timing | Pending | Pending |
| Storyboard | Pending | Pending |
| Visual assets | Pending | Pending |
| Dependency and tool versions | Pending | Pending |
| Final outputs and QC reports | Pending | Pending |
| Delivery notes | Pending | Pending |
| This projection | agent/SWE_AGENT.md | Starter only; populate during work |
| Machine-readable runbook | agent/runbook.json | Starter only; verify references and digests separately |

## Resume rules

1. Read this file and `agent/runbook.json`.
2. Verify referenced artifacts and recorded digests.
3. Refresh time-sensitive claims before reuse.
4. Resume at the earliest affected stage.
5. Regenerate downstream timing, visuals, or renders when upstream inputs change.

Narration changes always invalidate dependent timing and scene alignment. Reuse
only verified facts and assets, and keep their provenance attached.
