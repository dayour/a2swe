# a2swe Runbook Starter Asset

`runbook-starter.json` is a pending scaffold seed for a project
`agent/runbook.json`. A scaffold step must replace the starter IDs and timestamp
with project-specific values before validation.

This asset is not a credential, approval record, renderer output, or release
candidate. All gates intentionally start as pending. Validate a copied project
runbook with:

```powershell
node packages/core/src/cli.ts validate --schema Runbook --file PROJECT/agent/runbook.json
node packages/core/src/cli.ts runbook-verify --root PROJECT
```

Those commands verify structure, paths, and hashes. They do not approve the
domain agent, narration, brand, pilot, release, or redistribution rights.
