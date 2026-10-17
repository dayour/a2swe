---
title: datadog-cowork-plugin render analysis
description: Measured audio, spectrogram and video-layer comparison for every datadog-cowork-plugin revision.
---

## Method

Every revision video is decoded with FFmpeg and measured with the core `media-analyze` method. Spectrograms use a Hann window, logarithmic magnitude and a 120 dB range, with frequency, time and dBFS legends. Loudness uses ITU-R BS.1770 (EBU R128). Video layers are measured per layout zone as frame-to-frame motion and edge detail.

The video spectrogram is the visual counterpart of the audio spectrogram. Each pixel's brightness is a signal sampled at the frame rate, and a short-time Fourier transform of every pixel, averaged per layout zone, shows the temporal frequencies each layer carries. Scene and caption changes appear as broadband bursts, eased animation below 2 Hz, and flicker or shimmer as sustained narrow lines. The spatial spectrogram shows horizontal detail per content band over time; the fine-detail share above 0.18 cycles per pixel tracks text sharpness and density.

These are objective measurements. They do not replace listening and viewing.

## Revisions

| Revision | Status | Output | Voice | Size | Duration | LUFS | True peak | Pause floor | Speech HF>8k | Longest pause | Flicker | Motion <2 Hz | Body detail | Findings |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| datadog-cowork-plugin-2026-01 | superseded | datadog-cowork-plugin-2026-01.mp4 | kokoro_onnx | 1920x1080 | 89.0 s | -18.0 | -1.0 dBTP | -109.1 dBFS | 0.40% | 0.50 s | 8.53 s | 93.8% | 22.3% | warning:video-flicker |
| datadog-cowork-plugin-2026-02 | superseded | datadog-cowork-plugin-2026-02.mp4 | kokoro_onnx | 1920x1080 | 89.0 s | -18.6 | -1.0 dBTP | -64.5 dBFS | 0.40% | 1.07 s | 8.53 s | 93.7% | 22.9% | warning:video-flicker |
| datadog-cowork-plugin-2026-03 | superseded | datadog-cowork-plugin-2026-03.mp4 | kokoro_onnx | 1920x1080 | 89.0 s | -18.3 | -1.0 dBTP | -64.3 dBFS | 0.40% | 1.10 s | 9.07 s | 88.5% | 22.9% | warning:video-flicker |
| datadog-cowork-plugin-2026-04 | superseded | datadog-cowork-plugin-2026-04-am_michael-kokoro_onnx.mp4 | am_michael / kokoro_onnx | 1920x1080 | 91.8 s | -16.0 | -1.5 dBTP | -65.1 dBFS | 0.33% | 1.60 s | 8.53 s | 92.6% | 22.8% | warning:video-flicker |
| datadog-cowork-plugin-2026-04 | superseded | datadog-cowork-plugin-2026-04-af_heart-kokoro_onnx.mp4 | af_heart / kokoro_onnx | 1920x1080 | 83.8 s | -16.0 | -1.5 dBTP | -71.0 dBFS | 2.34% | 1.40 s | 7.47 s | 92.7% | 22.8% | warning:video-flicker |
| datadog-cowork-plugin-2026-04 | superseded | datadog-cowork-plugin-2026-04-af_bella-kokoro_onnx.mp4 | af_bella / kokoro_onnx | 1920x1080 | 87.0 s | -16.0 | -1.5 dBTP | -77.1 dBFS | 2.17% | 1.52 s | 8.00 s | 92.6% | 22.7% | warning:video-flicker |
| datadog-cowork-plugin-2026-04 | superseded | datadog-cowork-plugin-2026-04-am_michael-kokoro.mp4 | am_michael / kokoro | 1920x1080 | 91.8 s | -16.0 | -1.5 dBTP | -64.8 dBFS | 0.33% | 1.60 s | 9.07 s | 92.6% | 22.8% | warning:video-flicker |
| datadog-cowork-plugin-2026-05 | superseded | datadog-cowork-plugin-2026-05-am_michael-kokoro_onnx.mp4 | am_michael / kokoro_onnx | 1920x1080 | 91.8 s | -16.0 | -1.5 dBTP | -65.1 dBFS | 0.33% | 1.60 s | 8.53 s | 92.6% | 22.8% | warning:video-flicker |
| datadog-cowork-plugin-2026-05 | superseded | datadog-cowork-plugin-2026-05-af_heart-kokoro_onnx.mp4 | af_heart / kokoro_onnx | 1920x1080 | 83.8 s | -16.0 | -1.5 dBTP | -71.2 dBFS | 2.33% | 1.40 s | 7.47 s | 92.7% | 22.8% | warning:video-flicker |
| datadog-cowork-plugin-2026-05 | superseded | datadog-cowork-plugin-2026-05-af_bella-kokoro_onnx.mp4 | af_bella / kokoro_onnx | 1920x1080 | 87.0 s | -16.0 | -1.5 dBTP | -77.0 dBFS | 2.17% | 1.52 s | 8.00 s | 92.6% | 22.7% | warning:video-flicker |
| datadog-cowork-plugin-2026-05 | superseded | datadog-cowork-plugin-2026-05-am_michael-kokoro.mp4 | am_michael / kokoro | 1920x1080 | 91.8 s | -16.0 | -1.5 dBTP | -65.0 dBFS | 0.33% | 1.60 s | 8.53 s | 92.7% | 22.8% | warning:video-flicker |
| datadog-cowork-plugin-2026-06 | superseded | datadog-cowork-plugin-2026-06-am_michael-kokoro_onnx.mp4 | am_michael / kokoro_onnx | 1920x1080 | 72.7 s | -16.1 | -1.5 dBTP | -70.0 dBFS | 0.31% | 1.60 s | 5.33 s | 87.6% | 21.5% | warning:video-flicker |
| datadog-cowork-plugin-2026-06 | superseded | datadog-cowork-plugin-2026-06-af_heart-kokoro_onnx.mp4 | af_heart / kokoro_onnx | 1920x1080 | 66.3 s | -16.0 | -1.5 dBTP | -74.5 dBFS | 2.29% | 1.38 s | 4.80 s | 87.6% | 21.6% | warning:video-flicker |
| datadog-cowork-plugin-2026-06 | superseded | datadog-cowork-plugin-2026-06-af_bella-kokoro_onnx.mp4 | af_bella / kokoro_onnx | 1920x1080 | 69.2 s | -16.1 | -1.5 dBTP | -79.0 dBFS | 2.15% | 1.65 s | 4.80 s | 87.6% | 21.5% | warning:video-flicker |
| datadog-cowork-plugin-2026-06 | superseded | datadog-cowork-plugin-2026-06-am_michael-kokoro.mp4 | am_michael / kokoro | 1920x1080 | 72.7 s | -16.1 | -1.5 dBTP | -70.1 dBFS | 0.30% | 1.60 s | 5.33 s | 87.6% | 21.5% | warning:video-flicker |
| datadog-cowork-plugin-2026-07 | current | datadog-cowork-plugin-2026-07-am_michael-kokoro_onnx.mp4 | am_michael / kokoro_onnx | 1920x1080 | 72.7 s | -16.0 | -1.5 dBTP | -70.0 dBFS | 0.31% | 1.60 s | 0.00 s | 87.6% | 21.8% | none |
| datadog-cowork-plugin-2026-07 | current | datadog-cowork-plugin-2026-07-af_heart-kokoro_onnx.mp4 | af_heart / kokoro_onnx | 1920x1080 | 66.3 s | -16.0 | -1.5 dBTP | -74.3 dBFS | 2.29% | 1.38 s | 0.00 s | 87.6% | 21.8% | none |
| datadog-cowork-plugin-2026-07 | current | datadog-cowork-plugin-2026-07-af_bella-kokoro_onnx.mp4 | af_bella / kokoro_onnx | 1920x1080 | 69.2 s | -16.1 | -1.5 dBTP | -79.2 dBFS | 2.17% | 1.65 s | 0.00 s | 87.6% | 21.5% | none |
| datadog-cowork-plugin-2026-07 | current | datadog-cowork-plugin-2026-07-am_michael-kokoro.mp4 | am_michael / kokoro | 1920x1080 | 72.7 s | -16.1 | -1.5 dBTP | -70.2 dBFS | 0.30% | 1.60 s | 0.00 s | 87.6% | 21.8% | none |

