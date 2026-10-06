---
name: a2swe-account-weekly
description: Refresh a customer account's weekly executive overview from its read-only account intake, then produce the video, presentation, documents and verified release through the core pipeline.
---

# a2swe Account Weekly Overview

Use this profile for private customer projects whose facts come from a
LayeredCards account intake: CLS engagements, the Success Hub project and use
cases, Microsoft 365 meeting, mail and chat summaries, and public market and
news snapshots. Each customer folder is an a2swe project. Its outputs contain
private engagement data and must stay in a Git-ignored workspace.

## Weekly cycle

1. Capture a fresh read-only intake with the LayeredCards kit. Never write back
   to CRM, Success Hub or Microsoft 365.
2. Import it into the project. The importer accepts a kit customer folder with
   either `intake.json` or a `card-data.json` package (live CRM snapshot plus a
   dated engagement tracker). It stores a hashed text rendering of every record
   and makes each quote a verbatim line of that rendering:

   ```powershell
   node packages/core/src/cli.ts account-import --source KIT/customers/<id> --root <customer-project>
   ```

3. Author `canonical/content-ir.json` for this week, then bind digests:

   ```powershell
   node packages/core/src/cli.ts canonical-bind --root <customer-project>
   ```

4. Render the weekly revision. It becomes `renders/<id>-<year>-<NN>/` and the
   promoted `release/`:

   ```powershell
   node packages/core/src/cli.ts revision-produce --root <customer-project> --variants am_michael:kokoro_onnx
   node packages/core/src/cli.ts revisions-analyze --root <customer-project>
   node packages/core/src/cli.ts office-render --root <customer-project>
   node packages/core/src/cli.ts runbook-project --root <customer-project>
   ```

## Content contract

- Audience: account and engagement leadership. Lead with what changed this
  week and the one decision or ask.
- Use four sections: account health, active engagements, this week's signals,
  and next actions. Keep each body to two sentences of 120 to 170 characters.
- Every claim must match an imported DomainPack claim exactly. You may add a
  synthesized claim only when each element of its wording is directly
  supported by the cited evidence spans; cite all of them.
- Distinguish CRM status, Success Hub health and recent signals. Project-level
  health does not cancel a blocked use case or a true-down risk.
- Tracker rows are a dated working snapshot. Present their proposed health,
  owners and dates as proposals, never as CRM records.
- Diagrams must not imply sequence or causation the records do not state. Use
  grouped boxes for status and stage counts, and arrows only for real order.
- Write every body, box and caption for the executive reader. Never place
  authoring or presenter guidance such as tone advice or "keep X separate" in
  the content; state the fact or the ask instead.
- Microsoft 365 and news summaries are intake paraphrases. Do not present them
  as quotations, and do not infer sentiment, dates or owners they do not state.
- Name accountable owners only when the record names them and the name matters
  to the decision. Exclude personal, career and HR details, raw identifiers,
  meeting links and verbatim private correspondence from narration and slides.
- Use speech-only pronunciation overrides for acronyms such as CLS, CAT, MCP
  and M365 so captions keep the written form.

## Verification

Claim completion only after `release-verify`, `runbook-verify`, the media
analysis and the native Office render pass for the promoted release. A stale
or partial intake must stay visible in the DomainPack known gaps.
