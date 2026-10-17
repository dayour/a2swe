---
title: microsoft render analysis
description: Measured audio, spectrogram and video-layer comparison for every microsoft revision.
---

## Method

Every revision video is decoded with FFmpeg and measured with the core `media-analyze` method. Spectrograms use a Hann window, logarithmic magnitude and a 120 dB range, with frequency, time and dBFS legends. Loudness uses ITU-R BS.1770 (EBU R128). Video layers are measured per layout zone as frame-to-frame motion and edge detail.

The video spectrogram is the visual counterpart of the audio spectrogram. Each pixel's brightness is a signal sampled at the frame rate, and a short-time Fourier transform of every pixel, averaged per layout zone, shows the temporal frequencies each layer carries. Scene and caption changes appear as broadband bursts, eased animation below 2 Hz, and flicker or shimmer as sustained narrow lines. The spatial spectrogram shows horizontal detail per content band over time; the fine-detail share above 0.18 cycles per pixel tracks text sharpness and density.

These are objective measurements. They do not replace listening and viewing.

## Revisions

| Revision | Status | Output | Voice | Size | Duration | LUFS | True peak | Pause floor | Speech HF>8k | Longest pause | Flicker | Motion <2 Hz | Body detail | Findings |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| microsoft-2026-01 | superseded | microsoft-2026-01.mp4 | unrecorded | 1280x720 | 30.1 s | -15.8 | -1.0 dBTP | -97.8 dBFS | 0.19% | 0.40 s | 0.00 s | 84.9% | 6.6% | none |
| microsoft-2026-02 | superseded | microsoft-2026-02.mp4 | unrecorded | 1280x720 | 30.1 s | -15.8 | -1.0 dBTP | -97.8 dBFS | 0.19% | 0.40 s | 3.20 s | 82.2% | 5.8% | warning:video-flicker |
| microsoft-2026-03 | superseded | microsoft-2026-03.mp4 | en-US-AndrewNeural / edge-neural | 1280x720 | 30.0 s | -15.8 | -1.0 dBTP | -91.3 dBFS | 0.19% | 0.40 s | 3.20 s | 82.2% | 5.8% | warning:video-flicker |
| microsoft-2026-04 | superseded | microsoft-2026-04-am_michael-kokoro_onnx.mp4 | am_michael / kokoro_onnx | 1920x1080 | 67.8 s | -16.1 | -1.5 dBTP | -64.5 dBFS | 0.29% | 1.60 s | 0.00 s | 92.9% | 17.2% | none |
| microsoft-2026-04 | superseded | microsoft-2026-04-af_heart-kokoro_onnx.mp4 | af_heart / kokoro_onnx | 1920x1080 | 62.4 s | -16.1 | -1.5 dBTP | -69.5 dBFS | 1.98% | 1.38 s | 0.00 s | 92.9% | 17.2% | none |
| microsoft-2026-04 | superseded | microsoft-2026-04-af_bella-kokoro_onnx.mp4 | af_bella / kokoro_onnx | 1920x1080 | 65.2 s | -16.0 | -1.5 dBTP | -77.7 dBFS | 1.81% | 1.55 s | 0.00 s | 92.9% | 17.2% | none |
| microsoft-2026-04 | superseded | microsoft-2026-04-am_michael-kokoro.mp4 | am_michael / kokoro | 1920x1080 | 67.8 s | -16.1 | -1.5 dBTP | -63.3 dBFS | 0.30% | 1.60 s | 0.00 s | 92.9% | 17.2% | none |
| microsoft-2026-05 | superseded | microsoft-2026-05-am_michael-kokoro_onnx.mp4 | am_michael / kokoro_onnx | 1920x1080 | 67.8 s | -16.1 | -1.5 dBTP | -63.2 dBFS | 0.30% | 1.60 s | 0.00 s | 92.9% | 17.2% | none |
| microsoft-2026-05 | superseded | microsoft-2026-05-af_heart-kokoro_onnx.mp4 | af_heart / kokoro_onnx | 1920x1080 | 62.4 s | -16.1 | -1.5 dBTP | -69.5 dBFS | 1.97% | 1.38 s | 0.00 s | 92.9% | 17.2% | none |
| microsoft-2026-05 | superseded | microsoft-2026-05-af_bella-kokoro_onnx.mp4 | af_bella / kokoro_onnx | 1920x1080 | 65.2 s | -16.0 | -1.5 dBTP | -77.4 dBFS | 1.81% | 1.55 s | 0.00 s | 92.9% | 17.2% | none |
| microsoft-2026-05 | superseded | microsoft-2026-05-am_michael-kokoro.mp4 | am_michael / kokoro | 1920x1080 | 67.8 s | -16.1 | -1.5 dBTP | -63.2 dBFS | 0.30% | 1.60 s | 0.00 s | 92.9% | 17.2% | none |
| microsoft-2026-06 | superseded | microsoft-2026-06-am_michael-kokoro_onnx.mp4 | am_michael / kokoro_onnx | 1920x1080 | 67.8 s | -16.1 | -1.5 dBTP | -64.0 dBFS | 0.30% | 1.60 s | 0.00 s | 87.5% | 18.0% | none |
| microsoft-2026-06 | superseded | microsoft-2026-06-af_heart-kokoro_onnx.mp4 | af_heart / kokoro_onnx | 1920x1080 | 62.4 s | -16.1 | -1.5 dBTP | -69.3 dBFS | 1.98% | 1.38 s | 0.00 s | 87.5% | 18.0% | none |
| microsoft-2026-06 | superseded | microsoft-2026-06-af_bella-kokoro_onnx.mp4 | af_bella / kokoro_onnx | 1920x1080 | 65.2 s | -16.0 | -1.5 dBTP | -77.5 dBFS | 1.81% | 1.55 s | 0.00 s | 87.5% | 18.0% | none |
| microsoft-2026-06 | superseded | microsoft-2026-06-am_michael-kokoro.mp4 | am_michael / kokoro | 1920x1080 | 67.8 s | -16.1 | -1.5 dBTP | -64.3 dBFS | 0.30% | 1.60 s | 0.00 s | 87.5% | 18.0% | none |
| microsoft-2026-07 | current | microsoft-2026-07-am_michael-kokoro_onnx.mp4 | am_michael / kokoro_onnx | 1920x1080 | 67.8 s | -16.1 | -1.5 dBTP | -63.2 dBFS | 0.30% | 1.60 s | 0.00 s | 87.5% | 18.0% | none |
| microsoft-2026-07 | current | microsoft-2026-07-af_heart-kokoro_onnx.mp4 | af_heart / kokoro_onnx | 1920x1080 | 62.4 s | -16.1 | -1.5 dBTP | -69.4 dBFS | 1.97% | 1.38 s | 0.00 s | 87.5% | 18.0% | none |
| microsoft-2026-07 | current | microsoft-2026-07-af_bella-kokoro_onnx.mp4 | af_bella / kokoro_onnx | 1920x1080 | 65.2 s | -16.0 | -1.5 dBTP | -77.6 dBFS | 1.81% | 1.55 s | 0.00 s | 87.5% | 18.0% | none |
| microsoft-2026-07 | current | microsoft-2026-07-am_michael-kokoro.mp4 | am_michael / kokoro | 1920x1080 | 67.8 s | -16.1 | -1.5 dBTP | -64.9 dBFS | 0.30% | 1.60 s | 0.00 s | 87.5% | 18.0% | none |