## Findings by revision

### datadog-cowork-plugin-2026-01 datadog-cowork-plugin-2026-01.mp4

* info: Left and right channels carry identical mono narration.
* warning: The visual layer flickers at about 15 Hz for 8.53 s.

Evidence: [analysis](datadog-cowork-plugin-2026-01/datadog-cowork-plugin-2026-01/analysis.json), [spectrogram](datadog-cowork-plugin-2026-01/datadog-cowork-plugin-2026-01/spectrogram.jpg), [speech spectrogram](datadog-cowork-plugin-2026-01/datadog-cowork-plugin-2026-01/spectrogram-speech.jpg), [video spectrogram](datadog-cowork-plugin-2026-01/datadog-cowork-plugin-2026-01/video-spectrogram.jpg), [spatial spectrogram](datadog-cowork-plugin-2026-01/datadog-cowork-plugin-2026-01/spatial-spectrogram.jpg), [layers](datadog-cowork-plugin-2026-01/datadog-cowork-plugin-2026-01/layers.png), [frames](datadog-cowork-plugin-2026-01/datadog-cowork-plugin-2026-01/contact-sheet.jpg).

### datadog-cowork-plugin-2026-02 datadog-cowork-plugin-2026-02.mp4

* info: Left and right channels carry identical mono narration.
* warning: The visual layer flickers at about 15 Hz for 8.53 s.

