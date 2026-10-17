---
title: power-platform-community-conference render analysis
description: Measured audio, spectrogram and video-layer comparison for every power-platform-community-conference revision.
---

## Method

Every revision video is decoded with FFmpeg and measured with the core `media-analyze` method. Spectrograms use a Hann window, logarithmic magnitude and a 120 dB range, with frequency, time and dBFS legends. Loudness uses ITU-R BS.1770 (EBU R128). Video layers are measured per layout zone as frame-to-frame motion and edge detail.

The video spectrogram is the visual counterpart of the audio spectrogram. Each pixel's brightness is a signal sampled at the frame rate, and a short-time Fourier transform of every pixel, averaged per layout zone, shows the temporal frequencies each layer carries. Scene and caption changes appear as broadband bursts, eased animation below 2 Hz, and flicker or shimmer as sustained narrow lines. The spatial spectrogram shows horizontal detail per content band over time; the fine-detail share above 0.18 cycles per pixel tracks text sharpness and density.

These are objective measurements. They do not replace listening and viewing.

## Revisions

| Revision | Status | Output | Voice | Size | Duration | LUFS | True peak | Pause floor | Speech HF>8k | Longest pause | Flicker | Motion <2 Hz | Body detail | Findings |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| power-platform-community-conference-2026-01 | rejected | power-platform-community-conference-2026-01.mp4 | am_michael / kokoro_onnx | 1920x1080 | 80.1 s | -20.4 | -1.0 dBTP | -68.3 dBFS | 0.32% | 1.65 s | 0.00 s | 95.2% | 21.4% | warning:loudness-off-target |
| power-platform-community-conference-2026-02 | rejected | power-platform-community-conference-2026-02.mp4 | am_michael / kokoro_onnx | 1920x1080 | 80.1 s | -20.3 | -1.0 dBTP | -68.2 dBFS | 0.32% | 1.65 s | 0.00 s | 95.2% | 21.4% | warning:loudness-off-target |
| power-platform-community-conference-2026-03 | superseded | power-platform-community-conference-2026-03.mp4 | am_michael / kokoro_onnx | 1920x1080 | 80.1 s | -20.3 | -1.0 dBTP | -68.2 dBFS | 0.32% | 1.65 s | 0.00 s | 95.2% | 21.4% | warning:loudness-off-target |
| power-platform-community-conference-2026-04 | superseded | power-platform-community-conference-2026-04.mp4 | am_michael / kokoro_onnx | 1920x1080 | 75.4 s | -21.9 | -1.0 dBTP | -69.4 dBFS | 0.31% | 1.57 s | 0.00 s | 94.7% | 21.8% | warning:loudness-off-target |
| power-platform-community-conference-2026-05 | superseded | power-platform-community-conference-2026-05.mp4 | am_michael / kokoro_onnx | 1920x1080 | 75.4 s | -21.8 | -1.0 dBTP | -69.4 dBFS | 0.31% | 1.55 s | 0.00 s | 94.7% | 21.0% | warning:loudness-off-target |
| power-platform-community-conference-2026-06 | superseded | power-platform-community-conference-2026-06.mp4 | am_michael / kokoro_onnx | 1920x1080 | 71.7 s | -20.1 | -1.0 dBTP | -67.7 dBFS | 0.30% | 1.57 s | 0.00 s | 94.9% | 19.2% | warning:loudness-off-target |
| power-platform-community-conference-2026-07 | superseded | power-platform-community-conference-2026-07.mp4 | am_michael / kokoro_onnx | 1920x1080 | 71.7 s | -20.5 | -1.0 dBTP | -68.0 dBFS | 0.30% | 1.57 s | 0.00 s | 94.9% | 19.2% | warning:loudness-off-target |
| power-platform-community-conference-2026-08 | superseded | power-platform-community-conference-2026-08.mp4 | am_michael / kokoro_onnx | 1920x1080 | 71.7 s | -20.3 | -1.0 dBTP | -68.0 dBFS | 0.30% | 1.57 s | 0.00 s | 94.8% | 19.7% | warning:loudness-off-target |
| power-platform-community-conference-2026-09 | superseded | power-platform-community-conference-2026-09.mp4 | am_michael / kokoro_onnx | 1920x1080 | 71.7 s | -20.0 | -1.0 dBTP | -67.6 dBFS | 0.30% | 1.57 s | 0.00 s | 94.8% | 19.7% | none |
| power-platform-community-conference-2026-10 | superseded | power-platform-community-conference-2026-10-am_michael-kokoro_onnx.mp4 | am_michael / kokoro_onnx | 1920x1080 | 71.7 s | -16.0 | -1.5 dBTP | -63.4 dBFS | 0.33% | 1.57 s | 0.00 s | 94.7% | 19.6% | none |
| power-platform-community-conference-2026-10 | superseded | power-platform-community-conference-2026-10-af_heart-kokoro_onnx.mp4 | af_heart / kokoro_onnx | 1920x1080 | 65.8 s | -16.1 | -1.5 dBTP | -69.9 dBFS | 2.37% | 1.35 s | 0.00 s | 94.7% | 19.6% | none |
| power-platform-community-conference-2026-10 | superseded | power-platform-community-conference-2026-10-af_bella-kokoro_onnx.mp4 | af_bella / kokoro_onnx | 1920x1080 | 69.2 s | -16.0 | -1.5 dBTP | -76.7 dBFS | 2.11% | 1.52 s | 0.00 s | 94.7% | 19.6% | none |
| power-platform-community-conference-2026-10 | superseded | power-platform-community-conference-2026-10-am_michael-kokoro.mp4 | am_michael / kokoro | 1920x1080 | 71.7 s | -16.0 | -1.5 dBTP | -63.5 dBFS | 0.33% | 1.57 s | 0.00 s | 94.7% | 19.6% | none |
| power-platform-community-conference-2026-11 | superseded | power-platform-community-conference-2026-11-am_michael-kokoro_onnx.mp4 | am_michael / kokoro_onnx | 1920x1080 | 71.7 s | -16.0 | -1.5 dBTP | -63.5 dBFS | 0.33% | 1.57 s | 0.00 s | 94.7% | 19.6% | none |
| power-platform-community-conference-2026-11 | superseded | power-platform-community-conference-2026-11-af_heart-kokoro_onnx.mp4 | af_heart / kokoro_onnx | 1920x1080 | 65.8 s | -16.1 | -1.5 dBTP | -69.7 dBFS | 2.37% | 1.35 s | 0.00 s | 94.7% | 19.6% | none |
| power-platform-community-conference-2026-11 | superseded | power-platform-community-conference-2026-11-af_bella-kokoro_onnx.mp4 | af_bella / kokoro_onnx | 1920x1080 | 69.2 s | -16.0 | -1.5 dBTP | -76.8 dBFS | 2.12% | 1.52 s | 0.00 s | 94.7% | 19.6% | none |
| power-platform-community-conference-2026-11 | superseded | power-platform-community-conference-2026-11-am_michael-kokoro.mp4 | am_michael / kokoro | 1920x1080 | 71.7 s | -16.0 | -1.5 dBTP | -63.6 dBFS | 0.33% | 1.55 s | 0.00 s | 94.7% | 19.6% | none |
| power-platform-community-conference-2026-12 | superseded | power-platform-community-conference-2026-12-am_michael-kokoro_onnx.mp4 | am_michael / kokoro_onnx | 1920x1080 | 63.1 s | -16.1 | -1.5 dBTP | -66.2 dBFS | 0.33% | 1.63 s | 0.00 s | 88.3% | 21.1% | none |
| power-platform-community-conference-2026-12 | superseded | power-platform-community-conference-2026-12-af_heart-kokoro_onnx.mp4 | af_heart / kokoro_onnx | 1920x1080 | 57.9 s | -16.1 | -1.5 dBTP | -69.5 dBFS | 2.25% | 1.35 s | 0.00 s | 88.3% | 21.1% | none |
| power-platform-community-conference-2026-12 | superseded | power-platform-community-conference-2026-12-af_bella-kokoro_onnx.mp4 | af_bella / kokoro_onnx | 1920x1080 | 61.0 s | -16.0 | -1.5 dBTP | -76.7 dBFS | 2.05% | 1.52 s | 0.00 s | 88.3% | 21.1% | none |
| power-platform-community-conference-2026-12 | superseded | power-platform-community-conference-2026-12-am_michael-kokoro.mp4 | am_michael / kokoro | 1920x1080 | 63.1 s | -16.1 | -1.5 dBTP | -66.5 dBFS | 0.33% | 1.63 s | 0.00 s | 88.3% | 21.1% | none |
| power-platform-community-conference-2026-13 | current | power-platform-community-conference-2026-13-am_michael-kokoro_onnx.mp4 | am_michael / kokoro_onnx | 1920x1080 | 63.1 s | -16.1 | -1.5 dBTP | -66.5 dBFS | 0.33% | 1.63 s | 0.00 s | 88.3% | 21.1% | none |
| power-platform-community-conference-2026-13 | current | power-platform-community-conference-2026-13-af_heart-kokoro_onnx.mp4 | af_heart / kokoro_onnx | 1920x1080 | 57.9 s | -16.1 | -1.5 dBTP | -69.5 dBFS | 2.25% | 1.35 s | 0.00 s | 88.3% | 21.1% | none |
| power-platform-community-conference-2026-13 | current | power-platform-community-conference-2026-13-af_bella-kokoro_onnx.mp4 | af_bella / kokoro_onnx | 1920x1080 | 61.0 s | -16.0 | -1.5 dBTP | -76.6 dBFS | 2.05% | 1.52 s | 0.00 s | 88.3% | 21.1% | none |
| power-platform-community-conference-2026-13 | current | power-platform-community-conference-2026-13-am_michael-kokoro.mp4 | am_michael / kokoro | 1920x1080 | 63.1 s | -16.1 | -1.5 dBTP | -66.4 dBFS | 0.33% | 1.63 s | 0.00 s | 88.3% | 21.1% | none |

