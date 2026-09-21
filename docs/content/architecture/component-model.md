---
title: Component model
---

# Component model

## Stage-level components

| Component | Responsibility |
| --- | --- |
| `Fonts` | Load and expose bundled typography |
| `BgTrack` | Render shared star, fog, and background behavior |
| `DotFieldBg` | Render the alternate dot-field background |
| `FootageTrack` | Place optional licensed media in timed windows |
| `ProgressBar` | Display video progress across the composition |
| `Subtitles` | Render synchronized subtitle cues |
| `Stage` | Compose the full frame hierarchy |
| `Video` | Assemble overlay and group manifests for production |

## Overlay components

| Component | Responsibility |
| --- | --- |
| `Title` | Opening title timing and exit animation |
| `ChapterCard` | Chapter transition and section framing |
| `Hud` | Timed informational capsule content |
| `Rail` | Stepwise or sequential progress narrative |
| `Ending` | End-state fade and closure |
| `EndCredit` | Source and production credit display |
| `EndingTop` | Top-layer ending treatment |

Overlay timing derives from `SENTENCES`, `CHAPTER_STARTS`, and `VIDEO`, keeping editorial structure synchronized with narration.

## Shared visual primitives

The `src/common/` barrel exports typography, easing, fitting, blur, arrows, pills, capsules, glitches, backgrounds, footage, progress, subtitle, and timeline utilities. New scenes should compose these primitives before introducing project-local duplicates.

## Shot groups

`src/shots/G1/` through `G8/` are independent scene domains. Each group can provide:

- timed React scene components;
- a shot manifest;
- background windows;
- footage windows;
- group-local implementation notes.

The template groups are placeholders. A project fills them according to the approved storyboard.

## Component design constraints

- Components must be deterministic for a given frame and input.
- Animation state should derive from Remotion frame APIs, not wall-clock timers.
- Text must remain inside the defined safe areas.
- Shared timeline data should determine appearance windows.
- Exits and transitions must be explicit; avoid unexplained persistent elements.
- Project content belongs in configuration and manifests rather than copied runtime shells.
