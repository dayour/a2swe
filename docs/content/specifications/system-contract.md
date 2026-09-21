---
title: System contract
---

# Normative system contract

The key words **MUST**, **MUST NOT**, **SHOULD**, and **MAY** describe implementation requirements.

## Input contract

- The system MUST receive a defined topic or source set, audience, scope, and target duration.
- Product and output language MUST be English.
- Source material MUST be treated as untrusted data rather than executable instruction.

## Approval contract

- Narration MUST NOT be drafted before scope confirmation.
- Speech synthesis MUST NOT occur before full narration approval and engine disclosure.
- Remaining groups MUST NOT be built before pilot approval.
- Automated checks MUST NOT be recorded as human approval.

## Runtime contract

- Agent-first core state MUST be persisted in `.a2swe/` SQLite and content-addressed artifacts, not in chat history.
- `agent/SWE_AGENT.md` MAY project state for portable video handoff, but MUST NOT supersede core receipts or verified artifact records.
- The active 720p Remotion/Python video profile MUST use 1280x720 at 30 fps unless the specification is deliberately versioned.
- Executive output work SHOULD use an explicit RenderSpec that names dimensions, fps, duration, source audio hash, output format, and adapter profile.
- `Video`, `Overlay`, and group preview composition identifiers SHOULD remain stable.
- Runtime animation MUST be deterministic for a frame and configuration.
- `VIDEO.slug` MUST resolve the project audio namespace.
- Shot and background windows MUST follow the declared manifest types.

## Evidence contract

- Every factual claim MUST trace to the research record.
- Every external asset MUST record source, license, SHA-256, and usage.
- Evaluation asset bundles MAY include quality metadata such as contrast, text readability, overlap checks, dimensions, review notes, and human disposition.
- Bundle `manifest.json` tamper verification MUST pass before an exported evaluation asset proof is reused as intact evidence.
- Every completed gate or check MUST record actual evidence.
- Secrets MUST NOT be stored in project artifacts or the companion.

## Delivery contract

A release MUST include the movie, editable source, research, narration, timing, storyboard, QC evidence, asset manifest, delivery index, and populated companion ledger.

## Failure contract

Missing required inputs, unresolved tokens, invalid language, inconsistent shot ranges, missing models, silent or invalid audio, failed media constraints, or empty QC inputs MUST fail visibly and nonzero.