## Findings by revision

### power-platform-community-conference-2026-01 power-platform-community-conference-2026-01.mp4

* warning: Integrated loudness -20.4 LUFS is outside -16 ±4 LU for online video.
* info: Left and right channels carry identical mono narration.
* info: No visible motion for 8.9 s from 2.533 s.

Evidence: [analysis](power-platform-community-conference-2026-01/power-platform-community-conference-2026-01/analysis.json), [spectrogram](power-platform-community-conference-2026-01/power-platform-community-conference-2026-01/spectrogram.jpg), [speech spectrogram](power-platform-community-conference-2026-01/power-platform-community-conference-2026-01/spectrogram-speech.jpg), [video spectrogram](power-platform-community-conference-2026-01/power-platform-community-conference-2026-01/video-spectrogram.jpg), [spatial spectrogram](power-platform-community-conference-2026-01/power-platform-community-conference-2026-01/spatial-spectrogram.jpg), [layers](power-platform-community-conference-2026-01/power-platform-community-conference-2026-01/layers.png), [frames](power-platform-community-conference-2026-01/power-platform-community-conference-2026-01/contact-sheet.jpg).

### power-platform-community-conference-2026-02 power-platform-community-conference-2026-02.mp4

* warning: Integrated loudness -20.3 LUFS is outside -16 ±4 LU for online video.
* info: Left and right channels carry identical mono narration.
* info: No visible motion for 8.9 s from 2.533 s.

