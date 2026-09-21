---
title: Repository tour
---

# Repository tour

| Path | Purpose |
| --- | --- |
| `README.md` | Installation, production overview, verified pilots, limits |
| `SKILL.md` | Agent-facing operating contract and mandatory gates |
| `BRAND_CONTENT_SPEC.md` | Identity, language, media, and acceptance requirements |
| `reference/production-rules.md` | Detailed production and quality rules |
| `template/` | Canonical scaffold for a new explainer project |
| `template/src/` | Remotion composition runtime and visual SDK |
| `template/scripts/` | Scaffolding, narration, timing, model, and QC utilities |
| `template/agent/SWE_AGENT.md` | Portable companion-ledger starter |
| `projects/` | Completed or in-progress project instances |
| `qc/` | Cross-project model and quality evidence |
| `library/skills/` | Reusable skill and workflow reference library |
| `docs/` | Docusaurus engineering documentation website |
| `.github/workflows/docs-pages.yml` | GitHub Pages build and deployment |

## Canonical source and examples

Treat `template/` as the reusable implementation baseline. The project directories demonstrate authored configurations and production evidence, but may contain local work in progress. Project code should not silently redefine the global production contract.

## Generated outputs

The repository ignores common generated artifacts, including Node modules, virtual environments, template bundles, renders, stills, audio, resolved timeline outputs, and documentation build products. Project delivery artifacts can still be intentionally tracked when they are part of a verified release.

## Representative projects

- `projects/copilot/`
- `projects/john-deere/`
- `projects/microsoft/`

These projects preserve the same composition shell as the template and specialize content, timing, configuration, assets, and shot implementations.
