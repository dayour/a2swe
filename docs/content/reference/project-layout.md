---
title: Project layout
description: Expected input and output layout for a core-managed a2swe project and the separate legacy template scaffold.
---

## Core-managed authoring layout

```text
project/
├── canonical/
│   └── domain-pack.json
├── content-ir.json
├── render-spec.json
├── approval-manifest.json
├── assets/
│   └── <assetId>/
│       ├── request.json
│       ├── asset.json
│       └── asset.png
├── agent/
│   ├── SWE_AGENT.md
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
├── parity-manifest.json
├── asset-inputs/
└── outputs/
    ├── site.html
    ├── deck.deck.json
    ├── slides.pptx
    ├── document.docx
    ├── document.pdf
    ├── overview.png
    ├── overview.jpg
    └── remotion/
```

## Legacy template layout

The older template scaffold still creates the familiar `script/`, `src/`, `qc/`,
and `renders/` structure for 720p projects. Keep that layout scoped to legacy
template work.
