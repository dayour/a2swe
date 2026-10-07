---
title: a2swe
description: Evidence-bound SWE agent research and eight-format explainer generation with a core-managed 1080p video path.
---

## Overview

a2swe is a research and development toolkit for building domain SWE agents and
generating evidence-bound status updates, briefings, and explainer packages for a
named agent and its project, company, market, licenses, consumption, trends,
codebase, brand, health, perception, or leadership.

Distribution is outside a2swe. The repository does not publish outputs, authorize
sharing, perform redistribution checks, or confer usage rights.

The current code centers on a local Node/TypeScript core in `packages/core/src`.
It validates contracts, assembles release packages, generates a core-managed 1080p
Remotion project, and verifies the resulting output set.

## Native desktop workspace

The Tauri application in `apps/desktop/` provides a main workspace and floating
agent widget. Its Rust host shares one local Copilot SDK bridge between windows;
the a2swe MCP server exposes core tools and source-linked workspace context.
Start with one prompt and select **Generate**. By default, a2swe creates the
domain SWE agent and all eight presentation formats, including narrated video.
Expand **Pro mode** only to customize sources, library context, voice, speed,
formats, naming, or guided tool approvals. Resolved defaults are persisted in
the project's generation specification.
Executive decision-makers are the default audience: lead with the decision,
why it matters, supported impact, risks, and next actions. Pro mode can override
the audience. Customer and market research must distinguish verified sources,
referenced records and ambiguous entity matches.
See the [desktop guide](docs/content/platform/desktop.md) for runtime requirements,
permissions, and the distinction between draft intake and verified domain context.

Original product PDFs stay in `library/assets/product_knowledgebase/`.
Source-linked text chunks and selected visual assets are indexed in
`library/assets/knowledge/catalog.json` for the native library, agent retrieval,
and documentation asset previews. No source collection is uploaded by local
extraction or browsing.

## Current capability boundary

- Build and validate `DomainPack`, `ContentIR`, `RenderSpec`, `ApprovalManifest`,
  `ReleasePlan`, `AssetInventory`, `FormatParityManifest`, and `Runbook`
- Initialize a minimal project with `project-init` or a standalone draft domain
  with `domain-init`
- Generate, import, fetch, and verify raster asset bundles
- Produce digest-verified release packages from a ready domain, matched content,
  matched render spec, and approval manifest
- Generate HTML, AdaptiveDeck, PPTX, DOCX, searchable PDF, 1080p PNG/JPEG
  overview images, and a core-managed 1080p Remotion MP4 project
- Re-run release verification, including encoded MP4 QC when the release includes
  the Remotion output
- Render multi-voice revisions into `renders/<project>-<year>-<NN>/` and measure
  every revision with spectrogram, loudness and video-layer analysis

`template/` holds the shared Remotion runtime, fonts and Python lock that the
core MP4 adapter installs into each release workspace. Projects do not carry
their own copy.

## Install

Use Node.js 24 and a single repository `.venv` on Python 3.14.7.

```powershell
npm ci --ignore-scripts
npm run build
npm run contracts:check
npm test
uv python install 3.14.7
uv venv --python 3.14.7 .venv --seed
Push-Location template
..\.venv\Scripts\python.exe -m pip install -r requirements.lock.txt
Pop-Location
.\.venv\Scripts\python.exe template\scripts\test_pipeline.py -v
```

Install the documentation site separately when you need it:

```powershell
npm --prefix docs ci
npm --prefix docs run build
```

## Core workflow

Create a project with a draft domain pack and evidence-tracked Runbook:

```powershell
node packages/core/src/cli.ts project-init `
  --id datadog-cowork-plugin `
  --name "Datadog Cowork Plugin" `
  --kind tool `
  --as-of 2026-09-29 `
  --out projects/datadog-cowork-plugin
```

The default `node template\scripts\new_project.cjs <new-directory> <slug>` also
calls `project-init`. Neither path copies a runtime, creates empty
`stills/` or `renders/` folders, or overwrites an existing destination.
Each project gets a `qc/index.json` evidence inventory.
Complete `canonical/domain-pack.json` by adding sources, evidence spans,
supported claims, and known gaps. Production requires `state: "ready"`.

Prepare visual assets as needed:

```powershell
node packages/core/src/cli.ts asset-generate --file asset-request.json --out asset-bundles/hero-diagram
node packages/core/src/cli.ts asset-verify --root asset-bundles/hero-diagram
```

Author these inputs next:

- `domain-pack.json`
- `content-ir.json`
- `render-spec.json`
- `approval-manifest.json`

Plan or produce the release:

```powershell
node packages/core/src/cli.ts release-plan `
  --content content-ir.json `
  --render render-spec.json `
  --approval approval-manifest.json `
  --out release-plan.json

