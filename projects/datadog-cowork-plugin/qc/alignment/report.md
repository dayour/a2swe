---
title: datadog-cowork-plugin audience alignment
description: Semantic alignment ranking of claims, sections and video scenes for internal and external audiences.
---

Analyzed the release content on 2026-10-17 with sentence-transformers/all-MiniLM-L6-v2 at 1110a243, run locally.

* Declared distribution: none
* Derived from cited sources: external
* Evaluated as: **external**

| Audience | Ready | Readiness | Blockers | Warnings | Shareable evidence |
| --- | --- | --- | --- | --- | --- |
| Internal: account team and leadership | yes | 100% | 0 | 4 | 15 of 15 |
| External: customer and partner executives | yes | 100% | 0 | 4 | 15 of 15 |

## Sources

| Source | Host | Distribution | Basis |
| --- | --- | --- | --- |
| Datadog Claude Code Plugin | github.com | public | inferred-from-host |
| Datadog MCP Server | docs.datadoghq.com | public | inferred-from-host |
| Set Up the Datadog MCP Server | docs.datadoghq.com | public | inferred-from-host |
| Datadog \| Claude by Anthropic | claude.com | public | inferred-from-host |

## Internal: account team and leadership

### Section ranking

| Rank | Section | Score | Relevance | Best-matching priority | Grounding | Decision | Eligible claims | Leakage |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | Control. Choose the toolsets. | 0.68 | 0.24 | governance | 0.62 | 0.54 | 1 of 1 | 0 |
| 2 | Access. Your permissions still apply. | 0.64 | 0.23 | blockers | 0.79 | 0.47 | 1 of 1 | 0 |
| 3 | Risk. Preview, compliance, site limits. | 0.60 | 0.23 | account-risk | 0.82 | 0.39 | 2 of 2 | 0 |
| 4 | A bridge. Not a dashboard. | 0.56 | 0.15 | governance | 0.84 | 0.45 | 1 of 1 | 0 |
| 5 | Set up. Pick a site, sign in. | 0.55 | 0.14 | governance | 0.64 | 0.43 | 2 of 2 | 0 |
| 6 | Where it runs. Cowork and Claude Code. | 0.41 | 0.13 | customer-signals | 0.61 | 0.17 | 2 of 2 | 0 |

### Claim ranking

| Rank | Claim | Score | Relevance | Priority | Evidence support | Eligible |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | The Datadog plugin and its marketplace listing are in Preview. | 0.56 | 0.19 | platform-strategy | 0.57 | yes |
| 2 | For Claude, including Claude Cowork, the official Datadog connector is the recommended path and includes MCP Apps for in-product visualizati | 0.56 | 0.24 | platform-strategy | 0.92 | yes |
| 3 | Claude Code installs the Datadog plugin from the official Anthropic Plugin Marketplace; the plugin bundles the MCP Server with skills and au | 0.51 | 0.19 | accountability | 0.92 | yes |
| 4 | You need Datadog permissions for the resources you query, and the plugin states that no Datadog credentials are sent to the AI model provide | 0.51 | 0.17 | blockers | 0.68 | yes |
| 5 | Remove any separately registered Datadog MCP server or custom connector first to avoid conflicts. | 0.50 | 0.14 | blockers | 0.83 | yes |
| 6 | The Datadog MCP Server bridges Datadog observability data to AI agents, so logs, metrics, traces, dashboards and monitors can be queried in  | 0.46 | 0.16 | decision | 0.73 | yes |
| 7 | The Datadog MCP Server is HIPAA-eligible, customers remain responsible for the compliance of the AI tools they connect, and the server is no | 0.45 | 0.13 | governance | 0.83 | yes |
| 8 | Setup asks you to choose a Datadog site and sign in with OAuth in the browser; API and application keys are a supported alternative. | 0.44 | 0.14 | governance | 0.66 | yes |
| 9 | Groups of MCP tools can be enabled or disabled with the toolsets command. | 0.38 | 0.14 | accountability | 0.61 | yes |

### Blockers

* None.

### Warnings