## Findings by revision

### microsoft-2026-01 microsoft-2026-01.mp4

* info: Video is 1280x720.
* info: Left and right channels carry identical mono narration.

Evidence: [analysis](microsoft-2026-01/microsoft-2026-01/analysis.json), [spectrogram](microsoft-2026-01/microsoft-2026-01/spectrogram.jpg), [speech spectrogram](microsoft-2026-01/microsoft-2026-01/spectrogram-speech.jpg), [video spectrogram](microsoft-2026-01/microsoft-2026-01/video-spectrogram.jpg), [spatial spectrogram](microsoft-2026-01/microsoft-2026-01/spatial-spectrogram.jpg), [layers](microsoft-2026-01/microsoft-2026-01/layers.png), [frames](microsoft-2026-01/microsoft-2026-01/contact-sheet.jpg).

### microsoft-2026-02 microsoft-2026-02.mp4

* info: Video is 1280x720.
* info: Left and right channels carry identical mono narration.
* warning: The visual layer flickers at about 3.28 Hz for 3.2 s.

Evidence: [analysis](microsoft-2026-02/microsoft-2026-02/analysis.json), [spectrogram](microsoft-2026-02/microsoft-2026-02/spectrogram.jpg), [speech spectrogram](microsoft-2026-02/microsoft-2026-02/spectrogram-speech.jpg), [video spectrogram](microsoft-2026-02/microsoft-2026-02/video-spectrogram.jpg), [spatial spectrogram](microsoft-2026-02/microsoft-2026-02/spatial-spectrogram.jpg), [layers](microsoft-2026-02/microsoft-2026-02/layers.png), [frames](microsoft-2026-02/microsoft-2026-02/contact-sheet.jpg).