Evidence: [analysis](power-platform-community-conference-2026-02/power-platform-community-conference-2026-02/analysis.json), [spectrogram](power-platform-community-conference-2026-02/power-platform-community-conference-2026-02/spectrogram.jpg), [speech spectrogram](power-platform-community-conference-2026-02/power-platform-community-conference-2026-02/spectrogram-speech.jpg), [video spectrogram](power-platform-community-conference-2026-02/power-platform-community-conference-2026-02/video-spectrogram.jpg), [spatial spectrogram](power-platform-community-conference-2026-02/power-platform-community-conference-2026-02/spatial-spectrogram.jpg), [layers](power-platform-community-conference-2026-02/power-platform-community-conference-2026-02/layers.png), [frames](power-platform-community-conference-2026-02/power-platform-community-conference-2026-02/contact-sheet.jpg).

### power-platform-community-conference-2026-03 power-platform-community-conference-2026-03.mp4

* warning: Integrated loudness -20.3 LUFS is outside -16 ±4 LU for online video.
* info: Left and right channels carry identical mono narration.
* info: No visible motion for 8.9 s from 2.533 s.

Evidence: [analysis](power-platform-community-conference-2026-03/power-platform-community-conference-2026-03/analysis.json), [spectrogram](power-platform-community-conference-2026-03/power-platform-community-conference-2026-03/spectrogram.jpg), [speech spectrogram](power-platform-community-conference-2026-03/power-platform-community-conference-2026-03/spectrogram-speech.jpg), [video spectrogram](power-platform-community-conference-2026-03/power-platform-community-conference-2026-03/video-spectrogram.jpg), [spatial spectrogram](power-platform-community-conference-2026-03/power-platform-community-conference-2026-03/spatial-spectrogram.jpg), [layers](power-platform-community-conference-2026-03/power-platform-community-conference-2026-03/layers.png), [frames](power-platform-community-conference-2026-03/power-platform-community-conference-2026-03/contact-sheet.jpg).

### power-platform-community-conference-2026-04 power-platform-community-conference-2026-04.mp4

* warning: Integrated loudness -21.9 LUFS is outside -16 ±4 LU for online video.
* info: Left and right channels carry identical mono narration.
* info: No visible motion for 8.9 s from 2.533 s.

Evidence: [analysis](power-platform-community-conference-2026-04/power-platform-community-conference-2026-04/analysis.json), [spectrogram](power-platform-community-conference-2026-04/power-platform-community-conference-2026-04/spectrogram.jpg), [speech spectrogram](power-platform-community-conference-2026-04/power-platform-community-conference-2026-04/spectrogram-speech.jpg), [video spectrogram](power-platform-community-conference-2026-04/power-platform-community-conference-2026-04/video-spectrogram.jpg), [spatial spectrogram](power-platform-community-conference-2026-04/power-platform-community-conference-2026-04/spatial-spectrogram.jpg), [layers](power-platform-community-conference-2026-04/power-platform-community-conference-2026-04/layers.png), [frames](power-platform-community-conference-2026-04/power-platform-community-conference-2026-04/contact-sheet.jpg).

### power-platform-community-conference-2026-05 power-platform-community-conference-2026-05.mp4

* warning: Integrated loudness -21.8 LUFS is outside -16 ±4 LU for online video.
* info: Left and right channels carry identical mono narration.
* info: No visible motion for 9.7 s from 1.867 s.

Evidence: [analysis](power-platform-community-conference-2026-05/power-platform-community-conference-2026-05/analysis.json), [spectrogram](power-platform-community-conference-2026-05/power-platform-community-conference-2026-05/spectrogram.jpg), [speech spectrogram](power-platform-community-conference-2026-05/power-platform-community-conference-2026-05/spectrogram-speech.jpg), [video spectrogram](power-platform-community-conference-2026-05/power-platform-community-conference-2026-05/video-spectrogram.jpg), [spatial spectrogram](power-platform-community-conference-2026-05/power-platform-community-conference-2026-05/spatial-spectrogram.jpg), [layers](power-platform-community-conference-2026-05/power-platform-community-conference-2026-05/layers.png), [frames](power-platform-community-conference-2026-05/power-platform-community-conference-2026-05/contact-sheet.jpg).

