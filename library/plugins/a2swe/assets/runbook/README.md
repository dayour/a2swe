---
title: a2swe plugin runbook starter asset
description: Packaged copy of the first-party a2swe runbook starter asset.
---

## Purpose

This packaged `runbook-starter.json` seeds a project `agent/runbook.json`.

## Boundary

It is metadata only. It is not:

- a credential
- an approval record
- a renderer output
- a release package
- publication authorization

## Validation

```powershell
node packages/core/src/cli.ts validate --schema Runbook --file PROJECT/agent/runbook.json
node packages/core/src/cli.ts runbook-verify --root PROJECT
```

Those commands verify structure, referenced paths, and digests only.
