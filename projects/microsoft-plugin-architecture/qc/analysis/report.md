---
title: microsoft-plugin-architecture render analysis
description: Measured audio, spectrogram and video-layer comparison for every microsoft-plugin-architecture revision.
---

## Method

Every revision video is decoded with FFmpeg and measured with the core `media-analyze` method. Spectrograms use a Hann window, logarithmic magnitude and a 120 dB range, with frequency, time and dBFS legends. Loudness uses ITU-R BS.1770 (EBU R128). Video layers are measured per layout zone as frame-to-frame motion and edge detail.

These are objective measurements. They do not replace listening and viewing.

## Revisions

| Revision | Status | Output | Voice | Size | Duration | LUFS | True peak | Pause floor | Speech HF>8k | Longest pause | Findings |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| microsoft-plugin-architecture-2026-01 | superseded | microsoft-plugin-architecture-2026-01.mp4 | am_michael / kokoro_onnx | 1920x1080 | 82.3 s | -20.6 | -1.0 dBTP | -65.8 dBFS | 0.31% | 1.65 s | warning:loudness-off-target |
| microsoft-plugin-architecture-2026-02 | superseded | microsoft-plugin-architecture-2026-02.mp4 | am_michael / kokoro_onnx | 1920x1080 | 63.6 s | -20.5 | -1.0 dBTP | -74.2 dBFS | 0.29% | 1.65 s | warning:loudness-off-target |
| microsoft-plugin-architecture-2026-03 | superseded | microsoft-plugin-architecture-2026-03.mp4 | am_michael / kokoro_onnx | 1920x1080 | 63.6 s | -20.8 | -1.0 dBTP | -74.6 dBFS | 0.29% | 1.65 s | warning:loudness-off-target |
| microsoft-plugin-architecture-2026-04 | superseded | microsoft-plugin-architecture-2026-04-am_michael-kokoro_onnx.mp4 | am_michael / kokoro_onnx | 1920x1080 | 63.6 s | -16.1 | -1.5 dBTP | -69.2 dBFS | 0.32% | 1.65 s | none |
| microsoft-plugin-architecture-2026-04 | superseded | microsoft-plugin-architecture-2026-04-af_heart-kokoro_onnx.mp4 | af_heart / kokoro_onnx | 1920x1080 | 57.3 s | -16.1 | -1.5 dBTP | -74.0 dBFS | 2.44% | 1.32 s | none |
| microsoft-plugin-architecture-2026-04 | superseded | microsoft-plugin-architecture-2026-04-af_bella-kokoro_onnx.mp4 | af_bella / kokoro_onnx | 1920x1080 | 59.7 s | -16.1 | -1.5 dBTP | -78.9 dBFS | 2.19% | 1.52 s | none |
| microsoft-plugin-architecture-2026-04 | superseded | microsoft-plugin-architecture-2026-04-am_michael-kokoro.mp4 | am_michael / kokoro | 1920x1080 | 63.6 s | -16.1 | -1.5 dBTP | -69.3 dBFS | 0.32% | 1.65 s | none |
| microsoft-plugin-architecture-2026-05 | current | microsoft-plugin-architecture-2026-05-am_michael-kokoro_onnx.mp4 | am_michael / kokoro_onnx | 1920x1080 | 63.6 s | -16.1 | -1.5 dBTP | -69.4 dBFS | 0.32% | 1.65 s | none |
| microsoft-plugin-architecture-2026-05 | current | microsoft-plugin-architecture-2026-05-af_heart-kokoro_onnx.mp4 | af_heart / kokoro_onnx | 1920x1080 | 57.3 s | -16.1 | -1.5 dBTP | -74.0 dBFS | 2.45% | 1.32 s | none |
| microsoft-plugin-architecture-2026-05 | current | microsoft-plugin-architecture-2026-05-af_bella-kokoro_onnx.mp4 | af_bella / kokoro_onnx | 1920x1080 | 59.7 s | -16.1 | -1.5 dBTP | -78.8 dBFS | 2.19% | 1.52 s | none |
| microsoft-plugin-architecture-2026-05 | current | microsoft-plugin-architecture-2026-05-am_michael-kokoro.mp4 | am_michael / kokoro | 1920x1080 | 63.6 s | -16.1 | -1.5 dBTP | -69.2 dBFS | 0.32% | 1.65 s | none |

## Findings by revision

### microsoft-plugin-architecture-2026-01 microsoft-plugin-architecture-2026-01.mp4

* warning: Integrated loudness -20.6 LUFS is outside -16 ±4 LU for online video.
* info: Left and right channels carry identical mono narration.

Evidence: [analysis](microsoft-plugin-architecture-2026-01/microsoft-plugin-architecture-2026-01/analysis.json), [spectrogram](microsoft-plugin-architecture-2026-01/microsoft-plugin-architecture-2026-01/spectrogram.jpg), [speech spectrogram](microsoft-plugin-architecture-2026-01/microsoft-plugin-architecture-2026-01/spectrogram-speech.jpg), [layers](microsoft-plugin-architecture-2026-01/microsoft-plugin-architecture-2026-01/layers.png), [frames](microsoft-plugin-architecture-2026-01/microsoft-plugin-architecture-2026-01/contact-sheet.jpg).

