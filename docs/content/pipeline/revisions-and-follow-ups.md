---
title: Revisions and follow-ups
description: Render, compare, promote and refresh project revisions, including recurring weekly account overviews.
---
# Revisions and follow-ups

A revision is one render round of a project. Every revision lives in
`renders/<project>-<year>-<NN>/` with a `revision.json` manifest that records each
video, its captions, digest, duration, voice, speech engine and release digest.

## Revision procedure

1. Read `agent/SWE_AGENT.md` and `agent/runbook.json` before editing.
2. Refresh claims whose truth may have changed and update the DomainPack.
3. Edit `canonical/content-ir.json`, then bind the canonical digests:

   ```powershell
   node packages/core/src/cli.ts canonical-bind --root projects/<id>
   ```

4. Render the revision. Each variant is a full release with a different voice
   or speech engine; the first variant is promoted to `release/`:

   ```powershell
   node packages/core/src/cli.ts revision-produce --root projects/<id>
   ```

5. Measure and review it:

   ```powershell
   node packages/core/src/cli.ts revisions-analyze --root projects/<id>
   node packages/core/src/cli.ts office-render --root projects/<id>
   node packages/core/src/cli.ts alignment-rank --root projects/<id>
   node packages/core/src/cli.ts runbook-project --root projects/<id>
   ```

6. Read `qc/analysis/report.md`, the audio and video spectrograms, the contact
   sheets, the native slide renders and `qc/alignment/report.md` before
   reporting the revision as complete.

The previous release moves to `qc/revisions/<its revision title>/`. A file held
open by a viewer or Office stops the promotion before anything moves; close it
and run `revision-promote --root projects/<id> --id <title>`. The same command
switches `release/` to another variant of a revision with `--voice`.

## Change impact

| Change | Restart from |
| --- | --- |
| Source correction | DomainPack, then `canonical-bind` |
| Wording, section order or visuals | ContentIR, then `canonical-bind` |
| Pronunciation | `voice.pronunciations` in ContentIR |
| Voice or speech engine | `revision-produce --variants` |
| Theme or layout | RenderSpec theme or the core adapters |
| Encoder-only issue | `revision-produce` |

Content changes always produce a new revision. Published revisions are never
overwritten.

## Weekly account overviews

Customer account projects follow the `a2swe-account-weekly` agent profile in
`library/agents/`. Each week:

1. Capture a read-only intake with the LayeredCards kit.
2. Import it with `account-import`. The importer accepts `intake.json` or a
   `card-data.json` package and rebuilds the DomainPack from verbatim source
   lines.
3. Author the four-section overview and run `canonical-bind`. Account overviews
   cite internal CRM, Success Hub and Microsoft 365 records, so they are aligned
   for internal readers and every output is marked Internal.
4. Render one Michael ONNX variant with
   `revision-produce --variants am_michael:kokoro_onnx`, then analyze, render
   native Office QA, rank audience alignment and project the runbook.

Customer projects contain private engagement data. Keep them in a Git-ignored
workspace or a private repository, never in a public one.

## Follow-up projects

A follow-up is a separate project with its own DomainPack, approval manifest and
release. Reusable facts, primitives and assets carry forward only with their
original provenance and licensing.

## Durable state

The canonical inputs, revision manifests, release packages and runbook are the
durable state. Chat history alone is not a valid production record.

## Reference-based visual regenerations

Keep an archived original and add two different brand compositions without
rebuilding its historical facts or changing its narration:

```sh
node packages/core/src/cli.ts revisions-regenerate --root projects/copilot-code
node packages/core/src/cli.ts revisions-regenerate --root projects/copilot-code --id copilot-code-2026-02
node scripts/regenerate-archive.mjs --root . --jobs 4 --scope primary
```

`primary` adds Editorial and Studio versions of the first original video in each
revision. `--scope all` adds both versions for every original voice/engine video.
Regenerated outputs never become regeneration inputs, and this operation never
promotes, supersedes, or replaces an existing release package.

The reference process follows ReelMimic's measured-reference/design/render/review
approach. It records deterministic Lab color histograms, palette and coarse
layout measurements from the exact archived video. An installed project theme
supplies shared brand context when available; otherwise the reference palette
supplies appearance evidence with official-brand identity explicitly unverified.
Each composition has a versioned design plan and source/code/font digests.

The picture is contained without cropping, including burned captions. Audio is
copied, then independently decoded and compared with the original. Technical
review checks dimensions, frame count/rate, duration, changed visuals and new
interior black segments, and saves six same-time comparison frames. Visual
similarity scores describe appearance; they do not establish aesthetic quality.
Editorial review remains `pending` until inspection is recorded separately.

Most historical `qc/revisions/` authoring packages are not tracked. These outputs
are therefore labelled `reference-recomposition`, rather than claiming an exact
historical release rebuild. Their evidence lives in
`qc/regenerations/<revision>/<source>/`; lineage is attached to the new video
records in the existing `revision.json`. Original records and bytes stay intact.

Successful candidates are reused after integrity checks. Failed candidates keep
their evidence and do not register an incomplete pair in the revision manifest.
Refresh the media catalog after generation with
`npm --prefix docs run library:refresh`.
