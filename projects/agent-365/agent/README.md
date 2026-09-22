# Agent 365 SWE

This specialist uses the **existing GitHub Copilot CLI or VS Code Copilot host**.
It is not just a production companion: it answers cited engineering questions,
reviews integration code, proposes acceptance tests, and can make requested local
edits under the host's interactive permissions. It is not an autonomous service,
an Agent 365 registration, or a tenant-connected agent.

The native profile is `.github/agents/agent-365-swe.agent.md` at the repository
root. Select **Agent 365 SWE** in VS Code, or run from the repository root:

```powershell
node projects\agent-365\agent\run.mjs
```

For a bounded read-only question:

```powershell
node projects\agent-365\agent\run.mjs --prompt "Does Agent 365 replace the Microsoft 365 Agents SDK? Cite the evidence."
```

The wrapper uses the repository's existing CLI resolver. It does not install
another runtime, change accounts, or select a model. Prompt mode exposes only
the local file viewer and denies writes, shell commands, and URL tools. Interactive
mode uses the profile's read/search/edit tools with the host's normal permissions.
Private M365 tools are not part of the profile.

## Useful tasks

- Choose built-in integration, registry sync, or SDK based on actual capabilities.
- Compare S2S, OBO, and Agentic-User for an operation; separate permission from consent.
- Diagnose accepted HTTP responses with missing observability data.
- Review a proposed registration/instrumentation design for preview and license assumptions.
- Plan a migration from earlier observability packages to Microsoft OpenTelemetry Distro.
- Propose scoped code changes and tests from the user's actual repository and versions.

Example: "Our background service gets HTTP 200 when exporting traces, but no agent
activity appears. Explain a diagnostic sequence and distinguish license assignment,
root-span visibility, appId binding, and authentication mode. Do not request tokens."

## Evidence and limitations

`research/sources.json` holds source URLs, dated revisions, scoped claims, headings,
and qualifications. `agent/evaluations.json` defines the engineering acceptance
rubric. `qc/agent-evaluation.json` records actual native-host results when available.
Missing evidence is reported rather than inferred.

The offline trace preflight is a small engineering helper, not the reasoning
agent and not a live ingestion verifier:

```powershell
node projects\agent-365\agent\preflight.mjs projects\agent-365\agent\fixtures\telemetry-ready.json
```

It checks a **redacted** input with no secrets, performs no network requests, and
does not read environment credentials. A pass means this limited fixture is
internally consistent, not that a tenant is licensed, configured, or approved.
