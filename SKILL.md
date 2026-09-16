---
name: a2swe
description: "Topic in, narrated English explainer video out. Use when the user asks for an explainer video, a topic or article turned into a video, a video revision, or a follow-up video. A parallel domain-expert SWE track manages the full pipeline and ships reusable knowledge, instructions, approvals, and project state with each video."
---

# a2swe

**Anything to SWE Agent: Expert Explainers.** The primary output is a narrated
video, not an agent instead of a video. All product copy and output are English.

Read [reference/production-rules.md](reference/production-rules.md) before
production. It defines research, narration, timing, storyboard syntax, safe
areas, motion, lighting, QC, asset provenance, and delivery requirements.

## Companion Track

Initialize the scaffolded `agent/SWE_AGENT.md` at stage 0. The pipeline owner
updates it at every transition with dependencies, assignments, approvals,
decisions, sources, artifact paths, actual checks, blockers, and next actions.
Workers own bounded files and return evidence; they do not compete to edit the
ledger. Parallel work is permitted only when dependencies and approvals allow it.

The companion is a portable instruction-and-state artifact, not a daemon or a
trained model. Ship it with the movie and full source project. Never store secrets
or invent successful checks or user approvals.

## Mandatory Gates

1. Confirm duration, audience, and scope before drafting narration. English is fixed.
2. Show the complete narration, chapters, word count, and estimated duration;
   wait for sign-off before TTS.
3. Confirm TTS preference and disclose any external narration transfer. Auto uses
   local Piper on Python 3.14 with an explicitly supplied English voice model;
   Edge uses an English voice and Microsoft's speech endpoint. Install the
   project's requirements.lock.txt into a Python 3.14 environment first.
4. Show the first 30 seconds, or the whole shorter pilot, and wait for approval
   of style, readability, pacing, and voice before building remaining groups.

## Pipeline

| Stage | Work and evidence |
| --- | --- |
| 0 Scaffold | Copy template into a separate project; install locked dependencies; typecheck; initialize companion. |
| 1 Research | Create research/research.md with primary-source claims, dates, glossary, qualifications, and unresolved facts. |
| 2 Narration and timing | Draft script/narration.txt; obtain gates 1-3; run TTS; verify audio duration and subtitle timing. |
| 3 Storyboard | Write script/storyboard_src.md; resolve tokens into storyboard.md; specify beats, text, hero, light, motion, and exits. |
| 4 Shared visuals | Configure titles, chapters, HUD, rails, and primitives; inspect representative overlay stills. |
| 5a Pilot | Build G1; typecheck and render first 30 seconds; obtain gate 4. |
| 5b Parallel build | Assign remaining groups with approved storyboard and style; collect stills, motion checks, and BUILD_NOTES. |
| 6 Render | Integrate source; run typecheck and static QC; render versioned H.264 MP4 and extract frames. |
| 7 QC and fixes | Watch audio/video; inspect transitions, facts, text, motion, and assets; run metrics, repair, rerender, and retest. |
| 8 Delivery | Link video, editable source, research, timing, storyboard, QC, manifest, and populated companion in delivery.md. |

## Revisions and Follow-Ups

Read the delivered companion first. Verify referenced artifacts and refresh
time-sensitive claims. Resume at the earliest affected stage. Narration changes
need renewed approval, regenerated timing, and realigned shots. Preserve the
released original. Follow-up videos get a separate project and approval record;
reusable facts and primitives retain provenance and licensing information.
