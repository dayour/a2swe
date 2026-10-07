---
title: microsoft-autopilot-agents render analysis
description: Measured audio, spectrogram and video-layer comparison for every microsoft-autopilot-agents revision.
---

## Method

Every revision video is decoded with FFmpeg and measured with the core `media-analyze` method. Spectrograms use a Hann window, logarithmic magnitude and a 120 dB range, with frequency, time and dBFS legends. Loudness uses ITU-R BS.1770 (EBU R128). Video layers are measured per layout zone as frame-to-frame motion and edge detail.

These are objective measurements. They do not replace listening and viewing.

## Revisions

| Revision | Status | Output | Voice | Size | Duration | LUFS | True peak | Pause floor | Speech HF>8k | Longest pause | Findings |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| microsoft-autopilot-agents-2026-01 | superseded | microsoft-autopilot-agents-2026-01.mp4 | am_michael / kokoro_onnx | 1920x1080 | 73.4 s | -20.4 | -1.0 dBTP | -65.7 dBFS | 0.30% | 1.60 s | warning:loudness-off-target |
| microsoft-autopilot-agents-2026-02 | superseded | microsoft-autopilot-agents-2026-02.mp4 | am_michael / kokoro_onnx | 1920x1080 | 64.7 s | -22.8 | -1.0 dBTP | -67.9 dBFS | 0.29% | 1.60 s | warning:loudness-off-target |
| microsoft-autopilot-agents-2026-03 | superseded | microsoft-autopilot-agents-2026-03.mp4 | am_michael / kokoro_onnx | 1920x1080 | 61.6 s | -22.6 | -1.0 dBTP | -68.8 dBFS | 0.29% | 1.60 s | warning:loudness-off-target |
| microsoft-autopilot-agents-2026-04 | superseded | microsoft-autopilot-agents-2026-04.mp4 | am_michael / kokoro_onnx | 1920x1080 | 61.6 s | -22.8 | -1.0 dBTP | -68.9 dBFS | 0.29% | 1.60 s | warning:loudness-off-target |
| microsoft-autopilot-agents-2026-05 | current | microsoft-autopilot-agents-2026-05-am_michael-kokoro_onnx.mp4 | am_michael / kokoro_onnx | 1920x1080 | 61.6 s | -16.1 | -1.5 dBTP | -61.8 dBFS | 0.32% | 1.60 s | none |
| microsoft-autopilot-agents-2026-05 | current | microsoft-autopilot-agents-2026-05-af_heart-kokoro_onnx.mp4 | af_heart / kokoro_onnx | 1920x1080 | 56.4 s | -16.1 | -1.5 dBTP | -69.5 dBFS | 2.62% | 1.38 s | none |
| microsoft-autopilot-agents-2026-05 | current | microsoft-autopilot-agents-2026-05-af_bella-kokoro_onnx.mp4 | af_bella / kokoro_onnx | 1920x1080 | 58.5 s | -16.0 | -1.5 dBTP | -77.0 dBFS | 2.26% | 1.52 s | none |
| microsoft-autopilot-agents-2026-05 | current | microsoft-autopilot-agents-2026-05-am_michael-kokoro.mp4 | am_michael / kokoro | 1920x1080 | 61.6 s | -16.1 | -1.5 dBTP | -61.5 dBFS | 0.32% | 1.60 s | none |

## Findings by revision

### microsoft-autopilot-agents-2026-01 microsoft-autopilot-agents-2026-01.mp4

* warning: Integrated loudness -20.4 LUFS is outside -16 ±4 LU for online video.
* info: Left and right channels carry identical mono narration.

Evidence: [analysis](microsoft-autopilot-agents-2026-01/microsoft-autopilot-agents-2026-01/analysis.json), [spectrogram](microsoft-autopilot-agents-2026-01/microsoft-autopilot-agents-2026-01/spectrogram.jpg), [speech spectrogram](microsoft-autopilot-agents-2026-01/microsoft-autopilot-agents-2026-01/spectrogram-speech.jpg), [layers](microsoft-autopilot-agents-2026-01/microsoft-autopilot-agents-2026-01/layers.png), [frames](microsoft-autopilot-agents-2026-01/microsoft-autopilot-agents-2026-01/contact-sheet.jpg).

### microsoft-autopilot-agents-2026-02 microsoft-autopilot-agents-2026-02.mp4

* warning: Integrated loudness -22.8 LUFS is outside -16 ±4 LU for online video.
* info: Left and right channels carry identical mono narration.

Evidence: [analysis](microsoft-autopilot-agents-2026-02/microsoft-autopilot-agents-2026-02/analysis.json), [spectrogram](microsoft-autopilot-agents-2026-02/microsoft-autopilot-agents-2026-02/spectrogram.jpg), [speech spectrogram](microsoft-autopilot-agents-2026-02/microsoft-autopilot-agents-2026-02/spectrogram-speech.jpg), [layers](microsoft-autopilot-agents-2026-02/microsoft-autopilot-agents-2026-02/layers.png), [frames](microsoft-autopilot-agents-2026-02/microsoft-autopilot-agents-2026-02/contact-sheet.jpg).

### microsoft-autopilot-agents-2026-03 microsoft-autopilot-agents-2026-03.mp4

* warning: Integrated loudness -22.6 LUFS is outside -16 ±4 LU for online video.
* info: Left and right channels carry identical mono narration.

