---
title: Command-line reference
description: Current a2swe core commands and template workspace maintenance commands.
---

## Core commands

Run these from the repository root. `npm run a2swe -- <command>` and
`node packages/core/bin/a2swe.mjs <command>` run the core CLI on a supported
Node: the current runtime when it satisfies `engines`, otherwise `A2SWE_NODE`.

| Command | Behavior |
| --- | --- |
| `npm ci --ignore-scripts` | Install the root workspace |
| `npm run build` | Typecheck the root core project |
| `npm run contracts:check` | Verify generated contract files |
| `npm test` | Run root tests |
| `npm run desktop` | Start the native workspace and floating agent widget |
| `npm run desktop:build` | Build the native desktop application and installer |
| `npm run desktop:check` | Compile the desktop UI and Rust host |
| `npm run mcp` | Run the a2swe stdio MCP server for an MCP client |
| `npm run copilot:desktop` | Run the JSON-lines Copilot desktop bridge |
| `node packages/core/src/cli.ts capabilities` | Print current core capability summary |
| `node packages/core/src/cli.ts voice-profiles` | List shared local speech profiles |
| `node packages/core/src/cli.ts audio-render --root PROJECT --engine both --voice am_michael` | Produce matched Kokoro and ONNX narration through the managed speech producer |
| `node packages/core/src/cli.ts qc-index --root PROJECT` | Refresh project evidence paths and hashes |
| `node packages/core/src/cli.ts project-init --id SLUG --name NAME --kind topic --as-of DATE --out DIR` | Create canonical draft-domain, runbook and QC records, the neutral default brand theme and the project VS Code workspace |
| `node packages/core/src/cli.ts validate --schema ... --file ...` | Validate a contract file |
| `node packages/core/src/cli.ts runbook-verify --root PROJECT` | Verify runbook paths and digests |
| `node packages/core/src/cli.ts domain-init --id SLUG --name NAME --kind ... --as-of DATE --out FILE` | Create a draft domain pack |
| `node packages/core/src/cli.ts domain-certify --file DOMAIN --review REPORT --approvals SIGNATURES --trust POLICY --out FILE` | Create an optional signed domain certificate |
| `node packages/core/src/cli.ts asset-generate --file REQUEST --out DIR` | Generate a diagram asset bundle |
| `node packages/core/src/cli.ts asset-import --file REQUEST --source FILE --url HTTPS_URL --out DIR` | Import a local raster bundle |
| `node packages/core/src/cli.ts asset-fetch --file REQUEST --url HTTPS_URL --out DIR` | Fetch and normalize a public raster bundle |
| `node packages/core/src/cli.ts asset-verify --root DIR` | Verify an asset bundle |
| `node packages/core/src/cli.ts release-plan --content CONTENT --render RENDER --approval APPROVAL --out FILE` | Create a release plan |
| `node packages/core/src/cli.ts release-produce --domain DOMAIN --content CONTENT --render RENDER --approval APPROVAL [--assets DIR] --out DIR` | Produce a release package |
| `node packages/core/src/cli.ts release-verify --root DIR [--skip-media-probe]` | Verify a release package; `--skip-media-probe` skips only the ffprobe MP4 stage |
| `npm run knowledge:graph` | Write the evidence knowledge graph and gap report to `docs/audit/knowledge-graph.json` |
| `node packages/core/src/cli.ts canonical-bind --root PROJECT` | Rebind canonical content, render spec and approval digests after authoring edits |
| `node packages/core/src/cli.ts revision-produce --root PROJECT [--variants PROFILE:ENGINE,...] [--keep-release]` | Render one full release per voice variant into `renders/<project>-<year>-<NN>/` and promote the first |
| `node packages/core/src/cli.ts revision-promote --root PROJECT --id TITLE [--voice PROFILE-ENGINE]` | Promote a revision variant into `release/`, or resume a promotion a locked file stopped |
| `node packages/core/src/cli.ts revisions-organize --root PROJECT` | Import existing renders and packages into revision folders |
| `node packages/core/src/cli.ts revisions-analyze --root PROJECT [--force]` | Measure every revision video (audio and video spectrograms, loudness, flicker, detail, frames) and write `qc/analysis/report.md` |
| `node packages/core/src/cli.ts media-analyze --file MEDIA --out DIR` | Audio and video spectrograms, loudness, pauses, scene, freeze, flicker, detail and layer measurements for one file |
| `node packages/core/src/cli.ts office-render --root PROJECT` | Render the release PPTX and DOCX with native PowerPoint and Word on Windows |
| `node packages/core/src/cli.ts runbook-project --root PROJECT` | Project `agent/runbook.json` gates from the verified release and current evidence |
| `node packages/core/src/cli.ts account-import --source CUSTOMER_DIR --root PROJECT` | Import a LayeredCards account intake or card-data package as a ready DomainPack, install the kit brand theme and write the project workspace |
| `node packages/core/src/cli.ts brand-theme --root PROJECT --url HTTPS_SITE` | Derive the brand theme (palette, header band, highlight, fonts) from an official brand site's page and stylesheets; record the evidence in `qc/brand/`; fail on weak evidence |
| `node packages/core/src/cli.ts brand-theme --root PROJECT --source KIT_THEME_JSON` | Install a LayeredCards kit theme with the same derivation as the delivered cards |
| `node packages/core/src/cli.ts brand-theme --root PROJECT --file RENDER_THEME_JSON` | Validate and install a hand-written `RenderTheme` |
| `node packages/core/src/cli.ts workspace-init --root PROJECT` | Write `PROJECT/<projectId>.code-workspace` with VS Code tasks for every pipeline stage |
| `node packages/core/src/cli.ts semantic-model [--install]` | Verify, or install once, the pinned local sentence-embedding model used for alignment |
| `node packages/core/src/cli.ts alignment-rank --root PROJECT [--canonical]` | Rank claims, sections and video scenes for internal and external audiences and write `qc/alignment/report.md` |
| `node packages/core/src/cli.ts alignment-apply --root PROJECT --audience internal\|external` | Align canonical content for an audience and rebind; external refuses while internal-only material remains |

