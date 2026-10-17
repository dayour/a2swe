---
title: power-platform-2026 render analysis
description: Measured audio, spectrogram and video-layer comparison for every power-platform-2026 revision.
---

## Method

Every revision video is decoded with FFmpeg and measured with the core `media-analyze` method. Spectrograms use a Hann window, logarithmic magnitude and a 120 dB range, with frequency, time and dBFS legends. Loudness uses ITU-R BS.1770 (EBU R128). Video layers are measured per layout zone as frame-to-frame motion and edge detail.

The video spectrogram is the visual counterpart of the audio spectrogram. Each pixel's brightness is a signal sampled at the frame rate, and a short-time Fourier transform of every pixel, averaged per layout zone, shows the temporal frequencies each layer carries. Scene and caption changes appear as broadband bursts, eased animation below 2 Hz, and flicker or shimmer as sustained narrow lines. The spatial spectrogram shows horizontal detail per content band over time; the fine-detail share above 0.18 cycles per pixel tracks text sharpness and density.

These are objective measurements. They do not replace listening and viewing.

## Revisions

| Revision | Status | Output | Voice | Size | Duration | LUFS | True peak | Pause floor | Speech HF>8k | Longest pause | Flicker | Motion <2 Hz | Body detail | Findings |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| power-platform-2026-01 | superseded | power-platform-2026-01.mp4 | unrecorded | 1920x1080 | 42.2 s | -19.1 | -1.1 dBTP | -77.5 dBFS | 0.02% | 0.60 s | 0.00 s | 89.1% | 11.9% | warning:dc-offset |
| power-platform-2026-02 | superseded | power-platform-2026-02.mp4 | unrecorded | 1920x1080 | 42.2 s | -19.1 | -1.1 dBTP | -77.5 dBFS | 0.02% | 0.60 s | 0.00 s | 89.7% | 7.6% | warning:dc-offset |
| power-platform-2026-03 | superseded | power-platform-2026-03.mp4 | unrecorded | 1920x1080 | 42.2 s | -19.1 | -1.1 dBTP | -77.5 dBFS | 0.02% | 0.60 s | 0.00 s | 89.7% | 7.6% | warning:dc-offset |
| power-platform-2026-04 | superseded | power-platform-2026-04.mp4 | unrecorded | 1920x1080 | 42.2 s | -19.1 | -1.1 dBTP | -77.5 dBFS | 0.02% | 0.60 s | 0.00 s | 89.5% | 7.6% | warning:dc-offset |
| power-platform-2026-05 | superseded | power-platform-2026-05.mp4 | unrecorded | 1920x1080 | 42.2 s | -19.2 | -1.1 dBTP | -79.3 dBFS | 0.02% | 0.63 s | 0.00 s | 89.5% | 7.6% | warning:dc-offset |
| power-platform-2026-06 | superseded | power-platform-2026-06.mp4 | am_liam / kokoro | 1920x1080 | 36.4 s | -17.5 | -1.0 dBTP | -84.4 dBFS | 0.58% | 0.38 s | 0.00 s | 88.8% | 7.7% | none |
| power-platform-2026-07 | superseded | power-platform-2026-07-am_michael-kokoro_onnx.mp4 | am_michael / kokoro_onnx | 1920x1080 | 66.8 s | -16.1 | -1.5 dBTP | -64.9 dBFS | 0.34% | 1.65 s | 0.00 s | 92.9% | 19.7% | none |
| power-platform-2026-07 | superseded | power-platform-2026-07-af_heart-kokoro_onnx.mp4 | af_heart / kokoro_onnx | 1920x1080 | 60.2 s | -16.1 | -1.5 dBTP | -70.0 dBFS | 2.02% | 1.35 s | 0.00 s | 93.0% | 19.6% | none |
| power-platform-2026-07 | superseded | power-platform-2026-07-af_bella-kokoro_onnx.mp4 | af_bella / kokoro_onnx | 1920x1080 | 64.1 s | -16.1 | -1.5 dBTP | -76.5 dBFS | 1.94% | 1.52 s | 0.00 s | 93.0% | 19.6% | none |
| power-platform-2026-07 | superseded | power-platform-2026-07-am_michael-kokoro.mp4 | am_michael / kokoro | 1920x1080 | 66.8 s | -16.1 | -1.5 dBTP | -64.9 dBFS | 0.34% | 1.65 s | 0.00 s | 92.9% | 19.7% | none |
| power-platform-2026-08 | superseded | power-platform-2026-08-am_michael-kokoro_onnx.mp4 | am_michael / kokoro_onnx | 1920x1080 | 66.8 s | -16.1 | -1.5 dBTP | -64.8 dBFS | 0.34% | 1.65 s | 0.00 s | 92.9% | 19.7% | none |
| power-platform-2026-08 | superseded | power-platform-2026-08-af_heart-kokoro_onnx.mp4 | af_heart / kokoro_onnx | 1920x1080 | 60.2 s | -16.1 | -1.5 dBTP | -70.2 dBFS | 2.03% | 1.38 s | 0.00 s | 93.0% | 19.6% | none |
| power-platform-2026-08 | superseded | power-platform-2026-08-af_bella-kokoro_onnx.mp4 | af_bella / kokoro_onnx | 1920x1080 | 64.1 s | -16.1 | -1.5 dBTP | -76.3 dBFS | 1.93% | 1.55 s | 0.00 s | 93.0% | 19.6% | none |
| power-platform-2026-08 | superseded | power-platform-2026-08-am_michael-kokoro.mp4 | am_michael / kokoro | 1920x1080 | 66.8 s | -16.1 | -1.5 dBTP | -64.9 dBFS | 0.34% | 1.65 s | 0.00 s | 92.9% | 19.7% | none |
| power-platform-2026-09 | superseded | power-platform-2026-09-am_michael-kokoro_onnx.mp4 | am_michael / kokoro_onnx | 1920x1080 | 66.8 s | -16.1 | -1.5 dBTP | -64.8 dBFS | 0.34% | 1.65 s | 0.00 s | 92.9% | 19.7% | none |
| power-platform-2026-09 | superseded | power-platform-2026-09-af_heart-kokoro_onnx.mp4 | af_heart / kokoro_onnx | 1920x1080 | 60.2 s | -16.1 | -1.5 dBTP | -70.3 dBFS | 2.02% | 1.35 s | 0.00 s | 93.0% | 19.6% | none |
| power-platform-2026-09 | superseded | power-platform-2026-09-af_bella-kokoro_onnx.mp4 | af_bella / kokoro_onnx | 1920x1080 | 64.1 s | -16.1 | -1.5 dBTP | -76.3 dBFS | 1.93% | 1.55 s | 0.00 s | 93.0% | 19.6% | none |
| power-platform-2026-09 | superseded | power-platform-2026-09-am_michael-kokoro.mp4 | am_michael / kokoro | 1920x1080 | 66.8 s | -16.1 | -1.5 dBTP | -64.7 dBFS | 0.34% | 1.65 s | 0.00 s | 92.9% | 19.7% | none |
| power-platform-2026-10 | superseded | power-platform-2026-10-am_michael-kokoro_onnx.mp4 | am_michael / kokoro_onnx | 1920x1080 | 66.8 s | -16.1 | -1.5 dBTP | -64.8 dBFS | 0.34% | 1.65 s | 0.00 s | 87.5% | 16.4% | none |
| power-platform-2026-10 | superseded | power-platform-2026-10-af_heart-kokoro_onnx.mp4 | af_heart / kokoro_onnx | 1920x1080 | 60.2 s | -16.1 | -1.5 dBTP | -70.3 dBFS | 2.02% | 1.35 s | 0.00 s | 87.5% | 16.4% | none |
| power-platform-2026-10 | superseded | power-platform-2026-10-af_bella-kokoro_onnx.mp4 | af_bella / kokoro_onnx | 1920x1080 | 64.1 s | -16.1 | -1.5 dBTP | -76.4 dBFS | 1.93% | 1.55 s | 0.00 s | 87.5% | 16.4% | none |
| power-platform-2026-10 | superseded | power-platform-2026-10-am_michael-kokoro.mp4 | am_michael / kokoro | 1920x1080 | 66.8 s | -16.1 | -1.5 dBTP | -65.0 dBFS | 0.34% | 1.65 s | 0.00 s | 87.5% | 16.4% | none |
| power-platform-2026-11 | current | power-platform-2026-11-am_michael-kokoro_onnx.mp4 | am_michael / kokoro_onnx | 1920x1080 | 66.8 s | -16.1 | -1.5 dBTP | -64.9 dBFS | 0.34% | 1.65 s | 0.00 s | 87.5% | 16.4% | none |
| power-platform-2026-11 | current | power-platform-2026-11-af_heart-kokoro_onnx.mp4 | af_heart / kokoro_onnx | 1920x1080 | 60.2 s | -16.1 | -1.5 dBTP | -70.2 dBFS | 2.03% | 1.38 s | 0.00 s | 87.5% | 16.4% | none |
| power-platform-2026-11 | current | power-platform-2026-11-af_bella-kokoro_onnx.mp4 | af_bella / kokoro_onnx | 1920x1080 | 64.1 s | -16.1 | -1.5 dBTP | -76.5 dBFS | 1.93% | 1.52 s | 0.00 s | 87.5% | 16.4% | none |
| power-platform-2026-11 | current | power-platform-2026-11-am_michael-kokoro.mp4 | am_michael / kokoro | 1920x1080 | 66.8 s | -16.1 | -1.5 dBTP | -64.8 dBFS | 0.34% | 1.65 s | 0.00 s | 87.5% | 16.4% | none |

