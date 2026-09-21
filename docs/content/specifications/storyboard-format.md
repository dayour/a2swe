---
title: Storyboard format
---

# Storyboard format specification

## Required shot fields

| Field | Meaning |
| --- | --- |
| ID | Literal runtime shot identifier |
| Frames | Resolved start and end boundaries |
| Beat | Narration or subtitle intent |
| Visible text | Exact on-screen copy |
| Visual | Subject, diagram, or composition |
| Motion | Entrance, continuous behavior, and exit |
| Hero | Primary focal object and target size |
| Light | Glow, contrast, and background treatment |
| Camera | Push, pan, or fixed framing |
| Dependencies | Facts, assets, or shared primitives |

## Tokens

The source storyboard may refer to sentence and chapter timing with tokens resolved by `render_storyboard.py`. Supported token families include sentence start/end values, chapter references, and total duration. Unresolved braces matching the token grammar are an error.

## Grouping

Shots SHOULD be organized into `G1` through `G8`, generally five to seven shots per group. Group boundaries SHOULD align with coherent chapters or production assignments.

## Glitch whitelist

Glitch effects are opt-in. If a storyboard defines a `Glitch whitelist`, runtime `GlitchIn` usage MUST match it. This prevents accidental decorative glitch effects and keeps emphasis intentional.

## Safe-area notes

Storyboard visuals MUST reserve:

- content above y=637;
- subtitles at y=637–690;
- progress treatment at y=687–720.

Elements intended to overlap these zones require an explicit, reviewed exception.
