---
title: a2swe overview
description: Overview of the a2swe core, release workflow, shared speech stack, and retained legacy template path.
slug: /overview
---

## What a2swe is

a2swe is a research and development toolkit for building domain SWE agents and
generating evidence-bound briefings and explainer packages from those agents.

The codebase does not publish output, grant sharing rights, or perform
redistribution checks.

## Current surfaces

| Surface | Status | Output boundary |
| --- | --- | --- |
| Core orchestration | Implemented | Contracts, digests, inventories, asset bundles, runbook verification, and local release packaging |
| Core-managed 1080p release path | Implemented | HTML, AdaptiveDeck, PPTX, DOCX, searchable PDF, 1080p PNG/JPEG overviews, and a generated 1080p Remotion project |
| Encoded MP4 verification | Implemented | Local H.264/AAC render with encoded-media QC and release re-verification |
| Section visuals | Implemented | Mermaid, Excalidraw, and Marp sources rendered to shared diagram PNGs |
| Legacy template path | Retained | Hand-built 720p branded-video workflow under `template/` |

## Core workflow

1. Initialize a draft `DomainPack`.
2. Add sources, evidence spans, supported claims, and known gaps.
3. Mark the domain pack `ready` only when evidence is complete.
4. Author `ContentIR`, `RenderSpec`, and `ApprovalManifest`.
5. Generate or verify asset bundles as needed.
6. Produce the release package.
7. Verify the release package.

## Shared runtime rules

- Use the repository `.venv` on Python 3.14.7.
- Install `template/requirements.lock.txt`.
- Prefer Kokoro ONNX when ONNX model paths are configured.
- Keep claims tied to cited evidence.
- Record unknowns instead of inventing them.
- Treat automated checks as evidence, not as human approval.

## Legacy note

The older template path still exists for project-specific branded productions.
Use it only when the task explicitly targets that older workflow.
