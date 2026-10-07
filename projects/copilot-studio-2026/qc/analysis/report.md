---
title: copilot-studio-2026 render analysis
description: Measured audio, spectrogram and video-layer comparison for every copilot-studio-2026 revision.
---

## Method

Every revision video is decoded with FFmpeg and measured with the core `media-analyze` method. Spectrograms use a Hann window, logarithmic magnitude and a 120 dB range, with frequency, time and dBFS legends. Loudness uses ITU-R BS.1770 (EBU R128). Video layers are measured per layout zone as frame-to-frame motion and edge detail.

These are objective measurements. They do not replace listening and viewing.

## Revisions

| Revision | Status | Output | Voice | Size | Duration | LUFS | True peak | Pause floor | Speech HF>8k | Longest pause | Findings |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| copilot-studio-2026-01 | superseded | copilot-studio-2026-01.mp4 | unrecorded | 1920x1080 | 40.6 s | -19.1 | -1.1 dBTP | -78.0 dBFS | 0.02% | 0.50 s | warning:dc-offset |
| copilot-studio-2026-02 | superseded | copilot-studio-2026-02-raw.mp4 | unrecorded | 1920x1080 | 40.6 s | -19.1 | -1.1 dBTP | -78.0 dBFS | 0.02% | 0.50 s | warning:dc-offset |
| copilot-studio-2026-02 | superseded | copilot-studio-2026-02.mp4 | unrecorded | 1920x1080 | 40.5 s | -19.0 | -1.1 dBTP | -79.4 dBFS | 0.02% | 0.50 s | warning:dc-offset |
| copilot-studio-2026-03 | superseded | copilot-studio-2026-03-raw.mp4 | unrecorded | 1920x1080 | 40.6 s | -19.1 | -1.1 dBTP | -78.0 dBFS | 0.02% | 0.50 s | warning:dc-offset |
| copilot-studio-2026-03 | superseded | copilot-studio-2026-03.mp4 | unrecorded | 1920x1080 | 40.5 s | -19.0 | -1.1 dBTP | -79.4 dBFS | 0.02% | 0.50 s | warning:dc-offset |
| copilot-studio-2026-04 | superseded | copilot-studio-2026-04-raw.mp4 | Microsoft Mark / unknown | 1920x1080 | 40.6 s | -19.1 | -1.1 dBTP | -78.0 dBFS | 0.02% | 0.50 s | warning:dc-offset |
| copilot-studio-2026-04 | superseded | copilot-studio-2026-04.mp4 | Microsoft Mark / unknown | 1920x1080 | 40.5 s | -19.0 | -1.1 dBTP | -79.4 dBFS | 0.02% | 0.50 s | warning:dc-offset |
| copilot-studio-2026-05 | current | copilot-studio-2026-05-am_michael-kokoro_onnx.mp4 | am_michael / kokoro_onnx | 1920x1080 | 68.0 s | -16.1 | -1.5 dBTP | -65.9 dBFS | 0.34% | 1.57 s | none |
| copilot-studio-2026-05 | current | copilot-studio-2026-05-af_heart-kokoro_onnx.mp4 | af_heart / kokoro_onnx | 1920x1080 | 62.6 s | -16.1 | -1.5 dBTP | -69.3 dBFS | 2.12% | 1.32 s | none |
| copilot-studio-2026-05 | current | copilot-studio-2026-05-af_bella-kokoro_onnx.mp4 | af_bella / kokoro_onnx | 1920x1080 | 65.2 s | -16.0 | -1.5 dBTP | -76.9 dBFS | 2.10% | 1.52 s | none |
| copilot-studio-2026-05 | current | copilot-studio-2026-05-am_michael-kokoro.mp4 | am_michael / kokoro | 1920x1080 | 68.0 s | -16.1 | -1.5 dBTP | -65.7 dBFS | 0.34% | 1.57 s | none |

## Findings by revision

### copilot-studio-2026-01 copilot-studio-2026-01.mp4

* warning: DC offset 0.0113754.
* info: Left and right channels carry identical mono narration.

