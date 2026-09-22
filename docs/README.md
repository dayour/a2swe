# a2swe documentation site

This directory contains the Docusaurus source for the a2swe architecture, SDK, workflow, reference, and specification website.

```powershell
npm ci
npm run start
npm run typecheck
npm run build
```

GitHub Pages deployment is defined in `../.github/workflows/docs-pages.yml`.

## Interactive libraries

- `/video-library`: repository movie revisions, playback, comparison, downloads,
  QC links, and explicit unfinished-project status.
- `/templates`: searchable source-backed cards and a scenario-plan/instruction
  exporter. The front/back interaction is inspired by FlipDeck.
- `/tagging`: browser-local digest-bound feedback and pairwise preference capture;
  JSON/JSONL export, not a backend or training service.

`npm run library:build` indexes source material and copies recorded movies into
`static/library/videos/` (ignored generated output). It runs before development,
typechecking, tests, and production builds. All indexed source MP4 files,
including the 2026 projects, must be included in version control for Pages to
serve them. A clean checkout missing an indexed movie fails explicitly.

When adding or replacing movies, run `npm run library:refresh`. This requires
FFmpeg/ffprobe via `FFMPEG` and `FFPROBE`, or the installed Windows Remotion
binaries. It records media metadata and SHA-256 in `catalog/media.json` and
extracts per-revision posters. Commit the source movies, metadata, posters,
captions, and generated `src/data/library.json` together. Ordinary CI builds do
not need the media toolchain; changed or missing media fail closed.

Project completion notes and evidence are maintained in `catalog/projects.json`.
Update blockers as production advances; an input-readiness report is not proof
of a rendered or approved video. Reusable catalog entries are discovered from
repository files rather than a separate manually maintained list.

Run `npm test` for catalog coverage, media integrity, and feedback validation.
It also exercises complete brand recipes, negative-space geometry, and the
scaffolded brand-plan CLI. Template scenario exports use `a2swe-scenario/2` with
an unapproved `a2swe-brand-plan/1` sidecar; select at least one complete slide
recipe before exporting. Recipes live in `template/brand-recipes.json` and are
schematic authoring examples, not rendered or brand-approved PowerPoint files.
The catalog and gallery formats are documentation UI contracts, not replacements
for the core runtime's `LibraryEntry` or signed approval contracts.
Product-documentation validation is defined in
`../.github/workflows/product-docs-validate.yml` and checks the agent-first core,
evaluation-only asset proof, active 720p Remotion/Python video adapter, and
`.a2swe` state anchors.
