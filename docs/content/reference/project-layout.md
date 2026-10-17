---
title: Project layout
description: Core authoring inputs, revision folders, digest-bound release inventory, and QC evidence.
---

## Core-managed authoring layout

```text
project/
├── <projectId>.code-workspace  # VS Code workspace with pipeline tasks
├── canonical/
│   ├── domain-pack.json
│   ├── content-ir.json
│   ├── render-theme.json      # brand theme (RenderTheme) bound into render-spec.json
│   ├── render-spec.json
│   ├── approval-manifest.json
│   ├── asset-requests/<assetId>.json
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
│   ├── analysis/             # audio and video spectrograms, loudness and layer evidence per revision
│   ├── alignment/            # internal and external audience alignment report and ranking
│   ├── audio/<profile>/       # matched WAVs, metadata and comparison.json
│   ├── brand/brand-source.json # documents, color votes and fonts behind a site-derived theme
│   ├── native-office/        # source-bound Office renders
│   ├── video-frames/         # source-bound decoded frame previews
│   ├── production-review.json
│   └── revisions/<title>/    # local superseded and variant packages, not current QC
└── release/
```

## VS Code workspace

`project-init` and `account-import` write `<projectId>.code-workspace` at the
project root. `workspace-init --root PROJECT` regenerates it for an existing
project. Open the file in VS Code to work on one project with these tasks:

- **a2swe: brand-theme from site** prompts for an official brand URL.
- **a2swe: align for audience** offers a choice of internal or external.
- **a2swe: canonical-bind**
- **a2swe: revision-produce** offers a choice of voice variants.
- **a2swe: revisions-analyze**
- **a2swe: office-render**
- **a2swe: alignment-rank**
- **a2swe: runbook-project**
- **a2swe: release-verify**
- **a2swe: runbook-verify**
- **a2swe: produce, review and verify** is the default build task and runs the stages in order.

Each task runs the core CLI through `packages/core/bin/a2swe.mjs`, from the
repository root resolved relative to the project. The workspace therefore works
wherever the repository is checked out. When the default `node` is outside the
repository's `engines` range, the launcher runs with `A2SWE_NODE` instead or
reports the mismatch. The workspace keeps renders, revision archives and
analysis evidence out of search and file watching. It recommends the Mermaid,
Marp, Excalidraw and Live Preview extensions for editing section visuals and
previewing HTML output.

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
`qc/analysis/report.md`, `comparison.json`, stacked audio spectrogram, video
spectrogram, spatial spectrogram, frame and layer images, and per-video evidence
under `qc/analysis/<title>/<video>/`. `alignment-rank` writes the audience
alignment ranking to `qc/alignment/`.

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

The default scaffold creates the draft domain, Runbook, QC index, neutral
default brand theme and workspace file.
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