Evidence: [analysis](datadog-cowork-plugin-2026-02/datadog-cowork-plugin-2026-02/analysis.json), [spectrogram](datadog-cowork-plugin-2026-02/datadog-cowork-plugin-2026-02/spectrogram.jpg), [speech spectrogram](datadog-cowork-plugin-2026-02/datadog-cowork-plugin-2026-02/spectrogram-speech.jpg), [video spectrogram](datadog-cowork-plugin-2026-02/datadog-cowork-plugin-2026-02/video-spectrogram.jpg), [spatial spectrogram](datadog-cowork-plugin-2026-02/datadog-cowork-plugin-2026-02/spatial-spectrogram.jpg), [layers](datadog-cowork-plugin-2026-02/datadog-cowork-plugin-2026-02/layers.png), [frames](datadog-cowork-plugin-2026-02/datadog-cowork-plugin-2026-02/contact-sheet.jpg).

### datadog-cowork-plugin-2026-03 datadog-cowork-plugin-2026-03.mp4

* info: Left and right channels carry identical mono narration.
* warning: The visual layer flickers at about 11.25 Hz for 9.07 s.

Evidence: [analysis](datadog-cowork-plugin-2026-03/datadog-cowork-plugin-2026-03/analysis.json), [spectrogram](datadog-cowork-plugin-2026-03/datadog-cowork-plugin-2026-03/spectrogram.jpg), [speech spectrogram](datadog-cowork-plugin-2026-03/datadog-cowork-plugin-2026-03/spectrogram-speech.jpg), [video spectrogram](datadog-cowork-plugin-2026-03/datadog-cowork-plugin-2026-03/video-spectrogram.jpg), [spatial spectrogram](datadog-cowork-plugin-2026-03/datadog-cowork-plugin-2026-03/spatial-spectrogram.jpg), [layers](datadog-cowork-plugin-2026-03/datadog-cowork-plugin-2026-03/layers.png), [frames](datadog-cowork-plugin-2026-03/datadog-cowork-plugin-2026-03/contact-sheet.jpg).

### datadog-cowork-plugin-2026-04 datadog-cowork-plugin-2026-04-am_michael-kokoro_onnx.mp4

* info: Left and right channels carry identical mono narration.
* warning: The visual layer flickers at about 15 Hz for 8.53 s.

Evidence: [analysis](datadog-cowork-plugin-2026-04/datadog-cowork-plugin-2026-04-am_michael-kokoro_onnx/analysis.json), [spectrogram](datadog-cowork-plugin-2026-04/datadog-cowork-plugin-2026-04-am_michael-kokoro_onnx/spectrogram.jpg), [speech spectrogram](datadog-cowork-plugin-2026-04/datadog-cowork-plugin-2026-04-am_michael-kokoro_onnx/spectrogram-speech.jpg), [video spectrogram](datadog-cowork-plugin-2026-04/datadog-cowork-plugin-2026-04-am_michael-kokoro_onnx/video-spectrogram.jpg), [spatial spectrogram](datadog-cowork-plugin-2026-04/datadog-cowork-plugin-2026-04-am_michael-kokoro_onnx/spatial-spectrogram.jpg), [layers](datadog-cowork-plugin-2026-04/datadog-cowork-plugin-2026-04-am_michael-kokoro_onnx/layers.png), [frames](datadog-cowork-plugin-2026-04/datadog-cowork-plugin-2026-04-am_michael-kokoro_onnx/contact-sheet.jpg).

