---
title: a2swe overview
slug: /overview
---

# a2swe engineering documentation

a2swe is an English-only, agent-first source toolkit for building a public-evidence-grounded domain SWE agent before producing executive explainer outputs from that approved knowledge. The current repository has core orchestration, an evaluation-only asset proof pipeline, a local release-candidate adapter foundation, and the established 720p Remotion/Python production video architecture. It is not yet a complete production system for all target formats.

The system is deliberately not a one-click website, installed desktop application, trained model, or permanently running agent. The `.a2swe/` SQLite store is the authoritative local runtime state for core jobs and artifacts. `agent/SWE_AGENT.md` is a portable projection for established video architecture projects. Remotion Studio is the local preview interface for the Remotion/Python video adapter. Humans still approve scope, narration, voice handling, visual style, and release.

## Current surfaces

| Surface | Status | Output boundary |
| --- | --- | --- |
| Core orchestration | Foundation implemented | Draft packs, inventories, contracts, durable state, local receipts, and verified artifact records |
| Evaluation-only asset proof | Engineering validation only | Synthetic 1080p raster proofs and manifests; no subject, brand, or production approval |
| Local release-candidate adapters | Foundation implemented | Rights/approval-gated HTML, AdaptiveDeck, editable PPTX, editable DOCX, searchable PDF, and Remotion project/render-plan outputs from one cited ContentIR and RenderSpec |
| Established 720p Remotion/Python video architecture | Production video path, gated by approvals | Remotion/React 1280x720, 30 fps MP4 workflow, Python speech/timing/QC, and verified pilots |
| Target executive adapters | Partially implemented foundation | Narrated MP4, editable PPTX, searchable PDF, responsive HTML/AdaptiveDeck, and DOCX from one cited ContentIR and RenderSpec; MP4 encoding remains outside the local adapter foundation |

## System outcomes

A completed video adapter release contains more than an MP4:

- an H.264 explainer video;
- editable Remotion source;
- primary-source research and claim qualifications;
- approved narration and synchronized timing;
- resolved storyboard and chapter structure;
- quality-control evidence and media measurements;
- an asset provenance manifest;
- delivery notes;
- a populated SWE companion ledger projection that records decisions and verified state.

## Technology stack

| Layer | Technology | Responsibility |
| --- | --- | --- |
| Visual runtime | Remotion 4, React 19 | Frame-addressable composition and rendering |
| Application code | TypeScript | Components, shot manifests, timeline data, configuration |
| Media pipeline | Python 3.14 | TTS, timing, subtitle alignment, media verification |
| Encoding and inspection | FFmpeg and ffprobe | Encoded output, stream metadata, media QC |
| Documentation | Docusaurus 3 | Architecture, SDK, operating, and specification reference |
| Governance | `.a2swe/` SQLite plus Markdown projections | Runtime state, approvals, evidence, provenance, and portable project state |

## Core principles

1. **Evidence before animation.** Claims are researched, dated, sourced, and qualified before they enter narration.
2. **Human approval is a state transition.** The four mandatory gates cannot be replaced by an automated success marker.
3. **Core state is authoritative.** `.a2swe/` owns durable job and artifact state; Markdown ledgers are projections.
4. **The template is reusable; projects are isolated.** Every video is scaffolded into a separate project directory.
5. **Delivery is reproducible.** Source, evidence, manifests, and companion state ship with the movie.
6. **Checks must be real.** The workflow never invents approvals or successful validation.

## Read next

- [Install the toolchain](./getting-started/installation.md)
- [Understand the architecture](./architecture/system-overview.md)
- [Follow the production lifecycle](./pipeline/lifecycle.md)
- [Use the SDK](./sdk/overview.md)
- [Implement the normative system contract](./specifications/system-contract.md)
