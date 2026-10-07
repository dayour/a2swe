---
title: copilot render analysis
description: Measured audio, spectrogram and video-layer comparison for every copilot revision.
---

## Method

Every revision video is decoded with FFmpeg and measured with the core `media-analyze` method. Spectrograms use a Hann window, logarithmic magnitude and a 120 dB range, with frequency, time and dBFS legends. Loudness uses ITU-R BS.1770 (EBU R128). Video layers are measured per layout zone as frame-to-frame motion and edge detail.

These are objective measurements. They do not replace listening and viewing.

## Revisions

| Revision | Status | Output | Voice | Size | Duration | LUFS | True peak | Pause floor | Speech HF>8k | Longest pause | Findings |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| copilot-2026-01 | superseded | copilot-2026-01.mp4 | unrecorded | 1280x720 | 30.1 s | -16.1 | -1.0 dBTP | -91.9 dBFS | 0.14% | 0.38 s | none |
| copilot-2026-02 | superseded | copilot-2026-02.mp4 | unrecorded | 1280x720 | 30.1 s | -16.1 | -1.0 dBTP | -91.9 dBFS | 0.14% | 0.38 s | none |
| copilot-2026-03 | superseded | copilot-2026-03.mp4 | unrecorded | 1280x720 | 30.0 s | -16.1 | -1.0 dBTP | -87.9 dBFS | 0.14% | 0.38 s | none |
| copilot-2026-04 | superseded | copilot-2026-04.mp4 | unrecorded | 1280x720 | 30.1 s | -16.1 | -1.0 dBTP | -91.9 dBFS | 0.14% | 0.38 s | none |
| copilot-2026-05 | superseded | copilot-2026-05.mp4 | unrecorded | 1280x720 | 30.0 s | -16.1 | -1.0 dBTP | -87.9 dBFS | 0.14% | 0.38 s | none |
| copilot-2026-06 | superseded | copilot-2026-06.mp4 | en-US-AndrewNeural / edge-neural | 1280x720 | 30.0 s | -16.1 | -1.0 dBTP | -87.9 dBFS | 0.14% | 0.38 s | none |
| copilot-2026-07 | superseded | copilot-2026-07-am_michael-kokoro_onnx.mp4 | am_michael / kokoro_onnx | 1920x1080 | 65.2 s | -16.1 | -1.5 dBTP | -67.8 dBFS | 0.31% | 1.60 s | none |
| copilot-2026-07 | superseded | copilot-2026-07-af_heart-kokoro_onnx.mp4 | af_heart / kokoro_onnx | 1920x1080 | 59.6 s | -16.1 | -1.5 dBTP | -74.2 dBFS | 2.17% | 1.35 s | none |
| copilot-2026-07 | superseded | copilot-2026-07-af_bella-kokoro_onnx.mp4 | af_bella / kokoro_onnx | 1920x1080 | 62.4 s | -16.1 | -1.5 dBTP | -77.3 dBFS | 2.05% | 1.50 s | none |
| copilot-2026-07 | superseded | copilot-2026-07-am_michael-kokoro.mp4 | am_michael / kokoro | 1920x1080 | 65.2 s | -16.1 | -1.5 dBTP | -67.7 dBFS | 0.31% | 1.60 s | none |
| copilot-2026-08 | superseded | copilot-2026-08-am_michael-kokoro_onnx.mp4 | am_michael / kokoro_onnx | 1920x1080 | 65.2 s | -16.1 | -1.5 dBTP | -67.8 dBFS | 0.31% | 1.60 s | none |
| copilot-2026-08 | superseded | copilot-2026-08-af_heart-kokoro_onnx.mp4 | af_heart / kokoro_onnx | 1920x1080 | 59.6 s | -16.1 | -1.5 dBTP | -74.1 dBFS | 2.17% | 1.35 s | none |
| copilot-2026-08 | superseded | copilot-2026-08-af_bella-kokoro_onnx.mp4 | af_bella / kokoro_onnx | 1920x1080 | 62.4 s | -16.1 | -1.5 dBTP | -77.3 dBFS | 2.04% | 1.50 s | none |
| copilot-2026-08 | superseded | copilot-2026-08-am_michael-kokoro.mp4 | am_michael / kokoro | 1920x1080 | 65.2 s | -16.1 | -1.5 dBTP | -67.7 dBFS | 0.31% | 1.60 s | none |
| copilot-2026-09 | current | copilot-2026-09-am_michael-kokoro_onnx.mp4 | am_michael / kokoro_onnx | 1920x1080 | 65.2 s | -16.1 | -1.5 dBTP | -67.9 dBFS | 0.31% | 1.57 s | none |
| copilot-2026-09 | current | copilot-2026-09-af_heart-kokoro_onnx.mp4 | af_heart / kokoro_onnx | 1920x1080 | 59.6 s | -16.1 | -1.5 dBTP | -74.1 dBFS | 2.17% | 1.35 s | none |
| copilot-2026-09 | current | copilot-2026-09-af_bella-kokoro_onnx.mp4 | af_bella / kokoro_onnx | 1920x1080 | 62.4 s | -16.1 | -1.5 dBTP | -77.3 dBFS | 2.04% | 1.50 s | none |
| copilot-2026-09 | current | copilot-2026-09-am_michael-kokoro.mp4 | am_michael / kokoro | 1920x1080 | 65.2 s | -16.1 | -1.5 dBTP | -67.9 dBFS | 0.31% | 1.60 s | none |

