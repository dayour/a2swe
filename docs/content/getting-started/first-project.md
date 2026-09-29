---
title: First project
description: Start a core-managed a2swe project with domain-init, release inputs, and the optional legacy template path.
---

## Core-managed project flow

Start from a domain pack, not from the legacy template scaffold.

```powershell
node packages/core/src/cli.ts domain-init `
  --id datadog-cowork-plugin `
  --name "Datadog Cowork Plugin" `
  --kind tool `
  --as-of 2026-09-29 `
  --out projects/datadog-cowork-plugin/canonical/domain-pack.json
```

Then:

1. add sources, evidence spans, supported claims, and known gaps
2. move the domain pack to `state: "ready"`
3. generate diagram asset bundles with `asset-generate` as needed
4. author `content-ir.json`, `render-spec.json`, and `approval-manifest.json`
5. run `release-produce`
6. run `release-verify`

Example production commands:

```powershell
node packages/core/src/cli.ts release-produce `
  --domain projects/datadog-cowork-plugin/canonical/domain-pack.json `
  --content projects/datadog-cowork-plugin/content-ir.json `
  --render projects/datadog-cowork-plugin/render-spec.json `
  --approval projects/datadog-cowork-plugin/approval-manifest.json `
  --assets projects/datadog-cowork-plugin/assets `
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
render settled visual PNGs for the document outputs.

## Legacy template path

The older 720p template scaffold still exists:

```powershell
node template\scripts\new_project.cjs projects\vector-databases vector-databases
```

Use that only when you explicitly need the legacy hand-built branded-video path.
