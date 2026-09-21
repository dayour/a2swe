---
title: Production lifecycle
---

# Production lifecycle

The canonical lifecycle contains nine numbered stages with a split build stage.

| Stage | Objective | Required evidence |
| --- | --- | --- |
| 0 — Scaffold | Create an isolated project and initialize ownership | Locked install, typecheck, initialized companion |
| 1 — Research | Establish source-backed facts and constraints | URLs, access dates, claims, qualifications, confidence |
| 2 — Narration and timeline | Approve spoken content and produce synchronized media | Approval record, audio, timeline, subtitles |
| 3 — Storyboard | Translate sentences into executable visual intent | Source storyboard, resolved storyboard, token validation |
| 4 — Overlays and primitives | Configure global visual language | Title, chapters, HUD, rail, shared visuals, still checks |
| 5a — Pilot | Prove the first 30 seconds | Render, stills, readability, pacing, voice and style approval |
| 5b — Parallel build | Implement remaining approved groups | Bounded assignments, build notes, still and motion evidence |
| 6 — Render | Integrate and encode the complete movie | Typecheck, static QC, versioned H.264 MP4, extracted frames |
| 7 — QC and fixes | Detect, repair, and retest defects | Media metrics, frame checks, sync checks, rerender evidence |
| 8 — Delivery | Ship the reproducible release | Video, source, research, timing, storyboard, QC, manifest, ledger |

## Dependency rules

Parallel work is allowed only when dependencies and approvals permit it. A single pipeline owner updates `agent/SWE_AGENT.md`; workers edit bounded files and return evidence rather than competing to update the ledger.

## Mandatory gates

1. Confirm duration, audience, and scope before narration drafting.
2. Show the complete narration, chapter structure, word count, and estimated duration; wait for sign-off before speech synthesis.
3. Confirm the speech engine and disclose any external narration transfer.
4. Show the first 30 seconds, or the whole shorter pilot, and wait for approval before building remaining groups.

## State transitions

A stage is complete only when its artifacts exist and its checks were actually run. “Planned,” “implemented,” “rendered,” “verified,” and “approved” are distinct states. The companion should record the command, result, artifact path, owner, and decision where applicable.
