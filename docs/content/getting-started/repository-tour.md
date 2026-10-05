---
title: Repository tour
description: Core, reusable library material and project-local evidence locations.
---

| Path | Purpose |
| --- | --- |
| `README.md` | Installation, production overview, verified pilots, limits |
| `SKILL.md` | Agent-facing operating contract and mandatory gates |
| `BRAND_CONTENT_SPEC.md` | Identity, language, media, and acceptance requirements |
| `reference/production-rules.md` | Detailed production and quality rules |
| `packages/core/` | Canonical contracts, CLI, project scaffold and managed release pipeline |
| `template/` | Retained 720p compatibility runtime and shared speech dependency lock |
| `template/src/` | Remotion composition runtime and visual SDK |
| `template/scripts/` | Scaffolding, narration, timing, model, and QC utilities |
| `template/agent/SWE_AGENT.md` | Portable companion-ledger starter |
| `projects/` | Completed or in-progress project instances |
| `projects/*/qc/` | Project evidence, matched audio and hash inventory |
| `library/assets/speech/` | Shared model registry, export receipt and voice profiles |
| `library/integrations/` | Copilot SDK and CLI integration |
| `library/skills/` | Reusable skill and workflow reference library |
| `docs/` | Docusaurus engineering documentation website |
| `.github/workflows/docs-pages.yml` | GitHub Pages build and deployment |

## Canonical source and examples

Use `packages/core/` for new project and release workflows. The project directories demonstrate authored configurations and production evidence, but may contain local work in progress. Project code should not silently redefine the global production contract.

## Generated outputs

The repository ignores common generated artifacts, including Node modules, virtual environments, template bundles, renders, stills, audio, resolved timeline outputs, and documentation build products. Project delivery artifacts can still be intentionally tracked when they are part of a verified release.

## Representative projects

- `projects/copilot/`
- `projects/microsoft/`

These projects preserve the same composition shell as the template and specialize content, timing, configuration, assets, and shot implementations.