Evidence: [analysis](copilot-studio-2026-01/copilot-studio-2026-01/analysis.json), [spectrogram](copilot-studio-2026-01/copilot-studio-2026-01/spectrogram.jpg), [speech spectrogram](copilot-studio-2026-01/copilot-studio-2026-01/spectrogram-speech.jpg), [layers](copilot-studio-2026-01/copilot-studio-2026-01/layers.png), [frames](copilot-studio-2026-01/copilot-studio-2026-01/contact-sheet.jpg).

### copilot-studio-2026-02 copilot-studio-2026-02-raw.mp4

* warning: DC offset 0.0113754.
* info: Left and right channels carry identical mono narration.

Evidence: [analysis](copilot-studio-2026-02/copilot-studio-2026-02-raw/analysis.json), [spectrogram](copilot-studio-2026-02/copilot-studio-2026-02-raw/spectrogram.jpg), [speech spectrogram](copilot-studio-2026-02/copilot-studio-2026-02-raw/spectrogram-speech.jpg), [layers](copilot-studio-2026-02/copilot-studio-2026-02-raw/layers.png), [frames](copilot-studio-2026-02/copilot-studio-2026-02-raw/contact-sheet.jpg).

### copilot-studio-2026-02 copilot-studio-2026-02.mp4

* warning: DC offset 0.0113874.
* info: Left and right channels carry identical mono narration.

Evidence: [analysis](copilot-studio-2026-02/copilot-studio-2026-02/analysis.json), [spectrogram](copilot-studio-2026-02/copilot-studio-2026-02/spectrogram.jpg), [speech spectrogram](copilot-studio-2026-02/copilot-studio-2026-02/spectrogram-speech.jpg), [layers](copilot-studio-2026-02/copilot-studio-2026-02/layers.png), [frames](copilot-studio-2026-02/copilot-studio-2026-02/contact-sheet.jpg).

### copilot-studio-2026-03 copilot-studio-2026-03-raw.mp4

* warning: DC offset 0.0113754.
* info: Left and right channels carry identical mono narration.

Evidence: [analysis](copilot-studio-2026-03/copilot-studio-2026-03-raw/analysis.json), [spectrogram](copilot-studio-2026-03/copilot-studio-2026-03-raw/spectrogram.jpg), [speech spectrogram](copilot-studio-2026-03/copilot-studio-2026-03-raw/spectrogram-speech.jpg), [layers](copilot-studio-2026-03/copilot-studio-2026-03-raw/layers.png), [frames](copilot-studio-2026-03/copilot-studio-2026-03-raw/contact-sheet.jpg).

### copilot-studio-2026-03 copilot-studio-2026-03.mp4

* warning: DC offset 0.0113874.
* info: Left and right channels carry identical mono narration.

Evidence: [analysis](copilot-studio-2026-03/copilot-studio-2026-03/analysis.json), [spectrogram](copilot-studio-2026-03/copilot-studio-2026-03/spectrogram.jpg), [speech spectrogram](copilot-studio-2026-03/copilot-studio-2026-03/spectrogram-speech.jpg), [layers](copilot-studio-2026-03/copilot-studio-2026-03/layers.png), [frames](copilot-studio-2026-03/copilot-studio-2026-03/contact-sheet.jpg).

### copilot-studio-2026-04 copilot-studio-2026-04-raw.mp4

* warning: DC offset 0.0113754.
* info: Left and right channels carry identical mono narration.

Evidence: [analysis](copilot-studio-2026-04/copilot-studio-2026-04-raw/analysis.json), [spectrogram](copilot-studio-2026-04/copilot-studio-2026-04-raw/spectrogram.jpg), [speech spectrogram](copilot-studio-2026-04/copilot-studio-2026-04-raw/spectrogram-speech.jpg), [layers](copilot-studio-2026-04/copilot-studio-2026-04-raw/layers.png), [frames](copilot-studio-2026-04/copilot-studio-2026-04-raw/contact-sheet.jpg).

### copilot-studio-2026-04 copilot-studio-2026-04.mp4

* warning: DC offset 0.0113874.
* info: Left and right channels carry identical mono narration.

