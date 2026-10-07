---
title: power-platform-community-conference render analysis
description: Measured audio, spectrogram and video-layer comparison for every power-platform-community-conference revision.
---

## Method

Every revision video is decoded with FFmpeg and measured with the core `media-analyze` method. Spectrograms use a Hann window, logarithmic magnitude and a 120 dB range, with frequency, time and dBFS legends. Loudness uses ITU-R BS.1770 (EBU R128). Video layers are measured per layout zone as frame-to-frame motion and edge detail.

These are objective measurements. They do not replace listening and viewing.

## Revisions

| Revision | Status | Output | Voice | Size | Duration | LUFS | True peak | Pause floor | Speech HF>8k | Longest pause | Findings |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| power-platform-community-conference-2026-01 | rejected | power-platform-community-conference-2026-01.mp4 | am_michael / kokoro_onnx | 1920x1080 | 80.1 s | -20.4 | -1.0 dBTP | -68.3 dBFS | 0.32% | 1.65 s | warning:loudness-off-target |
| power-platform-community-conference-2026-02 | rejected | power-platform-community-conference-2026-02.mp4 | am_michael / kokoro_onnx | 1920x1080 | 80.1 s | -20.3 | -1.0 dBTP | -68.2 dBFS | 0.32% | 1.65 s | warning:loudness-off-target |
| power-platform-community-conference-2026-03 | superseded | power-platform-community-conference-2026-03.mp4 | am_michael / kokoro_onnx | 1920x1080 | 80.1 s | -20.3 | -1.0 dBTP | -68.2 dBFS | 0.32% | 1.65 s | warning:loudness-off-target |
| power-platform-community-conference-2026-04 | superseded | power-platform-community-conference-2026-04.mp4 | am_michael / kokoro_onnx | 1920x1080 | 75.4 s | -21.9 | -1.0 dBTP | -69.4 dBFS | 0.31% | 1.57 s | warning:loudness-off-target |
| power-platform-community-conference-2026-05 | superseded | power-platform-community-conference-2026-05.mp4 | am_michael / kokoro_onnx | 1920x1080 | 75.4 s | -21.8 | -1.0 dBTP | -69.4 dBFS | 0.31% | 1.55 s | warning:loudness-off-target |
| power-platform-community-conference-2026-06 | superseded | power-platform-community-conference-2026-06.mp4 | am_michael / kokoro_onnx | 1920x1080 | 71.7 s | -20.1 | -1.0 dBTP | -67.7 dBFS | 0.30% | 1.57 s | warning:loudness-off-target |
| power-platform-community-conference-2026-07 | superseded | power-platform-community-conference-2026-07.mp4 | am_michael / kokoro_onnx | 1920x1080 | 71.7 s | -20.5 | -1.0 dBTP | -68.0 dBFS | 0.30% | 1.57 s | warning:loudness-off-target |
| power-platform-community-conference-2026-08 | superseded | power-platform-community-conference-2026-08.mp4 | am_michael / kokoro_onnx | 1920x1080 | 71.7 s | -20.3 | -1.0 dBTP | -68.0 dBFS | 0.30% | 1.57 s | warning:loudness-off-target |
| power-platform-community-conference-2026-09 | superseded | power-platform-community-conference-2026-09.mp4 | am_michael / kokoro_onnx | 1920x1080 | 71.7 s | -20.0 | -1.0 dBTP | -67.6 dBFS | 0.30% | 1.57 s | none |
| power-platform-community-conference-2026-10 | current | power-platform-community-conference-2026-10-am_michael-kokoro_onnx.mp4 | am_michael / kokoro_onnx | 1920x1080 | 71.7 s | -16.0 | -1.5 dBTP | -63.4 dBFS | 0.33% | 1.57 s | none |
| power-platform-community-conference-2026-10 | current | power-platform-community-conference-2026-10-af_heart-kokoro_onnx.mp4 | af_heart / kokoro_onnx | 1920x1080 | 65.8 s | -16.1 | -1.5 dBTP | -69.9 dBFS | 2.37% | 1.35 s | none |
| power-platform-community-conference-2026-10 | current | power-platform-community-conference-2026-10-af_bella-kokoro_onnx.mp4 | af_bella / kokoro_onnx | 1920x1080 | 69.2 s | -16.0 | -1.5 dBTP | -76.7 dBFS | 2.11% | 1.52 s | none |
| power-platform-community-conference-2026-10 | current | power-platform-community-conference-2026-10-am_michael-kokoro.mp4 | am_michael / kokoro | 1920x1080 | 71.7 s | -16.0 | -1.5 dBTP | -63.5 dBFS | 0.33% | 1.57 s | none |

