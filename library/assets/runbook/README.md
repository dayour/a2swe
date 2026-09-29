# a2swe Runbook Starter Asset

`runbook-starter.json` is the first-party seed for a scaffolded
`agent/runbook.json`. It deliberately starts with pending gates and empty
artifact lists so a project must record real evidence before resuming or
releasing.

## Current capability boundary

The starter is a machine-readable projection template only. It is not an
approval, credential, model, renderer, signed receipt, release candidate, or
proof that any output format has been produced.

When a scaffold copies this file, it must set project-specific identifiers and
timestamps, then validate the copied runbook from the repository root:

```powershell
node packages/core/src/cli.ts validate --schema Runbook --file PROJECT/agent/runbook.json
node packages/core/src/cli.ts runbook-verify --root PROJECT
```

Validation checks schema, referenced paths, and hashes. DomainReady status,
brand approval, narration approval, pilot approval, release approval, and
redistribution rights remain separate human or independent-reviewer gates.