### power-platform-community-conference-2026-06 power-platform-community-conference-2026-06.mp4

* warning: Integrated loudness -20.1 LUFS is outside -16 ±4 LU for online video.
* info: Left and right channels carry identical mono narration.
* info: No visible motion for 9.667 s from 1.8 s.

Evidence: [analysis](power-platform-community-conference-2026-06/power-platform-community-conference-2026-06/analysis.json), [spectrogram](power-platform-community-conference-2026-06/power-platform-community-conference-2026-06/spectrogram.jpg), [speech spectrogram](power-platform-community-conference-2026-06/power-platform-community-conference-2026-06/spectrogram-speech.jpg), [video spectrogram](power-platform-community-conference-2026-06/power-platform-community-conference-2026-06/video-spectrogram.jpg), [spatial spectrogram](power-platform-community-conference-2026-06/power-platform-community-conference-2026-06/spatial-spectrogram.jpg), [layers](power-platform-community-conference-2026-06/power-platform-community-conference-2026-06/layers.png), [frames](power-platform-community-conference-2026-06/power-platform-community-conference-2026-06/contact-sheet.jpg).

### power-platform-community-conference-2026-07 power-platform-community-conference-2026-07.mp4

* warning: Integrated loudness -20.5 LUFS is outside -16 ±4 LU for online video.
* info: Left and right channels carry identical mono narration.
* info: No visible motion for 9.667 s from 1.8 s.

Evidence: [analysis](power-platform-community-conference-2026-07/power-platform-community-conference-2026-07/analysis.json), [spectrogram](power-platform-community-conference-2026-07/power-platform-community-conference-2026-07/spectrogram.jpg), [speech spectrogram](power-platform-community-conference-2026-07/power-platform-community-conference-2026-07/spectrogram-speech.jpg), [video spectrogram](power-platform-community-conference-2026-07/power-platform-community-conference-2026-07/video-spectrogram.jpg), [spatial spectrogram](power-platform-community-conference-2026-07/power-platform-community-conference-2026-07/spatial-spectrogram.jpg), [layers](power-platform-community-conference-2026-07/power-platform-community-conference-2026-07/layers.png), [frames](power-platform-community-conference-2026-07/power-platform-community-conference-2026-07/contact-sheet.jpg).

### power-platform-community-conference-2026-08 power-platform-community-conference-2026-08.mp4

* warning: Integrated loudness -20.3 LUFS is outside -16 ±4 LU for online video.
* info: Left and right channels carry identical mono narration.
* info: No visible motion for 9.667 s from 1.8 s.

Evidence: [analysis](power-platform-community-conference-2026-08/power-platform-community-conference-2026-08/analysis.json), [spectrogram](power-platform-community-conference-2026-08/power-platform-community-conference-2026-08/spectrogram.jpg), [speech spectrogram](power-platform-community-conference-2026-08/power-platform-community-conference-2026-08/spectrogram-speech.jpg), [video spectrogram](power-platform-community-conference-2026-08/power-platform-community-conference-2026-08/video-spectrogram.jpg), [spatial spectrogram](power-platform-community-conference-2026-08/power-platform-community-conference-2026-08/spatial-spectrogram.jpg), [layers](power-platform-community-conference-2026-08/power-platform-community-conference-2026-08/layers.png), [frames](power-platform-community-conference-2026-08/power-platform-community-conference-2026-08/contact-sheet.jpg).

### power-platform-community-conference-2026-09 power-platform-community-conference-2026-09.mp4

* info: Left and right channels carry identical mono narration.
* info: No visible motion for 9.667 s from 1.8 s.

Evidence: [analysis](power-platform-community-conference-2026-09/power-platform-community-conference-2026-09/analysis.json), [spectrogram](power-platform-community-conference-2026-09/power-platform-community-conference-2026-09/spectrogram.jpg), [speech spectrogram](power-platform-community-conference-2026-09/power-platform-community-conference-2026-09/spectrogram-speech.jpg), [video spectrogram](power-platform-community-conference-2026-09/power-platform-community-conference-2026-09/video-spectrogram.jpg), [spatial spectrogram](power-platform-community-conference-2026-09/power-platform-community-conference-2026-09/spatial-spectrogram.jpg), [layers](power-platform-community-conference-2026-09/power-platform-community-conference-2026-09/layers.png), [frames](power-platform-community-conference-2026-09/power-platform-community-conference-2026-09/contact-sheet.jpg).

### power-platform-community-conference-2026-10 power-platform-community-conference-2026-10-am_michael-kokoro_onnx.mp4

* info: Left and right channels carry identical mono narration.
* info: No visible motion for 9.733 s from 1.833 s.

Evidence: [analysis](power-platform-community-conference-2026-10/power-platform-community-conference-2026-10-am_michael-kokoro_onnx/analysis.json), [spectrogram](power-platform-community-conference-2026-10/power-platform-community-conference-2026-10-am_michael-kokoro_onnx/spectrogram.jpg), [speech spectrogram](power-platform-community-conference-2026-10/power-platform-community-conference-2026-10-am_michael-kokoro_onnx/spectrogram-speech.jpg), [video spectrogram](power-platform-community-conference-2026-10/power-platform-community-conference-2026-10-am_michael-kokoro_onnx/video-spectrogram.jpg), [spatial spectrogram](power-platform-community-conference-2026-10/power-platform-community-conference-2026-10-am_michael-kokoro_onnx/spatial-spectrogram.jpg), [layers](power-platform-community-conference-2026-10/power-platform-community-conference-2026-10-am_michael-kokoro_onnx/layers.png), [frames](power-platform-community-conference-2026-10/power-platform-community-conference-2026-10-am_michael-kokoro_onnx/contact-sheet.jpg).