## Findings by revision

### power-platform-2026-01 power-platform-2026-01.mp4

* warning: DC offset 0.0111122.
* info: Left and right channels carry identical mono narration.

Evidence: [analysis](power-platform-2026-01/power-platform-2026-01/analysis.json), [spectrogram](power-platform-2026-01/power-platform-2026-01/spectrogram.jpg), [speech spectrogram](power-platform-2026-01/power-platform-2026-01/spectrogram-speech.jpg), [video spectrogram](power-platform-2026-01/power-platform-2026-01/video-spectrogram.jpg), [spatial spectrogram](power-platform-2026-01/power-platform-2026-01/spatial-spectrogram.jpg), [layers](power-platform-2026-01/power-platform-2026-01/layers.png), [frames](power-platform-2026-01/power-platform-2026-01/contact-sheet.jpg).

### power-platform-2026-02 power-platform-2026-02.mp4

* warning: DC offset 0.0111122.
* info: Left and right channels carry identical mono narration.

Evidence: [analysis](power-platform-2026-02/power-platform-2026-02/analysis.json), [spectrogram](power-platform-2026-02/power-platform-2026-02/spectrogram.jpg), [speech spectrogram](power-platform-2026-02/power-platform-2026-02/spectrogram-speech.jpg), [video spectrogram](power-platform-2026-02/power-platform-2026-02/video-spectrogram.jpg), [spatial spectrogram](power-platform-2026-02/power-platform-2026-02/spatial-spectrogram.jpg), [layers](power-platform-2026-02/power-platform-2026-02/layers.png), [frames](power-platform-2026-02/power-platform-2026-02/contact-sheet.jpg).