### datadog-cowork-plugin-2026-04 datadog-cowork-plugin-2026-04-af_heart-kokoro_onnx.mp4

* info: Left and right channels carry identical mono narration.
* warning: The visual layer flickers at about 11.25 Hz for 7.47 s.

Evidence: [analysis](datadog-cowork-plugin-2026-04/datadog-cowork-plugin-2026-04-af_heart-kokoro_onnx/analysis.json), [spectrogram](datadog-cowork-plugin-2026-04/datadog-cowork-plugin-2026-04-af_heart-kokoro_onnx/spectrogram.jpg), [speech spectrogram](datadog-cowork-plugin-2026-04/datadog-cowork-plugin-2026-04-af_heart-kokoro_onnx/spectrogram-speech.jpg), [video spectrogram](datadog-cowork-plugin-2026-04/datadog-cowork-plugin-2026-04-af_heart-kokoro_onnx/video-spectrogram.jpg), [spatial spectrogram](datadog-cowork-plugin-2026-04/datadog-cowork-plugin-2026-04-af_heart-kokoro_onnx/spatial-spectrogram.jpg), [layers](datadog-cowork-plugin-2026-04/datadog-cowork-plugin-2026-04-af_heart-kokoro_onnx/layers.png), [frames](datadog-cowork-plugin-2026-04/datadog-cowork-plugin-2026-04-af_heart-kokoro_onnx/contact-sheet.jpg).

### datadog-cowork-plugin-2026-04 datadog-cowork-plugin-2026-04-af_bella-kokoro_onnx.mp4

* info: Left and right channels carry identical mono narration.
* warning: The visual layer flickers at about 3.75 Hz for 8 s.

Evidence: [analysis](datadog-cowork-plugin-2026-04/datadog-cowork-plugin-2026-04-af_bella-kokoro_onnx/analysis.json), [spectrogram](datadog-cowork-plugin-2026-04/datadog-cowork-plugin-2026-04-af_bella-kokoro_onnx/spectrogram.jpg), [speech spectrogram](datadog-cowork-plugin-2026-04/datadog-cowork-plugin-2026-04-af_bella-kokoro_onnx/spectrogram-speech.jpg), [video spectrogram](datadog-cowork-plugin-2026-04/datadog-cowork-plugin-2026-04-af_bella-kokoro_onnx/video-spectrogram.jpg), [spatial spectrogram](datadog-cowork-plugin-2026-04/datadog-cowork-plugin-2026-04-af_bella-kokoro_onnx/spatial-spectrogram.jpg), [layers](datadog-cowork-plugin-2026-04/datadog-cowork-plugin-2026-04-af_bella-kokoro_onnx/layers.png), [frames](datadog-cowork-plugin-2026-04/datadog-cowork-plugin-2026-04-af_bella-kokoro_onnx/contact-sheet.jpg).

### datadog-cowork-plugin-2026-04 datadog-cowork-plugin-2026-04-am_michael-kokoro.mp4

* info: Left and right channels carry identical mono narration.
* warning: The visual layer flickers at about 15 Hz for 9.07 s.

Evidence: [analysis](datadog-cowork-plugin-2026-04/datadog-cowork-plugin-2026-04-am_michael-kokoro/analysis.json), [spectrogram](datadog-cowork-plugin-2026-04/datadog-cowork-plugin-2026-04-am_michael-kokoro/spectrogram.jpg), [speech spectrogram](datadog-cowork-plugin-2026-04/datadog-cowork-plugin-2026-04-am_michael-kokoro/spectrogram-speech.jpg), [video spectrogram](datadog-cowork-plugin-2026-04/datadog-cowork-plugin-2026-04-am_michael-kokoro/video-spectrogram.jpg), [spatial spectrogram](datadog-cowork-plugin-2026-04/datadog-cowork-plugin-2026-04-am_michael-kokoro/spatial-spectrogram.jpg), [layers](datadog-cowork-plugin-2026-04/datadog-cowork-plugin-2026-04-am_michael-kokoro/layers.png), [frames](datadog-cowork-plugin-2026-04/datadog-cowork-plugin-2026-04-am_michael-kokoro/contact-sheet.jpg).

### datadog-cowork-plugin-2026-05 datadog-cowork-plugin-2026-05-am_michael-kokoro_onnx.mp4

* info: Left and right channels carry identical mono narration.
* warning: The visual layer flickers at about 11.25 Hz for 8.53 s.

