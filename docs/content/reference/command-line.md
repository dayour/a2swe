---
title: Command-line reference
description: Current a2swe core commands and the separate retained legacy template commands.
---

## Core commands

Run these from the repository root.

| Command | Behavior |
| --- | --- |
| `npm ci --ignore-scripts` | Install the root workspace |
| `npm run build` | Typecheck the root core project |
| `npm run contracts:check` | Verify generated contract files |
| `npm test` | Run root tests |
| `node packages/core/src/cli.ts capabilities` | Print current core capability summary |
| `node packages/core/src/cli.ts validate --schema ... --file ...` | Validate a contract file |
| `node packages/core/src/cli.ts runbook-verify --root PROJECT` | Verify runbook paths and digests |
| `node packages/core/src/cli.ts domain-init --id SLUG --name NAME --kind ... --as-of DATE --out FILE` | Create a draft domain pack |
| `node packages/core/src/cli.ts domain-certify --file DOMAIN --review REPORT --approvals SIGNATURES --trust POLICY --out FILE` | Create an optional signed domain certificate |
| `node packages/core/src/cli.ts asset-generate --file REQUEST --out DIR` | Generate a diagram asset bundle |
| `node packages/core/src/cli.ts asset-import --file REQUEST --source FILE --url HTTPS_URL --out DIR` | Import a local raster bundle |
| `node packages/core/src/cli.ts asset-fetch --file REQUEST --url HTTPS_URL --out DIR` | Fetch and normalize a public raster bundle |
| `node packages/core/src/cli.ts asset-verify --root DIR` | Verify an asset bundle |
| `node packages/core/src/cli.ts release-plan --content CONTENT --render RENDER --approval APPROVAL --out FILE` | Create a release plan |
| `node packages/core/src/cli.ts release-produce --domain DOMAIN --content CONTENT --render RENDER --approval APPROVAL [--assets DIR] --out DIR` | Produce a release package |
| `node packages/core/src/cli.ts release-verify --root DIR` | Verify a release package |

## Release behavior

`release-produce` requires:

- a ready `DomainPack`
- a matching `ContentIR`
- a matching `RenderSpec`
- a matching `ApprovalManifest`

It writes release records plus the requested outputs. `release-verify` checks the
entire output set and reruns MP4 QC when the package includes the Remotion output.

## Legacy template commands

Use these only for the retained 720p template workflow:

```powershell
npm --prefix template ci
npm --prefix template run build
npm --prefix template run studio
node template\scripts\new_project.cjs <destination> <slug>
python template\scripts\test_pipeline.py -v
```

That path is separate from the managed core release workflow.
