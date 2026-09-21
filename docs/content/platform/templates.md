---
title: Templates
description: Reusable project, visual, workflow, and output templates in a2swe.
---

# Templates

Templates are reusable, versioned starting points for explainer production. They reduce repeated setup without transferring facts, rights, or human approvals from one video to another.

## Canonical project template

`template/` is the production scaffold for a new video. It includes:

- the Remotion composition shell;
- shared visual and overlay primitives;
- `G1` through `G8` scene-group extension points;
- narration, timing, storyboard, motion, frame, and media scripts;
- the SWE companion ledger;
- production rules and dependency locks;
- fonts and project asset namespaces.

Create a project on Windows with:

```powershell
node template\scripts\new_project.cjs projects\my-explainer my-explainer
```

The scaffold refuses to overwrite an existing destination.

## Template categories

| Category | Examples | Reuse boundary |
| --- | --- | --- |
| Project | `template/` | Runtime shell, scripts, layout, and artifact structure |
| Visual | Shared components in `template/src/common/` | Drawing, typography, animation, backgrounds |
| Editorial | Overlay, chapter, HUD, rail, and ending patterns | Presentation behavior, not project claims |
| Workflow | Companion ledger and production rules | Stage definitions, gates, and evidence fields |
| Skill | `library/skills/*` | Domain-specific operating instructions and assets |
| Output | Core adapters | HTML, Markdown, Adaptive Card, slides, and Remotion plans |

## Registry contract

The core `LibraryEntry` contract supports entries with `kind: "template"`. Registry discovery in `packages/core/src/registry.ts` inventories source roots, validates safe paths, resolves requested capabilities, and rejects malformed or conflicting entries.

A template entry should declare:

```yaml
id: explainer-dark-line-art
kind: template
name: Dark line-art explainer
version: 1.0.0
capabilities:
  - video.remotion
  - storyboard.sentence-timed
  - subtitles.english
path: template
```

## Template invariants

- Templates must be deterministic and source-controlled.
- Generated outputs must not be mistaken for authored template inputs.
- Project slugs must create isolated asset namespaces.
- New templates must preserve required approval and evidence gates.
- External assets and model weights must not be silently bundled.
- Template upgrades must not overwrite project-specific research, timing, scenes, or approvals.

## Versioning

Template changes should record compatibility with existing projects. Breaking changes include composition identifier changes, manifest-shape changes, artifact-path changes, frame-rate changes, and altered approval requirements.

## Choosing a template

Select a template based on target medium, duration, visual grammar, evidence requirements, and renderer capability. Do not select based only on appearance: the template must support the production and governance contract required by the release.
