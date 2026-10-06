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
   node packages/core/src/cli.ts runbook-project --root projects/<id>
   ```

6. Read `qc/analysis/report.md`, the contact sheets and the native slide renders
   before reporting the revision as complete.

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
3. Author the four-section overview and run `canonical-bind`.
4. Render one Michael ONNX variant with
   `revision-produce --variants am_michael:kokoro_onnx`, then analyze, render
   native Office QA and project the runbook.

Customer projects contain private engagement data. Keep them in a Git-ignored
workspace or a private repository, never in a public one.

## Follow-up projects

A follow-up is a separate project with its own DomainPack, approval manifest and
release. Reusable facts, primitives and assets carry forward only with their
original provenance and licensing.

## Durable state

The canonical inputs, revision manifests, release packages and runbook are the
durable state. Chat history alone is not a valid production record.
