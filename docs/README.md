---
title: a2swe documentation site
description: Docusaurus site for the a2swe core, release flow, and legacy template notes.
---

## Purpose

This directory contains the Docusaurus source for the a2swe architecture,
workflow, reference, and specification site.

```powershell
npm ci
npm run start
npm run typecheck
npm run build
```

GitHub Pages deployment is defined in `../.github/workflows/docs-pages.yml`.

## What the site documents

- the local core under `packages/core/src`
- the digest-bound release workflow
- the repository `.venv` Python 3.14 speech stack
- section visuals rendered through Remotion
- the older 720p template path as a retained legacy workflow

The site must not describe a2swe as a publication service, rights checker, or
distribution authorization layer.

## Interactive libraries

- `/video-library` catalogs retained repository movies, revisions, and evidence
- `/templates` indexes template recipes and exports authoring aids
- `/tagging` stores browser-local feedback and JSON or JSONL exports

`npm run library:build` indexes source material and copies retained movies into
`static/library/videos/`. A catalog entry is discovery metadata only. It is not
proof that a project is complete, approved, publishable, or cleared for reuse.

When adding or replacing movies, run `npm run library:refresh`. This requires
FFmpeg and ffprobe or the installed Windows Remotion binaries. It records media
metadata and SHA-256 in `catalog/media.json` and extracts posters.

## First-party library entries

The site also documents these local discovery surfaces:

- `../library/agents/a2swe-conductor.agent.md`
- `../library/skills/a2swe/`
- `../library/plugins/a2swe/`
- `../library/assets/runbook/`

They are local metadata and scaffold assets only. Their presence does not install
models, validate a runbook, produce output, or grant sharing rights.