### microsoft-2026-03 microsoft-2026-03.mp4

* info: Video is 1280x720.
* info: Left and right channels carry identical mono narration.
* warning: The visual layer flickers at about 3.28 Hz for 3.2 s.

Evidence: [analysis](microsoft-2026-03/microsoft-2026-03/analysis.json), [spectrogram](microsoft-2026-03/microsoft-2026-03/spectrogram.jpg), [speech spectrogram](microsoft-2026-03/microsoft-2026-03/spectrogram-speech.jpg), [video spectrogram](microsoft-2026-03/microsoft-2026-03/video-spectrogram.jpg), [spatial spectrogram](microsoft-2026-03/microsoft-2026-03/spatial-spectrogram.jpg), [layers](microsoft-2026-03/microsoft-2026-03/layers.png), [frames](microsoft-2026-03/microsoft-2026-03/contact-sheet.jpg).

### microsoft-2026-04 microsoft-2026-04-am_michael-kokoro_onnx.mp4

* info: Left and right channels carry identical mono narration.
* info: No visible motion for 8.967 s from 2.233 s.

Evidence: [analysis](microsoft-2026-04/microsoft-2026-04-am_michael-kokoro_onnx/analysis.json), [spectrogram](microsoft-2026-04/microsoft-2026-04-am_michael-kokoro_onnx/spectrogram.jpg), [speech spectrogram](microsoft-2026-04/microsoft-2026-04-am_michael-kokoro_onnx/spectrogram-speech.jpg), [video spectrogram](microsoft-2026-04/microsoft-2026-04-am_michael-kokoro_onnx/video-spectrogram.jpg), [spatial spectrogram](microsoft-2026-04/microsoft-2026-04-am_michael-kokoro_onnx/spatial-spectrogram.jpg), [layers](microsoft-2026-04/microsoft-2026-04-am_michael-kokoro_onnx/layers.png), [frames](microsoft-2026-04/microsoft-2026-04-am_michael-kokoro_onnx/contact-sheet.jpg).

### microsoft-2026-04 microsoft-2026-04-af_heart-kokoro_onnx.mp4

* info: Left and right channels carry identical mono narration.
* info: No visible motion for 8.967 s from 2.233 s.

Evidence: [analysis](microsoft-2026-04/microsoft-2026-04-af_heart-kokoro_onnx/analysis.json), [spectrogram](microsoft-2026-04/microsoft-2026-04-af_heart-kokoro_onnx/spectrogram.jpg), [speech spectrogram](microsoft-2026-04/microsoft-2026-04-af_heart-kokoro_onnx/spectrogram-speech.jpg), [video spectrogram](microsoft-2026-04/microsoft-2026-04-af_heart-kokoro_onnx/video-spectrogram.jpg), [spatial spectrogram](microsoft-2026-04/microsoft-2026-04-af_heart-kokoro_onnx/spatial-spectrogram.jpg), [layers](microsoft-2026-04/microsoft-2026-04-af_heart-kokoro_onnx/layers.png), [frames](microsoft-2026-04/microsoft-2026-04-af_heart-kokoro_onnx/contact-sheet.jpg).

