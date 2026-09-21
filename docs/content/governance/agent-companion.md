---
title: SWE companion ledger
---

# SWE companion ledger

`agent/SWE_AGENT.md` is a portable instruction-and-state artifact shipped with each project. It is not a daemon, trained model, autonomous approval authority, or substitute for source files.

## Required sections

- project brief and audience;
- current lifecycle stage;
- owner and bounded worker assignments;
- dependencies and blockers;
- approval record;
- stage-by-stage evidence;
- decisions and rationale;
- source and artifact paths;
- commands actually run and their results;
- domain knowledge and reusable primitives;
- verification status;
- next actions and resume instructions.

## Ownership

One pipeline owner writes the ledger. Parallel workers return bounded evidence and edit assigned implementation files. This avoids conflicting state and preserves a coherent audit trail.

## Integrity rules

- Never record an approval that did not occur.
- Never mark a check successful without its actual result.
- Never store secrets.
- Distinguish planned, implemented, rendered, verified, and approved.
- Update the ledger at every stage transition.
- Verify artifact paths before resuming a revision.

## Delivery role

The companion enables a later agent or engineer to identify the earliest affected stage, understand prior decisions, reuse licensed material, and continue without relying on unavailable conversation context.
