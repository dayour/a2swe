# a2swe Local Plugin

This first-party library plugin packages the current a2swe conductor, runbook
skill, and starter runbook asset for local discovery by compatible coding-agent
hosts.

## Contents

- `agents/a2swe-conductor.agent.md`: coordination profile for validated
  agent-first transitions.
- `skills/a2swe-project/SKILL.md`: project runbook inspection and resume skill.
- `assets/runbook/runbook-starter.json`: pending runbook scaffold seed.
- `plugin.json`: package manifest that points at these local entries.

## Current capability boundary

The plugin is guidance and portable metadata only. It does not include a hosted
agent backend, model weights, native renderer, publication channel, approval
service, or credential. Installing or indexing it must not be treated as
DomainReady status, brand approval, narration approval, release approval, or proof
that any output format has been rendered.

Use it from an a2swe checkout, then validate the project runbook and recorded
artifacts with the root core CLI. Leave missing approvals, model weights,
renderer prerequisites, stale hashes, and unsupported formats as explicit
blockers.