Evidence: [analysis](copilot-studio-2026-04/copilot-studio-2026-04/analysis.json), [spectrogram](copilot-studio-2026-04/copilot-studio-2026-04/spectrogram.jpg), [speech spectrogram](copilot-studio-2026-04/copilot-studio-2026-04/spectrogram-speech.jpg), [layers](copilot-studio-2026-04/copilot-studio-2026-04/layers.png), [frames](copilot-studio-2026-04/copilot-studio-2026-04/contact-sheet.jpg).

### copilot-studio-2026-05 copilot-studio-2026-05-am_michael-kokoro_onnx.mp4

* info: Left and right channels carry identical mono narration.
* info: No visible motion for 8.633 s from 2.5 s.

Evidence: [analysis](copilot-studio-2026-05/copilot-studio-2026-05-am_michael-kokoro_onnx/analysis.json), [spectrogram](copilot-studio-2026-05/copilot-studio-2026-05-am_michael-kokoro_onnx/spectrogram.jpg), [speech spectrogram](copilot-studio-2026-05/copilot-studio-2026-05-am_michael-kokoro_onnx/spectrogram-speech.jpg), [layers](copilot-studio-2026-05/copilot-studio-2026-05-am_michael-kokoro_onnx/layers.png), [frames](copilot-studio-2026-05/copilot-studio-2026-05-am_michael-kokoro_onnx/contact-sheet.jpg).

### copilot-studio-2026-05 copilot-studio-2026-05-af_heart-kokoro_onnx.mp4

* info: Left and right channels carry identical mono narration.
* info: No visible motion for 8.567 s from 2.5 s.

Evidence: [analysis](copilot-studio-2026-05/copilot-studio-2026-05-af_heart-kokoro_onnx/analysis.json), [spectrogram](copilot-studio-2026-05/copilot-studio-2026-05-af_heart-kokoro_onnx/spectrogram.jpg), [speech spectrogram](copilot-studio-2026-05/copilot-studio-2026-05-af_heart-kokoro_onnx/spectrogram-speech.jpg), [layers](copilot-studio-2026-05/copilot-studio-2026-05-af_heart-kokoro_onnx/layers.png), [frames](copilot-studio-2026-05/copilot-studio-2026-05-af_heart-kokoro_onnx/contact-sheet.jpg).

### copilot-studio-2026-05 copilot-studio-2026-05-af_bella-kokoro_onnx.mp4

* info: Left and right channels carry identical mono narration.
* info: No visible motion for 8.6 s from 2.5 s.

Evidence: [analysis](copilot-studio-2026-05/copilot-studio-2026-05-af_bella-kokoro_onnx/analysis.json), [spectrogram](copilot-studio-2026-05/copilot-studio-2026-05-af_bella-kokoro_onnx/spectrogram.jpg), [speech spectrogram](copilot-studio-2026-05/copilot-studio-2026-05-af_bella-kokoro_onnx/spectrogram-speech.jpg), [layers](copilot-studio-2026-05/copilot-studio-2026-05-af_bella-kokoro_onnx/layers.png), [frames](copilot-studio-2026-05/copilot-studio-2026-05-af_bella-kokoro_onnx/contact-sheet.jpg).

### copilot-studio-2026-05 copilot-studio-2026-05-am_michael-kokoro.mp4

* info: Left and right channels carry identical mono narration.
* info: No visible motion for 8.633 s from 2.5 s.

Evidence: [analysis](copilot-studio-2026-05/copilot-studio-2026-05-am_michael-kokoro/analysis.json), [spectrogram](copilot-studio-2026-05/copilot-studio-2026-05-am_michael-kokoro/spectrogram.jpg), [speech spectrogram](copilot-studio-2026-05/copilot-studio-2026-05-am_michael-kokoro/spectrogram-speech.jpg), [layers](copilot-studio-2026-05/copilot-studio-2026-05-am_michael-kokoro/layers.png), [frames](copilot-studio-2026-05/copilot-studio-2026-05-am_michael-kokoro/contact-sheet.jpg).

## Comparison images

* [Spectrogram stack](spectrogram-stack.jpg)
* [Frame grid](frames-grid.jpg)
* [Layer activity stack](layers-stack.jpg)
