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
├── qc/
│   ├── index.json
│   ├── audio/<profile>/       # matched WAVs, metadata and comparison.json
│   ├── native-office/        # source-bound Office renders
│   ├── video-frames/         # source-bound decoded frame previews
│   ├── production-review.json
│   └── revisions/            # local superseded candidates, not current QC
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

The default scaffold initially creates the draft domain, Runbook and QC index.
Other authoring files appear when you create them; the release tree appears
only after production. `outputs/remotion/` holds its own `src/`, `scripts/`,
`audio/`, `visuals/`, `public/`, `qc/`, and `dist/` as one generated build
workspace. Section stills live in `visuals/`, not in a top-level `stills/`
folder. The asset inventory distinguishes selected PNGs from generated
visuals and is bound by the parity manifest.

The project QC index links to release-internal reports without moving them out
of their digest-bound package. Shared model configuration and profiles belong
in `library/assets/speech/`, not in a cross-project QC folder.

Raw intake bodies and superseded candidate packages remain local under
`intake/` and `qc/revisions/`. The current-QC index explicitly excludes revision
archives; published packages contain the final outputs, concise evidence,
provenance, and current review artifacts rather than duplicate full renders or
wholesale copies of source pages.

Git preserves the exact bytes of canonical inputs, release outputs, runbooks,
and QC records. Automatic line-ending conversion would invalidate source hashes
and evidence references when checking out the same package on another platform.

## Legacy template layout

Pass `--legacy` to the template script to copy the old `script/`, `src/`,
`qc/`, and `renders/` structure for 720p projects. Do not copy it into
core-managed projects.