## Findings by revision

### copilot-2026-01 copilot-2026-01.mp4

* info: Video is 1280x720.
* info: Left and right channels carry identical mono narration.

Evidence: [analysis](copilot-2026-01/copilot-2026-01/analysis.json), [spectrogram](copilot-2026-01/copilot-2026-01/spectrogram.jpg), [speech spectrogram](copilot-2026-01/copilot-2026-01/spectrogram-speech.jpg), [layers](copilot-2026-01/copilot-2026-01/layers.png), [frames](copilot-2026-01/copilot-2026-01/contact-sheet.jpg).

### copilot-2026-02 copilot-2026-02.mp4

* info: Video is 1280x720.
* info: Left and right channels carry identical mono narration.

Evidence: [analysis](copilot-2026-02/copilot-2026-02/analysis.json), [spectrogram](copilot-2026-02/copilot-2026-02/spectrogram.jpg), [speech spectrogram](copilot-2026-02/copilot-2026-02/spectrogram-speech.jpg), [layers](copilot-2026-02/copilot-2026-02/layers.png), [frames](copilot-2026-02/copilot-2026-02/contact-sheet.jpg).

### copilot-2026-03 copilot-2026-03.mp4

* info: Video is 1280x720.
* info: Left and right channels carry identical mono narration.

Evidence: [analysis](copilot-2026-03/copilot-2026-03/analysis.json), [spectrogram](copilot-2026-03/copilot-2026-03/spectrogram.jpg), [speech spectrogram](copilot-2026-03/copilot-2026-03/spectrogram-speech.jpg), [layers](copilot-2026-03/copilot-2026-03/layers.png), [frames](copilot-2026-03/copilot-2026-03/contact-sheet.jpg).

### copilot-2026-04 copilot-2026-04.mp4

* info: Video is 1280x720.
* info: Left and right channels carry identical mono narration.

Evidence: [analysis](copilot-2026-04/copilot-2026-04/analysis.json), [spectrogram](copilot-2026-04/copilot-2026-04/spectrogram.jpg), [speech spectrogram](copilot-2026-04/copilot-2026-04/spectrogram-speech.jpg), [layers](copilot-2026-04/copilot-2026-04/layers.png), [frames](copilot-2026-04/copilot-2026-04/contact-sheet.jpg).

### copilot-2026-05 copilot-2026-05.mp4

* info: Video is 1280x720.
* info: Left and right channels carry identical mono narration.

Evidence: [analysis](copilot-2026-05/copilot-2026-05/analysis.json), [spectrogram](copilot-2026-05/copilot-2026-05/spectrogram.jpg), [speech spectrogram](copilot-2026-05/copilot-2026-05/spectrogram-speech.jpg), [layers](copilot-2026-05/copilot-2026-05/layers.png), [frames](copilot-2026-05/copilot-2026-05/contact-sheet.jpg).

### copilot-2026-06 copilot-2026-06.mp4

* info: Video is 1280x720.
* info: Left and right channels carry identical mono narration.

Evidence: [analysis](copilot-2026-06/copilot-2026-06/analysis.json), [spectrogram](copilot-2026-06/copilot-2026-06/spectrogram.jpg), [speech spectrogram](copilot-2026-06/copilot-2026-06/spectrogram-speech.jpg), [layers](copilot-2026-06/copilot-2026-06/layers.png), [frames](copilot-2026-06/copilot-2026-06/contact-sheet.jpg).

### copilot-2026-07 copilot-2026-07-am_michael-kokoro_onnx.mp4

* info: Left and right channels carry identical mono narration.
* info: No visible motion for 8.167 s from 2.467 s.