### microsoft-2026-04 microsoft-2026-04-af_bella-kokoro_onnx.mp4

* info: Left and right channels carry identical mono narration.
* info: No visible motion for 8.533 s from 2.767 s.

Evidence: [analysis](microsoft-2026-04/microsoft-2026-04-af_bella-kokoro_onnx/analysis.json), [spectrogram](microsoft-2026-04/microsoft-2026-04-af_bella-kokoro_onnx/spectrogram.jpg), [speech spectrogram](microsoft-2026-04/microsoft-2026-04-af_bella-kokoro_onnx/spectrogram-speech.jpg), [video spectrogram](microsoft-2026-04/microsoft-2026-04-af_bella-kokoro_onnx/video-spectrogram.jpg), [spatial spectrogram](microsoft-2026-04/microsoft-2026-04-af_bella-kokoro_onnx/spatial-spectrogram.jpg), [layers](microsoft-2026-04/microsoft-2026-04-af_bella-kokoro_onnx/layers.png), [frames](microsoft-2026-04/microsoft-2026-04-af_bella-kokoro_onnx/contact-sheet.jpg).

### microsoft-2026-04 microsoft-2026-04-am_michael-kokoro.mp4

* info: Left and right channels carry identical mono narration.
* info: No visible motion for 8.967 s from 2.233 s.

Evidence: [analysis](microsoft-2026-04/microsoft-2026-04-am_michael-kokoro/analysis.json), [spectrogram](microsoft-2026-04/microsoft-2026-04-am_michael-kokoro/spectrogram.jpg), [speech spectrogram](microsoft-2026-04/microsoft-2026-04-am_michael-kokoro/spectrogram-speech.jpg), [video spectrogram](microsoft-2026-04/microsoft-2026-04-am_michael-kokoro/video-spectrogram.jpg), [spatial spectrogram](microsoft-2026-04/microsoft-2026-04-am_michael-kokoro/spatial-spectrogram.jpg), [layers](microsoft-2026-04/microsoft-2026-04-am_michael-kokoro/layers.png), [frames](microsoft-2026-04/microsoft-2026-04-am_michael-kokoro/contact-sheet.jpg).

### microsoft-2026-05 microsoft-2026-05-am_michael-kokoro_onnx.mp4

* info: Left and right channels carry identical mono narration.
* info: No visible motion for 8.967 s from 2.233 s.

Evidence: [analysis](microsoft-2026-05/microsoft-2026-05-am_michael-kokoro_onnx/analysis.json), [spectrogram](microsoft-2026-05/microsoft-2026-05-am_michael-kokoro_onnx/spectrogram.jpg), [speech spectrogram](microsoft-2026-05/microsoft-2026-05-am_michael-kokoro_onnx/spectrogram-speech.jpg), [video spectrogram](microsoft-2026-05/microsoft-2026-05-am_michael-kokoro_onnx/video-spectrogram.jpg), [spatial spectrogram](microsoft-2026-05/microsoft-2026-05-am_michael-kokoro_onnx/spatial-spectrogram.jpg), [layers](microsoft-2026-05/microsoft-2026-05-am_michael-kokoro_onnx/layers.png), [frames](microsoft-2026-05/microsoft-2026-05-am_michael-kokoro_onnx/contact-sheet.jpg).

### microsoft-2026-05 microsoft-2026-05-af_heart-kokoro_onnx.mp4

* info: Left and right channels carry identical mono narration.
* info: No visible motion for 8.967 s from 2.233 s.