### power-platform-community-conference-2026-10 power-platform-community-conference-2026-10-af_heart-kokoro_onnx.mp4

* info: Left and right channels carry identical mono narration.
* info: No visible motion for 9.667 s from 1.833 s.

Evidence: [analysis](power-platform-community-conference-2026-10/power-platform-community-conference-2026-10-af_heart-kokoro_onnx/analysis.json), [spectrogram](power-platform-community-conference-2026-10/power-platform-community-conference-2026-10-af_heart-kokoro_onnx/spectrogram.jpg), [speech spectrogram](power-platform-community-conference-2026-10/power-platform-community-conference-2026-10-af_heart-kokoro_onnx/spectrogram-speech.jpg), [video spectrogram](power-platform-community-conference-2026-10/power-platform-community-conference-2026-10-af_heart-kokoro_onnx/video-spectrogram.jpg), [spatial spectrogram](power-platform-community-conference-2026-10/power-platform-community-conference-2026-10-af_heart-kokoro_onnx/spatial-spectrogram.jpg), [layers](power-platform-community-conference-2026-10/power-platform-community-conference-2026-10-af_heart-kokoro_onnx/layers.png), [frames](power-platform-community-conference-2026-10/power-platform-community-conference-2026-10-af_heart-kokoro_onnx/contact-sheet.jpg).

### power-platform-community-conference-2026-10 power-platform-community-conference-2026-10-af_bella-kokoro_onnx.mp4

* info: Left and right channels carry identical mono narration.
* info: No visible motion for 9.7 s from 1.833 s.

Evidence: [analysis](power-platform-community-conference-2026-10/power-platform-community-conference-2026-10-af_bella-kokoro_onnx/analysis.json), [spectrogram](power-platform-community-conference-2026-10/power-platform-community-conference-2026-10-af_bella-kokoro_onnx/spectrogram.jpg), [speech spectrogram](power-platform-community-conference-2026-10/power-platform-community-conference-2026-10-af_bella-kokoro_onnx/spectrogram-speech.jpg), [video spectrogram](power-platform-community-conference-2026-10/power-platform-community-conference-2026-10-af_bella-kokoro_onnx/video-spectrogram.jpg), [spatial spectrogram](power-platform-community-conference-2026-10/power-platform-community-conference-2026-10-af_bella-kokoro_onnx/spatial-spectrogram.jpg), [layers](power-platform-community-conference-2026-10/power-platform-community-conference-2026-10-af_bella-kokoro_onnx/layers.png), [frames](power-platform-community-conference-2026-10/power-platform-community-conference-2026-10-af_bella-kokoro_onnx/contact-sheet.jpg).

### power-platform-community-conference-2026-10 power-platform-community-conference-2026-10-am_michael-kokoro.mp4

* info: Left and right channels carry identical mono narration.
* info: No visible motion for 9.733 s from 1.833 s.

Evidence: [analysis](power-platform-community-conference-2026-10/power-platform-community-conference-2026-10-am_michael-kokoro/analysis.json), [spectrogram](power-platform-community-conference-2026-10/power-platform-community-conference-2026-10-am_michael-kokoro/spectrogram.jpg), [speech spectrogram](power-platform-community-conference-2026-10/power-platform-community-conference-2026-10-am_michael-kokoro/spectrogram-speech.jpg), [video spectrogram](power-platform-community-conference-2026-10/power-platform-community-conference-2026-10-am_michael-kokoro/video-spectrogram.jpg), [spatial spectrogram](power-platform-community-conference-2026-10/power-platform-community-conference-2026-10-am_michael-kokoro/spatial-spectrogram.jpg), [layers](power-platform-community-conference-2026-10/power-platform-community-conference-2026-10-am_michael-kokoro/layers.png), [frames](power-platform-community-conference-2026-10/power-platform-community-conference-2026-10-am_michael-kokoro/contact-sheet.jpg).

### power-platform-community-conference-2026-11 power-platform-community-conference-2026-11-am_michael-kokoro_onnx.mp4

* info: Left and right channels carry identical mono narration.
* info: No visible motion for 9.733 s from 1.833 s.

Evidence: [analysis](power-platform-community-conference-2026-11/power-platform-community-conference-2026-11-am_michael-kokoro_onnx/analysis.json), [spectrogram](power-platform-community-conference-2026-11/power-platform-community-conference-2026-11-am_michael-kokoro_onnx/spectrogram.jpg), [speech spectrogram](power-platform-community-conference-2026-11/power-platform-community-conference-2026-11-am_michael-kokoro_onnx/spectrogram-speech.jpg), [video spectrogram](power-platform-community-conference-2026-11/power-platform-community-conference-2026-11-am_michael-kokoro_onnx/video-spectrogram.jpg), [spatial spectrogram](power-platform-community-conference-2026-11/power-platform-community-conference-2026-11-am_michael-kokoro_onnx/spatial-spectrogram.jpg), [layers](power-platform-community-conference-2026-11/power-platform-community-conference-2026-11-am_michael-kokoro_onnx/layers.png), [frames](power-platform-community-conference-2026-11/power-platform-community-conference-2026-11-am_michael-kokoro_onnx/contact-sheet.jpg).

