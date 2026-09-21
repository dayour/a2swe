---
title: Documentation
---

# Documentation guide

The documentation website lives in `docs/` and deploys to `https://dayour.github.io/a2swe/` through GitHub Actions.

## Local development

```powershell
npm --prefix docs ci
npm --prefix docs run start
```

## Validation

```powershell
npm --prefix docs run typecheck
npm --prefix docs run build
```

The build treats broken links as errors. Keep links repository-relative within the documentation and use fully qualified URLs for source material outside the repository.

## Content rules

- Document behavior verified in source or production rules.
- Distinguish normative requirements from implementation notes.
- Update SDK pages when public types, scripts, options, outputs, or environment variables change.
- Update specifications when artifact or approval contracts change.
- Do not publish credentials, private source material, or unlicensed media.
- Keep examples reproducible on Windows and label platform-specific commands.

## Information architecture

Add operating procedures under `pipeline/`, implementation details under `architecture/`, callable surfaces under `sdk/` or `reference/`, and normative contracts under `specifications/`. Register new pages in `sidebars.ts`.
