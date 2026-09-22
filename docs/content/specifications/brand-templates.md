---
title: Example-led brand templates
description: Shared authoring contract for PowerPoint templates and video compositions.
---

# Example-led brand templates

a2swe applies Microsoft's **July 2026** guidance by treating complete sample
slides as the primary design evidence, layouts as secondary evidence, and the
Slide Master as fallback. A color palette alone is not a brand template.
Verified subject identity outranks the website's ClippyFlow styling.

## Implemented boundary

The [Template Library](/templates) includes six original, complete **composition
recipes**: opening question, agenda, text with image, process, illustrative
dashboard, and next steps. Their previews are schematic, not rendered PPT files.
They demonstrate light, medium, and heavy density and can be exported with
source SHA-256, explicit intent, typed content regions, theme bindings, and
negative-space geometry in an `a2swe-scenario/2` authoring plan.

`template/scripts/brand-plan.ts` supplies the shared types, plan construction,
geometry validation, warnings, and coding-agent instructions.
`template/scripts/check_brand_plan.ts` is copied into newly scaffolded projects
and checks an exported plan without dependencies, using Node 24.

**This is an authoring/preflight contract, not a new core release contract.**
`RenderSpec` and signed approval semantics are unchanged. The current core PPTX
adapter is a basic text-layout exporter; it does not import these recipes or a
`.potx`, reproduce sample-slide geometry, or upload to Brand kits. Remotion scenes
must also be authored from the plan. Neither a schema check nor a gallery
selection establishes brand fidelity, rights, or release approval.

## Source-of-truth order

1. Inspect realistic, complete sample slides from the approved brand template.
   Record the file's SHA-256, slide numbers, source owner, usage rights, and
   visual-review evidence. Include sample outputs, not only empty layouts.
2. Map each scenario beat to a clear intent and a matching example. Preserve
   relationships between text, images, diagrams, and whitespace.
3. Read layout and Slide Master structure to resolve inheritance and gaps.
   Record fallback use rather than presenting it as example-derived design.
4. Resolve colors, major/minor fonts, typography hierarchy, icon/shape styles,
   data styles, imagery, voice, and tone from the verified brand evidence.
   Reapprove affected output if those inputs change.

The UI's optional exemplar field is **only an unverified reference string**. It
does not read, hash, upload, or inspect a presentation. The producer must perform
that work before claiming the reference is an approved design source.

## Representative coverage

| Intent family | What a realistic example should teach |
| --- | --- |
| Title, section divider | Hierarchy, whitespace, background/image treatment |
| Agenda, summary, conclusion, next steps | Grouping, emphasis, decision/action |
| Content | Text, bullets, icons, inset and full-bleed imagery |
| Data visualization | Statistics, tables, charts, dashboards, captions |
| Timeline, process | Sequence, ownership, arrows, connections, staged reveal |
| Quote, questions | Attribution, emphasis, breathing room |
| Scenario-specific | Biography, team, contacts, map, calendar, case study |

These are **coverage recommendations**, not a requirement to include every type
in every deck. Six recipe intents are shipped; the intent filter also exposes
the remaining supported authoring intents. An empty filter is not evidence of a
missing PowerPoint feature. A new recipe must define a complete composition and
realistic sample content in `template/brand-recipes.json`.

Show light, medium, and heavy density where relevant. Heavy means intentional,
readable grouping, not smaller text. Show brand-appropriate image crops,
full-bleed and inset treatments, chart series colors, table hierarchies, and
alternate section colors in real reference slides. Keep teaching instructions
in this specification or a sidecar, not mixed with reusable sample content.

## Sidecar contract and SDK

The exported scenario contains `brandPlan` plus the selected repository sources
and their SHA-256 values. The sidecar is deliberately distinct from `ContentIR`,
`RenderSpec`, and `LibraryEntry`.

| Field | Contract |
| --- | --- |
| `schemaVersion` | `a2swe-brand-plan/1` |
| `approvalState` | Always `unapproved`; never a signed release assertion |
| `formats` | Distinct `pptx`, `video`, or both |
| `exemplarReference` / `exemplarStatus` | Reference string; always `not-inspected` |
| `selectionOrder` | Sample slides, layouts, Slide Master |
| `canvas` | Shared authoring coordinates: 1280 x 720 |
| `safeArea` | x48, y40, width1184, height570 |
| `themeBindings` | Major/minor font, foreground/background/accent, image/data style roles |
| `overflow` | `split-or-recompose-never-shrink` |
| `placeholderTextIsInstruction` | Always `false` |
| `layouts` | 1-100 complete recipes, each with unique ID, intent, density, and objects |

Objects declare a unique `id`, a `type`, realistic `sample` content, a bounding
`box`, nonnegative `clearance`, and a corresponding `themeRole`. Types are
`title`, `body`, `picture`, `chart`, `table`, `diagram`, and `decoration`. Each
recipe has exactly one title. Picture content is an example description, **not
a bundled photo**. Chart/table figures are explicitly illustrative.