### power-platform-community-conference-2026-11 power-platform-community-conference-2026-11-af_heart-kokoro_onnx.mp4

* info: Left and right channels carry identical mono narration.
* info: No visible motion for 9.667 s from 1.833 s.

Evidence: [analysis](power-platform-community-conference-2026-11/power-platform-community-conference-2026-11-af_heart-kokoro_onnx/analysis.json), [spectrogram](power-platform-community-conference-2026-11/power-platform-community-conference-2026-11-af_heart-kokoro_onnx/spectrogram.jpg), [speech spectrogram](power-platform-community-conference-2026-11/power-platform-community-conference-2026-11-af_heart-kokoro_onnx/spectrogram-speech.jpg), [video spectrogram](power-platform-community-conference-2026-11/power-platform-community-conference-2026-11-af_heart-kokoro_onnx/video-spectrogram.jpg), [spatial spectrogram](power-platform-community-conference-2026-11/power-platform-community-conference-2026-11-af_heart-kokoro_onnx/spatial-spectrogram.jpg), [layers](power-platform-community-conference-2026-11/power-platform-community-conference-2026-11-af_heart-kokoro_onnx/layers.png), [frames](power-platform-community-conference-2026-11/power-platform-community-conference-2026-11-af_heart-kokoro_onnx/contact-sheet.jpg).

### power-platform-community-conference-2026-11 power-platform-community-conference-2026-11-af_bella-kokoro_onnx.mp4

* info: Left and right channels carry identical mono narration.
* info: No visible motion for 9.7 s from 1.833 s.

Evidence: [analysis](power-platform-community-conference-2026-11/power-platform-community-conference-2026-11-af_bella-kokoro_onnx/analysis.json), [spectrogram](power-platform-community-conference-2026-11/power-platform-community-conference-2026-11-af_bella-kokoro_onnx/spectrogram.jpg), [speech spectrogram](power-platform-community-conference-2026-11/power-platform-community-conference-2026-11-af_bella-kokoro_onnx/spectrogram-speech.jpg), [video spectrogram](power-platform-community-conference-2026-11/power-platform-community-conference-2026-11-af_bella-kokoro_onnx/video-spectrogram.jpg), [spatial spectrogram](power-platform-community-conference-2026-11/power-platform-community-conference-2026-11-af_bella-kokoro_onnx/spatial-spectrogram.jpg), [layers](power-platform-community-conference-2026-11/power-platform-community-conference-2026-11-af_bella-kokoro_onnx/layers.png), [frames](power-platform-community-conference-2026-11/power-platform-community-conference-2026-11-af_bella-kokoro_onnx/contact-sheet.jpg).

### power-platform-community-conference-2026-11 power-platform-community-conference-2026-11-am_michael-kokoro.mp4

* info: Left and right channels carry identical mono narration.
* info: No visible motion for 9.733 s from 1.833 s.

Evidence: [analysis](power-platform-community-conference-2026-11/power-platform-community-conference-2026-11-am_michael-kokoro/analysis.json), [spectrogram](power-platform-community-conference-2026-11/power-platform-community-conference-2026-11-am_michael-kokoro/spectrogram.jpg), [speech spectrogram](power-platform-community-conference-2026-11/power-platform-community-conference-2026-11-am_michael-kokoro/spectrogram-speech.jpg), [video spectrogram](power-platform-community-conference-2026-11/power-platform-community-conference-2026-11-am_michael-kokoro/video-spectrogram.jpg), [spatial spectrogram](power-platform-community-conference-2026-11/power-platform-community-conference-2026-11-am_michael-kokoro/spatial-spectrogram.jpg), [layers](power-platform-community-conference-2026-11/power-platform-community-conference-2026-11-am_michael-kokoro/layers.png), [frames](power-platform-community-conference-2026-11/power-platform-community-conference-2026-11-am_michael-kokoro/contact-sheet.jpg).

### power-platform-community-conference-2026-12 power-platform-community-conference-2026-12-am_michael-kokoro_onnx.mp4

* info: Left and right channels carry identical mono narration.
* info: No visible motion for 11.733 s from 1.367 s.
* info: No visible motion for 9.6 s from 15.633 s.
* info: No visible motion for 8.2 s from 39.967 s.

Evidence: [analysis](power-platform-community-conference-2026-12/power-platform-community-conference-2026-12-am_michael-kokoro_onnx/analysis.json), [spectrogram](power-platform-community-conference-2026-12/power-platform-community-conference-2026-12-am_michael-kokoro_onnx/spectrogram.jpg), [speech spectrogram](power-platform-community-conference-2026-12/power-platform-community-conference-2026-12-am_michael-kokoro_onnx/spectrogram-speech.jpg), [video spectrogram](power-platform-community-conference-2026-12/power-platform-community-conference-2026-12-am_michael-kokoro_onnx/video-spectrogram.jpg), [spatial spectrogram](power-platform-community-conference-2026-12/power-platform-community-conference-2026-12-am_michael-kokoro_onnx/spatial-spectrogram.jpg), [layers](power-platform-community-conference-2026-12/power-platform-community-conference-2026-12-am_michael-kokoro_onnx/layers.png), [frames](power-platform-community-conference-2026-12/power-platform-community-conference-2026-12-am_michael-kokoro_onnx/contact-sheet.jpg).