node packages/core/src/cli.ts release-produce `
  --domain domain-pack.json `
  --content content-ir.json `
  --render render-spec.json `
  --approval approval-manifest.json `
  --assets asset-bundles `
  --out release

node packages/core/src/cli.ts release-verify --root release
```

`release/asset-inventory.json` lists selected PNG asset bundles under
`asset-inputs/` and separately generated section visuals under
`outputs/remotion/visuals/`. The parity manifest binds its digest;
`release-verify` rehashes each asset and rejects a changed inventory or output.

`release-produce` requires:

- a ready `DomainPack`
- a domain digest equal to `ContentIR.domainDigest`
- content claims whose wording and evidence exactly match supported domain claims
- an `ApprovalManifest` whose `contentDigest` and `domainDigest` match the release

## Approval manifest

`ApprovalManifest` replaced the older rights manifest model.

Each manifest contains:

- `schemaVersion`
- `manifestId`
- `domainDigest`
- `contentDigest`
- `reviewedAt`
- `selectedAssets[]`

Each selected asset contains:

- `assetId`
- `assetDigest`
- `basis`
- `reviewerId`
- `evidenceDigest`
- `status` of `pending`, `approved`, or `rejected`

Only a rejected asset blocks generation. `AssetRecord` and `LibraryEntry` no longer
carry embedded approval or rights fields.

## Release outputs

`release-produce` writes these release records at the package root:

- `content-ir.json`
- `domain-pack.json`
- `render-spec.json`
- `approval-manifest.json`
- `release-plan.json`
- `parity-manifest.json`

It can also produce:

- self-contained HTML
- AdaptiveDeck JSON
- editable PPTX with native shapes, fitted text, speaker notes, and embedded images
- editable DOCX
- searchable PDF with inline images and WinAnsi text output
- 1080p PNG and JPEG overview images
- a core-managed Remotion project that synthesizes audio, renders a 1080p
  H.264/AAC MP4, and records encoded-media QC

`release-verify` checks the digests of the entire output set and reruns MP4 QC
when the package includes the Remotion output. `--skip-media-probe` skips only the
ffprobe stage for hosts without FFmpeg; digest, inventory and timeline checks still run.

## Speech and video

The repository uses one Python 3.14.7 environment at `.venv`. Speech dependencies
are locked in `template/requirements.lock.txt`, including the dayour fork wheels
for Kokoro, Kokoro ONNX, and Misaki from the `py314-2026.09.17` release set.

The core-managed 1080p path defaults to Kokoro ONNX when
`KOKORO_ONNX_MODEL` and `KOKORO_ONNX_VOICES` are configured. It can fall back to
explicit PyTorch Kokoro only when `A2SWE_KOKORO_CONFIG`,
`A2SWE_KOKORO_WEIGHTS`, and the shared `KOKORO_ONNX_VOICES` bank are configured.
The core resolves local model paths and verifies their hashes from
`library/assets/speech/models.json` unless explicitly overridden.
`ContentIR.voice.profileId` selects the same voice for either engine; optional
`speed` and `pronunciations` control speech without altering display text.

```powershell
npm run a2swe -- voice-profiles
npm run a2swe -- audio-render --root projects\datadog-cowork-plugin --engine both --voice am_michael
npm run a2swe -- qc-index --root projects\datadog-cowork-plugin
```

Matched comparisons use identical voice tensors and Misaki phonemes, with
cleanup disabled. WAVs and measured metadata go in `PROJECT/qc/audio/PROFILE/`.
The default pronunciation map says `co-work` for `Cowork`.
Shared integrations now live under `library/integrations/`; there is no root
QC directory. Old model evidence lives with its project.
QC indexes inventory hashes, not quality approvals. Existing self-contained
release packages keep their internal QC paths intact.

Narration is synthesized per paragraph, separated by blank lines. Global captions
come from actual measured narration, independent of scene count. Scene timing
uses proven transcript/scene mappings when available; otherwise visual cuts are
proportional and their provenance is explicit. Captions are burned into the video.
Spoken-form spellings such as
`H I P A A` and `O Auth` are normalized to written form in captions and documents.

The core-managed Remotion scene design uses a dark backdrop, animated glow and
grid treatment, a kinetic headline, claim cards with source labels, a progress
bar, captions, and a sources footer. The outgoing scene remains visible while
the next scene fades in over at most ten frames; only the opening and ending
fade to the backdrop.

Audio QC is part of the managed Remotion path. The generated package includes a
reusable `scripts/audio-qa.mjs` tool that decodes the rendered MP4 audio, measures
speech RMS, non-speech noise floor, speech-versus-silence SNR, high-frequency
energy above 8 kHz, spectral flatness, peak level, and source-WAV speech
boundary continuity, then writes
`qc/audio-qa.json` and `qc/audio-spectrogram.svg`. The speech producer can also
apply measured cleanup through `A2SWE_AUDIO_CLEANUP=auto|on|off`; `auto` is the
default. It high-pass filters speech segments at 35 Hz to remove DC drift and
tapers each speech boundary over at most 25 ms without changing inserted
silence. It only applies an additional low-pass filter when the measured hiss
signature crosses its threshold (`on` forces that filter; `off` disables cleanup
but not QA). The report rejects source boundary jumps above -55 dBFS and
10 ms source edge RMS above -60 dBFS. It retains both the full gap level and
an interior-gap level measured 100 ms away from speech boundaries; the interior
noise floor and speech-to-silence SNR are checked independently. The
spectrogram marks scene cuts and reports boundary measurements. These
measurements do not replace listening for perceptual quality. Audio QA
threshold overrides can only tighten the built-in limits.

The producer resamples 24 kHz speech to the 48 kHz video rate with a steep
Kaiser anti-imaging filter, so no mirrored speech energy appears above 12 kHz.
It then masters the narration to -16 LUFS integrated (ITU-R BS.1770-4) through
a smooth 4x-oversampled true-peak limiter at -1.5 dBTP and records the gain in
the narration metadata. Audio QA fails a render outside -16 ±1 LU or above
-1 dBTP.

## Visuals inside sections

Each `ContentSection` can include an optional `visual` object:

```json
{
  "kind": "mermaid",
  "source": "flowchart LR\nA-->B",
  "caption": "System data flow"
}
```

Supported `kind` values are:

- `mermaid`
- `excalidraw`
- `marp`

The release flow emits:

- editable visual source files in `outputs/remotion/visuals/`
- one settled PNG per visual in `outputs/remotion/visuals/NN-section.png`

The PNG becomes the shared diagram image embedded by HTML, AdaptiveDeck, PPTX,
DOCX, PDF, and PNG/JPEG outputs. Visual embedding therefore requires the Remotion
format to be part of the requested release.

## Autonomous workflow

The workflow is autonomous. It does not pause at human sign-off checkpoints before
TTS, pilot, or final render.

Instead, the agent records decisions and evidence in `agent/runbook.json`. Gates
use `pending`, `blocked`, and `passed` status with `evidencePath` and
`evidenceDigest`. Automated checks are measurement evidence, not human review.
Human review remains optional and external to the core state model.

Facts still require cited evidence. Unknowns must be recorded as unknowns, not
invented. Freshness for recent claims uses a trailing nine-calendar-month window.

## Revisions and media analysis

Each render round is a revision. `revision-produce` renders one full release per
voice and engine variant and promotes the first variant to `release/`:

```powershell
npm run a2swe -- revision-produce --root projects\microsoft-plugin-architecture
npm run a2swe -- revisions-analyze --root projects\microsoft-plugin-architecture
npm run a2swe -- revision-promote --root projects\microsoft-plugin-architecture --id microsoft-plugin-architecture-2026-04 --voice af_heart-kokoro_onnx
```

The default variants are Michael, Heart and Bella on Kokoro ONNX plus Michael on
PyTorch Kokoro. Videos and captions go to `renders/<project>-<year>-<NN>/` with a
`revision.json` manifest. `revisions-analyze` writes `qc/analysis/report.md` with
EBU R128 loudness, true peak, pause noise floor, high-frequency energy,
spectrograms with legends, scene and freeze detection, and per-zone layer motion
for every revision. `revisions-organize` imports older renders into the same
layout.
