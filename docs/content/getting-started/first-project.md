---
title: First project
---

# Create a first project

A video is produced from a separate scaffold, never by turning the template directory into the deliverable.

## Windows

```powershell
node template\scripts\new_project.cjs projects\vector-databases vector-databases
```

## macOS and Linux

The existing wrapper requires zsh and rsync:

```bash
template/scripts/new_project.sh ~/work/vector-databases vector-databases
```

The scaffold copies the production source, companion ledger, and production rules; excludes generated outputs; installs locked JavaScript dependencies; and typechecks. It refuses to overwrite an existing destination.

## Initialize stage 0

1. Open `projects/vector-databases/agent/SWE_AGENT.md`.
2. Record the requested outcome, audience, target duration, owner, dependencies, and current stage.
3. Confirm scope before narration drafting.
4. Create `research/research.md` from primary sources.
5. Keep every approval and completed check explicit in the companion ledger.

## Preview before production

The generated project initially contains placeholder compositions. Start Studio to inspect the shell:

```powershell
npm --prefix projects\vector-databases run studio -- --port 3100
```

A complete render requires project-specific narration, timeline data, subtitle data, configuration, and shot groups.

## Direct Remotion commands

Run these from a generated project:

```powershell
npx remotion still src\index.ts Overlay stills\title.png --frame=39
npx remotion render src\index.ts Video renders\pilot.mp4 --frames=0-899
```

The second command renders frames 0–899, which is 30 seconds at 30 fps.

## Continue through the gates

Proceed with the [production lifecycle](../pipeline/lifecycle.md). Do not synthesize approved narration or build beyond the pilot without the required human decisions.