In a scaffolded project, place the scenario download beside `package.json`:

```powershell
node scripts\check_brand_plan.ts a2swe-scenario.json
```

From the repository root:

```powershell
node template\scripts\check_brand_plan.ts path\to\a2swe-scenario.json
```

The command accepts a standalone brand plan or a scenario containing `brandPlan`.
Malformed or unsafe plans exit nonzero with a concrete error. Successful output
states that approval remains unapproved and reports outstanding human review.
The pure functions `createBrandPlan`, `validateSlideRecipe`, `validateBrandPlan`,
`brandPlanWarnings`, and `brandInstructions` are available from the shared module.
No install, network transfer, media execution, or project mutation occurs.

## Geometry, placeholders, and overflow

The preflight rejects non-finite coordinates, zero/negative dimensions, duplicate
IDs, incorrect theme roles, overlapping expanded bounds, and content outside the
safe area. It checks **negative space as well as visible rectangles**:
`[x - clearance, y - clearance, width + 2 * clearance, height + 2 * clearance]`.
Decorative objects receive the same checks; they cannot sit over text or images.

The shared safe area leaves room for the active 720p subtitle/progress bands.
For 1920 x 1080, scale all positions and clearances uniformly by 1.5. A different
aspect ratio needs a new, reviewed layout rather than stretching the recipe.
The conservative shared inset is an a2swe authoring choice, not a Microsoft
PowerPoint requirement. Full-bleed background imagery is a renderer layer outside
these foreground object recipes and needs separate crop/contrast review.

In PowerPoint, implement title/body/image/chart/table regions as correctly typed
**layout placeholders**, not ordinary text boxes masquerading as placeholders.
Use real theme color and font references. For diagrams, use editable shapes or
a suitable content placeholder with separate intent metadata. Do not infer
semantic instructions from placeholder wording.

When content exceeds the demonstrated capacity, split a slide/scene, revise the
copy with approval, or choose a more appropriate complete layout. Do not silently
truncate, shrink fonts, squeeze text, or enlarge placeholders to force a fit.
Microsoft notes that Copilot may add design elements instead of resizing text
or placeholders; any such additions still require collision and reading-order
review.

These checks describe planned rectangles, not actual glyph bounds or motion.
Inspect rendered typography, chart labels, crops, and contrast; inspect
entrances, exits, transitions, camera-scale extrema, captions, and HUD clearance
in video. Retain at least two representative slides, three frames, and the
moving pilot as review evidence. Machine checks cannot replace human approval.

## Asset and voice handoff

For each selected asset retain its source and digest, permission/license,
attribution, alt text, intended placeholder, crop/focal point, and generation
provenance. Preserve original source metadata and C2PA where present; never
fabricate it. Generated artwork is not an official logo. Rights to a deck do
not automatically grant rights to its fonts, photos, or logos.

Use the approved brand voice and tone in narration and written copy. Reapprove
edited narration and regenerate dependent timing. Brand kit or connector
selection does not waive a2swe's consent, domain, rights, pilot, or release gates.

## PowerPoint and Brand kit handoff

Author template structure in **desktop PowerPoint for Windows or Mac**, using
View > Slide Master. Define theme colors/fonts and insert typed placeholders in
the appropriate layouts. Add realistic sample slides and keep separate guidance
outside the reusable deck.

Microsoft documents `.pptx` and `.potx` support: in the Microsoft Copilot app,
open Create > More > Brand kits, open the kit, then Templates > Upload Template
(or select from the Organization Asset Library). Add optional metatags and add
the template to the kit.

In PowerPoint's Copilot pane, use **+ > Select brand**, select the kit, then
prompt for the presentation. Copilot and Brand kit usage are documented for
Windows, Mac, and web, subject to subscription, rollout, and organization
settings. The website does not perform this upload or selection.

Copilot skills and connectors are separate integration surfaces. A repository
`SKILL.md` does not become an installed PowerPoint skill by appearing in this
gallery. Connector use may require admin enablement, source permissions, and
explicit external-transfer consent.

## Authoritative references

- [Keep your presentation on brand with Copilot](https://support.microsoft.com/en-us/powerpoint/copilot/keep-your-presentation-on-brand-with-copilot) — July 2026 guidance.
- [Create a presentation with Copilot](https://support.microsoft.com/en-us/powerpoint/copilot/create-a-new-presentation-with-copilot-in-powerpoint).
- [Copilot in PowerPoint skills](https://support.microsoft.com/en-us/powerpoint/copilot/copilot-in-powerpoint-skills).
- [Connectors with Copilot in PowerPoint](https://support.microsoft.com/en-us/powerpoint/copilot/connectors-with-copilot-in-powerpoint).
