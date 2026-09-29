# a2swe

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

## Current capability boundary

- Build and validate `DomainPack`, `ContentIR`, `RenderSpec`, `ApprovalManifest`,
  `ReleasePlan`, `FormatParityManifest`, and `Runbook`
- Initialize draft domain packs with `domain-init`
- Generate, import, fetch, and verify raster asset bundles
- Produce digest-verified release packages from a ready domain, matched content,
  matched render spec, and approval manifest
- Generate HTML, AdaptiveDeck, PPTX, DOCX, searchable PDF, 1080p PNG/JPEG
  overview images, and a core-managed 1080p Remotion MP4 project
- Re-run release verification, including encoded MP4 QC when the release includes
  the Remotion output

The repository also retains an older template-based 720p video pipeline under
`template/`. That path remains useful for hand-built branded videos, but it is the
legacy path, not the core-managed production path.

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

Initialize a draft domain pack:

```powershell
node packages/core/src/cli.ts domain-init `
  --id datadog-cowork-plugin `
  --name "Datadog Cowork Plugin" `
  --kind tool `
  --as-of 2026-09-29 `
  --out projects/datadog-cowork-plugin/canonical/domain-pack.json
```

Then complete the domain pack by adding sources, evidence spans, supported claims,
and known gaps. Production requires `state: "ready"`.

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
when the package includes the Remotion output.

## Speech and video

The repository uses one Python 3.14.7 environment at `.venv`. Speech dependencies
are locked in `template/requirements.lock.txt`, including the dayour fork wheels
for Kokoro, Kokoro ONNX, and Misaki from the `py314-2026.09.17` release set.

The core-managed 1080p path defaults to Kokoro ONNX when
`KOKORO_ONNX_MODEL` and `KOKORO_ONNX_VOICES` are configured. It can fall back to
explicit PyTorch Kokoro only when `A2SWE_KOKORO_CONFIG`,
`A2SWE_KOKORO_WEIGHTS`, and `A2SWE_KOKORO_VOICE_MODEL` are configured.
`KOKORO_ONNX_VOICE` selects the ONNX voice.

Narration is synthesized per paragraph, separated by blank lines. When paragraph
count matches scene count, the renderer derives scene timing and captions from
measured speech segments. Otherwise it distributes scene cuts proportionally by
text length. Captions are burned into the video. Spoken-form spellings such as
`H I P A A` and `O Auth` are normalized to written form in captions and documents.

The core-managed Remotion scene design uses a dark backdrop, animated glow and
grid treatment, a kinetic headline, claim cards with source labels, a progress
bar, captions, and a sources footer.

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

## Legacy template note

The older 720p template pipeline still exists under `template/`, including
`template/scripts`, `tts_build.py`, and `new_project.cjs`. Use it only when you
need the older hand-built branded-video workflow. The core adapter described above
is the managed 1080p path.