`brand-theme` writes `canonical/render-theme.json`. It regenerates generated
semantic diagram assets with the brand palette and updates their content and
approval digests. When `canonical/content-ir.json` exists, it rebinds the
canonical inputs so the next render uses the new brand.

## Release behavior

`release-produce` requires:

- a ready `DomainPack`
- a matching `ContentIR`
- a matching `RenderSpec`
- a matching `ApprovalManifest`

It writes release records plus the requested outputs. `release-verify` checks the
entire output set and reruns MP4 QC when the package includes the Remotion output.

## Spec-driven execution

Use the same contract and tool sequence from the CLI, desktop Tools tab, or
Copilot MCP session. Do not encode product claims in renderer templates.

| Priority | Specification | Executable implementation | Recorded output |
| --- | --- | --- | --- |
| Domain SWE agent | Source-backed domain, project runbook, library agent/skill instructions | SDK session plus `intake`, knowledge search, workspace tools, core validation | Source receipts, canonical contracts, runbook evidence |
| Audio | `ContentIR.voice` profile, speed, pronunciation map and narration | `audio-render`; generated `synthesize-audio.py` | WAVs, phoneme/voice hashes and raw measurements under project QC |
| Video | Content sections/visuals and `RenderSpec.video` | `release-produce`; generated Remotion render and QC scripts | 1080p MP4, captions, render receipt, encoded-media measurements |
| Presentation | Shared claims, citations, layouts and embedded assets | `release-produce` with PPTX/PDF/HTML/AdaptiveDeck/DOCX/raster formats | Editable/source-linked documents and digest-bound parity manifest |

Each project selects its own content, brand, voice and render specifications;
tools do not inherit another project's facts or approval state. The native
project selector refreshes the working context, while its Tools catalog exposes
argument schemas for the actual core commands. SDK tool approvals control
execution, not editorial or publication sign-offs.

## Template workspace commands

`template/` holds the shared Remotion runtime and visual components. These
commands maintain it; project rendering goes through the core commands above.

```powershell
npm --prefix template ci
npm --prefix template run build
npm --prefix template run studio
npm --prefix template run postinstall
node template\scripts\patch_remotion_profile.cjs --check
node template\scripts\new_project.cjs <destination> <slug>
python template\scripts\test_pipeline.py -v
```

`postinstall`, which `ci` runs automatically, patches the installed Remotion
renderer so renders reuse a persistent browser profile at
`<project>/.remotion/chrome-profile` instead of a new temporary
`puppeteer_dev_chrome_profile-*` folder per launch. Concurrent renders claim
`chrome-profile-1`, `chrome-profile-2`, and so on. Set `REMOTION_USER_DATA_DIR`
to use another location. Profiles are never deleted automatically; only their
browser caches are trimmed, so delete `.remotion/` to reset them. `--check`
exits with status 1 when the patch is missing, for example after an
`--ignore-scripts` install or a Remotion upgrade.
