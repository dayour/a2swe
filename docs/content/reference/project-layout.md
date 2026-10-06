---
title: Project layout
description: Core authoring inputs, revision folders, digest-bound release inventory, and QC evidence.
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
│   ├── runbook.json
│   └── SWE_AGENT.md          # project agent instructions
├── renders/
│   └── <project>-<year>-<NN>/ # one folder per revision
│       ├── revision.json      # RenderRevision manifest
│       ├── <title>-<voice>-<engine>.mp4
│       └── <title>-<voice>-<engine>.vtt
├── qc/
│   ├── index.json
│   ├── analysis/             # spectrogram, loudness and video-layer evidence per revision
│   ├── audio/<profile>/       # matched WAVs, metadata and comparison.json
│   ├── native-office/        # source-bound Office renders
│   ├── video-frames/         # source-bound decoded frame previews
│   ├── production-review.json
│   └── revisions/<title>/    # local superseded and variant packages, not current QC
└── release/
```

## Revisions

A revision is one render round. `revision-produce` renders a full release for
each voice and engine variant, writes the videos and captions to
`renders/<project>-<year>-<NN>/`, and records digests, durations, voices and
release digests in `revision.json`. The base name drops a trailing year from
the project ID, so `copilot-studio-2026` produces `copilot-studio-2026-01`.

The first variant is promoted to `release/`. The previous release moves to
`qc/revisions/<its revision title>/`. A file held open by a viewer or Office app
stops the promotion before anything moves; close it and run `revision-promote`.
`revision-promote` also switches the release to another variant of the same
revision.

`revisions-analyze` measures every revision video and writes
`qc/analysis/report.md`, `comparison.json`, stacked spectrogram, frame and layer
images, and per-video evidence under `qc/analysis/<title>/<video>/`.

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