Evidence: [analysis](datadog-cowork-plugin-2026-05/datadog-cowork-plugin-2026-05-am_michael-kokoro_onnx/analysis.json), [spectrogram](datadog-cowork-plugin-2026-05/datadog-cowork-plugin-2026-05-am_michael-kokoro_onnx/spectrogram.jpg), [speech spectrogram](datadog-cowork-plugin-2026-05/datadog-cowork-plugin-2026-05-am_michael-kokoro_onnx/spectrogram-speech.jpg), [video spectrogram](datadog-cowork-plugin-2026-05/datadog-cowork-plugin-2026-05-am_michael-kokoro_onnx/video-spectrogram.jpg), [spatial spectrogram](datadog-cowork-plugin-2026-05/datadog-cowork-plugin-2026-05-am_michael-kokoro_onnx/spatial-spectrogram.jpg), [layers](datadog-cowork-plugin-2026-05/datadog-cowork-plugin-2026-05-am_michael-kokoro_onnx/layers.png), [frames](datadog-cowork-plugin-2026-05/datadog-cowork-plugin-2026-05-am_michael-kokoro_onnx/contact-sheet.jpg).

### datadog-cowork-plugin-2026-05 datadog-cowork-plugin-2026-05-af_heart-kokoro_onnx.mp4

* info: Left and right channels carry identical mono narration.
* warning: The visual layer flickers at about 15 Hz for 7.47 s.

Evidence: [analysis](datadog-cowork-plugin-2026-05/datadog-cowork-plugin-2026-05-af_heart-kokoro_onnx/analysis.json), [spectrogram](datadog-cowork-plugin-2026-05/datadog-cowork-plugin-2026-05-af_heart-kokoro_onnx/spectrogram.jpg), [speech spectrogram](datadog-cowork-plugin-2026-05/datadog-cowork-plugin-2026-05-af_heart-kokoro_onnx/spectrogram-speech.jpg), [video spectrogram](datadog-cowork-plugin-2026-05/datadog-cowork-plugin-2026-05-af_heart-kokoro_onnx/video-spectrogram.jpg), [spatial spectrogram](datadog-cowork-plugin-2026-05/datadog-cowork-plugin-2026-05-af_heart-kokoro_onnx/spatial-spectrogram.jpg), [layers](datadog-cowork-plugin-2026-05/datadog-cowork-plugin-2026-05-af_heart-kokoro_onnx/layers.png), [frames](datadog-cowork-plugin-2026-05/datadog-cowork-plugin-2026-05-af_heart-kokoro_onnx/contact-sheet.jpg).

### datadog-cowork-plugin-2026-05 datadog-cowork-plugin-2026-05-af_bella-kokoro_onnx.mp4

* info: Left and right channels carry identical mono narration.
* warning: The visual layer flickers at about 7.5 Hz for 8 s.

Evidence: [analysis](datadog-cowork-plugin-2026-05/datadog-cowork-plugin-2026-05-af_bella-kokoro_onnx/analysis.json), [spectrogram](datadog-cowork-plugin-2026-05/datadog-cowork-plugin-2026-05-af_bella-kokoro_onnx/spectrogram.jpg), [speech spectrogram](datadog-cowork-plugin-2026-05/datadog-cowork-plugin-2026-05-af_bella-kokoro_onnx/spectrogram-speech.jpg), [video spectrogram](datadog-cowork-plugin-2026-05/datadog-cowork-plugin-2026-05-af_bella-kokoro_onnx/video-spectrogram.jpg), [spatial spectrogram](datadog-cowork-plugin-2026-05/datadog-cowork-plugin-2026-05-af_bella-kokoro_onnx/spatial-spectrogram.jpg), [layers](datadog-cowork-plugin-2026-05/datadog-cowork-plugin-2026-05-af_bella-kokoro_onnx/layers.png), [frames](datadog-cowork-plugin-2026-05/datadog-cowork-plugin-2026-05-af_bella-kokoro_onnx/contact-sheet.jpg).

### datadog-cowork-plugin-2026-05 datadog-cowork-plugin-2026-05-am_michael-kokoro.mp4

* info: Left and right channels carry identical mono narration.
* warning: The visual layer flickers at about 11.25 Hz for 8.53 s.