### microsoft-plugin-architecture-2026-02 microsoft-plugin-architecture-2026-02.mp4

* warning: Integrated loudness -20.5 LUFS is outside -16 ±4 LU for online video.
* info: Left and right channels carry identical mono narration.

Evidence: [analysis](microsoft-plugin-architecture-2026-02/microsoft-plugin-architecture-2026-02/analysis.json), [spectrogram](microsoft-plugin-architecture-2026-02/microsoft-plugin-architecture-2026-02/spectrogram.jpg), [speech spectrogram](microsoft-plugin-architecture-2026-02/microsoft-plugin-architecture-2026-02/spectrogram-speech.jpg), [layers](microsoft-plugin-architecture-2026-02/microsoft-plugin-architecture-2026-02/layers.png), [frames](microsoft-plugin-architecture-2026-02/microsoft-plugin-architecture-2026-02/contact-sheet.jpg).

### microsoft-plugin-architecture-2026-03 microsoft-plugin-architecture-2026-03.mp4

* warning: Integrated loudness -20.8 LUFS is outside -16 ±4 LU for online video.
* info: Left and right channels carry identical mono narration.

Evidence: [analysis](microsoft-plugin-architecture-2026-03/microsoft-plugin-architecture-2026-03/analysis.json), [spectrogram](microsoft-plugin-architecture-2026-03/microsoft-plugin-architecture-2026-03/spectrogram.jpg), [speech spectrogram](microsoft-plugin-architecture-2026-03/microsoft-plugin-architecture-2026-03/spectrogram-speech.jpg), [layers](microsoft-plugin-architecture-2026-03/microsoft-plugin-architecture-2026-03/layers.png), [frames](microsoft-plugin-architecture-2026-03/microsoft-plugin-architecture-2026-03/contact-sheet.jpg).

### microsoft-plugin-architecture-2026-04 microsoft-plugin-architecture-2026-04-am_michael-kokoro_onnx.mp4

* info: Left and right channels carry identical mono narration.

Evidence: [analysis](microsoft-plugin-architecture-2026-04/microsoft-plugin-architecture-2026-04-am_michael-kokoro_onnx/analysis.json), [spectrogram](microsoft-plugin-architecture-2026-04/microsoft-plugin-architecture-2026-04-am_michael-kokoro_onnx/spectrogram.jpg), [speech spectrogram](microsoft-plugin-architecture-2026-04/microsoft-plugin-architecture-2026-04-am_michael-kokoro_onnx/spectrogram-speech.jpg), [layers](microsoft-plugin-architecture-2026-04/microsoft-plugin-architecture-2026-04-am_michael-kokoro_onnx/layers.png), [frames](microsoft-plugin-architecture-2026-04/microsoft-plugin-architecture-2026-04-am_michael-kokoro_onnx/contact-sheet.jpg).

### microsoft-plugin-architecture-2026-04 microsoft-plugin-architecture-2026-04-af_heart-kokoro_onnx.mp4

* info: Left and right channels carry identical mono narration.
* info: No visible motion for 8.167 s from 48.533 s.

Evidence: [analysis](microsoft-plugin-architecture-2026-04/microsoft-plugin-architecture-2026-04-af_heart-kokoro_onnx/analysis.json), [spectrogram](microsoft-plugin-architecture-2026-04/microsoft-plugin-architecture-2026-04-af_heart-kokoro_onnx/spectrogram.jpg), [speech spectrogram](microsoft-plugin-architecture-2026-04/microsoft-plugin-architecture-2026-04-af_heart-kokoro_onnx/spectrogram-speech.jpg), [layers](microsoft-plugin-architecture-2026-04/microsoft-plugin-architecture-2026-04-af_heart-kokoro_onnx/layers.png), [frames](microsoft-plugin-architecture-2026-04/microsoft-plugin-architecture-2026-04-af_heart-kokoro_onnx/contact-sheet.jpg).

### microsoft-plugin-architecture-2026-04 microsoft-plugin-architecture-2026-04-af_bella-kokoro_onnx.mp4

* info: Left and right channels carry identical mono narration.

Evidence: [analysis](microsoft-plugin-architecture-2026-04/microsoft-plugin-architecture-2026-04-af_bella-kokoro_onnx/analysis.json), [spectrogram](microsoft-plugin-architecture-2026-04/microsoft-plugin-architecture-2026-04-af_bella-kokoro_onnx/spectrogram.jpg), [speech spectrogram](microsoft-plugin-architecture-2026-04/microsoft-plugin-architecture-2026-04-af_bella-kokoro_onnx/spectrogram-speech.jpg), [layers](microsoft-plugin-architecture-2026-04/microsoft-plugin-architecture-2026-04-af_bella-kokoro_onnx/layers.png), [frames](microsoft-plugin-architecture-2026-04/microsoft-plugin-architecture-2026-04-af_bella-kokoro_onnx/contact-sheet.jpg).

### microsoft-plugin-architecture-2026-04 microsoft-plugin-architecture-2026-04-am_michael-kokoro.mp4

