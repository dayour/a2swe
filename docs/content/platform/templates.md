---
title: Templates
description: Reusable project, visual, workflow, and output templates in a2swe.
---

# Templates

[Open the interactive Template Library](/templates). Search all indexed skills,
agent profiles and companions, overlay layouts, storylines, graphics components,
plugin recipes, and the project scaffold. Flip a card to inspect its source and
digest, then add it to your scenario.

The scenario builder exports a JSON selection plan or coding-agent instructions.
It does **not** install plugins, execute downloaded code, edit project files, or
transfer previous approvals. Pattern illustrations are schematic previews, not
live Remotion renders.

## Example-led PPT and video plans

Choose **Slide recipes** for six complete, original composition examples with
intent/density filters and geometry previews. Add at least one recipe, then
combine it with skills, agents, graphics, and storylines. Choose PowerPoint,
video, or both; optionally supply a reference to a brand deck and sample slides.
This reference is not opened or uploaded.

Exports now use `a2swe-scenario/2` and include an unapproved `brandPlan`.
Instructions prioritize complete sample slides over layouts and Slide Master,
preserve theme roles and typed placeholders, prohibit shrink-to-fit, and require
asset provenance and real visual review. Primitive-only selections cannot
export a PPT/video authoring plan until a complete recipe is added.

See the [brand-template specification](../specifications/brand-templates.md)
for the SDK, geometry preflight, PowerPoint/Brand kit handoff, and limitations.
Recipes are not `.pptx`/`.potx` assets and are not consumed automatically by the
core output adapters.

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

The following is illustrative authoring metadata, **not** a valid core
`LibraryEntry` object. The gallery uses its own source-index format; consult the
core schema before registering a runtime entry.

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