## Findings by revision

### power-platform-community-conference-2026-01 power-platform-community-conference-2026-01.mp4

* warning: Integrated loudness -20.4 LUFS is outside -16 ±4 LU for online video.
* info: Left and right channels carry identical mono narration.
* info: No visible motion for 8.9 s from 2.533 s.

Evidence: [analysis](power-platform-community-conference-2026-01/power-platform-community-conference-2026-01/analysis.json), [spectrogram](power-platform-community-conference-2026-01/power-platform-community-conference-2026-01/spectrogram.jpg), [speech spectrogram](power-platform-community-conference-2026-01/power-platform-community-conference-2026-01/spectrogram-speech.jpg), [layers](power-platform-community-conference-2026-01/power-platform-community-conference-2026-01/layers.png), [frames](power-platform-community-conference-2026-01/power-platform-community-conference-2026-01/contact-sheet.jpg).

### power-platform-community-conference-2026-02 power-platform-community-conference-2026-02.mp4

* warning: Integrated loudness -20.3 LUFS is outside -16 ±4 LU for online video.
* info: Left and right channels carry identical mono narration.
* info: No visible motion for 8.9 s from 2.533 s.

Evidence: [analysis](power-platform-community-conference-2026-02/power-platform-community-conference-2026-02/analysis.json), [spectrogram](power-platform-community-conference-2026-02/power-platform-community-conference-2026-02/spectrogram.jpg), [speech spectrogram](power-platform-community-conference-2026-02/power-platform-community-conference-2026-02/spectrogram-speech.jpg), [layers](power-platform-community-conference-2026-02/power-platform-community-conference-2026-02/layers.png), [frames](power-platform-community-conference-2026-02/power-platform-community-conference-2026-02/contact-sheet.jpg).

### power-platform-community-conference-2026-03 power-platform-community-conference-2026-03.mp4

* warning: Integrated loudness -20.3 LUFS is outside -16 ±4 LU for online video.
* info: Left and right channels carry identical mono narration.
* info: No visible motion for 8.9 s from 2.533 s.

Evidence: [analysis](power-platform-community-conference-2026-03/power-platform-community-conference-2026-03/analysis.json), [spectrogram](power-platform-community-conference-2026-03/power-platform-community-conference-2026-03/spectrogram.jpg), [speech spectrogram](power-platform-community-conference-2026-03/power-platform-community-conference-2026-03/spectrogram-speech.jpg), [layers](power-platform-community-conference-2026-03/power-platform-community-conference-2026-03/layers.png), [frames](power-platform-community-conference-2026-03/power-platform-community-conference-2026-03/contact-sheet.jpg).

### power-platform-community-conference-2026-04 power-platform-community-conference-2026-04.mp4

* warning: Integrated loudness -21.9 LUFS is outside -16 ±4 LU for online video.
* info: Left and right channels carry identical mono narration.
* info: No visible motion for 8.9 s from 2.533 s.

Evidence: [analysis](power-platform-community-conference-2026-04/power-platform-community-conference-2026-04/analysis.json), [spectrogram](power-platform-community-conference-2026-04/power-platform-community-conference-2026-04/spectrogram.jpg), [speech spectrogram](power-platform-community-conference-2026-04/power-platform-community-conference-2026-04/spectrogram-speech.jpg), [layers](power-platform-community-conference-2026-04/power-platform-community-conference-2026-04/layers.png), [frames](power-platform-community-conference-2026-04/power-platform-community-conference-2026-04/contact-sheet.jpg).

### power-platform-community-conference-2026-05 power-platform-community-conference-2026-05.mp4