* info: Left and right channels carry identical mono narration.

Evidence: [analysis](microsoft-plugin-architecture-2026-04/microsoft-plugin-architecture-2026-04-am_michael-kokoro/analysis.json), [spectrogram](microsoft-plugin-architecture-2026-04/microsoft-plugin-architecture-2026-04-am_michael-kokoro/spectrogram.jpg), [speech spectrogram](microsoft-plugin-architecture-2026-04/microsoft-plugin-architecture-2026-04-am_michael-kokoro/spectrogram-speech.jpg), [layers](microsoft-plugin-architecture-2026-04/microsoft-plugin-architecture-2026-04-am_michael-kokoro/layers.png), [frames](microsoft-plugin-architecture-2026-04/microsoft-plugin-architecture-2026-04-am_michael-kokoro/contact-sheet.jpg).

### microsoft-plugin-architecture-2026-05 microsoft-plugin-architecture-2026-05-am_michael-kokoro_onnx.mp4

* info: Left and right channels carry identical mono narration.

Evidence: [analysis](microsoft-plugin-architecture-2026-05/microsoft-plugin-architecture-2026-05-am_michael-kokoro_onnx/analysis.json), [spectrogram](microsoft-plugin-architecture-2026-05/microsoft-plugin-architecture-2026-05-am_michael-kokoro_onnx/spectrogram.jpg), [speech spectrogram](microsoft-plugin-architecture-2026-05/microsoft-plugin-architecture-2026-05-am_michael-kokoro_onnx/spectrogram-speech.jpg), [layers](microsoft-plugin-architecture-2026-05/microsoft-plugin-architecture-2026-05-am_michael-kokoro_onnx/layers.png), [frames](microsoft-plugin-architecture-2026-05/microsoft-plugin-architecture-2026-05-am_michael-kokoro_onnx/contact-sheet.jpg).

### microsoft-plugin-architecture-2026-05 microsoft-plugin-architecture-2026-05-af_heart-kokoro_onnx.mp4

* info: Left and right channels carry identical mono narration.
* info: No visible motion for 8.167 s from 48.533 s.

Evidence: [analysis](microsoft-plugin-architecture-2026-05/microsoft-plugin-architecture-2026-05-af_heart-kokoro_onnx/analysis.json), [spectrogram](microsoft-plugin-architecture-2026-05/microsoft-plugin-architecture-2026-05-af_heart-kokoro_onnx/spectrogram.jpg), [speech spectrogram](microsoft-plugin-architecture-2026-05/microsoft-plugin-architecture-2026-05-af_heart-kokoro_onnx/spectrogram-speech.jpg), [layers](microsoft-plugin-architecture-2026-05/microsoft-plugin-architecture-2026-05-af_heart-kokoro_onnx/layers.png), [frames](microsoft-plugin-architecture-2026-05/microsoft-plugin-architecture-2026-05-af_heart-kokoro_onnx/contact-sheet.jpg).

### microsoft-plugin-architecture-2026-05 microsoft-plugin-architecture-2026-05-af_bella-kokoro_onnx.mp4

* info: Left and right channels carry identical mono narration.

Evidence: [analysis](microsoft-plugin-architecture-2026-05/microsoft-plugin-architecture-2026-05-af_bella-kokoro_onnx/analysis.json), [spectrogram](microsoft-plugin-architecture-2026-05/microsoft-plugin-architecture-2026-05-af_bella-kokoro_onnx/spectrogram.jpg), [speech spectrogram](microsoft-plugin-architecture-2026-05/microsoft-plugin-architecture-2026-05-af_bella-kokoro_onnx/spectrogram-speech.jpg), [layers](microsoft-plugin-architecture-2026-05/microsoft-plugin-architecture-2026-05-af_bella-kokoro_onnx/layers.png), [frames](microsoft-plugin-architecture-2026-05/microsoft-plugin-architecture-2026-05-af_bella-kokoro_onnx/contact-sheet.jpg).

### microsoft-plugin-architecture-2026-05 microsoft-plugin-architecture-2026-05-am_michael-kokoro.mp4

* info: Left and right channels carry identical mono narration.

Evidence: [analysis](microsoft-plugin-architecture-2026-05/microsoft-plugin-architecture-2026-05-am_michael-kokoro/analysis.json), [spectrogram](microsoft-plugin-architecture-2026-05/microsoft-plugin-architecture-2026-05-am_michael-kokoro/spectrogram.jpg), [speech spectrogram](microsoft-plugin-architecture-2026-05/microsoft-plugin-architecture-2026-05-am_michael-kokoro/spectrogram-speech.jpg), [layers](microsoft-plugin-architecture-2026-05/microsoft-plugin-architecture-2026-05-am_michael-kokoro/layers.png), [frames](microsoft-plugin-architecture-2026-05/microsoft-plugin-architecture-2026-05-am_michael-kokoro/contact-sheet.jpg).

## Comparison images

* [Spectrogram stack](spectrogram-stack.jpg)
* [Frame grid](frames-grid.jpg)
* [Layer activity stack](layers-stack.jpg)
