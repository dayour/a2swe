---
title: microsoft render analysis
description: Measured audio, spectrogram and video-layer comparison for every microsoft revision.
---

## Method

Every revision video is decoded with FFmpeg and measured with the core `media-analyze` method. Spectrograms use a Hann window, logarithmic magnitude and a 120 dB range, with frequency, time and dBFS legends. Loudness uses ITU-R BS.1770 (EBU R128). Video layers are measured per layout zone as frame-to-frame motion and edge detail.

These are objective measurements. They do not replace listening and viewing.

## Revisions

| Revision | Status | Output | Voice | Size | Duration | LUFS | True peak | Pause floor | Speech HF>8k | Longest pause | Findings |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| microsoft-2026-01 | superseded | microsoft-2026-01.mp4 | unrecorded | 1280x720 | 30.1 s | -15.8 | -1.0 dBTP | -97.8 dBFS | 0.19% | 0.40 s | none |
| microsoft-2026-02 | superseded | microsoft-2026-02.mp4 | unrecorded | 1280x720 | 30.1 s | -15.8 | -1.0 dBTP | -97.8 dBFS | 0.19% | 0.40 s | none |
| microsoft-2026-03 | superseded | microsoft-2026-03.mp4 | en-US-AndrewNeural / edge-neural | 1280x720 | 30.0 s | -15.8 | -1.0 dBTP | -91.3 dBFS | 0.19% | 0.40 s | none |
| microsoft-2026-04 | current | microsoft-2026-04-am_michael-kokoro_onnx.mp4 | am_michael / kokoro_onnx | 1920x1080 | 67.8 s | -16.1 | -1.5 dBTP | -64.5 dBFS | 0.29% | 1.60 s | none |
| microsoft-2026-04 | current | microsoft-2026-04-af_heart-kokoro_onnx.mp4 | af_heart / kokoro_onnx | 1920x1080 | 62.4 s | -16.1 | -1.5 dBTP | -69.5 dBFS | 1.98% | 1.38 s | none |
| microsoft-2026-04 | current | microsoft-2026-04-af_bella-kokoro_onnx.mp4 | af_bella / kokoro_onnx | 1920x1080 | 65.2 s | -16.0 | -1.5 dBTP | -77.7 dBFS | 1.81% | 1.55 s | none |
| microsoft-2026-04 | current | microsoft-2026-04-am_michael-kokoro.mp4 | am_michael / kokoro | 1920x1080 | 67.8 s | -16.1 | -1.5 dBTP | -63.3 dBFS | 0.30% | 1.60 s | none |

## Findings by revision

### microsoft-2026-01 microsoft-2026-01.mp4

* info: Video is 1280x720.
* info: Left and right channels carry identical mono narration.

Evidence: [analysis](microsoft-2026-01/microsoft-2026-01/analysis.json), [spectrogram](microsoft-2026-01/microsoft-2026-01/spectrogram.jpg), [speech spectrogram](microsoft-2026-01/microsoft-2026-01/spectrogram-speech.jpg), [layers](microsoft-2026-01/microsoft-2026-01/layers.png), [frames](microsoft-2026-01/microsoft-2026-01/contact-sheet.jpg).

### microsoft-2026-02 microsoft-2026-02.mp4

* info: Video is 1280x720.
* info: Left and right channels carry identical mono narration.

Evidence: [analysis](microsoft-2026-02/microsoft-2026-02/analysis.json), [spectrogram](microsoft-2026-02/microsoft-2026-02/spectrogram.jpg), [speech spectrogram](microsoft-2026-02/microsoft-2026-02/spectrogram-speech.jpg), [layers](microsoft-2026-02/microsoft-2026-02/layers.png), [frames](microsoft-2026-02/microsoft-2026-02/contact-sheet.jpg).

### microsoft-2026-03 microsoft-2026-03.mp4

* info: Video is 1280x720.
* info: Left and right channels carry identical mono narration.