Evidence: [analysis](datadog-cowork-plugin-2026-05/datadog-cowork-plugin-2026-05-am_michael-kokoro/analysis.json), [spectrogram](datadog-cowork-plugin-2026-05/datadog-cowork-plugin-2026-05-am_michael-kokoro/spectrogram.jpg), [speech spectrogram](datadog-cowork-plugin-2026-05/datadog-cowork-plugin-2026-05-am_michael-kokoro/spectrogram-speech.jpg), [video spectrogram](datadog-cowork-plugin-2026-05/datadog-cowork-plugin-2026-05-am_michael-kokoro/video-spectrogram.jpg), [spatial spectrogram](datadog-cowork-plugin-2026-05/datadog-cowork-plugin-2026-05-am_michael-kokoro/spatial-spectrogram.jpg), [layers](datadog-cowork-plugin-2026-05/datadog-cowork-plugin-2026-05-am_michael-kokoro/layers.png), [frames](datadog-cowork-plugin-2026-05/datadog-cowork-plugin-2026-05-am_michael-kokoro/contact-sheet.jpg).

### datadog-cowork-plugin-2026-06 datadog-cowork-plugin-2026-06-am_michael-kokoro_onnx.mp4

* info: Left and right channels carry identical mono narration.
* info: No visible motion for 10.033 s from 1.3 s.
* info: No visible motion for 9.633 s from 13.867 s.
* info: No visible motion for 8.133 s from 63.933 s.
* warning: The visual layer flickers at about 3.75 Hz for 5.33 s.

Evidence: [analysis](datadog-cowork-plugin-2026-06/datadog-cowork-plugin-2026-06-am_michael-kokoro_onnx/analysis.json), [spectrogram](datadog-cowork-plugin-2026-06/datadog-cowork-plugin-2026-06-am_michael-kokoro_onnx/spectrogram.jpg), [speech spectrogram](datadog-cowork-plugin-2026-06/datadog-cowork-plugin-2026-06-am_michael-kokoro_onnx/spectrogram-speech.jpg), [video spectrogram](datadog-cowork-plugin-2026-06/datadog-cowork-plugin-2026-06-am_michael-kokoro_onnx/video-spectrogram.jpg), [spatial spectrogram](datadog-cowork-plugin-2026-06/datadog-cowork-plugin-2026-06-am_michael-kokoro_onnx/spatial-spectrogram.jpg), [layers](datadog-cowork-plugin-2026-06/datadog-cowork-plugin-2026-06-am_michael-kokoro_onnx/layers.png), [frames](datadog-cowork-plugin-2026-06/datadog-cowork-plugin-2026-06-am_michael-kokoro_onnx/contact-sheet.jpg).

### datadog-cowork-plugin-2026-06 datadog-cowork-plugin-2026-06-af_heart-kokoro_onnx.mp4

* info: Left and right channels carry identical mono narration.
* info: No visible motion for 8.967 s from 1.3 s.
* info: No visible motion for 8.733 s from 12.8 s.
* warning: The visual layer flickers at about 3.75 Hz for 4.8 s.

Evidence: [analysis](datadog-cowork-plugin-2026-06/datadog-cowork-plugin-2026-06-af_heart-kokoro_onnx/analysis.json), [spectrogram](datadog-cowork-plugin-2026-06/datadog-cowork-plugin-2026-06-af_heart-kokoro_onnx/spectrogram.jpg), [speech spectrogram](datadog-cowork-plugin-2026-06/datadog-cowork-plugin-2026-06-af_heart-kokoro_onnx/spectrogram-speech.jpg), [video spectrogram](datadog-cowork-plugin-2026-06/datadog-cowork-plugin-2026-06-af_heart-kokoro_onnx/video-spectrogram.jpg), [spatial spectrogram](datadog-cowork-plugin-2026-06/datadog-cowork-plugin-2026-06-af_heart-kokoro_onnx/spatial-spectrogram.jpg), [layers](datadog-cowork-plugin-2026-06/datadog-cowork-plugin-2026-06-af_heart-kokoro_onnx/layers.png), [frames](datadog-cowork-plugin-2026-06/datadog-cowork-plugin-2026-06-af_heart-kokoro_onnx/contact-sheet.jpg).

### datadog-cowork-plugin-2026-06 datadog-cowork-plugin-2026-06-af_bella-kokoro_onnx.mp4

* info: Left and right channels carry identical mono narration.
* info: No visible motion for 9.567 s from 1.3 s.
* info: No visible motion for 9.067 s from 13.4 s.
* warning: The visual layer flickers at about 15 Hz for 4.8 s.

