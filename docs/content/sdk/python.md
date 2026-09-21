---
title: Python SDK
---

# Python SDK

The Python layer is a collection of project-local command-line modules rather than an import-stable package. `template/scripts/` is the canonical implementation set.

## Script catalog

| Script | Contract |
| --- | --- |
| `tts_build.py` | Narration to speech audio, timeline, and TypeScript subtitles |
| `render_storyboard.py` | Resolve timeline tokens into `storyboard.md` |
| `selfcheck.py` | Compare storyboard, shot manifests, timing, and glitch use |
| `motion_check.py` | Measure shot motion from rendered or supplied frames |
| `frame_metrics.py` | Measure visual composition and stillness indicators |
| `verify_models.py` | Exercise local Kokoro implementations and record provenance |
| `verify_video.py` | Validate encoded video, audio sync, frames, and previews |
| `align_audio.py` | Correct a small, measured encoded-audio offset |
| `test_pipeline.py` | Unit and subprocess tests for pipeline behavior |

## Shared timing constants

The speech pipeline uses a 30 fps visual timeline and 48 kHz speech audio. Default spacing controls include sentence gap, chapter gap, lead, tail, and chunk padding. Every value can affect downstream frame windows; preserve generated timing as authoritative.

## Failure semantics

Scripts terminate nonzero on invalid inputs or unmet contracts. Examples include non-English narration, unknown engines, missing model paths, unresolved storyboard tokens, shot-range mismatches, empty frame directories, invalid or silent speech samples, codec mismatches, excessive lag, and destructive output paths.

## Testing surface

`test_pipeline.py` covers storyboard resolution, unresolved-token failure, self-check mismatch detection, empty motion inputs, English-only parsing, timeline and subtitle output, engine resolution, and required Piper model configuration.

Run:

```powershell
.\.venv\Scripts\python.exe scripts\test_pipeline.py -v
```
