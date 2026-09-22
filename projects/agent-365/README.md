# Agent 365: control with context

An original, public-evidence-led explainer and engineering specialist for
Microsoft Agent 365. This project uses a restrained white/ink/blue editorial
design, **not an official Microsoft template**.

## Current deliverables

| Surface | State |
| --- | --- |
| [Agent 365 SWE](agent/README.md) | Native Copilot profile and local runner; evaluation candidate |
| [Evidence pack](research/sources.json) | Ten dated Microsoft sources, nineteen scoped claims |
| [Video narration](script/narration-review.txt) | Draft; synthesis awaits user approval |
| Eight-slide editable presentation | In preparation |
| Approximately 60-second 1080p video | In preparation |

See [the accepted brief](brief.md) and [review gates](REVIEW.md). Local agent
execution does not mean that Microsoft Agent 365 is connected to a tenant or that
formal a2swe DomainReady/release approval has been granted.

## Engineering use

From the repository root:

```powershell
node projects\agent-365\agent\run.mjs --prompt "Why can HTTP 200 coincide with absent Agent 365 activity? Cite the evidence and propose checks."
node --test projects\agent-365\agent\preflight.test.mjs
```

From this project:

```powershell
npm ci
npm run evaluate:agent
node scripts\verify_sources.mjs
```

The native runner reuses the existing Copilot installation and account. It does
not install a runtime, choose a model, authorize private connectors, or register
an Agent 365 service. Evaluation uses the configured Copilot backend; evidence and
the engineering questions are sent to that host, not to a local language model.
Speech is a separate local-only pipeline.

The presentation authoring workflow uses HTML-to-PPTX with the locally installed
skill converter (`A2SWE_HTML2PPTX` can identify its path). The converter's configurable
Chromium-compatible backend is pinned Playwright because the published
CopilotBrowser package has an unresolved `@copilotbrowser/test` dependency in the
configured feed. This is not reported as CopilotBrowser execution. Generated
slides must also be inspected using the actual PowerPoint renderer.
