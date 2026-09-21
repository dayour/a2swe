---
title: Development
---

# Development guide

## Change the canonical template

Reusable runtime and pipeline improvements belong in `template/`. Preserve composition identifiers, manifest contracts, asset resolution, deterministic frame behavior, and project scaffolding unless intentionally versioning the system.

## Validate TypeScript changes

```powershell
npm --prefix template run typecheck
npm --prefix template run build
```

## Validate Python changes

```powershell
.\.venv\Scripts\python.exe template\scripts\test_pipeline.py -v
```

Run targeted project checks when changing authored configurations or scenes.

## Propagation

Representative projects may carry copied runtime files. Propagate shared fixes deliberately and avoid overwriting project-specific configuration, timing, shots, research, assets, QC, or delivery state.

## Pull request evidence

Include:

- affected contract or lifecycle stage;
- tests and commands actually run;
- before/after behavior;
- generated artifact impact;
- compatibility notes for existing projects;
- screenshots or frame evidence for visual changes;
- licensing/provenance updates for new assets.

## Scope discipline

Do not combine unrelated project content changes with reusable runtime changes. Never hide a failed gate or regenerate approved narration without documenting the resulting invalidation.