Evidence: [analysis](datadog-cowork-plugin-2026-06/datadog-cowork-plugin-2026-06-af_bella-kokoro_onnx/analysis.json), [spectrogram](datadog-cowork-plugin-2026-06/datadog-cowork-plugin-2026-06-af_bella-kokoro_onnx/spectrogram.jpg), [speech spectrogram](datadog-cowork-plugin-2026-06/datadog-cowork-plugin-2026-06-af_bella-kokoro_onnx/spectrogram-speech.jpg), [video spectrogram](datadog-cowork-plugin-2026-06/datadog-cowork-plugin-2026-06-af_bella-kokoro_onnx/video-spectrogram.jpg), [spatial spectrogram](datadog-cowork-plugin-2026-06/datadog-cowork-plugin-2026-06-af_bella-kokoro_onnx/spatial-spectrogram.jpg), [layers](datadog-cowork-plugin-2026-06/datadog-cowork-plugin-2026-06-af_bella-kokoro_onnx/layers.png), [frames](datadog-cowork-plugin-2026-06/datadog-cowork-plugin-2026-06-af_bella-kokoro_onnx/contact-sheet.jpg).

### datadog-cowork-plugin-2026-06 datadog-cowork-plugin-2026-06-am_michael-kokoro.mp4

* info: Left and right channels carry identical mono narration.
* info: No visible motion for 10.033 s from 1.3 s.
* info: No visible motion for 9.633 s from 13.867 s.
* info: No visible motion for 8.133 s from 63.933 s.
* warning: The visual layer flickers at about 11.25 Hz for 5.33 s.

Evidence: [analysis](datadog-cowork-plugin-2026-06/datadog-cowork-plugin-2026-06-am_michael-kokoro/analysis.json), [spectrogram](datadog-cowork-plugin-2026-06/datadog-cowork-plugin-2026-06-am_michael-kokoro/spectrogram.jpg), [speech spectrogram](datadog-cowork-plugin-2026-06/datadog-cowork-plugin-2026-06-am_michael-kokoro/spectrogram-speech.jpg), [video spectrogram](datadog-cowork-plugin-2026-06/datadog-cowork-plugin-2026-06-am_michael-kokoro/video-spectrogram.jpg), [spatial spectrogram](datadog-cowork-plugin-2026-06/datadog-cowork-plugin-2026-06-am_michael-kokoro/spatial-spectrogram.jpg), [layers](datadog-cowork-plugin-2026-06/datadog-cowork-plugin-2026-06-am_michael-kokoro/layers.png), [frames](datadog-cowork-plugin-2026-06/datadog-cowork-plugin-2026-06-am_michael-kokoro/contact-sheet.jpg).

### datadog-cowork-plugin-2026-07 datadog-cowork-plugin-2026-07-am_michael-kokoro_onnx.mp4

* info: Left and right channels carry identical mono narration.
* info: No visible motion for 10.033 s from 1.3 s.
* info: No visible motion for 9.633 s from 13.867 s.
* info: No visible motion for 8.133 s from 63.933 s.

Evidence: [analysis](datadog-cowork-plugin-2026-07/datadog-cowork-plugin-2026-07-am_michael-kokoro_onnx/analysis.json), [spectrogram](datadog-cowork-plugin-2026-07/datadog-cowork-plugin-2026-07-am_michael-kokoro_onnx/spectrogram.jpg), [speech spectrogram](datadog-cowork-plugin-2026-07/datadog-cowork-plugin-2026-07-am_michael-kokoro_onnx/spectrogram-speech.jpg), [video spectrogram](datadog-cowork-plugin-2026-07/datadog-cowork-plugin-2026-07-am_michael-kokoro_onnx/video-spectrogram.jpg), [spatial spectrogram](datadog-cowork-plugin-2026-07/datadog-cowork-plugin-2026-07-am_michael-kokoro_onnx/spatial-spectrogram.jpg), [layers](datadog-cowork-plugin-2026-07/datadog-cowork-plugin-2026-07-am_michael-kokoro_onnx/layers.png), [frames](datadog-cowork-plugin-2026-07/datadog-cowork-plugin-2026-07-am_michael-kokoro_onnx/contact-sheet.jpg).

### datadog-cowork-plugin-2026-07 datadog-cowork-plugin-2026-07-af_heart-kokoro_onnx.mp4

* info: Left and right channels carry identical mono narration.
* info: No visible motion for 8.967 s from 1.3 s.
* info: No visible motion for 8.733 s from 12.8 s.

