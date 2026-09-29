---
title: a2swe runbook starter asset
description: Starter runbook asset for scaffolded a2swe projects.
---

## Purpose

`runbook-starter.json` seeds a project `agent/runbook.json`. It starts with pending
gates and empty artifact lists so a project must record real evidence before it
can claim progress.

## Boundary

This asset is a projection template only. It is not:

- a credential
- an approval record
- a renderer output
- a release package
- publication authorization

## Validation

Validate a copied runbook from the repository root:

```powershell
node packages/core/src/cli.ts validate --schema Runbook --file PROJECT/agent/runbook.json
node packages/core/src/cli.ts runbook-verify --root PROJECT
```

Those commands verify structure, referenced paths, and digests. They do not grant
sharing rights or certify a finished release.