### power-platform-2026-03 power-platform-2026-03.mp4

* warning: DC offset 0.0111122.
* info: Left and right channels carry identical mono narration.

Evidence: [analysis](power-platform-2026-03/power-platform-2026-03/analysis.json), [spectrogram](power-platform-2026-03/power-platform-2026-03/spectrogram.jpg), [speech spectrogram](power-platform-2026-03/power-platform-2026-03/spectrogram-speech.jpg), [video spectrogram](power-platform-2026-03/power-platform-2026-03/video-spectrogram.jpg), [spatial spectrogram](power-platform-2026-03/power-platform-2026-03/spatial-spectrogram.jpg), [layers](power-platform-2026-03/power-platform-2026-03/layers.png), [frames](power-platform-2026-03/power-platform-2026-03/contact-sheet.jpg).

### power-platform-2026-04 power-platform-2026-04.mp4

* warning: DC offset 0.0111122.
* info: Left and right channels carry identical mono narration.

Evidence: [analysis](power-platform-2026-04/power-platform-2026-04/analysis.json), [spectrogram](power-platform-2026-04/power-platform-2026-04/spectrogram.jpg), [speech spectrogram](power-platform-2026-04/power-platform-2026-04/spectrogram-speech.jpg), [video spectrogram](power-platform-2026-04/power-platform-2026-04/video-spectrogram.jpg), [spatial spectrogram](power-platform-2026-04/power-platform-2026-04/spatial-spectrogram.jpg), [layers](power-platform-2026-04/power-platform-2026-04/layers.png), [frames](power-platform-2026-04/power-platform-2026-04/contact-sheet.jpg).

### power-platform-2026-05 power-platform-2026-05.mp4

* warning: DC offset 0.0111009.
* info: Left and right channels carry identical mono narration.

Evidence: [analysis](power-platform-2026-05/power-platform-2026-05/analysis.json), [spectrogram](power-platform-2026-05/power-platform-2026-05/spectrogram.jpg), [speech spectrogram](power-platform-2026-05/power-platform-2026-05/spectrogram-speech.jpg), [video spectrogram](power-platform-2026-05/power-platform-2026-05/video-spectrogram.jpg), [spatial spectrogram](power-platform-2026-05/power-platform-2026-05/spatial-spectrogram.jpg), [layers](power-platform-2026-05/power-platform-2026-05/layers.png), [frames](power-platform-2026-05/power-platform-2026-05/contact-sheet.jpg).

### power-platform-2026-06 power-platform-2026-06.mp4

