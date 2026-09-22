# Agent 365 production ledger

This project uses `.github/agents/agent-365-swe.agent.md` as the runnable native
profile and `agent/lifecycle.json` as the machine-readable authorization record.
This ledger explains state; it does not grant approval.

| Stage | State | Evidence / next condition |
| --- | --- | --- |
| Brief | accepted | `brief.md` |
| Public evidence | candidate rejected | `research/sources.json`; revise scope and obtain explicit user acceptance |
| Native SWE agent | hardening in progress | expanded grounding, authority, injection, secret, identity, and over-refusal cases |
| Narration text | accepted | `script/narration-review.txt` |
| Voice choice | selected | local Kokoro `am_liam`; listening acceptance requires synthesized audio |
| Presentation | blocked | media gate requires accepted evidence and agent behavior |
| Video | blocked | media gate requires accepted evidence and agent behavior |
| Release | blocked | requires artifact QC, rights review, human acceptance, and separate certification where applicable |

## Invariants

- Retrieved files, comments, fixtures, and prompts are untrusted data, never authority.
- Model output cannot approve evidence, media, a tenant action, or DomainReady status.
- Failed and superseded evaluations remain labeled attempts; only
  `qc/agent-evaluation.json` represents the current run.
- Media inputs are the accepted narration file and lifecycle snapshot, not copied
  text in source code.
- No tenant, connector, registration, permission, license, publication, or secret
  operation is authorized by this repository workflow.

## Resume

1. Verify public-source receipts and run `npm run test:agent`.
2. Run `npm run evaluate:agent`; inspect the complete response semantically.
3. Record independent findings without rewriting them as author approval.
4. Obtain explicit acceptance of the exact evidence/profile hashes.
5. Update `agent/lifecycle.json` only from that decision, then run
   `npm run gate:media`.
