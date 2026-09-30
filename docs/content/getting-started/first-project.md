---
title: First project
description: Create a minimal core-managed project and produce a verified release.
---

## Core-managed project flow

Create a draft domain pack and evidence-tracked Runbook in a new directory:

```powershell
node packages/core/src/cli.ts project-init `
  --id datadog-cowork-plugin `
  --name "Datadog Cowork Plugin" `
  --kind tool `
  --as-of 2026-09-29 `
  --out projects/datadog-cowork-plugin
```

The default `node template\scripts\new_project.cjs <new-directory> <slug>`
delegates to the same core command. Both refuse to overwrite a destination.
Then:

1. add sources, evidence spans, supported claims, and known gaps
2. move the domain pack to `state: "ready"`
3. generate diagram asset bundles with `asset-generate` as needed
4. author `content-ir.json`, `render-spec.json`, and `approval-manifest.json`
5. run `release-produce`
6. run `release-verify`
7. record completed stages and file-digest evidence in `agent/runbook.json`

Example production commands:

```powershell
node packages/core/src/cli.ts release-produce `
  --domain projects/datadog-cowork-plugin/canonical/domain-pack.json `
  --content projects/datadog-cowork-plugin/canonical/content-ir.json `
  --render projects/datadog-cowork-plugin/canonical/render-spec.json `
  --approval projects/datadog-cowork-plugin/canonical/approval-manifest.json `
  --assets projects/datadog-cowork-plugin/canonical/assets `
  --out projects/datadog-cowork-plugin/release

node packages/core/src/cli.ts release-verify `
  --root projects/datadog-cowork-plugin/release
```

## Required authoring inputs

The managed path expects:

- a ready `DomainPack`
- a `ContentIR` whose claims and citations match the domain pack
- a `RenderSpec`
- an `ApprovalManifest`

If sections use diagrams, include `remotion` in the format list so the release can
render settled visual PNGs for the document outputs. `asset-inventory.json`
records selected raster bundles under `asset-inputs/` separately from generated
visual stills under `outputs/remotion/visuals/`. One selected PNG can accompany
several generated Mermaid, Excalidraw, and Marp visuals. The parity manifest
binds this inventory, and release verification rehashes every referenced file.

## Legacy template path

The older copied 720p template scaffold remains an explicit compatibility path:

```powershell
node template\scripts\new_project.cjs projects\vector-databases vector-databases --legacy
```

Use that only when you explicitly need the legacy hand-built branded-video path.
