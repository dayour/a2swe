---
title: Visual asset pipeline
description: Current asset, visual, and release-image behavior in the a2swe core and generated Remotion output.
---

## Scope

This page documents the current visual asset behavior in the local core. It covers:

- raster asset bundles
- section visuals embedded through Remotion
- release image outputs
- the remaining optional signed domain certificate

It does not describe publication, redistribution authorization, or release rights.

## Asset bundles

The core supports these commands:

```powershell
node packages/core/src/cli.ts asset-generate --file asset-request.json --out asset-bundles/hero
node packages/core/src/cli.ts asset-import --file asset-request.json --source image.png --url https://example.com/source.png --out asset-bundles/imported
node packages/core/src/cli.ts asset-fetch --file asset-request.json --url https://example.com/source.png --out asset-bundles/fetched
node packages/core/src/cli.ts asset-verify --root asset-bundles/hero
```

Each bundle contains:

- `request.json`
- `asset.json`
- `asset.png`

`asset-verify` checks the bundle structure and digest binding. It does not grant
approval or usage rights.

## Approval manifest

Release production now consumes `ApprovalManifest`.

The manifest records:

- `schemaVersion`
- `manifestId`
- `domainDigest`
- `contentDigest`
- `reviewedAt`
- `selectedAssets[]`

Each selected asset records:

- `assetId`
- `assetDigest`
- `basis`
- `reviewerId`
- `evidenceDigest`
- `status`

Only `status: rejected` blocks release generation. `AssetRecord` does not carry a
separate approval field.

## Section visuals

Each `ContentSection` can include:

```json
{
  "visual": {
    "kind": "marp",
    "source": "## One slide\n\nCurrent system flow",
    "caption": "Current system flow"
  }
}
```

Supported kinds are:

- Mermaid
- Excalidraw element JSON
- one Marp slide

Validation rules enforced by the core:

- Mermaid must start with a supported diagram type
- Excalidraw must be a JSON array of supported element skeletons, or an object
  with `elements`
- Marp must not include front matter or unsafe raw HTML

## Remotion rendering

When a release requests the `remotion` format, the core:

1. writes the generated Remotion project under `outputs/remotion/`
2. emits editable visual source files under `outputs/remotion/visuals/`
3. renders one settled PNG per visual under `outputs/remotion/visuals/`
4. regenerates HTML, AdaptiveDeck, PPTX, DOCX, PDF, and overview images with
   those settled PNGs embedded as diagrams

The editable source file extensions are:

- `.mmd` for Mermaid
- `.excalidraw.json` for Excalidraw
- `.marp.md` for Marp

The settled PNG uses the ordered visual stem:

```text
outputs/remotion/visuals/NN-section.png
```

## Release image outputs

`release-produce` can emit:

- HTML
- AdaptiveDeck JSON
- editable PPTX
- editable DOCX
- searchable PDF
- 1080p PNG overview
- 1080p JPEG overview
- a generated 1080p Remotion project

The diagram PNGs are shared across these formats. If you need embedded section
visuals in documents, request the `remotion` format so the still images exist.

## Speech and visual coupling

The generated Remotion project uses local Python 3.14 speech synthesis, measured
audio duration, and encoded-media QC. Narration paragraphs align directly to scenes
only when paragraph count matches scene count. Otherwise the renderer falls back to
proportional text length for scene cuts.

## Optional signed domain certificate

`domain-certify` remains the only signed primitive in the release flow:

```powershell
node packages/core/src/cli.ts domain-certify --file domain-pack.json --review review.json --approvals signatures.json --trust policy.json --out certified-domain.json
```

It creates an optional signed domain certificate. It does not authorize release
generation by itself and it does not replace `ApprovalManifest`.
