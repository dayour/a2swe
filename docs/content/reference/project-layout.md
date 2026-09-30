---
title: Project layout
description: Minimal core authoring inputs, digest-bound release inventory, and legacy compatibility layout.
---

## Core-managed authoring layout

```text
project/
├── canonical/
│   ├── domain-pack.json
│   ├── content-ir.json
│   ├── render-spec.json
│   ├── approval-manifest.json
│   └── assets/
│       └── <assetId>/
│           ├── request.json
│           ├── asset.json
│           └── asset.png
├── agent/
│   └── runbook.json
└── release/
```

## Managed release output layout

```text
release/
├── content-ir.json
├── domain-pack.json
├── render-spec.json
├── approval-manifest.json
├── release-plan.json
├── asset-inventory.json
├── parity-manifest.json
├── asset-inputs/              # selected raster bundles only
└── outputs/
    ├── index.html
    ├── deck.deck.json
    ├── deck.pptx
    ├── document.docx
    ├── document.pdf
    ├── raster.png
    ├── raster.jpg
    └── remotion/               # one generated build workspace
```

The default scaffold initially creates only the draft domain and Runbook.
Other authoring files appear when you create them; the release tree appears
only after production. `outputs/remotion/` holds its own `src/`, `scripts/`,
`audio/`, `visuals/`, `public/`, `qc/`, and `dist/` as one generated build
workspace. Section stills live in `visuals/`, not in a top-level `stills/`
folder. The asset inventory distinguishes selected PNGs from generated
visuals and is bound by the parity manifest.

## Legacy template layout

Pass `--legacy` to the template script to copy the old `script/`, `src/`,
`qc/`, and `renders/` structure for 720p projects. Do not copy it into
core-managed projects.