* info: Left and right channels carry identical mono narration.

Evidence: [analysis](power-platform-2026-06/power-platform-2026-06/analysis.json), [spectrogram](power-platform-2026-06/power-platform-2026-06/spectrogram.jpg), [speech spectrogram](power-platform-2026-06/power-platform-2026-06/spectrogram-speech.jpg), [video spectrogram](power-platform-2026-06/power-platform-2026-06/video-spectrogram.jpg), [spatial spectrogram](power-platform-2026-06/power-platform-2026-06/spatial-spectrogram.jpg), [layers](power-platform-2026-06/power-platform-2026-06/layers.png), [frames](power-platform-2026-06/power-platform-2026-06/contact-sheet.jpg).

### power-platform-2026-07 power-platform-2026-07-am_michael-kokoro_onnx.mp4

* info: Left and right channels carry identical mono narration.
* info: No visible motion for 8.067 s from 3.1 s.

Evidence: [analysis](power-platform-2026-07/power-platform-2026-07-am_michael-kokoro_onnx/analysis.json), [spectrogram](power-platform-2026-07/power-platform-2026-07-am_michael-kokoro_onnx/spectrogram.jpg), [speech spectrogram](power-platform-2026-07/power-platform-2026-07-am_michael-kokoro_onnx/spectrogram-speech.jpg), [video spectrogram](power-platform-2026-07/power-platform-2026-07-am_michael-kokoro_onnx/video-spectrogram.jpg), [spatial spectrogram](power-platform-2026-07/power-platform-2026-07-am_michael-kokoro_onnx/spatial-spectrogram.jpg), [layers](power-platform-2026-07/power-platform-2026-07-am_michael-kokoro_onnx/layers.png), [frames](power-platform-2026-07/power-platform-2026-07-am_michael-kokoro_onnx/contact-sheet.jpg).

### power-platform-2026-07 power-platform-2026-07-af_heart-kokoro_onnx.mp4

* info: Left and right channels carry identical mono narration.
* info: No visible motion for 8.133 s from 3.033 s.

Evidence: [analysis](power-platform-2026-07/power-platform-2026-07-af_heart-kokoro_onnx/analysis.json), [spectrogram](power-platform-2026-07/power-platform-2026-07-af_heart-kokoro_onnx/spectrogram.jpg), [speech spectrogram](power-platform-2026-07/power-platform-2026-07-af_heart-kokoro_onnx/spectrogram-speech.jpg), [video spectrogram](power-platform-2026-07/power-platform-2026-07-af_heart-kokoro_onnx/video-spectrogram.jpg), [spatial spectrogram](power-platform-2026-07/power-platform-2026-07-af_heart-kokoro_onnx/spatial-spectrogram.jpg), [layers](power-platform-2026-07/power-platform-2026-07-af_heart-kokoro_onnx/layers.png), [frames](power-platform-2026-07/power-platform-2026-07-af_heart-kokoro_onnx/contact-sheet.jpg).

### power-platform-2026-07 power-platform-2026-07-af_bella-kokoro_onnx.mp4

* info: Left and right channels carry identical mono narration.
* info: No visible motion for 8.133 s from 3.033 s.

Evidence: [analysis](power-platform-2026-07/power-platform-2026-07-af_bella-kokoro_onnx/analysis.json), [spectrogram](power-platform-2026-07/power-platform-2026-07-af_bella-kokoro_onnx/spectrogram.jpg), [speech spectrogram](power-platform-2026-07/power-platform-2026-07-af_bella-kokoro_onnx/spectrogram-speech.jpg), [video spectrogram](power-platform-2026-07/power-platform-2026-07-af_bella-kokoro_onnx/video-spectrogram.jpg), [spatial spectrogram](power-platform-2026-07/power-platform-2026-07-af_bella-kokoro_onnx/spatial-spectrogram.jpg), [layers](power-platform-2026-07/power-platform-2026-07-af_bella-kokoro_onnx/layers.png), [frames](power-platform-2026-07/power-platform-2026-07-af_bella-kokoro_onnx/contact-sheet.jpg).

### power-platform-2026-07 power-platform-2026-07-am_michael-kokoro.mp4

* info: Left and right channels carry identical mono narration.
* info: No visible motion for 8.067 s from 3.1 s.