* what-it-is: low relevance to internal priorities (0.148).
* where-it-runs: low relevance to internal priorities (0.126).
* setup: weakly grounded sentence (0.357): "Keys are supported, and older manual servers or custom connectors should be removed first."
* setup: low relevance to internal priorities (0.139).

## External: customer and partner executives

### Section ranking

| Rank | Section | Score | Relevance | Best-matching priority | Grounding | Decision | Eligible claims | Leakage |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | Control. Choose the toolsets. | 0.65 | 0.20 | architecture-choices | 0.62 | 0.54 | 1 of 1 | 0 |
| 2 | Risk. Preview, compliance, site limits. | 0.64 | 0.29 | assurance | 0.82 | 0.39 | 2 of 2 | 0 |
| 3 | Access. Your permissions still apply. | 0.62 | 0.21 | assurance | 0.79 | 0.47 | 1 of 1 | 0 |
| 4 | A bridge. Not a dashboard. | 0.59 | 0.18 | architecture-choices | 0.84 | 0.45 | 1 of 1 | 0 |
| 5 | Set up. Pick a site, sign in. | 0.55 | 0.15 | assurance | 0.64 | 0.43 | 2 of 2 | 0 |
| 6 | Where it runs. Cowork and Claude Code. | 0.41 | 0.12 | architecture-choices | 0.61 | 0.17 | 2 of 2 | 0 |

### Claim ranking

| Rank | Claim | Score | Relevance | Priority | Evidence support | Eligible |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | The Datadog MCP Server is HIPAA-eligible, customers remain responsible for the compliance of the AI tools they connect, and the server is no | 0.54 | 0.22 | assurance | 0.83 | yes |
| 2 | The Datadog plugin and its marketplace listing are in Preview. | 0.51 | 0.13 | architecture-choices | 0.57 | yes |
| 3 | Setup asks you to choose a Datadog site and sign in with OAuth in the browser; API and application keys are a supported alternative. | 0.48 | 0.18 | assurance | 0.66 | yes |
| 4 | For Claude, including Claude Cowork, the official Datadog connector is the recommended path and includes MCP Apps for in-product visualizati | 0.48 | 0.17 | capabilities | 0.92 | yes |
| 5 | Remove any separately registered Datadog MCP server or custom connector first to avoid conflicts. | 0.46 | 0.09 | joint-actions | 0.83 | yes |
| 6 | Claude Code installs the Datadog plugin from the official Anthropic Plugin Marketplace; the plugin bundles the MCP Server with skills and au | 0.46 | 0.14 | architecture-choices | 0.92 | yes |
| 7 | The Datadog MCP Server bridges Datadog observability data to AI agents, so logs, metrics, traces, dashboards and monitors can be queried in  | 0.44 | 0.15 | assurance | 0.73 | yes |
| 8 | You need Datadog permissions for the resources you query, and the plugin states that no Datadog credentials are sent to the AI model provide | 0.44 | 0.10 | assurance | 0.68 | yes |
| 9 | Groups of MCP tools can be enabled or disabled with the toolsets command. | 0.34 | 0.07 | architecture-choices | 0.61 | yes |

### Blockers

* None.

### Warnings

* what-it-is: low relevance to external priorities (0.177).
* where-it-runs: low relevance to external priorities (0.124).
* setup: weakly grounded sentence (0.357): "Keys are supported, and older manual servers or custom connectors should be removed first."
* setup: low relevance to external priorities (0.148).

## Video scenes: what is said versus what is shown

| Scene | Visual | Similarity | Status |
| --- | --- | --- | --- |
| title | cards | 0.57 | aligned |
| what-it-is | mermaid | 0.72 | aligned |
| where-it-runs | cards | 0.76 | aligned |
| setup | mermaid | 0.86 | aligned |
| access | excalidraw | 0.74 | aligned |
| control | cards | 0.60 | aligned |
| risk | marp | 0.64 | aligned |

Scores are cosine similarities of local sentence embeddings, scaled to 0-1 for ranking. They measure semantic closeness, not truth; the ContentIR contract still binds every claim to verbatim evidence.

