---
title: Timing and subtitles
description: Timing and burned-caption rules for paragraph-based narration in the current a2swe managed release path.
---

## Media clock

- Visual frame rate: 30 fps
- Speech sample rate: 48 kHz
- Managed release video size: 1920x1080

## Segmentation

Narration is split by blank lines into paragraphs. Those paragraphs become the
speech segments stored in narration metadata.

When paragraph count matches the number of scenes, measured speech defines scene
timing and caption timing. Otherwise the renderer keeps the measured WAV duration
and derives scene cuts proportionally from text length.

## Subtitle rules

- Captions derive from the approved narration text.
- Captions are burned into the managed MP4 output.
- Captions must reflect measured or verified speech timing.
- Spoken-form spellings normalize to written forms in captions and documents.
- Captions must not hide critical focal content.

## Change control

Changes to narration text, paragraph boundaries, speech engine, model path, or
audio generation invalidate dependent timing and can require rerendering.