Evidence: [analysis](microsoft-autopilot-agents-2026-03/microsoft-autopilot-agents-2026-03/analysis.json), [spectrogram](microsoft-autopilot-agents-2026-03/microsoft-autopilot-agents-2026-03/spectrogram.jpg), [speech spectrogram](microsoft-autopilot-agents-2026-03/microsoft-autopilot-agents-2026-03/spectrogram-speech.jpg), [layers](microsoft-autopilot-agents-2026-03/microsoft-autopilot-agents-2026-03/layers.png), [frames](microsoft-autopilot-agents-2026-03/microsoft-autopilot-agents-2026-03/contact-sheet.jpg).

### microsoft-autopilot-agents-2026-04 microsoft-autopilot-agents-2026-04.mp4

* warning: Integrated loudness -22.8 LUFS is outside -16 ±4 LU for online video.
* info: Left and right channels carry identical mono narration.

Evidence: [analysis](microsoft-autopilot-agents-2026-04/microsoft-autopilot-agents-2026-04/analysis.json), [spectrogram](microsoft-autopilot-agents-2026-04/microsoft-autopilot-agents-2026-04/spectrogram.jpg), [speech spectrogram](microsoft-autopilot-agents-2026-04/microsoft-autopilot-agents-2026-04/spectrogram-speech.jpg), [layers](microsoft-autopilot-agents-2026-04/microsoft-autopilot-agents-2026-04/layers.png), [frames](microsoft-autopilot-agents-2026-04/microsoft-autopilot-agents-2026-04/contact-sheet.jpg).

### microsoft-autopilot-agents-2026-05 microsoft-autopilot-agents-2026-05-am_michael-kokoro_onnx.mp4

* info: Left and right channels carry identical mono narration.

Evidence: [analysis](microsoft-autopilot-agents-2026-05/microsoft-autopilot-agents-2026-05-am_michael-kokoro_onnx/analysis.json), [spectrogram](microsoft-autopilot-agents-2026-05/microsoft-autopilot-agents-2026-05-am_michael-kokoro_onnx/spectrogram.jpg), [speech spectrogram](microsoft-autopilot-agents-2026-05/microsoft-autopilot-agents-2026-05-am_michael-kokoro_onnx/spectrogram-speech.jpg), [layers](microsoft-autopilot-agents-2026-05/microsoft-autopilot-agents-2026-05-am_michael-kokoro_onnx/layers.png), [frames](microsoft-autopilot-agents-2026-05/microsoft-autopilot-agents-2026-05-am_michael-kokoro_onnx/contact-sheet.jpg).

### microsoft-autopilot-agents-2026-05 microsoft-autopilot-agents-2026-05-af_heart-kokoro_onnx.mp4

* info: Left and right channels carry identical mono narration.

Evidence: [analysis](microsoft-autopilot-agents-2026-05/microsoft-autopilot-agents-2026-05-af_heart-kokoro_onnx/analysis.json), [spectrogram](microsoft-autopilot-agents-2026-05/microsoft-autopilot-agents-2026-05-af_heart-kokoro_onnx/spectrogram.jpg), [speech spectrogram](microsoft-autopilot-agents-2026-05/microsoft-autopilot-agents-2026-05-af_heart-kokoro_onnx/spectrogram-speech.jpg), [layers](microsoft-autopilot-agents-2026-05/microsoft-autopilot-agents-2026-05-af_heart-kokoro_onnx/layers.png), [frames](microsoft-autopilot-agents-2026-05/microsoft-autopilot-agents-2026-05-af_heart-kokoro_onnx/contact-sheet.jpg).

### microsoft-autopilot-agents-2026-05 microsoft-autopilot-agents-2026-05-af_bella-kokoro_onnx.mp4

* info: Left and right channels carry identical mono narration.

Evidence: [analysis](microsoft-autopilot-agents-2026-05/microsoft-autopilot-agents-2026-05-af_bella-kokoro_onnx/analysis.json), [spectrogram](microsoft-autopilot-agents-2026-05/microsoft-autopilot-agents-2026-05-af_bella-kokoro_onnx/spectrogram.jpg), [speech spectrogram](microsoft-autopilot-agents-2026-05/microsoft-autopilot-agents-2026-05-af_bella-kokoro_onnx/spectrogram-speech.jpg), [layers](microsoft-autopilot-agents-2026-05/microsoft-autopilot-agents-2026-05-af_bella-kokoro_onnx/layers.png), [frames](microsoft-autopilot-agents-2026-05/microsoft-autopilot-agents-2026-05-af_bella-kokoro_onnx/contact-sheet.jpg).

### microsoft-autopilot-agents-2026-05 microsoft-autopilot-agents-2026-05-am_michael-kokoro.mp4

* info: Left and right channels carry identical mono narration.

Evidence: [analysis](microsoft-autopilot-agents-2026-05/microsoft-autopilot-agents-2026-05-am_michael-kokoro/analysis.json), [spectrogram](microsoft-autopilot-agents-2026-05/microsoft-autopilot-agents-2026-05-am_michael-kokoro/spectrogram.jpg), [speech spectrogram](microsoft-autopilot-agents-2026-05/microsoft-autopilot-agents-2026-05-am_michael-kokoro/spectrogram-speech.jpg), [layers](microsoft-autopilot-agents-2026-05/microsoft-autopilot-agents-2026-05-am_michael-kokoro/layers.png), [frames](microsoft-autopilot-agents-2026-05/microsoft-autopilot-agents-2026-05-am_michael-kokoro/contact-sheet.jpg).

## Comparison images

* [Spectrogram stack](spectrogram-stack.jpg)
* [Frame grid](frames-grid.jpg)
* [Layer activity stack](layers-stack.jpg)
