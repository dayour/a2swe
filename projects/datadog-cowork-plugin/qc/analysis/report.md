---
title: datadog-cowork-plugin render analysis
description: Measured audio, spectrogram and video-layer comparison for every datadog-cowork-plugin revision.
---

## Method

Every revision video is decoded with FFmpeg and measured with the core `media-analyze` method. Spectrograms use a Hann window, logarithmic magnitude and a 120 dB range, with frequency, time and dBFS legends. Loudness uses ITU-R BS.1770 (EBU R128). Video layers are measured per layout zone as frame-to-frame motion and edge detail.

These are objective measurements. They do not replace listening and viewing.

## Revisions

| Revision | Status | Output | Voice | Size | Duration | LUFS | True peak | Pause floor | Speech HF>8k | Longest pause | Findings |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| datadog-cowork-plugin-2026-01 | superseded | datadog-cowork-plugin-2026-01.mp4 | kokoro_onnx | 1920x1080 | 89.0 s | -18.0 | -1.0 dBTP | -109.1 dBFS | 0.40% | 0.50 s | none |
| datadog-cowork-plugin-2026-02 | superseded | datadog-cowork-plugin-2026-02.mp4 | kokoro_onnx | 1920x1080 | 89.0 s | -18.6 | -1.0 dBTP | -64.5 dBFS | 0.40% | 1.07 s | none |
| datadog-cowork-plugin-2026-03 | superseded | datadog-cowork-plugin-2026-03.mp4 | kokoro_onnx | 1920x1080 | 89.0 s | -18.3 | -1.0 dBTP | -64.3 dBFS | 0.40% | 1.10 s | none |
| datadog-cowork-plugin-2026-04 | current | datadog-cowork-plugin-2026-04-am_michael-kokoro_onnx.mp4 | am_michael / kokoro_onnx | 1920x1080 | 91.8 s | -16.0 | -1.5 dBTP | -65.1 dBFS | 0.33% | 1.60 s | none |
| datadog-cowork-plugin-2026-04 | current | datadog-cowork-plugin-2026-04-af_heart-kokoro_onnx.mp4 | af_heart / kokoro_onnx | 1920x1080 | 83.8 s | -16.0 | -1.5 dBTP | -71.0 dBFS | 2.34% | 1.40 s | none |
| datadog-cowork-plugin-2026-04 | current | datadog-cowork-plugin-2026-04-af_bella-kokoro_onnx.mp4 | af_bella / kokoro_onnx | 1920x1080 | 87.0 s | -16.0 | -1.5 dBTP | -77.1 dBFS | 2.17% | 1.52 s | none |
| datadog-cowork-plugin-2026-04 | current | datadog-cowork-plugin-2026-04-am_michael-kokoro.mp4 | am_michael / kokoro | 1920x1080 | 91.8 s | -16.0 | -1.5 dBTP | -64.8 dBFS | 0.33% | 1.60 s | none |

## Findings by revision

### datadog-cowork-plugin-2026-01 datadog-cowork-plugin-2026-01.mp4

* info: Left and right channels carry identical mono narration.

Evidence: [analysis](datadog-cowork-plugin-2026-01/datadog-cowork-plugin-2026-01/analysis.json), [spectrogram](datadog-cowork-plugin-2026-01/datadog-cowork-plugin-2026-01/spectrogram.jpg), [speech spectrogram](datadog-cowork-plugin-2026-01/datadog-cowork-plugin-2026-01/spectrogram-speech.jpg), [layers](datadog-cowork-plugin-2026-01/datadog-cowork-plugin-2026-01/layers.png), [frames](datadog-cowork-plugin-2026-01/datadog-cowork-plugin-2026-01/contact-sheet.jpg).

### datadog-cowork-plugin-2026-02 datadog-cowork-plugin-2026-02.mp4

* info: Left and right channels carry identical mono narration.

Evidence: [analysis](datadog-cowork-plugin-2026-02/datadog-cowork-plugin-2026-02/analysis.json), [spectrogram](datadog-cowork-plugin-2026-02/datadog-cowork-plugin-2026-02/spectrogram.jpg), [speech spectrogram](datadog-cowork-plugin-2026-02/datadog-cowork-plugin-2026-02/spectrogram-speech.jpg), [layers](datadog-cowork-plugin-2026-02/datadog-cowork-plugin-2026-02/layers.png), [frames](datadog-cowork-plugin-2026-02/datadog-cowork-plugin-2026-02/contact-sheet.jpg).

### datadog-cowork-plugin-2026-03 datadog-cowork-plugin-2026-03.mp4

* info: Left and right channels carry identical mono narration.

