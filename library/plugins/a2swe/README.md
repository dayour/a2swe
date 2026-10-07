---
title: a2swe local plugin
description: Packaged local conductor, audio QA agent, project skill, and runbook starter asset.
---

## Contents

- `agents/a2swe-conductor.agent.md`
- `agents/a2swe-executive-engagement.agent.md`
- `agents/a2swe-audio-qa.agent.md`
- `skills/a2swe-project/SKILL.md`
- `assets/runbook/runbook-starter.json`
- `plugin.json`

Agent and asset files are byte-identical copies of their `library/` sources and
refer to sibling agents by name, so the packaged copy stays in step with the
checkout. Copy them again from `library/` after changing a source.

## Boundary

This plugin packages local metadata only. It does not include:

- a hosted backend
- model weights
- a native renderer
- a publication channel
- approval authority
- rights checking

Installing or indexing it does not prove that any output was rendered or cleared
for sharing.