Evidence: [analysis](microsoft-2026-05/microsoft-2026-05-af_heart-kokoro_onnx/analysis.json), [spectrogram](microsoft-2026-05/microsoft-2026-05-af_heart-kokoro_onnx/spectrogram.jpg), [speech spectrogram](microsoft-2026-05/microsoft-2026-05-af_heart-kokoro_onnx/spectrogram-speech.jpg), [video spectrogram](microsoft-2026-05/microsoft-2026-05-af_heart-kokoro_onnx/video-spectrogram.jpg), [spatial spectrogram](microsoft-2026-05/microsoft-2026-05-af_heart-kokoro_onnx/spatial-spectrogram.jpg), [layers](microsoft-2026-05/microsoft-2026-05-af_heart-kokoro_onnx/layers.png), [frames](microsoft-2026-05/microsoft-2026-05-af_heart-kokoro_onnx/contact-sheet.jpg).

### microsoft-2026-05 microsoft-2026-05-af_bella-kokoro_onnx.mp4

* info: Left and right channels carry identical mono narration.
* info: No visible motion for 8.533 s from 2.767 s.

Evidence: [analysis](microsoft-2026-05/microsoft-2026-05-af_bella-kokoro_onnx/analysis.json), [spectrogram](microsoft-2026-05/microsoft-2026-05-af_bella-kokoro_onnx/spectrogram.jpg), [speech spectrogram](microsoft-2026-05/microsoft-2026-05-af_bella-kokoro_onnx/spectrogram-speech.jpg), [video spectrogram](microsoft-2026-05/microsoft-2026-05-af_bella-kokoro_onnx/video-spectrogram.jpg), [spatial spectrogram](microsoft-2026-05/microsoft-2026-05-af_bella-kokoro_onnx/spatial-spectrogram.jpg), [layers](microsoft-2026-05/microsoft-2026-05-af_bella-kokoro_onnx/layers.png), [frames](microsoft-2026-05/microsoft-2026-05-af_bella-kokoro_onnx/contact-sheet.jpg).

### microsoft-2026-05 microsoft-2026-05-am_michael-kokoro.mp4

* info: Left and right channels carry identical mono narration.
* info: No visible motion for 8.967 s from 2.233 s.

Evidence: [analysis](microsoft-2026-05/microsoft-2026-05-am_michael-kokoro/analysis.json), [spectrogram](microsoft-2026-05/microsoft-2026-05-am_michael-kokoro/spectrogram.jpg), [speech spectrogram](microsoft-2026-05/microsoft-2026-05-am_michael-kokoro/spectrogram-speech.jpg), [video spectrogram](microsoft-2026-05/microsoft-2026-05-am_michael-kokoro/video-spectrogram.jpg), [spatial spectrogram](microsoft-2026-05/microsoft-2026-05-am_michael-kokoro/spatial-spectrogram.jpg), [layers](microsoft-2026-05/microsoft-2026-05-am_michael-kokoro/layers.png), [frames](microsoft-2026-05/microsoft-2026-05-am_michael-kokoro/contact-sheet.jpg).

### microsoft-2026-06 microsoft-2026-06-am_michael-kokoro_onnx.mp4

* info: Left and right channels carry identical mono narration.
* info: No visible motion for 11.8 s from 1.333 s.
* info: No visible motion for 8.133 s from 28.133 s.

Evidence: [analysis](microsoft-2026-06/microsoft-2026-06-am_michael-kokoro_onnx/analysis.json), [spectrogram](microsoft-2026-06/microsoft-2026-06-am_michael-kokoro_onnx/spectrogram.jpg), [speech spectrogram](microsoft-2026-06/microsoft-2026-06-am_michael-kokoro_onnx/spectrogram-speech.jpg), [video spectrogram](microsoft-2026-06/microsoft-2026-06-am_michael-kokoro_onnx/video-spectrogram.jpg), [spatial spectrogram](microsoft-2026-06/microsoft-2026-06-am_michael-kokoro_onnx/spatial-spectrogram.jpg), [layers](microsoft-2026-06/microsoft-2026-06-am_michael-kokoro_onnx/layers.png), [frames](microsoft-2026-06/microsoft-2026-06-am_michael-kokoro_onnx/contact-sheet.jpg).

### microsoft-2026-06 microsoft-2026-06-af_heart-kokoro_onnx.mp4