Evidence: [analysis](datadog-cowork-plugin-2026-07/datadog-cowork-plugin-2026-07-af_heart-kokoro_onnx/analysis.json), [spectrogram](datadog-cowork-plugin-2026-07/datadog-cowork-plugin-2026-07-af_heart-kokoro_onnx/spectrogram.jpg), [speech spectrogram](datadog-cowork-plugin-2026-07/datadog-cowork-plugin-2026-07-af_heart-kokoro_onnx/spectrogram-speech.jpg), [video spectrogram](datadog-cowork-plugin-2026-07/datadog-cowork-plugin-2026-07-af_heart-kokoro_onnx/video-spectrogram.jpg), [spatial spectrogram](datadog-cowork-plugin-2026-07/datadog-cowork-plugin-2026-07-af_heart-kokoro_onnx/spatial-spectrogram.jpg), [layers](datadog-cowork-plugin-2026-07/datadog-cowork-plugin-2026-07-af_heart-kokoro_onnx/layers.png), [frames](datadog-cowork-plugin-2026-07/datadog-cowork-plugin-2026-07-af_heart-kokoro_onnx/contact-sheet.jpg).

### datadog-cowork-plugin-2026-07 datadog-cowork-plugin-2026-07-af_bella-kokoro_onnx.mp4

* info: Left and right channels carry identical mono narration.
* info: No visible motion for 9.567 s from 1.3 s.
* info: No visible motion for 9.067 s from 13.4 s.

Evidence: [analysis](datadog-cowork-plugin-2026-07/datadog-cowork-plugin-2026-07-af_bella-kokoro_onnx/analysis.json), [spectrogram](datadog-cowork-plugin-2026-07/datadog-cowork-plugin-2026-07-af_bella-kokoro_onnx/spectrogram.jpg), [speech spectrogram](datadog-cowork-plugin-2026-07/datadog-cowork-plugin-2026-07-af_bella-kokoro_onnx/spectrogram-speech.jpg), [video spectrogram](datadog-cowork-plugin-2026-07/datadog-cowork-plugin-2026-07-af_bella-kokoro_onnx/video-spectrogram.jpg), [spatial spectrogram](datadog-cowork-plugin-2026-07/datadog-cowork-plugin-2026-07-af_bella-kokoro_onnx/spatial-spectrogram.jpg), [layers](datadog-cowork-plugin-2026-07/datadog-cowork-plugin-2026-07-af_bella-kokoro_onnx/layers.png), [frames](datadog-cowork-plugin-2026-07/datadog-cowork-plugin-2026-07-af_bella-kokoro_onnx/contact-sheet.jpg).

### datadog-cowork-plugin-2026-07 datadog-cowork-plugin-2026-07-am_michael-kokoro.mp4

* info: Left and right channels carry identical mono narration.
* info: No visible motion for 10.033 s from 1.3 s.
* info: No visible motion for 9.633 s from 13.867 s.
* info: No visible motion for 8.133 s from 63.933 s.

Evidence: [analysis](datadog-cowork-plugin-2026-07/datadog-cowork-plugin-2026-07-am_michael-kokoro/analysis.json), [spectrogram](datadog-cowork-plugin-2026-07/datadog-cowork-plugin-2026-07-am_michael-kokoro/spectrogram.jpg), [speech spectrogram](datadog-cowork-plugin-2026-07/datadog-cowork-plugin-2026-07-am_michael-kokoro/spectrogram-speech.jpg), [video spectrogram](datadog-cowork-plugin-2026-07/datadog-cowork-plugin-2026-07-am_michael-kokoro/video-spectrogram.jpg), [spatial spectrogram](datadog-cowork-plugin-2026-07/datadog-cowork-plugin-2026-07-am_michael-kokoro/spatial-spectrogram.jpg), [layers](datadog-cowork-plugin-2026-07/datadog-cowork-plugin-2026-07-am_michael-kokoro/layers.png), [frames](datadog-cowork-plugin-2026-07/datadog-cowork-plugin-2026-07-am_michael-kokoro/contact-sheet.jpg).

## Comparison images

* [Spectrogram stack](spectrogram-stack.jpg)
* [Video spectrogram stack](video-spectrogram-stack.jpg)
* [Spatial spectrogram stack](spatial-spectrogram-stack.jpg)
* [Frame grid](frames-grid.jpg)
* [Layer activity stack](layers-stack.jpg)
