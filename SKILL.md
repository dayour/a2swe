---
name: a2swe
description: "Use when creating a public-evidence-grounded domain SWE agent for a company, topic, framework, repository, or tool, or producing executive videos, presentations, and briefings from that approved agent. Build and evaluate the domain agent before media; preserve citations, brand provenance, approval gates, and durable handoffs."
---

# a2swe

**Anything to SWE Agent: Expert Explainers.** First build an independently useful,
public-evidence-grounded domain SWE agent; then produce approved executive outputs
from its versioned knowledge. All product copy and output are English.

Read [docs/AGENT_FIRST_BUILD_SPEC.md](docs/AGENT_FIRST_BUILD_SPEC.md) for the
accepted scope and current implementation boundary. The local core is a foundation,
not a complete reasoning backend. Never present a draft pack or companion ledger
as a ready agent, and never run direct video production to bypass missing
DomainReady gates.

Ground recent claims in the trailing nine calendar months, separating publication,
modification, observation, and retrieval dates. Older official foundations require
explicit exceptions and current revalidation. Include applicable public engineering,
brand, news, investor, and market sources with exact citations and rights evidence.

Read [reference/production-rules.md](reference/production-rules.md) before
production. It defines research, narration, timing, storyboard syntax, safe
areas, motion, lighting, QC, asset provenance, and delivery requirements.

## Companion Projection

Initialize the scaffolded `agent/SWE_AGENT.md` at stage 0. The pipeline owner
updates it at every transition with dependencies, assignments, approvals,
decisions, sources, artifact paths, actual checks, blockers, and next actions.
Workers own bounded files and return evidence; they do not compete to edit the
ledger. Parallel work is permitted only when dependencies and approvals allow it.

The companion is a readable project projection, not the authoritative runtime
store, a daemon, or a trained model. The `.a2swe/` SQLite store owns runtime state,
durable job receipts, integrity records, and verified asset records. Ship the
projection with the movie and full source project, but never use it to override
the core state. Never store secrets or invent successful checks or user approvals.

## Mandatory Gates

Before these media gates, independent QA and the user must approve the exact
DomainPack version, subject scope, foundational exceptions, and brand basis.
Neither the producer nor a passing unit test can confer this approval.

1. Confirm duration, audience, and scope before drafting narration. English is fixed.
2. Show the complete narration, chapters, word count, and estimated duration;
   wait for sign-off before TTS.
3. Confirm TTS preference and disclose any external narration transfer. Auto uses
   the upgraded local Kokoro/Misaki stack on Python 3.14; ONNX needs supplied weights;
   Edge uses an English voice and Microsoft's speech endpoint. Install the
   project's requirements.lock.txt into a Python 3.14 environment first.
4. Show the first 30 seconds, or the whole shorter pilot, and wait for approval
   of style, readability, pacing, and voice before building remaining groups.

## Active 720p Remotion/Python Adapter

Run only after the agent-first domain and content prerequisites are met. This
adapter targets 1280x720 at 30fps with Remotion/React rendering and Python
speech, timing, and QC. It is the current production video path and an adapter
target for the agent-first system. It does not yet produce the planned PPTX, PDF,
HTML/AdaptiveDeck, or DOCX outputs; those adapters should consume the same
ContentIR/RenderSpec and approval records instead of becoming separate products.

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
