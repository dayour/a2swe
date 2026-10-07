---
title: power-platform-2026 render analysis
description: Measured audio, spectrogram and video-layer comparison for every power-platform-2026 revision.
---

## Method

Every revision video is decoded with FFmpeg and measured with the core `media-analyze` method. Spectrograms use a Hann window, logarithmic magnitude and a 120 dB range, with frequency, time and dBFS legends. Loudness uses ITU-R BS.1770 (EBU R128). Video layers are measured per layout zone as frame-to-frame motion and edge detail.

These are objective measurements. They do not replace listening and viewing.

## Revisions

| Revision | Status | Output | Voice | Size | Duration | LUFS | True peak | Pause floor | Speech HF>8k | Longest pause | Findings |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| power-platform-2026-01 | superseded | power-platform-2026-01.mp4 | unrecorded | 1920x1080 | 42.2 s | -19.1 | -1.1 dBTP | -77.5 dBFS | 0.02% | 0.60 s | warning:dc-offset |
| power-platform-2026-02 | superseded | power-platform-2026-02.mp4 | unrecorded | 1920x1080 | 42.2 s | -19.1 | -1.1 dBTP | -77.5 dBFS | 0.02% | 0.60 s | warning:dc-offset |
| power-platform-2026-03 | superseded | power-platform-2026-03.mp4 | unrecorded | 1920x1080 | 42.2 s | -19.1 | -1.1 dBTP | -77.5 dBFS | 0.02% | 0.60 s | warning:dc-offset |
| power-platform-2026-04 | superseded | power-platform-2026-04.mp4 | unrecorded | 1920x1080 | 42.2 s | -19.1 | -1.1 dBTP | -77.5 dBFS | 0.02% | 0.60 s | warning:dc-offset |
| power-platform-2026-05 | superseded | power-platform-2026-05.mp4 | unrecorded | 1920x1080 | 42.2 s | -19.2 | -1.1 dBTP | -79.3 dBFS | 0.02% | 0.63 s | warning:dc-offset |
| power-platform-2026-06 | superseded | power-platform-2026-06.mp4 | am_liam / kokoro | 1920x1080 | 36.4 s | -17.5 | -1.0 dBTP | -84.4 dBFS | 0.58% | 0.38 s | none |
| power-platform-2026-07 | current | power-platform-2026-07-am_michael-kokoro_onnx.mp4 | am_michael / kokoro_onnx | 1920x1080 | 66.8 s | -16.1 | -1.5 dBTP | -64.9 dBFS | 0.34% | 1.65 s | none |
| power-platform-2026-07 | current | power-platform-2026-07-af_heart-kokoro_onnx.mp4 | af_heart / kokoro_onnx | 1920x1080 | 60.2 s | -16.1 | -1.5 dBTP | -70.0 dBFS | 2.02% | 1.35 s | none |
| power-platform-2026-07 | current | power-platform-2026-07-af_bella-kokoro_onnx.mp4 | af_bella / kokoro_onnx | 1920x1080 | 64.1 s | -16.1 | -1.5 dBTP | -76.5 dBFS | 1.94% | 1.52 s | none |
| power-platform-2026-07 | current | power-platform-2026-07-am_michael-kokoro.mp4 | am_michael / kokoro | 1920x1080 | 66.8 s | -16.1 | -1.5 dBTP | -64.9 dBFS | 0.34% | 1.65 s | none |

## Findings by revision

### power-platform-2026-01 power-platform-2026-01.mp4

* warning: DC offset 0.0111122.
* info: Left and right channels carry identical mono narration.

Evidence: [analysis](power-platform-2026-01/power-platform-2026-01/analysis.json), [spectrogram](power-platform-2026-01/power-platform-2026-01/spectrogram.jpg), [speech spectrogram](power-platform-2026-01/power-platform-2026-01/spectrogram-speech.jpg), [layers](power-platform-2026-01/power-platform-2026-01/layers.png), [frames](power-platform-2026-01/power-platform-2026-01/contact-sheet.jpg).

### power-platform-2026-02 power-platform-2026-02.mp4

* warning: DC offset 0.0111122.
* info: Left and right channels carry identical mono narration.

Evidence: [analysis](power-platform-2026-02/power-platform-2026-02/analysis.json), [spectrogram](power-platform-2026-02/power-platform-2026-02/spectrogram.jpg), [speech spectrogram](power-platform-2026-02/power-platform-2026-02/spectrogram-speech.jpg), [layers](power-platform-2026-02/power-platform-2026-02/layers.png), [frames](power-platform-2026-02/power-platform-2026-02/contact-sheet.jpg).

### power-platform-2026-03 power-platform-2026-03.mp4

* warning: DC offset 0.0111122.
* info: Left and right channels carry identical mono narration.

Evidence: [analysis](power-platform-2026-03/power-platform-2026-03/analysis.json), [spectrogram](power-platform-2026-03/power-platform-2026-03/spectrogram.jpg), [speech spectrogram](power-platform-2026-03/power-platform-2026-03/spectrogram-speech.jpg), [layers](power-platform-2026-03/power-platform-2026-03/layers.png), [frames](power-platform-2026-03/power-platform-2026-03/contact-sheet.jpg).

