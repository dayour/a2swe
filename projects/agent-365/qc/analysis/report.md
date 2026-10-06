---
title: agent-365 render analysis
description: Measured audio, spectrogram and video-layer comparison for every agent-365 revision.
---

## Method

Every revision video is decoded with FFmpeg and measured with the core `media-analyze` method. Spectrograms use a Hann window, logarithmic magnitude and a 120 dB range, with frequency, time and dBFS legends. Loudness uses ITU-R BS.1770 (EBU R128). Video layers are measured per layout zone as frame-to-frame motion and edge detail.

These are objective measurements. They do not replace listening and viewing.

## Revisions

| Revision | Status | Output | Voice | Size | Duration | LUFS | True peak | Pause floor | Speech HF>8k | Longest pause | Findings |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| agent-365-2026-01 | superseded | agent-365-2026-01.mp4 | am_liam / kokoro | 1920x1080 | 62.7 s | -18.6 | -1.0 dBTP | -84.5 dBFS | 0.53% | 2.00 s | none |
| agent-365-2026-02 | current | agent-365-2026-02-am_michael-kokoro_onnx.mp4 | am_michael / kokoro_onnx | 1920x1080 | 66.0 s | -16.1 | -1.5 dBTP | -65.0 dBFS | 0.32% | 1.65 s | none |
| agent-365-2026-02 | current | agent-365-2026-02-af_heart-kokoro_onnx.mp4 | af_heart / kokoro_onnx | 1920x1080 | 59.6 s | -16.1 | -1.5 dBTP | -67.6 dBFS | 2.24% | 1.38 s | none |
| agent-365-2026-02 | current | agent-365-2026-02-af_bella-kokoro_onnx.mp4 | af_bella / kokoro_onnx | 1920x1080 | 63.1 s | -16.0 | -1.5 dBTP | -76.3 dBFS | 2.12% | 1.50 s | none |
| agent-365-2026-02 | current | agent-365-2026-02-am_michael-kokoro.mp4 | am_michael / kokoro | 1920x1080 | 66.0 s | -16.1 | -1.5 dBTP | -65.2 dBFS | 0.32% | 1.65 s | none |

## Findings by revision

### agent-365-2026-01 agent-365-2026-01.mp4

* info: Left and right channels carry identical mono narration.

Evidence: [analysis](agent-365-2026-01/agent-365-2026-01/analysis.json), [spectrogram](agent-365-2026-01/agent-365-2026-01/spectrogram.jpg), [speech spectrogram](agent-365-2026-01/agent-365-2026-01/spectrogram-speech.jpg), [layers](agent-365-2026-01/agent-365-2026-01/layers.png), [frames](agent-365-2026-01/agent-365-2026-01/contact-sheet.jpg).

### agent-365-2026-02 agent-365-2026-02-am_michael-kokoro_onnx.mp4

* info: Left and right channels carry identical mono narration.

Evidence: [analysis](agent-365-2026-02/agent-365-2026-02-am_michael-kokoro_onnx/analysis.json), [spectrogram](agent-365-2026-02/agent-365-2026-02-am_michael-kokoro_onnx/spectrogram.jpg), [speech spectrogram](agent-365-2026-02/agent-365-2026-02-am_michael-kokoro_onnx/spectrogram-speech.jpg), [layers](agent-365-2026-02/agent-365-2026-02-am_michael-kokoro_onnx/layers.png), [frames](agent-365-2026-02/agent-365-2026-02-am_michael-kokoro_onnx/contact-sheet.jpg).

### agent-365-2026-02 agent-365-2026-02-af_heart-kokoro_onnx.mp4

* info: Left and right channels carry identical mono narration.

Evidence: [analysis](agent-365-2026-02/agent-365-2026-02-af_heart-kokoro_onnx/analysis.json), [spectrogram](agent-365-2026-02/agent-365-2026-02-af_heart-kokoro_onnx/spectrogram.jpg), [speech spectrogram](agent-365-2026-02/agent-365-2026-02-af_heart-kokoro_onnx/spectrogram-speech.jpg), [layers](agent-365-2026-02/agent-365-2026-02-af_heart-kokoro_onnx/layers.png), [frames](agent-365-2026-02/agent-365-2026-02-af_heart-kokoro_onnx/contact-sheet.jpg).

### agent-365-2026-02 agent-365-2026-02-af_bella-kokoro_onnx.mp4

* info: Left and right channels carry identical mono narration.

Evidence: [analysis](agent-365-2026-02/agent-365-2026-02-af_bella-kokoro_onnx/analysis.json), [spectrogram](agent-365-2026-02/agent-365-2026-02-af_bella-kokoro_onnx/spectrogram.jpg), [speech spectrogram](agent-365-2026-02/agent-365-2026-02-af_bella-kokoro_onnx/spectrogram-speech.jpg), [layers](agent-365-2026-02/agent-365-2026-02-af_bella-kokoro_onnx/layers.png), [frames](agent-365-2026-02/agent-365-2026-02-af_bella-kokoro_onnx/contact-sheet.jpg).

### agent-365-2026-02 agent-365-2026-02-am_michael-kokoro.mp4

* info: Left and right channels carry identical mono narration.

Evidence: [analysis](agent-365-2026-02/agent-365-2026-02-am_michael-kokoro/analysis.json), [spectrogram](agent-365-2026-02/agent-365-2026-02-am_michael-kokoro/spectrogram.jpg), [speech spectrogram](agent-365-2026-02/agent-365-2026-02-am_michael-kokoro/spectrogram-speech.jpg), [layers](agent-365-2026-02/agent-365-2026-02-am_michael-kokoro/layers.png), [frames](agent-365-2026-02/agent-365-2026-02-am_michael-kokoro/contact-sheet.jpg).

## Comparison images

* [Spectrogram stack](spectrogram-stack.jpg)
* [Frame grid](frames-grid.jpg)
* [Layer activity stack](layers-stack.jpg)