Evidence: [analysis](power-platform-2026-07/power-platform-2026-07-am_michael-kokoro/analysis.json), [spectrogram](power-platform-2026-07/power-platform-2026-07-am_michael-kokoro/spectrogram.jpg), [speech spectrogram](power-platform-2026-07/power-platform-2026-07-am_michael-kokoro/spectrogram-speech.jpg), [video spectrogram](power-platform-2026-07/power-platform-2026-07-am_michael-kokoro/video-spectrogram.jpg), [spatial spectrogram](power-platform-2026-07/power-platform-2026-07-am_michael-kokoro/spatial-spectrogram.jpg), [layers](power-platform-2026-07/power-platform-2026-07-am_michael-kokoro/layers.png), [frames](power-platform-2026-07/power-platform-2026-07-am_michael-kokoro/contact-sheet.jpg).

### power-platform-2026-08 power-platform-2026-08-am_michael-kokoro_onnx.mp4

* info: Left and right channels carry identical mono narration.
* info: No visible motion for 8.067 s from 3.1 s.

Evidence: [analysis](power-platform-2026-08/power-platform-2026-08-am_michael-kokoro_onnx/analysis.json), [spectrogram](power-platform-2026-08/power-platform-2026-08-am_michael-kokoro_onnx/spectrogram.jpg), [speech spectrogram](power-platform-2026-08/power-platform-2026-08-am_michael-kokoro_onnx/spectrogram-speech.jpg), [video spectrogram](power-platform-2026-08/power-platform-2026-08-am_michael-kokoro_onnx/video-spectrogram.jpg), [spatial spectrogram](power-platform-2026-08/power-platform-2026-08-am_michael-kokoro_onnx/spatial-spectrogram.jpg), [layers](power-platform-2026-08/power-platform-2026-08-am_michael-kokoro_onnx/layers.png), [frames](power-platform-2026-08/power-platform-2026-08-am_michael-kokoro_onnx/contact-sheet.jpg).

### power-platform-2026-08 power-platform-2026-08-af_heart-kokoro_onnx.mp4

* info: Left and right channels carry identical mono narration.
* info: No visible motion for 8.133 s from 3.033 s.

Evidence: [analysis](power-platform-2026-08/power-platform-2026-08-af_heart-kokoro_onnx/analysis.json), [spectrogram](power-platform-2026-08/power-platform-2026-08-af_heart-kokoro_onnx/spectrogram.jpg), [speech spectrogram](power-platform-2026-08/power-platform-2026-08-af_heart-kokoro_onnx/spectrogram-speech.jpg), [video spectrogram](power-platform-2026-08/power-platform-2026-08-af_heart-kokoro_onnx/video-spectrogram.jpg), [spatial spectrogram](power-platform-2026-08/power-platform-2026-08-af_heart-kokoro_onnx/spatial-spectrogram.jpg), [layers](power-platform-2026-08/power-platform-2026-08-af_heart-kokoro_onnx/layers.png), [frames](power-platform-2026-08/power-platform-2026-08-af_heart-kokoro_onnx/contact-sheet.jpg).

### power-platform-2026-08 power-platform-2026-08-af_bella-kokoro_onnx.mp4

* info: Left and right channels carry identical mono narration.
* info: No visible motion for 8.133 s from 3.033 s.

Evidence: [analysis](power-platform-2026-08/power-platform-2026-08-af_bella-kokoro_onnx/analysis.json), [spectrogram](power-platform-2026-08/power-platform-2026-08-af_bella-kokoro_onnx/spectrogram.jpg), [speech spectrogram](power-platform-2026-08/power-platform-2026-08-af_bella-kokoro_onnx/spectrogram-speech.jpg), [video spectrogram](power-platform-2026-08/power-platform-2026-08-af_bella-kokoro_onnx/video-spectrogram.jpg), [spatial spectrogram](power-platform-2026-08/power-platform-2026-08-af_bella-kokoro_onnx/spatial-spectrogram.jpg), [layers](power-platform-2026-08/power-platform-2026-08-af_bella-kokoro_onnx/layers.png), [frames](power-platform-2026-08/power-platform-2026-08-af_bella-kokoro_onnx/contact-sheet.jpg).

### power-platform-2026-08 power-platform-2026-08-am_michael-kokoro.mp4

* info: Left and right channels carry identical mono narration.
* info: No visible motion for 8.067 s from 3.1 s.

Evidence: [analysis](power-platform-2026-08/power-platform-2026-08-am_michael-kokoro/analysis.json), [spectrogram](power-platform-2026-08/power-platform-2026-08-am_michael-kokoro/spectrogram.jpg), [speech spectrogram](power-platform-2026-08/power-platform-2026-08-am_michael-kokoro/spectrogram-speech.jpg), [video spectrogram](power-platform-2026-08/power-platform-2026-08-am_michael-kokoro/video-spectrogram.jpg), [spatial spectrogram](power-platform-2026-08/power-platform-2026-08-am_michael-kokoro/spatial-spectrogram.jpg), [layers](power-platform-2026-08/power-platform-2026-08-am_michael-kokoro/layers.png), [frames](power-platform-2026-08/power-platform-2026-08-am_michael-kokoro/contact-sheet.jpg).