Evidence: [analysis](microsoft-2026-03/microsoft-2026-03/analysis.json), [spectrogram](microsoft-2026-03/microsoft-2026-03/spectrogram.jpg), [speech spectrogram](microsoft-2026-03/microsoft-2026-03/spectrogram-speech.jpg), [layers](microsoft-2026-03/microsoft-2026-03/layers.png), [frames](microsoft-2026-03/microsoft-2026-03/contact-sheet.jpg).

### microsoft-2026-04 microsoft-2026-04-am_michael-kokoro_onnx.mp4

* info: Left and right channels carry identical mono narration.
* info: No visible motion for 8.967 s from 2.233 s.

Evidence: [analysis](microsoft-2026-04/microsoft-2026-04-am_michael-kokoro_onnx/analysis.json), [spectrogram](microsoft-2026-04/microsoft-2026-04-am_michael-kokoro_onnx/spectrogram.jpg), [speech spectrogram](microsoft-2026-04/microsoft-2026-04-am_michael-kokoro_onnx/spectrogram-speech.jpg), [layers](microsoft-2026-04/microsoft-2026-04-am_michael-kokoro_onnx/layers.png), [frames](microsoft-2026-04/microsoft-2026-04-am_michael-kokoro_onnx/contact-sheet.jpg).

### microsoft-2026-04 microsoft-2026-04-af_heart-kokoro_onnx.mp4

* info: Left and right channels carry identical mono narration.
* info: No visible motion for 8.967 s from 2.233 s.

Evidence: [analysis](microsoft-2026-04/microsoft-2026-04-af_heart-kokoro_onnx/analysis.json), [spectrogram](microsoft-2026-04/microsoft-2026-04-af_heart-kokoro_onnx/spectrogram.jpg), [speech spectrogram](microsoft-2026-04/microsoft-2026-04-af_heart-kokoro_onnx/spectrogram-speech.jpg), [layers](microsoft-2026-04/microsoft-2026-04-af_heart-kokoro_onnx/layers.png), [frames](microsoft-2026-04/microsoft-2026-04-af_heart-kokoro_onnx/contact-sheet.jpg).

### microsoft-2026-04 microsoft-2026-04-af_bella-kokoro_onnx.mp4

* info: Left and right channels carry identical mono narration.
* info: No visible motion for 8.533 s from 2.767 s.

Evidence: [analysis](microsoft-2026-04/microsoft-2026-04-af_bella-kokoro_onnx/analysis.json), [spectrogram](microsoft-2026-04/microsoft-2026-04-af_bella-kokoro_onnx/spectrogram.jpg), [speech spectrogram](microsoft-2026-04/microsoft-2026-04-af_bella-kokoro_onnx/spectrogram-speech.jpg), [layers](microsoft-2026-04/microsoft-2026-04-af_bella-kokoro_onnx/layers.png), [frames](microsoft-2026-04/microsoft-2026-04-af_bella-kokoro_onnx/contact-sheet.jpg).

### microsoft-2026-04 microsoft-2026-04-am_michael-kokoro.mp4

* info: Left and right channels carry identical mono narration.
* info: No visible motion for 8.967 s from 2.233 s.

Evidence: [analysis](microsoft-2026-04/microsoft-2026-04-am_michael-kokoro/analysis.json), [spectrogram](microsoft-2026-04/microsoft-2026-04-am_michael-kokoro/spectrogram.jpg), [speech spectrogram](microsoft-2026-04/microsoft-2026-04-am_michael-kokoro/spectrogram-speech.jpg), [layers](microsoft-2026-04/microsoft-2026-04-am_michael-kokoro/layers.png), [frames](microsoft-2026-04/microsoft-2026-04-am_michael-kokoro/contact-sheet.jpg).

## Comparison images

* [Spectrogram stack](spectrogram-stack.jpg)
* [Frame grid](frames-grid.jpg)
* [Layer activity stack](layers-stack.jpg)
