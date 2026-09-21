---
title: Environment variables
---

# Environment variables

## Speech selection

| Variable | Purpose |
| --- | --- |
| `TTS_ENGINE` | `auto`, `kokoro`, `kokoro_onnx`, `piper`, or `edge` |
| `VOICE` | Edge voice identifier |
| `RATE` | Edge speech-rate adjustment |
| `KOKORO_VOICE` | Kokoro voice identifier |
| `KOKORO_LANG` | Kokoro language code |
| `KOKORO_SPEED` | Kokoro synthesis speed |
| `KOKORO_ONNX_MODEL` | Path to ONNX model weights |
| `KOKORO_ONNX_VOICES` | Path to ONNX voice data |
| `KOKORO_ONNX_VOICE` | ONNX voice identifier |
| `KOKORO_ONNX_LANG` | ONNX language code |
| `PIPER_MODEL` | Piper model path; required for Piper |
| `EDGE_TRIES` | Edge retry count |

The active speech pipeline is English-only. `VOICE`, `KOKORO_VOICE`,
`KOKORO_LANG`, `KOKORO_ONNX_VOICE`, `KOKORO_ONNX_LANG`, and Piper model choices
must select English voices or language settings only. Do not add a language
selector or set non-English defaults. `TTS_ENGINE=auto` remains local Kokoro and
must not silently fall back to Edge or another cloud service.

## Timing controls

| Variable | Purpose |
| --- | --- |
| `GAP` | Standard inter-sentence gap |
| `CHAPTER_GAP` | Additional chapter separation |
| `LEAD` | Opening lead time |
| `TAIL` | Closing tail time |
| `CHUNK_PAD` | Speech chunk padding |

Changing these values regenerates timing and can invalidate storyboard and shot windows.

## Remotion controls

| Variable | Purpose |
| --- | --- |
| `REMOTION_CACHE` | Set to `0` to reduce disk cache usage |
| `REMOTION_BROWSER_EXECUTABLE` | Reuse an installed Chromium-compatible executable |

## Example

```powershell
$env:TTS_ENGINE = 'kokoro_onnx'
$env:KOKORO_ONNX_MODEL = 'C:\models\kokoro.onnx'
$env:KOKORO_ONNX_VOICES = 'C:\models\voices.bin'
python scripts\tts_build.py
```

Do not record credentials in environment examples, project configuration, or the companion ledger.