* info: Left and right channels carry identical mono narration.
* info: No visible motion for 10.767 s from 1.333 s.

Evidence: [analysis](microsoft-2026-06/microsoft-2026-06-af_heart-kokoro_onnx/analysis.json), [spectrogram](microsoft-2026-06/microsoft-2026-06-af_heart-kokoro_onnx/spectrogram.jpg), [speech spectrogram](microsoft-2026-06/microsoft-2026-06-af_heart-kokoro_onnx/spectrogram-speech.jpg), [video spectrogram](microsoft-2026-06/microsoft-2026-06-af_heart-kokoro_onnx/video-spectrogram.jpg), [spatial spectrogram](microsoft-2026-06/microsoft-2026-06-af_heart-kokoro_onnx/spatial-spectrogram.jpg), [layers](microsoft-2026-06/microsoft-2026-06-af_heart-kokoro_onnx/layers.png), [frames](microsoft-2026-06/microsoft-2026-06-af_heart-kokoro_onnx/contact-sheet.jpg).

### microsoft-2026-06 microsoft-2026-06-af_bella-kokoro_onnx.mp4

* info: Left and right channels carry identical mono narration.
* info: No visible motion for 11.333 s from 1.333 s.

Evidence: [analysis](microsoft-2026-06/microsoft-2026-06-af_bella-kokoro_onnx/analysis.json), [spectrogram](microsoft-2026-06/microsoft-2026-06-af_bella-kokoro_onnx/spectrogram.jpg), [speech spectrogram](microsoft-2026-06/microsoft-2026-06-af_bella-kokoro_onnx/spectrogram-speech.jpg), [video spectrogram](microsoft-2026-06/microsoft-2026-06-af_bella-kokoro_onnx/video-spectrogram.jpg), [spatial spectrogram](microsoft-2026-06/microsoft-2026-06-af_bella-kokoro_onnx/spatial-spectrogram.jpg), [layers](microsoft-2026-06/microsoft-2026-06-af_bella-kokoro_onnx/layers.png), [frames](microsoft-2026-06/microsoft-2026-06-af_bella-kokoro_onnx/contact-sheet.jpg).

### microsoft-2026-06 microsoft-2026-06-am_michael-kokoro.mp4

* info: Left and right channels carry identical mono narration.
* info: No visible motion for 11.8 s from 1.333 s.
* info: No visible motion for 8.167 s from 28.1 s.

Evidence: [analysis](microsoft-2026-06/microsoft-2026-06-am_michael-kokoro/analysis.json), [spectrogram](microsoft-2026-06/microsoft-2026-06-am_michael-kokoro/spectrogram.jpg), [speech spectrogram](microsoft-2026-06/microsoft-2026-06-am_michael-kokoro/spectrogram-speech.jpg), [video spectrogram](microsoft-2026-06/microsoft-2026-06-am_michael-kokoro/video-spectrogram.jpg), [spatial spectrogram](microsoft-2026-06/microsoft-2026-06-am_michael-kokoro/spatial-spectrogram.jpg), [layers](microsoft-2026-06/microsoft-2026-06-am_michael-kokoro/layers.png), [frames](microsoft-2026-06/microsoft-2026-06-am_michael-kokoro/contact-sheet.jpg).

### microsoft-2026-07 microsoft-2026-07-am_michael-kokoro_onnx.mp4

* info: Left and right channels carry identical mono narration.
* info: No visible motion for 11.8 s from 1.333 s.
* info: No visible motion for 8.133 s from 28.133 s.

Evidence: [analysis](microsoft-2026-07/microsoft-2026-07-am_michael-kokoro_onnx/analysis.json), [spectrogram](microsoft-2026-07/microsoft-2026-07-am_michael-kokoro_onnx/spectrogram.jpg), [speech spectrogram](microsoft-2026-07/microsoft-2026-07-am_michael-kokoro_onnx/spectrogram-speech.jpg), [video spectrogram](microsoft-2026-07/microsoft-2026-07-am_michael-kokoro_onnx/video-spectrogram.jpg), [spatial spectrogram](microsoft-2026-07/microsoft-2026-07-am_michael-kokoro_onnx/spatial-spectrogram.jpg), [layers](microsoft-2026-07/microsoft-2026-07-am_michael-kokoro_onnx/layers.png), [frames](microsoft-2026-07/microsoft-2026-07-am_michael-kokoro_onnx/contact-sheet.jpg).

