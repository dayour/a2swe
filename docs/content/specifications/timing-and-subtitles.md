---
title: Timing and subtitles
---

# Timing and subtitle specification

## Media clock

- Visual frame rate: 30 fps.
- Speech sample rate: 48 kHz.
- Pilot duration: 30 seconds or the complete shorter video.
- Pilot frame range at 30 fps: 0–899.

## Timing generation

The speech builder trims invalid edge silence, computes chunk starts, inserts sentence and chapter gaps, and applies lead, tail, and chunk padding. The generated timeline is authoritative for downstream scenes.

## Subtitle requirements

- Subtitle cues MUST derive from approved narration.
- Cue timing MUST align with the generated or verified audio.
- Text MUST remain inside y=637–690.
- Blocks SHOULD remain readable at the target pace and resolution.
- Subtitles MUST NOT conceal critical focal content.

## Audio sync acceptance

The encoded pilot verifier requires audio correlation greater than 0.98 and lag no greater than 1024 samples against the reference WAV. `align_audio.py` permits correction only for offsets under 0.1 seconds with the same high similarity threshold.

## Change control

Any narration, engine, voice, rate, pronunciation, gap, lead, tail, or chunk-padding change MUST regenerate timing and trigger review of subtitles, chapter starts, overlay windows, and shot manifests.
