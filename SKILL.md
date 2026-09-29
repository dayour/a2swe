---
name: a2swe
description: "Use when building or resuming an a2swe domain SWE agent workflow, authoring release inputs, or producing a digest-verified explainer package from a ready domain."
---

# a2swe

Use this skill for the first-party a2swe workflow in this repository.

Build the domain SWE agent first. Then produce evidence-bound briefings, decks,
documents, and video outputs from that domain package.

## Scope

- Create or resume a domain pack for a company, customer, topic, framework,
  repository, or tool
- Validate `Runbook`, `DomainPack`, `ContentIR`, `RenderSpec`,
  `ApprovalManifest`, `ReleasePlan`, and `FormatParityManifest`
- Generate or verify diagram asset bundles
- Produce or verify a release package through the core CLI
- Resume legacy template projects only when the task explicitly targets the older
  720p branded-video path

Do not claim that this repository publishes output, grants redistribution rights,
or authorizes sharing.

## Current implementation boundary

The core workflow is local and digest-bound. It can assemble and verify release
packages, but it does not act as a publication service or rights checker.

The remaining signed primitive is `domain-certify`, which creates an optional
signed domain certificate. Release-specific signed approval bundles, trust-policy
release verification, review-candidate packaging, and output watermarks were
removed.

## Required workflow

1. Read the repository `README.md`, `docs/AGENT_FIRST_BUILD_SPEC.md`, and
   `reference/production-rules.md`.
2. If the task targets an existing project, read `agent/runbook.json` and
   `agent/SWE_AGENT.md`. Validate the runbook with:
   `node packages/core/src/cli.ts validate --schema Runbook --file PROJECT/agent/runbook.json`
   and `node packages/core/src/cli.ts runbook-verify --root PROJECT`.
3. If the task starts a new project, initialize a draft domain pack with
   `domain-init`, complete its sources, evidence, claims, and known gaps, and do
   not treat `state: "draft"` as production-ready.
4. Author `ContentIR`, `RenderSpec`, and `ApprovalManifest` only after the domain
   pack is ready. Keep claim wording and evidence IDs identical between the domain
   pack and content.
5. Use `asset-generate`, `asset-import`, `asset-fetch`, and `asset-verify` for
   digest-bound visual bundles as needed.
6. Use `release-plan` for a dry run, `release-produce` for a release package, and
   `release-verify` to re-check the finished package.
7. Record actual evidence in `agent/runbook.json`. Gates must remain
   `pending`, `blocked`, or `passed` until the evidence file and digest exist.

## Speech and visual rules

- Use the repository `.venv` on Python 3.14.7
- Install `template/requirements.lock.txt`
- Prefer Kokoro ONNX when `KOKORO_ONNX_MODEL` and `KOKORO_ONNX_VOICES` are set
- Use explicit PyTorch Kokoro only when the `A2SWE_KOKORO_*` model paths are set
- Treat blank-line-separated narration paragraphs as the speech segmentation unit
- Use `ContentSection.visual` for Mermaid, Excalidraw, or Marp diagrams
- Request the `remotion` format when document outputs need settled diagram PNGs

## Output expectations

Return the exact validated command results, blockers, stale or missing evidence,
and earliest safe resumption stage.

If a required input, model path, asset bundle, or output format is unavailable,
say so directly. Do not invent approvals, publication authority, or successful
checks.