### power-platform-community-conference-2026-12 power-platform-community-conference-2026-12-af_heart-kokoro_onnx.mp4

* info: Left and right channels carry identical mono narration.
* info: No visible motion for 10.333 s from 1.4 s.
* info: No visible motion for 8.867 s from 14.1 s.

Evidence: [analysis](power-platform-community-conference-2026-12/power-platform-community-conference-2026-12-af_heart-kokoro_onnx/analysis.json), [spectrogram](power-platform-community-conference-2026-12/power-platform-community-conference-2026-12-af_heart-kokoro_onnx/spectrogram.jpg), [speech spectrogram](power-platform-community-conference-2026-12/power-platform-community-conference-2026-12-af_heart-kokoro_onnx/spectrogram-speech.jpg), [video spectrogram](power-platform-community-conference-2026-12/power-platform-community-conference-2026-12-af_heart-kokoro_onnx/video-spectrogram.jpg), [spatial spectrogram](power-platform-community-conference-2026-12/power-platform-community-conference-2026-12-af_heart-kokoro_onnx/spatial-spectrogram.jpg), [layers](power-platform-community-conference-2026-12/power-platform-community-conference-2026-12-af_heart-kokoro_onnx/layers.png), [frames](power-platform-community-conference-2026-12/power-platform-community-conference-2026-12-af_heart-kokoro_onnx/contact-sheet.jpg).

### power-platform-community-conference-2026-12 power-platform-community-conference-2026-12-af_bella-kokoro_onnx.mp4

* info: Left and right channels carry identical mono narration.
* info: No visible motion for 11.133 s from 1.4 s.
* info: No visible motion for 9.3 s from 15 s.
* info: No visible motion for 9 s from 37.6 s.

Evidence: [analysis](power-platform-community-conference-2026-12/power-platform-community-conference-2026-12-af_bella-kokoro_onnx/analysis.json), [spectrogram](power-platform-community-conference-2026-12/power-platform-community-conference-2026-12-af_bella-kokoro_onnx/spectrogram.jpg), [speech spectrogram](power-platform-community-conference-2026-12/power-platform-community-conference-2026-12-af_bella-kokoro_onnx/spectrogram-speech.jpg), [video spectrogram](power-platform-community-conference-2026-12/power-platform-community-conference-2026-12-af_bella-kokoro_onnx/video-spectrogram.jpg), [spatial spectrogram](power-platform-community-conference-2026-12/power-platform-community-conference-2026-12-af_bella-kokoro_onnx/spatial-spectrogram.jpg), [layers](power-platform-community-conference-2026-12/power-platform-community-conference-2026-12-af_bella-kokoro_onnx/layers.png), [frames](power-platform-community-conference-2026-12/power-platform-community-conference-2026-12-af_bella-kokoro_onnx/contact-sheet.jpg).

### power-platform-community-conference-2026-12 power-platform-community-conference-2026-12-am_michael-kokoro.mp4

* info: Left and right channels carry identical mono narration.
* info: No visible motion for 11.733 s from 1.367 s.
* info: No visible motion for 9.6 s from 15.633 s.
* info: No visible motion for 8.2 s from 39.967 s.

Evidence: [analysis](power-platform-community-conference-2026-12/power-platform-community-conference-2026-12-am_michael-kokoro/analysis.json), [spectrogram](power-platform-community-conference-2026-12/power-platform-community-conference-2026-12-am_michael-kokoro/spectrogram.jpg), [speech spectrogram](power-platform-community-conference-2026-12/power-platform-community-conference-2026-12-am_michael-kokoro/spectrogram-speech.jpg), [video spectrogram](power-platform-community-conference-2026-12/power-platform-community-conference-2026-12-am_michael-kokoro/video-spectrogram.jpg), [spatial spectrogram](power-platform-community-conference-2026-12/power-platform-community-conference-2026-12-am_michael-kokoro/spatial-spectrogram.jpg), [layers](power-platform-community-conference-2026-12/power-platform-community-conference-2026-12-am_michael-kokoro/layers.png), [frames](power-platform-community-conference-2026-12/power-platform-community-conference-2026-12-am_michael-kokoro/contact-sheet.jpg).

### power-platform-community-conference-2026-13 power-platform-community-conference-2026-13-am_michael-kokoro_onnx.mp4

* info: Left and right channels carry identical mono narration.
* info: No visible motion for 11.733 s from 1.367 s.
* info: No visible motion for 9.6 s from 15.633 s.
* info: No visible motion for 8.2 s from 39.967 s.