### power-platform-2026-09 power-platform-2026-09-am_michael-kokoro_onnx.mp4

* info: Left and right channels carry identical mono narration.
* info: No visible motion for 8.067 s from 3.1 s.

Evidence: [analysis](power-platform-2026-09/power-platform-2026-09-am_michael-kokoro_onnx/analysis.json), [spectrogram](power-platform-2026-09/power-platform-2026-09-am_michael-kokoro_onnx/spectrogram.jpg), [speech spectrogram](power-platform-2026-09/power-platform-2026-09-am_michael-kokoro_onnx/spectrogram-speech.jpg), [video spectrogram](power-platform-2026-09/power-platform-2026-09-am_michael-kokoro_onnx/video-spectrogram.jpg), [spatial spectrogram](power-platform-2026-09/power-platform-2026-09-am_michael-kokoro_onnx/spatial-spectrogram.jpg), [layers](power-platform-2026-09/power-platform-2026-09-am_michael-kokoro_onnx/layers.png), [frames](power-platform-2026-09/power-platform-2026-09-am_michael-kokoro_onnx/contact-sheet.jpg).

### power-platform-2026-09 power-platform-2026-09-af_heart-kokoro_onnx.mp4

* info: Left and right channels carry identical mono narration.
* info: No visible motion for 8.133 s from 3.033 s.

Evidence: [analysis](power-platform-2026-09/power-platform-2026-09-af_heart-kokoro_onnx/analysis.json), [spectrogram](power-platform-2026-09/power-platform-2026-09-af_heart-kokoro_onnx/spectrogram.jpg), [speech spectrogram](power-platform-2026-09/power-platform-2026-09-af_heart-kokoro_onnx/spectrogram-speech.jpg), [video spectrogram](power-platform-2026-09/power-platform-2026-09-af_heart-kokoro_onnx/video-spectrogram.jpg), [spatial spectrogram](power-platform-2026-09/power-platform-2026-09-af_heart-kokoro_onnx/spatial-spectrogram.jpg), [layers](power-platform-2026-09/power-platform-2026-09-af_heart-kokoro_onnx/layers.png), [frames](power-platform-2026-09/power-platform-2026-09-af_heart-kokoro_onnx/contact-sheet.jpg).

### power-platform-2026-09 power-platform-2026-09-af_bella-kokoro_onnx.mp4

* info: Left and right channels carry identical mono narration.
* info: No visible motion for 8.133 s from 3.033 s.

Evidence: [analysis](power-platform-2026-09/power-platform-2026-09-af_bella-kokoro_onnx/analysis.json), [spectrogram](power-platform-2026-09/power-platform-2026-09-af_bella-kokoro_onnx/spectrogram.jpg), [speech spectrogram](power-platform-2026-09/power-platform-2026-09-af_bella-kokoro_onnx/spectrogram-speech.jpg), [video spectrogram](power-platform-2026-09/power-platform-2026-09-af_bella-kokoro_onnx/video-spectrogram.jpg), [spatial spectrogram](power-platform-2026-09/power-platform-2026-09-af_bella-kokoro_onnx/spatial-spectrogram.jpg), [layers](power-platform-2026-09/power-platform-2026-09-af_bella-kokoro_onnx/layers.png), [frames](power-platform-2026-09/power-platform-2026-09-af_bella-kokoro_onnx/contact-sheet.jpg).

### power-platform-2026-09 power-platform-2026-09-am_michael-kokoro.mp4

* info: Left and right channels carry identical mono narration.
* info: No visible motion for 8.067 s from 3.1 s.

Evidence: [analysis](power-platform-2026-09/power-platform-2026-09-am_michael-kokoro/analysis.json), [spectrogram](power-platform-2026-09/power-platform-2026-09-am_michael-kokoro/spectrogram.jpg), [speech spectrogram](power-platform-2026-09/power-platform-2026-09-am_michael-kokoro/spectrogram-speech.jpg), [video spectrogram](power-platform-2026-09/power-platform-2026-09-am_michael-kokoro/video-spectrogram.jpg), [spatial spectrogram](power-platform-2026-09/power-platform-2026-09-am_michael-kokoro/spatial-spectrogram.jpg), [layers](power-platform-2026-09/power-platform-2026-09-am_michael-kokoro/layers.png), [frames](power-platform-2026-09/power-platform-2026-09-am_michael-kokoro/contact-sheet.jpg).

### power-platform-2026-10 power-platform-2026-10-am_michael-kokoro_onnx.mp4