* warning: Integrated loudness -21.8 LUFS is outside -16 ±4 LU for online video.
* info: Left and right channels carry identical mono narration.
* info: No visible motion for 9.7 s from 1.867 s.

Evidence: [analysis](power-platform-community-conference-2026-05/power-platform-community-conference-2026-05/analysis.json), [spectrogram](power-platform-community-conference-2026-05/power-platform-community-conference-2026-05/spectrogram.jpg), [speech spectrogram](power-platform-community-conference-2026-05/power-platform-community-conference-2026-05/spectrogram-speech.jpg), [layers](power-platform-community-conference-2026-05/power-platform-community-conference-2026-05/layers.png), [frames](power-platform-community-conference-2026-05/power-platform-community-conference-2026-05/contact-sheet.jpg).

### power-platform-community-conference-2026-06 power-platform-community-conference-2026-06.mp4

* warning: Integrated loudness -20.1 LUFS is outside -16 ±4 LU for online video.
* info: Left and right channels carry identical mono narration.
* info: No visible motion for 9.667 s from 1.8 s.

Evidence: [analysis](power-platform-community-conference-2026-06/power-platform-community-conference-2026-06/analysis.json), [spectrogram](power-platform-community-conference-2026-06/power-platform-community-conference-2026-06/spectrogram.jpg), [speech spectrogram](power-platform-community-conference-2026-06/power-platform-community-conference-2026-06/spectrogram-speech.jpg), [layers](power-platform-community-conference-2026-06/power-platform-community-conference-2026-06/layers.png), [frames](power-platform-community-conference-2026-06/power-platform-community-conference-2026-06/contact-sheet.jpg).

### power-platform-community-conference-2026-07 power-platform-community-conference-2026-07.mp4

* warning: Integrated loudness -20.5 LUFS is outside -16 ±4 LU for online video.
* info: Left and right channels carry identical mono narration.
* info: No visible motion for 9.667 s from 1.8 s.

Evidence: [analysis](power-platform-community-conference-2026-07/power-platform-community-conference-2026-07/analysis.json), [spectrogram](power-platform-community-conference-2026-07/power-platform-community-conference-2026-07/spectrogram.jpg), [speech spectrogram](power-platform-community-conference-2026-07/power-platform-community-conference-2026-07/spectrogram-speech.jpg), [layers](power-platform-community-conference-2026-07/power-platform-community-conference-2026-07/layers.png), [frames](power-platform-community-conference-2026-07/power-platform-community-conference-2026-07/contact-sheet.jpg).

### power-platform-community-conference-2026-08 power-platform-community-conference-2026-08.mp4

* warning: Integrated loudness -20.3 LUFS is outside -16 ±4 LU for online video.
* info: Left and right channels carry identical mono narration.
* info: No visible motion for 9.667 s from 1.8 s.

Evidence: [analysis](power-platform-community-conference-2026-08/power-platform-community-conference-2026-08/analysis.json), [spectrogram](power-platform-community-conference-2026-08/power-platform-community-conference-2026-08/spectrogram.jpg), [speech spectrogram](power-platform-community-conference-2026-08/power-platform-community-conference-2026-08/spectrogram-speech.jpg), [layers](power-platform-community-conference-2026-08/power-platform-community-conference-2026-08/layers.png), [frames](power-platform-community-conference-2026-08/power-platform-community-conference-2026-08/contact-sheet.jpg).

### power-platform-community-conference-2026-09 power-platform-community-conference-2026-09.mp4

* info: Left and right channels carry identical mono narration.
* info: No visible motion for 9.667 s from 1.8 s.

Evidence: [analysis](power-platform-community-conference-2026-09/power-platform-community-conference-2026-09/analysis.json), [spectrogram](power-platform-community-conference-2026-09/power-platform-community-conference-2026-09/spectrogram.jpg), [speech spectrogram](power-platform-community-conference-2026-09/power-platform-community-conference-2026-09/spectrogram-speech.jpg), [layers](power-platform-community-conference-2026-09/power-platform-community-conference-2026-09/layers.png), [frames](power-platform-community-conference-2026-09/power-platform-community-conference-2026-09/contact-sheet.jpg).