Evidence: [analysis](power-platform-community-conference-2026-13/power-platform-community-conference-2026-13-am_michael-kokoro_onnx/analysis.json), [spectrogram](power-platform-community-conference-2026-13/power-platform-community-conference-2026-13-am_michael-kokoro_onnx/spectrogram.jpg), [speech spectrogram](power-platform-community-conference-2026-13/power-platform-community-conference-2026-13-am_michael-kokoro_onnx/spectrogram-speech.jpg), [video spectrogram](power-platform-community-conference-2026-13/power-platform-community-conference-2026-13-am_michael-kokoro_onnx/video-spectrogram.jpg), [spatial spectrogram](power-platform-community-conference-2026-13/power-platform-community-conference-2026-13-am_michael-kokoro_onnx/spatial-spectrogram.jpg), [layers](power-platform-community-conference-2026-13/power-platform-community-conference-2026-13-am_michael-kokoro_onnx/layers.png), [frames](power-platform-community-conference-2026-13/power-platform-community-conference-2026-13-am_michael-kokoro_onnx/contact-sheet.jpg).

### power-platform-community-conference-2026-13 power-platform-community-conference-2026-13-af_heart-kokoro_onnx.mp4

* info: Left and right channels carry identical mono narration.
* info: No visible motion for 10.333 s from 1.4 s.
* info: No visible motion for 8.867 s from 14.1 s.

Evidence: [analysis](power-platform-community-conference-2026-13/power-platform-community-conference-2026-13-af_heart-kokoro_onnx/analysis.json), [spectrogram](power-platform-community-conference-2026-13/power-platform-community-conference-2026-13-af_heart-kokoro_onnx/spectrogram.jpg), [speech spectrogram](power-platform-community-conference-2026-13/power-platform-community-conference-2026-13-af_heart-kokoro_onnx/spectrogram-speech.jpg), [video spectrogram](power-platform-community-conference-2026-13/power-platform-community-conference-2026-13-af_heart-kokoro_onnx/video-spectrogram.jpg), [spatial spectrogram](power-platform-community-conference-2026-13/power-platform-community-conference-2026-13-af_heart-kokoro_onnx/spatial-spectrogram.jpg), [layers](power-platform-community-conference-2026-13/power-platform-community-conference-2026-13-af_heart-kokoro_onnx/layers.png), [frames](power-platform-community-conference-2026-13/power-platform-community-conference-2026-13-af_heart-kokoro_onnx/contact-sheet.jpg).

### power-platform-community-conference-2026-13 power-platform-community-conference-2026-13-af_bella-kokoro_onnx.mp4

* info: Left and right channels carry identical mono narration.
* info: No visible motion for 11.133 s from 1.4 s.
* info: No visible motion for 9.3 s from 15 s.
* info: No visible motion for 9 s from 37.6 s.

Evidence: [analysis](power-platform-community-conference-2026-13/power-platform-community-conference-2026-13-af_bella-kokoro_onnx/analysis.json), [spectrogram](power-platform-community-conference-2026-13/power-platform-community-conference-2026-13-af_bella-kokoro_onnx/spectrogram.jpg), [speech spectrogram](power-platform-community-conference-2026-13/power-platform-community-conference-2026-13-af_bella-kokoro_onnx/spectrogram-speech.jpg), [video spectrogram](power-platform-community-conference-2026-13/power-platform-community-conference-2026-13-af_bella-kokoro_onnx/video-spectrogram.jpg), [spatial spectrogram](power-platform-community-conference-2026-13/power-platform-community-conference-2026-13-af_bella-kokoro_onnx/spatial-spectrogram.jpg), [layers](power-platform-community-conference-2026-13/power-platform-community-conference-2026-13-af_bella-kokoro_onnx/layers.png), [frames](power-platform-community-conference-2026-13/power-platform-community-conference-2026-13-af_bella-kokoro_onnx/contact-sheet.jpg).

### power-platform-community-conference-2026-13 power-platform-community-conference-2026-13-am_michael-kokoro.mp4

* info: Left and right channels carry identical mono narration.
* info: No visible motion for 11.733 s from 1.367 s.
* info: No visible motion for 9.6 s from 15.633 s.
* info: No visible motion for 8.2 s from 39.967 s.

Evidence: [analysis](power-platform-community-conference-2026-13/power-platform-community-conference-2026-13-am_michael-kokoro/analysis.json), [spectrogram](power-platform-community-conference-2026-13/power-platform-community-conference-2026-13-am_michael-kokoro/spectrogram.jpg), [speech spectrogram](power-platform-community-conference-2026-13/power-platform-community-conference-2026-13-am_michael-kokoro/spectrogram-speech.jpg), [video spectrogram](power-platform-community-conference-2026-13/power-platform-community-conference-2026-13-am_michael-kokoro/video-spectrogram.jpg), [spatial spectrogram](power-platform-community-conference-2026-13/power-platform-community-conference-2026-13-am_michael-kokoro/spatial-spectrogram.jpg), [layers](power-platform-community-conference-2026-13/power-platform-community-conference-2026-13-am_michael-kokoro/layers.png), [frames](power-platform-community-conference-2026-13/power-platform-community-conference-2026-13-am_michael-kokoro/contact-sheet.jpg).

## Comparison images

* [Spectrogram stack](spectrogram-stack.jpg)
* [Video spectrogram stack](video-spectrogram-stack.jpg)
* [Spatial spectrogram stack](spatial-spectrogram-stack.jpg)
* [Frame grid](frames-grid.jpg)
* [Layer activity stack](layers-stack.jpg)
