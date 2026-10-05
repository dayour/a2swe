---
title: Environment variables
description: Current environment variables for the managed 1080p release path and the retained legacy template path.
---

## Managed release path

| Variable | Purpose |
| --- | --- |
| `A2SWE_PYTHON` | Absolute Python 3.14 interpreter path override |
| `A2SWE_TTS_ENGINE` | `auto`, `kokoro`, or `kokoro_onnx` |
| `A2SWE_KOKORO_CONFIG` | PyTorch Kokoro config path |
| `A2SWE_KOKORO_WEIGHTS` | PyTorch Kokoro weights path |
| `KOKORO_ONNX_MODEL` | Kokoro ONNX model path |
| `KOKORO_ONNX_VOICES` | Shared voice bank for both engines |
| `FFMPEG_PATH` | FFmpeg executable override |
| `FFPROBE_PATH` | ffprobe executable override |
| `A2SWE_OVERWRITE_MP4` | Allow overwriting an existing MP4 when set to `1` |

`auto` prefers ONNX when ONNX model paths exist. The managed release path does not
silently fall back to cloud speech.

The core hydrates missing paths from `library/assets/speech/models.json` and
checks registry hashes. `ContentIR.voice.profileId`, `speed`, and
`pronunciations` select speech behavior; the CLI comparison uses `--voice`.
The old `KOKORO_VOICE`, `KOKORO_ONNX_VOICE`, `KOKORO_SPEED`, `KOKORO_LANG`,
`KOKORO_ONNX_LANG`, and `A2SWE_KOKORO_VOICE_MODEL` overrides are rejected by
the managed producer. Remove them and use the shared profile instead.

## Legacy template path

The retained template still supports its own environment variables such as
`TTS_ENGINE`, `VOICE`, `RATE`, and related timing controls. Keep those variables
scoped to legacy template projects.

## Example

```powershell
$env:KOKORO_ONNX_MODEL = 'C:\models\kokoro.onnx'
$env:KOKORO_ONNX_VOICES = 'C:\models\voices.bin'
npm run a2swe -- audio-render --root projects\datadog-cowork-plugin --voice am_michael --engine both
```
