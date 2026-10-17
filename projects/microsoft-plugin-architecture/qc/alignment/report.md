---
title: microsoft-plugin-architecture audience alignment
description: Semantic alignment ranking of claims, sections and video scenes for internal and external audiences.
---

Analyzed the release content on 2026-10-17 with sentence-transformers/all-MiniLM-L6-v2 at 1110a243, run locally.

* Declared distribution: none
* Derived from cited sources: external
* Evaluated as: **external**

| Audience | Ready | Readiness | Blockers | Warnings | Shareable evidence |
| --- | --- | --- | --- | --- | --- |
| Internal: account team and leadership | yes | 100% | 0 | 3 | 9 of 9 |
| External: customer and partner executives | yes | 100% | 0 | 2 | 9 of 9 |

## Sources

| Source | Host | Distribution | Basis |
| --- | --- | --- | --- |
| Build plugins for Copilot Cowork | learn.microsoft.com | public | inferred-from-host |
| MCP and API plugins for declarative agents | learn.microsoft.com | public | inferred-from-host |
| About GitHub Copilot plugins | docs.github.com | public | inferred-from-host |

## Internal: account team and leadership

### Section ranking

| Rank | Section | Score | Relevance | Best-matching priority | Grounding | Decision | Eligible claims | Leakage |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | 4. Govern a small portfolio | 0.63 | 0.40 | platform-strategy | 0.32 | 0.56 | 2 of 2 | 0 |
| 2 | 2. Reuse the core, not the wrapper | 0.61 | 0.17 | blockers | 0.64 | 0.51 | 1 of 1 | 0 |
| 3 | 3. Preserve supported paths | 0.48 | 0.20 | blockers | 0.73 | 0.21 | 2 of 2 | 0 |
| 4 | 1. Choose the host route | 0.47 | 0.20 | platform-strategy | 0.70 | 0.18 | 3 of 3 | 0 |

### Claim ranking

| Rank | Claim | Score | Relevance | Priority | Evidence support | Eligible |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | Cowork packages skills and connectors in a standard Microsoft 365 app package. | 0.56 | 0.33 | platform-strategy | 0.56 | yes |
| 2 | Three host routes use different delivery contracts: Cowork uses Microsoft 365 app packages; declarative agents use MCP or API actions; GitHu | 0.51 | 0.30 | platform-strategy | 0.47 | yes |
| 3 | Skills and MCP configuration can be reusable, while manifests, discovery, authentication and client-specific components remain host-specific | 0.46 | 0.17 | governance | 0.42 | yes |
| 4 | Microsoft 365 declarative agents support MCP and REST API plugins as in-agent actions; REST API tools are defined in the plugin manifest. | 0.45 | 0.20 | platform-strategy | 0.68 | yes |
| 5 | GitHub Agent Plugins 1.0 ports skills and MCP configuration across compatible clients; client-specific components and legacy plugins remain  | 0.44 | 0.20 | blockers | 0.51 | yes |

### Blockers

* None.

### Warnings

* reuse-boundary: low relevance to internal priorities (0.172).
* portfolio: weakly grounded sentence (0.208): "Assign one owner per capability and service."
* portfolio: weakly grounded sentence (0.422): "Publish a host compatibility matrix, version each package, and add routes only when demand justifies lifecycle cost."

## External: customer and partner executives

### Section ranking

| Rank | Section | Score | Relevance | Best-matching priority | Grounding | Decision | Eligible claims | Leakage |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | 2. Reuse the core, not the wrapper | 0.66 | 0.23 | architecture-choices | 0.64 | 0.51 | 1 of 1 | 0 |
| 2 | 4. Govern a small portfolio | 0.66 | 0.44 | capabilities | 0.32 | 0.56 | 2 of 2 | 0 |
| 3 | 3. Preserve supported paths | 0.50 | 0.22 | architecture-choices | 0.73 | 0.21 | 2 of 2 | 0 |
| 4 | 1. Choose the host route | 0.48 | 0.21 | architecture-choices | 0.70 | 0.18 | 3 of 3 | 0 |

### Claim ranking

| Rank | Claim | Score | Relevance | Priority | Evidence support | Eligible |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | Cowork packages skills and connectors in a standard Microsoft 365 app package. | 0.60 | 0.36 | architecture-choices | 0.56 | yes |
| 2 | Skills and MCP configuration can be reusable, while manifests, discovery, authentication and client-specific components remain host-specific | 0.56 | 0.27 | architecture-choices | 0.42 | yes |
| 3 | Three host routes use different delivery contracts: Cowork uses Microsoft 365 app packages; declarative agents use MCP or API actions; GitHu | 0.48 | 0.27 | architecture-choices | 0.47 | yes |
| 4 | Microsoft 365 declarative agents support MCP and REST API plugins as in-agent actions; REST API tools are defined in the plugin manifest. | 0.47 | 0.22 | architecture-choices | 0.68 | yes |
| 5 | GitHub Agent Plugins 1.0 ports skills and MCP configuration across compatible clients; client-specific components and legacy plugins remain  | 0.45 | 0.20 | architecture-choices | 0.51 | yes |

### Blockers

* None.

### Warnings

* portfolio: weakly grounded sentence (0.208): "Assign one owner per capability and service."
* portfolio: weakly grounded sentence (0.422): "Publish a host compatibility matrix, version each package, and add routes only when demand justifies lifecycle cost."

## Video scenes: what is said versus what is shown

| Scene | Visual | Similarity | Status |
| --- | --- | --- | --- |
| title | cards | 0.64 | aligned |
| three-routes | mermaid | 0.57 | aligned |
| reuse-boundary | excalidraw | 0.54 | aligned |
| supported-paths | marp | 0.45 | aligned |
| portfolio | marp | 0.63 | aligned |

Scores are cosine similarities of local sentence embeddings, scaled to 0-1 for ranking. They measure semantic closeness, not truth; the ContentIR contract still binds every claim to verbatim evidence.

