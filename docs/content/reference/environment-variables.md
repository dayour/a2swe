---
title: Environment variables
description: Current environment variables for the managed 1080p release path and the retained legacy template path.
---

## Managed release path

| Variable | Purpose |
| --- | --- |
| `A2SWE_NODE` | Supported Node executable for `npm run a2swe`, `packages/core/bin/a2swe.mjs`, project workspace tasks and the desktop bridge when the default `node` is outside the repository `engines` range |
| `A2SWE_PYTHON` | Absolute Python 3.14 interpreter path override |
| `A2SWE_TTS_ENGINE` | `auto`, `kokoro`, or `kokoro_onnx` |
| `A2SWE_KOKORO_CONFIG` | PyTorch Kokoro config path |
| `A2SWE_KOKORO_WEIGHTS` | PyTorch Kokoro weights path |
| `KOKORO_ONNX_MODEL` | Kokoro ONNX model path |
| `KOKORO_ONNX_VOICES` | Shared voice bank for both engines |
| `FFMPEG_PATH` | FFmpeg executable override |
| `FFPROBE_PATH` | ffprobe executable override |
| `A2SWE_OVERWRITE_MP4` | Allow overwriting an existing MP4 when set to `1` |
| `A2SWE_BROWSER_EXECUTABLE` | Browser executable for managed stills and MP4 renders; a release's `render-mp4.mjs` also reads it when run by hand |
| `REMOTION_BROWSER_EXECUTABLE` | Browser executable used when `A2SWE_BROWSER_EXECUTABLE` is unset; the template reads it too |
| `REMOTION_BROWSER` | `remotion` skips Playwright's headless shell and uses Remotion's Chrome for Testing shell |
| `PLAYWRIGHT_BROWSERS_PATH` | Playwright browser cache searched for `chromium_headless_shell-*` revisions; relative paths resolve as Playwright resolves them, and `0` means the default cache |
| `REMOTION_USER_DATA_DIR` | Browser profile folder for every managed render instead of one per content ID; must resolve outside the release |

`auto` prefers ONNX when ONNX model paths exist. The managed release path does not
silently fall back to cloud speech.

Without a pinned executable, managed renders launch the newest completed
Playwright Chromium headless shell and fall back to Remotion's Chrome for
Testing shell when Playwright has none installed.

The core hydrates missing paths from `library/assets/speech/models.json` and
checks registry hashes. Registry paths are home-relative (`~/...`) and resolve
against the current user's home folder, so the checkout carries no user-specific
absolute paths. `ContentIR.voice.profileId`, `speed`, and
`pronunciations` select speech behavior; the CLI comparison uses `--voice`.
The old `KOKORO_VOICE`, `KOKORO_ONNX_VOICE`, `KOKORO_SPEED`, `KOKORO_LANG`,
`KOKORO_ONNX_LANG`, and `A2SWE_KOKORO_VOICE_MODEL` overrides are rejected by
the managed producer. Remove them and use the shared profile instead.

## Legacy template path

The retained template still supports its own environment variables such as
`TTS_ENGINE`, `VOICE`, `RATE`, and related timing controls. Keep those variables
scoped to legacy template projects.

The template's `remotion.config.ts` launches `REMOTION_BROWSER_EXECUTABLE` when
set, otherwise Playwright's newest completed Chromium headless shell unless
`REMOTION_BROWSER` is `remotion`, otherwise Remotion's own download. When it
selects a browser, `REMOTION_GL` sets the OpenGL renderer (default `swangle`).
`REMOTION_USER_DATA_DIR` moves the persistent browser profile.

## Example

```powershell
$env:KOKORO_ONNX_MODEL = 'C:\models\kokoro.onnx'
$env:KOKORO_ONNX_VOICES = 'C:\models\voices.bin'
npm run a2swe -- audio-render --root projects\datadog-cowork-plugin --voice am_michael --engine both
```