### microsoft-2026-07 microsoft-2026-07-af_heart-kokoro_onnx.mp4

* info: Left and right channels carry identical mono narration.
* info: No visible motion for 10.767 s from 1.333 s.

Evidence: [analysis](microsoft-2026-07/microsoft-2026-07-af_heart-kokoro_onnx/analysis.json), [spectrogram](microsoft-2026-07/microsoft-2026-07-af_heart-kokoro_onnx/spectrogram.jpg), [speech spectrogram](microsoft-2026-07/microsoft-2026-07-af_heart-kokoro_onnx/spectrogram-speech.jpg), [video spectrogram](microsoft-2026-07/microsoft-2026-07-af_heart-kokoro_onnx/video-spectrogram.jpg), [spatial spectrogram](microsoft-2026-07/microsoft-2026-07-af_heart-kokoro_onnx/spatial-spectrogram.jpg), [layers](microsoft-2026-07/microsoft-2026-07-af_heart-kokoro_onnx/layers.png), [frames](microsoft-2026-07/microsoft-2026-07-af_heart-kokoro_onnx/contact-sheet.jpg).

### microsoft-2026-07 microsoft-2026-07-af_bella-kokoro_onnx.mp4

* info: Left and right channels carry identical mono narration.
* info: No visible motion for 11.333 s from 1.333 s.

Evidence: [analysis](microsoft-2026-07/microsoft-2026-07-af_bella-kokoro_onnx/analysis.json), [spectrogram](microsoft-2026-07/microsoft-2026-07-af_bella-kokoro_onnx/spectrogram.jpg), [speech spectrogram](microsoft-2026-07/microsoft-2026-07-af_bella-kokoro_onnx/spectrogram-speech.jpg), [video spectrogram](microsoft-2026-07/microsoft-2026-07-af_bella-kokoro_onnx/video-spectrogram.jpg), [spatial spectrogram](microsoft-2026-07/microsoft-2026-07-af_bella-kokoro_onnx/spatial-spectrogram.jpg), [layers](microsoft-2026-07/microsoft-2026-07-af_bella-kokoro_onnx/layers.png), [frames](microsoft-2026-07/microsoft-2026-07-af_bella-kokoro_onnx/contact-sheet.jpg).

### microsoft-2026-07 microsoft-2026-07-am_michael-kokoro.mp4

* info: Left and right channels carry identical mono narration.
* info: No visible motion for 11.8 s from 1.333 s.
* info: No visible motion for 8.133 s from 28.133 s.

Evidence: [analysis](microsoft-2026-07/microsoft-2026-07-am_michael-kokoro/analysis.json), [spectrogram](microsoft-2026-07/microsoft-2026-07-am_michael-kokoro/spectrogram.jpg), [speech spectrogram](microsoft-2026-07/microsoft-2026-07-am_michael-kokoro/spectrogram-speech.jpg), [video spectrogram](microsoft-2026-07/microsoft-2026-07-am_michael-kokoro/video-spectrogram.jpg), [spatial spectrogram](microsoft-2026-07/microsoft-2026-07-am_michael-kokoro/spatial-spectrogram.jpg), [layers](microsoft-2026-07/microsoft-2026-07-am_michael-kokoro/layers.png), [frames](microsoft-2026-07/microsoft-2026-07-am_michael-kokoro/contact-sheet.jpg).

## Comparison images

* [Spectrogram stack](spectrogram-stack.jpg)
* [Video spectrogram stack](video-spectrogram-stack.jpg)
* [Spatial spectrogram stack](spatial-spectrogram-stack.jpg)
* [Frame grid](frames-grid.jpg)
* [Layer activity stack](layers-stack.jpg)