* info: Left and right channels carry identical mono narration.
* info: No visible motion for 12.533 s from 1.233 s.
* info: No visible motion for 8.433 s from 44.233 s.

Evidence: [analysis](power-platform-2026-10/power-platform-2026-10-am_michael-kokoro_onnx/analysis.json), [spectrogram](power-platform-2026-10/power-platform-2026-10-am_michael-kokoro_onnx/spectrogram.jpg), [speech spectrogram](power-platform-2026-10/power-platform-2026-10-am_michael-kokoro_onnx/spectrogram-speech.jpg), [video spectrogram](power-platform-2026-10/power-platform-2026-10-am_michael-kokoro_onnx/video-spectrogram.jpg), [spatial spectrogram](power-platform-2026-10/power-platform-2026-10-am_michael-kokoro_onnx/spatial-spectrogram.jpg), [layers](power-platform-2026-10/power-platform-2026-10-am_michael-kokoro_onnx/layers.png), [frames](power-platform-2026-10/power-platform-2026-10-am_michael-kokoro_onnx/contact-sheet.jpg).

### power-platform-2026-10 power-platform-2026-10-af_heart-kokoro_onnx.mp4

* info: Left and right channels carry identical mono narration.
* info: No visible motion for 10.967 s from 1.233 s.

Evidence: [analysis](power-platform-2026-10/power-platform-2026-10-af_heart-kokoro_onnx/analysis.json), [spectrogram](power-platform-2026-10/power-platform-2026-10-af_heart-kokoro_onnx/spectrogram.jpg), [speech spectrogram](power-platform-2026-10/power-platform-2026-10-af_heart-kokoro_onnx/spectrogram-speech.jpg), [video spectrogram](power-platform-2026-10/power-platform-2026-10-af_heart-kokoro_onnx/video-spectrogram.jpg), [spatial spectrogram](power-platform-2026-10/power-platform-2026-10-af_heart-kokoro_onnx/spatial-spectrogram.jpg), [layers](power-platform-2026-10/power-platform-2026-10-af_heart-kokoro_onnx/layers.png), [frames](power-platform-2026-10/power-platform-2026-10-af_heart-kokoro_onnx/contact-sheet.jpg).

### power-platform-2026-10 power-platform-2026-10-af_bella-kokoro_onnx.mp4

* info: Left and right channels carry identical mono narration.
* info: No visible motion for 11.933 s from 1.233 s.

Evidence: [analysis](power-platform-2026-10/power-platform-2026-10-af_bella-kokoro_onnx/analysis.json), [spectrogram](power-platform-2026-10/power-platform-2026-10-af_bella-kokoro_onnx/spectrogram.jpg), [speech spectrogram](power-platform-2026-10/power-platform-2026-10-af_bella-kokoro_onnx/spectrogram-speech.jpg), [video spectrogram](power-platform-2026-10/power-platform-2026-10-af_bella-kokoro_onnx/video-spectrogram.jpg), [spatial spectrogram](power-platform-2026-10/power-platform-2026-10-af_bella-kokoro_onnx/spatial-spectrogram.jpg), [layers](power-platform-2026-10/power-platform-2026-10-af_bella-kokoro_onnx/layers.png), [frames](power-platform-2026-10/power-platform-2026-10-af_bella-kokoro_onnx/contact-sheet.jpg).

### power-platform-2026-10 power-platform-2026-10-am_michael-kokoro.mp4

* info: Left and right channels carry identical mono narration.
* info: No visible motion for 12.533 s from 1.233 s.
* info: No visible motion for 8.433 s from 44.233 s.

Evidence: [analysis](power-platform-2026-10/power-platform-2026-10-am_michael-kokoro/analysis.json), [spectrogram](power-platform-2026-10/power-platform-2026-10-am_michael-kokoro/spectrogram.jpg), [speech spectrogram](power-platform-2026-10/power-platform-2026-10-am_michael-kokoro/spectrogram-speech.jpg), [video spectrogram](power-platform-2026-10/power-platform-2026-10-am_michael-kokoro/video-spectrogram.jpg), [spatial spectrogram](power-platform-2026-10/power-platform-2026-10-am_michael-kokoro/spatial-spectrogram.jpg), [layers](power-platform-2026-10/power-platform-2026-10-am_michael-kokoro/layers.png), [frames](power-platform-2026-10/power-platform-2026-10-am_michael-kokoro/contact-sheet.jpg).

### power-platform-2026-11 power-platform-2026-11-am_michael-kokoro_onnx.mp4

* info: Left and right channels carry identical mono narration.
* info: No visible motion for 12.533 s from 1.233 s.
* info: No visible motion for 8.433 s from 44.233 s.