Evidence: [analysis](datadog-cowork-plugin-2026-03/datadog-cowork-plugin-2026-03/analysis.json), [spectrogram](datadog-cowork-plugin-2026-03/datadog-cowork-plugin-2026-03/spectrogram.jpg), [speech spectrogram](datadog-cowork-plugin-2026-03/datadog-cowork-plugin-2026-03/spectrogram-speech.jpg), [layers](datadog-cowork-plugin-2026-03/datadog-cowork-plugin-2026-03/layers.png), [frames](datadog-cowork-plugin-2026-03/datadog-cowork-plugin-2026-03/contact-sheet.jpg).

### datadog-cowork-plugin-2026-04 datadog-cowork-plugin-2026-04-am_michael-kokoro_onnx.mp4

* info: Left and right channels carry identical mono narration.

Evidence: [analysis](datadog-cowork-plugin-2026-04/datadog-cowork-plugin-2026-04-am_michael-kokoro_onnx/analysis.json), [spectrogram](datadog-cowork-plugin-2026-04/datadog-cowork-plugin-2026-04-am_michael-kokoro_onnx/spectrogram.jpg), [speech spectrogram](datadog-cowork-plugin-2026-04/datadog-cowork-plugin-2026-04-am_michael-kokoro_onnx/spectrogram-speech.jpg), [layers](datadog-cowork-plugin-2026-04/datadog-cowork-plugin-2026-04-am_michael-kokoro_onnx/layers.png), [frames](datadog-cowork-plugin-2026-04/datadog-cowork-plugin-2026-04-am_michael-kokoro_onnx/contact-sheet.jpg).

### datadog-cowork-plugin-2026-04 datadog-cowork-plugin-2026-04-af_heart-kokoro_onnx.mp4

* info: Left and right channels carry identical mono narration.

Evidence: [analysis](datadog-cowork-plugin-2026-04/datadog-cowork-plugin-2026-04-af_heart-kokoro_onnx/analysis.json), [spectrogram](datadog-cowork-plugin-2026-04/datadog-cowork-plugin-2026-04-af_heart-kokoro_onnx/spectrogram.jpg), [speech spectrogram](datadog-cowork-plugin-2026-04/datadog-cowork-plugin-2026-04-af_heart-kokoro_onnx/spectrogram-speech.jpg), [layers](datadog-cowork-plugin-2026-04/datadog-cowork-plugin-2026-04-af_heart-kokoro_onnx/layers.png), [frames](datadog-cowork-plugin-2026-04/datadog-cowork-plugin-2026-04-af_heart-kokoro_onnx/contact-sheet.jpg).

### datadog-cowork-plugin-2026-04 datadog-cowork-plugin-2026-04-af_bella-kokoro_onnx.mp4

* info: Left and right channels carry identical mono narration.

Evidence: [analysis](datadog-cowork-plugin-2026-04/datadog-cowork-plugin-2026-04-af_bella-kokoro_onnx/analysis.json), [spectrogram](datadog-cowork-plugin-2026-04/datadog-cowork-plugin-2026-04-af_bella-kokoro_onnx/spectrogram.jpg), [speech spectrogram](datadog-cowork-plugin-2026-04/datadog-cowork-plugin-2026-04-af_bella-kokoro_onnx/spectrogram-speech.jpg), [layers](datadog-cowork-plugin-2026-04/datadog-cowork-plugin-2026-04-af_bella-kokoro_onnx/layers.png), [frames](datadog-cowork-plugin-2026-04/datadog-cowork-plugin-2026-04-af_bella-kokoro_onnx/contact-sheet.jpg).

### datadog-cowork-plugin-2026-04 datadog-cowork-plugin-2026-04-am_michael-kokoro.mp4

* info: Left and right channels carry identical mono narration.

Evidence: [analysis](datadog-cowork-plugin-2026-04/datadog-cowork-plugin-2026-04-am_michael-kokoro/analysis.json), [spectrogram](datadog-cowork-plugin-2026-04/datadog-cowork-plugin-2026-04-am_michael-kokoro/spectrogram.jpg), [speech spectrogram](datadog-cowork-plugin-2026-04/datadog-cowork-plugin-2026-04-am_michael-kokoro/spectrogram-speech.jpg), [layers](datadog-cowork-plugin-2026-04/datadog-cowork-plugin-2026-04-am_michael-kokoro/layers.png), [frames](datadog-cowork-plugin-2026-04/datadog-cowork-plugin-2026-04-am_michael-kokoro/contact-sheet.jpg).

## Comparison images

* [Spectrogram stack](spectrogram-stack.jpg)
* [Frame grid](frames-grid.jpg)
* [Layer activity stack](layers-stack.jpg)
