---
title: Storyboard and build
---

# Storyboard and build

## Storyboard source

`script/storyboard_src.md` maps approved narration into visual instructions. One shot per sentence is preferred where practical. Group work into five to seven shots when possible.

Every shot should state:

- sentence or frame window;
- exact visible text;
- subtitle beat;
- visual subject and focal hero;
- hero size and placement;
- light and backdrop behavior;
- entrance, sustained motion, and exit;
- camera motion;
- literal shot registry identifier;
- factual or asset dependencies.

## Token resolution

`render_storyboard.py` resolves timing tokens from `script/timeline.json`, including sentence, chapter, and total-duration references. It writes `storyboard.md` and fails when any token remains unresolved.

```powershell
python scripts\render_storyboard.py
```

## Static self-check

`selfcheck.py` compares resolved storyboard ranges against `src/shots/G*/index.ts`, detects gaps and overlaps, checks chapter allowances, validates glitch use against the storyboard whitelist, and surfaces literal strings for manual review.

```powershell
python scripts\selfcheck.py
```

## Shared visual stage

Before group implementation, configure title, chapter cards, HUD, rail, subtitles, progress, backdrop, ending, and credits. Inspect representative overlay stills so every group uses the same hierarchy and safe areas.

## Pilot first

Implement `G1`, typecheck, and render frames 0–899 for a 30-second pilot. Review style, readability, pacing, voice, motion, subtitle placement, and factual representation. Remaining groups stay blocked until approval.

## Parallel group build

After approval, workers may implement separate groups with bounded ownership. Each returns:

- changed files;
- build notes;
- typecheck result;
- representative stills;
- motion-check output;
- unresolved blockers.
