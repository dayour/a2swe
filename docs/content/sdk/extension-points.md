---
title: Extension points
---

# Extension points

## Add a shot group scene

1. Choose the storyboard group `G1` through `G8`.
2. Add a deterministic React component inside that group.
3. Export a unique, timed `ShotDef`.
4. Add background or footage windows only when required.
5. Preview the isolated group composition.
6. Capture representative stills and motion checks.
7. Record implementation evidence in the companion ledger.

## Add a shared primitive

Place genuinely reusable typography, layout, drawing, or animation behavior under `src/common/` and export it through `src/common/index.ts`. Keep project-specific language and branding in configuration or the project group.

## Change the overlay system

Overlay components live under `src/overlay/`. Preserve sentence-driven timing when adding a new editorial treatment. If the component must appear above subtitles or the progress bar, document and test its layer behavior.

## Add an external asset

1. Place the asset under the project namespace in `public/assets/<slug>/`.
2. Record source URL, creator, license, access date, SHA-256 digest, and intended usage.
3. Add a timed footage specification.
4. Verify crop, safe-area behavior, and attribution.
5. Include the manifest in delivery.

## Add a narration engine

A new engine must:

- be selected explicitly or by documented local auto-detection;
- never become an undisclosed cloud fallback;
- accept only approved narration;
- produce deterministic output paths;
- expose voice/model provenance;
- generate or support sentence timing;
- fail clearly when required weights or configuration are absent;
- include pipeline tests and operating documentation.

## Forking project behavior

The existing representative projects retain a shared runtime shell. Prefer landing reusable improvements in `template/` and propagating them deliberately. A project-local fork should explain why the behavior cannot remain data-driven.