Evidence: [analysis](copilot-2026-07/copilot-2026-07-am_michael-kokoro_onnx/analysis.json), [spectrogram](copilot-2026-07/copilot-2026-07-am_michael-kokoro_onnx/spectrogram.jpg), [speech spectrogram](copilot-2026-07/copilot-2026-07-am_michael-kokoro_onnx/spectrogram-speech.jpg), [layers](copilot-2026-07/copilot-2026-07-am_michael-kokoro_onnx/layers.png), [frames](copilot-2026-07/copilot-2026-07-am_michael-kokoro_onnx/contact-sheet.jpg).

### copilot-2026-07 copilot-2026-07-af_heart-kokoro_onnx.mp4

* info: Left and right channels carry identical mono narration.
* info: No visible motion for 8.1 s from 2.467 s.

Evidence: [analysis](copilot-2026-07/copilot-2026-07-af_heart-kokoro_onnx/analysis.json), [spectrogram](copilot-2026-07/copilot-2026-07-af_heart-kokoro_onnx/spectrogram.jpg), [speech spectrogram](copilot-2026-07/copilot-2026-07-af_heart-kokoro_onnx/spectrogram-speech.jpg), [layers](copilot-2026-07/copilot-2026-07-af_heart-kokoro_onnx/layers.png), [frames](copilot-2026-07/copilot-2026-07-af_heart-kokoro_onnx/contact-sheet.jpg).

### copilot-2026-07 copilot-2026-07-af_bella-kokoro_onnx.mp4

* info: Left and right channels carry identical mono narration.
* info: No visible motion for 8.167 s from 2.467 s.

Evidence: [analysis](copilot-2026-07/copilot-2026-07-af_bella-kokoro_onnx/analysis.json), [spectrogram](copilot-2026-07/copilot-2026-07-af_bella-kokoro_onnx/spectrogram.jpg), [speech spectrogram](copilot-2026-07/copilot-2026-07-af_bella-kokoro_onnx/spectrogram-speech.jpg), [layers](copilot-2026-07/copilot-2026-07-af_bella-kokoro_onnx/layers.png), [frames](copilot-2026-07/copilot-2026-07-af_bella-kokoro_onnx/contact-sheet.jpg).

### copilot-2026-07 copilot-2026-07-am_michael-kokoro.mp4

* info: Left and right channels carry identical mono narration.
* info: No visible motion for 8.167 s from 2.467 s.

Evidence: [analysis](copilot-2026-07/copilot-2026-07-am_michael-kokoro/analysis.json), [spectrogram](copilot-2026-07/copilot-2026-07-am_michael-kokoro/spectrogram.jpg), [speech spectrogram](copilot-2026-07/copilot-2026-07-am_michael-kokoro/spectrogram-speech.jpg), [layers](copilot-2026-07/copilot-2026-07-am_michael-kokoro/layers.png), [frames](copilot-2026-07/copilot-2026-07-am_michael-kokoro/contact-sheet.jpg).

### copilot-2026-08 copilot-2026-08-am_michael-kokoro_onnx.mp4

* info: Left and right channels carry identical mono narration.
* info: No visible motion for 8.167 s from 2.467 s.

Evidence: [analysis](copilot-2026-08/copilot-2026-08-am_michael-kokoro_onnx/analysis.json), [spectrogram](copilot-2026-08/copilot-2026-08-am_michael-kokoro_onnx/spectrogram.jpg), [speech spectrogram](copilot-2026-08/copilot-2026-08-am_michael-kokoro_onnx/spectrogram-speech.jpg), [layers](copilot-2026-08/copilot-2026-08-am_michael-kokoro_onnx/layers.png), [frames](copilot-2026-08/copilot-2026-08-am_michael-kokoro_onnx/contact-sheet.jpg).

### copilot-2026-08 copilot-2026-08-af_heart-kokoro_onnx.mp4

* info: Left and right channels carry identical mono narration.
* info: No visible motion for 8.1 s from 2.467 s.

Evidence: [analysis](copilot-2026-08/copilot-2026-08-af_heart-kokoro_onnx/analysis.json), [spectrogram](copilot-2026-08/copilot-2026-08-af_heart-kokoro_onnx/spectrogram.jpg), [speech spectrogram](copilot-2026-08/copilot-2026-08-af_heart-kokoro_onnx/spectrogram-speech.jpg), [layers](copilot-2026-08/copilot-2026-08-af_heart-kokoro_onnx/layers.png), [frames](copilot-2026-08/copilot-2026-08-af_heart-kokoro_onnx/contact-sheet.jpg).

### copilot-2026-08 copilot-2026-08-af_bella-kokoro_onnx.mp4

* info: Left and right channels carry identical mono narration.
* info: No visible motion for 8.167 s from 2.467 s.