### power-platform-community-conference-2026-10 power-platform-community-conference-2026-10-am_michael-kokoro_onnx.mp4

* info: Left and right channels carry identical mono narration.
* info: No visible motion for 9.733 s from 1.833 s.

Evidence: [analysis](power-platform-community-conference-2026-10/power-platform-community-conference-2026-10-am_michael-kokoro_onnx/analysis.json), [spectrogram](power-platform-community-conference-2026-10/power-platform-community-conference-2026-10-am_michael-kokoro_onnx/spectrogram.jpg), [speech spectrogram](power-platform-community-conference-2026-10/power-platform-community-conference-2026-10-am_michael-kokoro_onnx/spectrogram-speech.jpg), [layers](power-platform-community-conference-2026-10/power-platform-community-conference-2026-10-am_michael-kokoro_onnx/layers.png), [frames](power-platform-community-conference-2026-10/power-platform-community-conference-2026-10-am_michael-kokoro_onnx/contact-sheet.jpg).

### power-platform-community-conference-2026-10 power-platform-community-conference-2026-10-af_heart-kokoro_onnx.mp4

* info: Left and right channels carry identical mono narration.
* info: No visible motion for 9.667 s from 1.833 s.

Evidence: [analysis](power-platform-community-conference-2026-10/power-platform-community-conference-2026-10-af_heart-kokoro_onnx/analysis.json), [spectrogram](power-platform-community-conference-2026-10/power-platform-community-conference-2026-10-af_heart-kokoro_onnx/spectrogram.jpg), [speech spectrogram](power-platform-community-conference-2026-10/power-platform-community-conference-2026-10-af_heart-kokoro_onnx/spectrogram-speech.jpg), [layers](power-platform-community-conference-2026-10/power-platform-community-conference-2026-10-af_heart-kokoro_onnx/layers.png), [frames](power-platform-community-conference-2026-10/power-platform-community-conference-2026-10-af_heart-kokoro_onnx/contact-sheet.jpg).

### power-platform-community-conference-2026-10 power-platform-community-conference-2026-10-af_bella-kokoro_onnx.mp4

* info: Left and right channels carry identical mono narration.
* info: No visible motion for 9.7 s from 1.833 s.

Evidence: [analysis](power-platform-community-conference-2026-10/power-platform-community-conference-2026-10-af_bella-kokoro_onnx/analysis.json), [spectrogram](power-platform-community-conference-2026-10/power-platform-community-conference-2026-10-af_bella-kokoro_onnx/spectrogram.jpg), [speech spectrogram](power-platform-community-conference-2026-10/power-platform-community-conference-2026-10-af_bella-kokoro_onnx/spectrogram-speech.jpg), [layers](power-platform-community-conference-2026-10/power-platform-community-conference-2026-10-af_bella-kokoro_onnx/layers.png), [frames](power-platform-community-conference-2026-10/power-platform-community-conference-2026-10-af_bella-kokoro_onnx/contact-sheet.jpg).

### power-platform-community-conference-2026-10 power-platform-community-conference-2026-10-am_michael-kokoro.mp4

* info: Left and right channels carry identical mono narration.
* info: No visible motion for 9.733 s from 1.833 s.

Evidence: [analysis](power-platform-community-conference-2026-10/power-platform-community-conference-2026-10-am_michael-kokoro/analysis.json), [spectrogram](power-platform-community-conference-2026-10/power-platform-community-conference-2026-10-am_michael-kokoro/spectrogram.jpg), [speech spectrogram](power-platform-community-conference-2026-10/power-platform-community-conference-2026-10-am_michael-kokoro/spectrogram-speech.jpg), [layers](power-platform-community-conference-2026-10/power-platform-community-conference-2026-10-am_michael-kokoro/layers.png), [frames](power-platform-community-conference-2026-10/power-platform-community-conference-2026-10-am_michael-kokoro/contact-sheet.jpg).

## Comparison images

* [Spectrogram stack](spectrogram-stack.jpg)
* [Frame grid](frames-grid.jpg)
* [Layer activity stack](layers-stack.jpg)