Evidence: [analysis](power-platform-2026-11/power-platform-2026-11-am_michael-kokoro_onnx/analysis.json), [spectrogram](power-platform-2026-11/power-platform-2026-11-am_michael-kokoro_onnx/spectrogram.jpg), [speech spectrogram](power-platform-2026-11/power-platform-2026-11-am_michael-kokoro_onnx/spectrogram-speech.jpg), [video spectrogram](power-platform-2026-11/power-platform-2026-11-am_michael-kokoro_onnx/video-spectrogram.jpg), [spatial spectrogram](power-platform-2026-11/power-platform-2026-11-am_michael-kokoro_onnx/spatial-spectrogram.jpg), [layers](power-platform-2026-11/power-platform-2026-11-am_michael-kokoro_onnx/layers.png), [frames](power-platform-2026-11/power-platform-2026-11-am_michael-kokoro_onnx/contact-sheet.jpg).

### power-platform-2026-11 power-platform-2026-11-af_heart-kokoro_onnx.mp4

* info: Left and right channels carry identical mono narration.
* info: No visible motion for 10.967 s from 1.233 s.

Evidence: [analysis](power-platform-2026-11/power-platform-2026-11-af_heart-kokoro_onnx/analysis.json), [spectrogram](power-platform-2026-11/power-platform-2026-11-af_heart-kokoro_onnx/spectrogram.jpg), [speech spectrogram](power-platform-2026-11/power-platform-2026-11-af_heart-kokoro_onnx/spectrogram-speech.jpg), [video spectrogram](power-platform-2026-11/power-platform-2026-11-af_heart-kokoro_onnx/video-spectrogram.jpg), [spatial spectrogram](power-platform-2026-11/power-platform-2026-11-af_heart-kokoro_onnx/spatial-spectrogram.jpg), [layers](power-platform-2026-11/power-platform-2026-11-af_heart-kokoro_onnx/layers.png), [frames](power-platform-2026-11/power-platform-2026-11-af_heart-kokoro_onnx/contact-sheet.jpg).

### power-platform-2026-11 power-platform-2026-11-af_bella-kokoro_onnx.mp4

* info: Left and right channels carry identical mono narration.
* info: No visible motion for 11.933 s from 1.233 s.

Evidence: [analysis](power-platform-2026-11/power-platform-2026-11-af_bella-kokoro_onnx/analysis.json), [spectrogram](power-platform-2026-11/power-platform-2026-11-af_bella-kokoro_onnx/spectrogram.jpg), [speech spectrogram](power-platform-2026-11/power-platform-2026-11-af_bella-kokoro_onnx/spectrogram-speech.jpg), [video spectrogram](power-platform-2026-11/power-platform-2026-11-af_bella-kokoro_onnx/video-spectrogram.jpg), [spatial spectrogram](power-platform-2026-11/power-platform-2026-11-af_bella-kokoro_onnx/spatial-spectrogram.jpg), [layers](power-platform-2026-11/power-platform-2026-11-af_bella-kokoro_onnx/layers.png), [frames](power-platform-2026-11/power-platform-2026-11-af_bella-kokoro_onnx/contact-sheet.jpg).

### power-platform-2026-11 power-platform-2026-11-am_michael-kokoro.mp4

* info: Left and right channels carry identical mono narration.
* info: No visible motion for 12.533 s from 1.233 s.
* info: No visible motion for 8.433 s from 44.233 s.

Evidence: [analysis](power-platform-2026-11/power-platform-2026-11-am_michael-kokoro/analysis.json), [spectrogram](power-platform-2026-11/power-platform-2026-11-am_michael-kokoro/spectrogram.jpg), [speech spectrogram](power-platform-2026-11/power-platform-2026-11-am_michael-kokoro/spectrogram-speech.jpg), [video spectrogram](power-platform-2026-11/power-platform-2026-11-am_michael-kokoro/video-spectrogram.jpg), [spatial spectrogram](power-platform-2026-11/power-platform-2026-11-am_michael-kokoro/spatial-spectrogram.jpg), [layers](power-platform-2026-11/power-platform-2026-11-am_michael-kokoro/layers.png), [frames](power-platform-2026-11/power-platform-2026-11-am_michael-kokoro/contact-sheet.jpg).

## Comparison images

* [Spectrogram stack](spectrogram-stack.jpg)
* [Video spectrogram stack](video-spectrogram-stack.jpg)
* [Spatial spectrogram stack](spatial-spectrogram-stack.jpg)
* [Frame grid](frames-grid.jpg)
* [Layer activity stack](layers-stack.jpg)