Evidence: [analysis](copilot-2026-08/copilot-2026-08-af_bella-kokoro_onnx/analysis.json), [spectrogram](copilot-2026-08/copilot-2026-08-af_bella-kokoro_onnx/spectrogram.jpg), [speech spectrogram](copilot-2026-08/copilot-2026-08-af_bella-kokoro_onnx/spectrogram-speech.jpg), [layers](copilot-2026-08/copilot-2026-08-af_bella-kokoro_onnx/layers.png), [frames](copilot-2026-08/copilot-2026-08-af_bella-kokoro_onnx/contact-sheet.jpg).

### copilot-2026-08 copilot-2026-08-am_michael-kokoro.mp4

* info: Left and right channels carry identical mono narration.
* info: No visible motion for 8.167 s from 2.467 s.

Evidence: [analysis](copilot-2026-08/copilot-2026-08-am_michael-kokoro/analysis.json), [spectrogram](copilot-2026-08/copilot-2026-08-am_michael-kokoro/spectrogram.jpg), [speech spectrogram](copilot-2026-08/copilot-2026-08-am_michael-kokoro/spectrogram-speech.jpg), [layers](copilot-2026-08/copilot-2026-08-am_michael-kokoro/layers.png), [frames](copilot-2026-08/copilot-2026-08-am_michael-kokoro/contact-sheet.jpg).

### copilot-2026-09 copilot-2026-09-am_michael-kokoro_onnx.mp4

* info: Left and right channels carry identical mono narration.
* info: No visible motion for 8.167 s from 2.467 s.

Evidence: [analysis](copilot-2026-09/copilot-2026-09-am_michael-kokoro_onnx/analysis.json), [spectrogram](copilot-2026-09/copilot-2026-09-am_michael-kokoro_onnx/spectrogram.jpg), [speech spectrogram](copilot-2026-09/copilot-2026-09-am_michael-kokoro_onnx/spectrogram-speech.jpg), [layers](copilot-2026-09/copilot-2026-09-am_michael-kokoro_onnx/layers.png), [frames](copilot-2026-09/copilot-2026-09-am_michael-kokoro_onnx/contact-sheet.jpg).

### copilot-2026-09 copilot-2026-09-af_heart-kokoro_onnx.mp4

* info: Left and right channels carry identical mono narration.
* info: No visible motion for 8.1 s from 2.467 s.

Evidence: [analysis](copilot-2026-09/copilot-2026-09-af_heart-kokoro_onnx/analysis.json), [spectrogram](copilot-2026-09/copilot-2026-09-af_heart-kokoro_onnx/spectrogram.jpg), [speech spectrogram](copilot-2026-09/copilot-2026-09-af_heart-kokoro_onnx/spectrogram-speech.jpg), [layers](copilot-2026-09/copilot-2026-09-af_heart-kokoro_onnx/layers.png), [frames](copilot-2026-09/copilot-2026-09-af_heart-kokoro_onnx/contact-sheet.jpg).

### copilot-2026-09 copilot-2026-09-af_bella-kokoro_onnx.mp4

* info: Left and right channels carry identical mono narration.
* info: No visible motion for 8.167 s from 2.467 s.

Evidence: [analysis](copilot-2026-09/copilot-2026-09-af_bella-kokoro_onnx/analysis.json), [spectrogram](copilot-2026-09/copilot-2026-09-af_bella-kokoro_onnx/spectrogram.jpg), [speech spectrogram](copilot-2026-09/copilot-2026-09-af_bella-kokoro_onnx/spectrogram-speech.jpg), [layers](copilot-2026-09/copilot-2026-09-af_bella-kokoro_onnx/layers.png), [frames](copilot-2026-09/copilot-2026-09-af_bella-kokoro_onnx/contact-sheet.jpg).

### copilot-2026-09 copilot-2026-09-am_michael-kokoro.mp4

* info: Left and right channels carry identical mono narration.
* info: No visible motion for 8.167 s from 2.467 s.

Evidence: [analysis](copilot-2026-09/copilot-2026-09-am_michael-kokoro/analysis.json), [spectrogram](copilot-2026-09/copilot-2026-09-am_michael-kokoro/spectrogram.jpg), [speech spectrogram](copilot-2026-09/copilot-2026-09-am_michael-kokoro/spectrogram-speech.jpg), [layers](copilot-2026-09/copilot-2026-09-am_michael-kokoro/layers.png), [frames](copilot-2026-09/copilot-2026-09-am_michael-kokoro/contact-sheet.jpg).

## Comparison images

* [Spectrogram stack](spectrogram-stack.jpg)
* [Frame grid](frames-grid.jpg)
* [Layer activity stack](layers-stack.jpg)