### power-platform-2026-04 power-platform-2026-04.mp4

* warning: DC offset 0.0111122.
* info: Left and right channels carry identical mono narration.

Evidence: [analysis](power-platform-2026-04/power-platform-2026-04/analysis.json), [spectrogram](power-platform-2026-04/power-platform-2026-04/spectrogram.jpg), [speech spectrogram](power-platform-2026-04/power-platform-2026-04/spectrogram-speech.jpg), [layers](power-platform-2026-04/power-platform-2026-04/layers.png), [frames](power-platform-2026-04/power-platform-2026-04/contact-sheet.jpg).

### power-platform-2026-05 power-platform-2026-05.mp4

* warning: DC offset 0.0111009.
* info: Left and right channels carry identical mono narration.

Evidence: [analysis](power-platform-2026-05/power-platform-2026-05/analysis.json), [spectrogram](power-platform-2026-05/power-platform-2026-05/spectrogram.jpg), [speech spectrogram](power-platform-2026-05/power-platform-2026-05/spectrogram-speech.jpg), [layers](power-platform-2026-05/power-platform-2026-05/layers.png), [frames](power-platform-2026-05/power-platform-2026-05/contact-sheet.jpg).

### power-platform-2026-06 power-platform-2026-06.mp4

* info: Left and right channels carry identical mono narration.

Evidence: [analysis](power-platform-2026-06/power-platform-2026-06/analysis.json), [spectrogram](power-platform-2026-06/power-platform-2026-06/spectrogram.jpg), [speech spectrogram](power-platform-2026-06/power-platform-2026-06/spectrogram-speech.jpg), [layers](power-platform-2026-06/power-platform-2026-06/layers.png), [frames](power-platform-2026-06/power-platform-2026-06/contact-sheet.jpg).

### power-platform-2026-07 power-platform-2026-07-am_michael-kokoro_onnx.mp4

* info: Left and right channels carry identical mono narration.
* info: No visible motion for 8.067 s from 3.1 s.

Evidence: [analysis](power-platform-2026-07/power-platform-2026-07-am_michael-kokoro_onnx/analysis.json), [spectrogram](power-platform-2026-07/power-platform-2026-07-am_michael-kokoro_onnx/spectrogram.jpg), [speech spectrogram](power-platform-2026-07/power-platform-2026-07-am_michael-kokoro_onnx/spectrogram-speech.jpg), [layers](power-platform-2026-07/power-platform-2026-07-am_michael-kokoro_onnx/layers.png), [frames](power-platform-2026-07/power-platform-2026-07-am_michael-kokoro_onnx/contact-sheet.jpg).

### power-platform-2026-07 power-platform-2026-07-af_heart-kokoro_onnx.mp4

* info: Left and right channels carry identical mono narration.
* info: No visible motion for 8.133 s from 3.033 s.

Evidence: [analysis](power-platform-2026-07/power-platform-2026-07-af_heart-kokoro_onnx/analysis.json), [spectrogram](power-platform-2026-07/power-platform-2026-07-af_heart-kokoro_onnx/spectrogram.jpg), [speech spectrogram](power-platform-2026-07/power-platform-2026-07-af_heart-kokoro_onnx/spectrogram-speech.jpg), [layers](power-platform-2026-07/power-platform-2026-07-af_heart-kokoro_onnx/layers.png), [frames](power-platform-2026-07/power-platform-2026-07-af_heart-kokoro_onnx/contact-sheet.jpg).

### power-platform-2026-07 power-platform-2026-07-af_bella-kokoro_onnx.mp4

* info: Left and right channels carry identical mono narration.
* info: No visible motion for 8.133 s from 3.033 s.

Evidence: [analysis](power-platform-2026-07/power-platform-2026-07-af_bella-kokoro_onnx/analysis.json), [spectrogram](power-platform-2026-07/power-platform-2026-07-af_bella-kokoro_onnx/spectrogram.jpg), [speech spectrogram](power-platform-2026-07/power-platform-2026-07-af_bella-kokoro_onnx/spectrogram-speech.jpg), [layers](power-platform-2026-07/power-platform-2026-07-af_bella-kokoro_onnx/layers.png), [frames](power-platform-2026-07/power-platform-2026-07-af_bella-kokoro_onnx/contact-sheet.jpg).

### power-platform-2026-07 power-platform-2026-07-am_michael-kokoro.mp4

* info: Left and right channels carry identical mono narration.
* info: No visible motion for 8.067 s from 3.1 s.

Evidence: [analysis](power-platform-2026-07/power-platform-2026-07-am_michael-kokoro/analysis.json), [spectrogram](power-platform-2026-07/power-platform-2026-07-am_michael-kokoro/spectrogram.jpg), [speech spectrogram](power-platform-2026-07/power-platform-2026-07-am_michael-kokoro/spectrogram-speech.jpg), [layers](power-platform-2026-07/power-platform-2026-07-am_michael-kokoro/layers.png), [frames](power-platform-2026-07/power-platform-2026-07-am_michael-kokoro/contact-sheet.jpg).

## Comparison images

* [Spectrogram stack](spectrogram-stack.jpg)
* [Frame grid](frames-grid.jpg)
* [Layer activity stack](layers-stack.jpg)
