---
title: microsoft-autopilot-agents render analysis
description: Measured audio, spectrogram and video-layer comparison for every microsoft-autopilot-agents revision.
---

## Method

Every revision video is decoded with FFmpeg and measured with the core `media-analyze` method. Spectrograms use a Hann window, logarithmic magnitude and a 120 dB range, with frequency, time and dBFS legends. Loudness uses ITU-R BS.1770 (EBU R128). Video layers are measured per layout zone as frame-to-frame motion and edge detail.

The video spectrogram is the visual counterpart of the audio spectrogram. Each pixel's brightness is a signal sampled at the frame rate, and a short-time Fourier transform of every pixel, averaged per layout zone, shows the temporal frequencies each layer carries. Scene and caption changes appear as broadband bursts, eased animation below 2 Hz, and flicker or shimmer as sustained narrow lines. The spatial spectrogram shows horizontal detail per content band over time; the fine-detail share above 0.18 cycles per pixel tracks text sharpness and density.

These are objective measurements. They do not replace listening and viewing.

## Revisions

| Revision | Status | Output | Voice | Size | Duration | LUFS | True peak | Pause floor | Speech HF>8k | Longest pause | Flicker | Motion <2 Hz | Body detail | Findings |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| microsoft-autopilot-agents-2026-01 | superseded | microsoft-autopilot-agents-2026-01.mp4 | am_michael / kokoro_onnx | 1920x1080 | 73.4 s | -20.4 | -1.0 dBTP | -65.7 dBFS | 0.30% | 1.60 s | 16.00 s | 93.2% | 20.3% | warning:loudness-off-target, warning:video-flicker |
| microsoft-autopilot-agents-2026-02 | superseded | microsoft-autopilot-agents-2026-02.mp4 | am_michael / kokoro_onnx | 1920x1080 | 64.7 s | -22.8 | -1.0 dBTP | -67.9 dBFS | 0.29% | 1.60 s | 13.33 s | 93.3% | 20.9% | warning:loudness-off-target, warning:video-flicker |
| microsoft-autopilot-agents-2026-03 | superseded | microsoft-autopilot-agents-2026-03.mp4 | am_michael / kokoro_onnx | 1920x1080 | 61.6 s | -22.6 | -1.0 dBTP | -68.8 dBFS | 0.29% | 1.60 s | 12.80 s | 93.4% | 20.9% | warning:loudness-off-target, warning:video-flicker |
| microsoft-autopilot-agents-2026-04 | superseded | microsoft-autopilot-agents-2026-04.mp4 | am_michael / kokoro_onnx | 1920x1080 | 61.6 s | -22.8 | -1.0 dBTP | -68.9 dBFS | 0.29% | 1.60 s | 12.80 s | 93.3% | 20.9% | warning:loudness-off-target, warning:video-flicker |
| microsoft-autopilot-agents-2026-05 | superseded | microsoft-autopilot-agents-2026-05-am_michael-kokoro_onnx.mp4 | am_michael / kokoro_onnx | 1920x1080 | 61.6 s | -16.1 | -1.5 dBTP | -61.8 dBFS | 0.32% | 1.60 s | 12.80 s | 93.3% | 20.9% | warning:video-flicker |
| microsoft-autopilot-agents-2026-05 | superseded | microsoft-autopilot-agents-2026-05-af_heart-kokoro_onnx.mp4 | af_heart / kokoro_onnx | 1920x1080 | 56.4 s | -16.1 | -1.5 dBTP | -69.5 dBFS | 2.62% | 1.38 s | 11.73 s | 93.3% | 20.9% | warning:video-flicker |
| microsoft-autopilot-agents-2026-05 | superseded | microsoft-autopilot-agents-2026-05-af_bella-kokoro_onnx.mp4 | af_bella / kokoro_onnx | 1920x1080 | 58.5 s | -16.0 | -1.5 dBTP | -77.0 dBFS | 2.26% | 1.52 s | 12.27 s | 93.4% | 20.9% | warning:video-flicker |
| microsoft-autopilot-agents-2026-05 | superseded | microsoft-autopilot-agents-2026-05-am_michael-kokoro.mp4 | am_michael / kokoro | 1920x1080 | 61.6 s | -16.1 | -1.5 dBTP | -61.5 dBFS | 0.32% | 1.60 s | 13.33 s | 93.3% | 20.9% | warning:video-flicker |
| microsoft-autopilot-agents-2026-06 | superseded | microsoft-autopilot-agents-2026-06-am_michael-kokoro_onnx.mp4 | am_michael / kokoro_onnx | 1920x1080 | 61.6 s | -16.1 | -1.5 dBTP | -61.6 dBFS | 0.32% | 1.60 s | 12.80 s | 93.3% | 20.9% | warning:video-flicker |
| microsoft-autopilot-agents-2026-06 | superseded | microsoft-autopilot-agents-2026-06-af_heart-kokoro_onnx.mp4 | af_heart / kokoro_onnx | 1920x1080 | 56.4 s | -16.0 | -1.5 dBTP | -69.8 dBFS | 2.62% | 1.38 s | 11.73 s | 93.4% | 20.9% | warning:video-flicker |
| microsoft-autopilot-agents-2026-06 | superseded | microsoft-autopilot-agents-2026-06-af_bella-kokoro_onnx.mp4 | af_bella / kokoro_onnx | 1920x1080 | 58.5 s | -16.1 | -1.5 dBTP | -77.0 dBFS | 2.26% | 1.52 s | 12.27 s | 93.3% | 20.9% | warning:video-flicker |
| microsoft-autopilot-agents-2026-06 | superseded | microsoft-autopilot-agents-2026-06-am_michael-kokoro.mp4 | am_michael / kokoro | 1920x1080 | 61.6 s | -16.1 | -1.5 dBTP | -61.6 dBFS | 0.32% | 1.60 s | 12.80 s | 93.3% | 20.9% | warning:video-flicker |
| microsoft-autopilot-agents-2026-07 | superseded | microsoft-autopilot-agents-2026-07-am_michael-kokoro_onnx.mp4 | am_michael / kokoro_onnx | 1920x1080 | 61.6 s | -16.1 | -1.5 dBTP | -61.8 dBFS | 0.32% | 1.60 s | 12.80 s | 87.8% | 18.9% | warning:video-flicker |
| microsoft-autopilot-agents-2026-07 | superseded | microsoft-autopilot-agents-2026-07-af_heart-kokoro_onnx.mp4 | af_heart / kokoro_onnx | 1920x1080 | 56.4 s | -16.1 | -1.5 dBTP | -69.6 dBFS | 2.63% | 1.38 s | 11.73 s | 87.8% | 19.0% | warning:video-flicker |
| microsoft-autopilot-agents-2026-07 | superseded | microsoft-autopilot-agents-2026-07-af_bella-kokoro_onnx.mp4 | af_bella / kokoro_onnx | 1920x1080 | 58.5 s | -16.1 | -1.5 dBTP | -77.0 dBFS | 2.27% | 1.52 s | 12.27 s | 87.8% | 19.1% | warning:video-flicker |
| microsoft-autopilot-agents-2026-07 | superseded | microsoft-autopilot-agents-2026-07-am_michael-kokoro.mp4 | am_michael / kokoro | 1920x1080 | 61.6 s | -16.1 | -1.5 dBTP | -61.5 dBFS | 0.32% | 1.60 s | 12.80 s | 87.8% | 18.9% | warning:video-flicker |
| microsoft-autopilot-agents-2026-08 | current | microsoft-autopilot-agents-2026-08-am_michael-kokoro_onnx.mp4 | am_michael / kokoro_onnx | 1920x1080 | 61.6 s | -16.1 | -1.5 dBTP | -61.7 dBFS | 0.32% | 1.60 s | 0.00 s | 87.8% | 18.9% | none |
| microsoft-autopilot-agents-2026-08 | current | microsoft-autopilot-agents-2026-08-af_heart-kokoro_onnx.mp4 | af_heart / kokoro_onnx | 1920x1080 | 56.4 s | -16.1 | -1.5 dBTP | -69.4 dBFS | 2.62% | 1.38 s | 0.00 s | 87.9% | 18.9% | none |
| microsoft-autopilot-agents-2026-08 | current | microsoft-autopilot-agents-2026-08-af_bella-kokoro_onnx.mp4 | af_bella / kokoro_onnx | 1920x1080 | 58.5 s | -16.1 | -1.5 dBTP | -77.0 dBFS | 2.26% | 1.52 s | 0.00 s | 87.8% | 18.9% | none |
| microsoft-autopilot-agents-2026-08 | current | microsoft-autopilot-agents-2026-08-am_michael-kokoro.mp4 | am_michael / kokoro | 1920x1080 | 61.6 s | -16.1 | -1.5 dBTP | -61.7 dBFS | 0.32% | 1.60 s | 0.00 s | 87.8% | 18.9% | none |

## Findings by revision

### microsoft-autopilot-agents-2026-01 microsoft-autopilot-agents-2026-01.mp4

* warning: Integrated loudness -20.4 LUFS is outside -16 ±4 LU for online video.
* info: Left and right channels carry identical mono narration.
* warning: The visual layer flickers at about 3.75 Hz for 16 s.

Evidence: [analysis](microsoft-autopilot-agents-2026-01/microsoft-autopilot-agents-2026-01/analysis.json), [spectrogram](microsoft-autopilot-agents-2026-01/microsoft-autopilot-agents-2026-01/spectrogram.jpg), [speech spectrogram](microsoft-autopilot-agents-2026-01/microsoft-autopilot-agents-2026-01/spectrogram-speech.jpg), [video spectrogram](microsoft-autopilot-agents-2026-01/microsoft-autopilot-agents-2026-01/video-spectrogram.jpg), [spatial spectrogram](microsoft-autopilot-agents-2026-01/microsoft-autopilot-agents-2026-01/spatial-spectrogram.jpg), [layers](microsoft-autopilot-agents-2026-01/microsoft-autopilot-agents-2026-01/layers.png), [frames](microsoft-autopilot-agents-2026-01/microsoft-autopilot-agents-2026-01/contact-sheet.jpg).

### microsoft-autopilot-agents-2026-02 microsoft-autopilot-agents-2026-02.mp4

* warning: Integrated loudness -22.8 LUFS is outside -16 ±4 LU for online video.
* info: Left and right channels carry identical mono narration.
* warning: The visual layer flickers at about 15 Hz for 13.33 s.

Evidence: [analysis](microsoft-autopilot-agents-2026-02/microsoft-autopilot-agents-2026-02/analysis.json), [spectrogram](microsoft-autopilot-agents-2026-02/microsoft-autopilot-agents-2026-02/spectrogram.jpg), [speech spectrogram](microsoft-autopilot-agents-2026-02/microsoft-autopilot-agents-2026-02/spectrogram-speech.jpg), [video spectrogram](microsoft-autopilot-agents-2026-02/microsoft-autopilot-agents-2026-02/video-spectrogram.jpg), [spatial spectrogram](microsoft-autopilot-agents-2026-02/microsoft-autopilot-agents-2026-02/spatial-spectrogram.jpg), [layers](microsoft-autopilot-agents-2026-02/microsoft-autopilot-agents-2026-02/layers.png), [frames](microsoft-autopilot-agents-2026-02/microsoft-autopilot-agents-2026-02/contact-sheet.jpg).

### microsoft-autopilot-agents-2026-03 microsoft-autopilot-agents-2026-03.mp4

* warning: Integrated loudness -22.6 LUFS is outside -16 ±4 LU for online video.
* info: Left and right channels carry identical mono narration.
* warning: The visual layer flickers at about 7.5 Hz for 12.8 s.

Evidence: [analysis](microsoft-autopilot-agents-2026-03/microsoft-autopilot-agents-2026-03/analysis.json), [spectrogram](microsoft-autopilot-agents-2026-03/microsoft-autopilot-agents-2026-03/spectrogram.jpg), [speech spectrogram](microsoft-autopilot-agents-2026-03/microsoft-autopilot-agents-2026-03/spectrogram-speech.jpg), [video spectrogram](microsoft-autopilot-agents-2026-03/microsoft-autopilot-agents-2026-03/video-spectrogram.jpg), [spatial spectrogram](microsoft-autopilot-agents-2026-03/microsoft-autopilot-agents-2026-03/spatial-spectrogram.jpg), [layers](microsoft-autopilot-agents-2026-03/microsoft-autopilot-agents-2026-03/layers.png), [frames](microsoft-autopilot-agents-2026-03/microsoft-autopilot-agents-2026-03/contact-sheet.jpg).

### microsoft-autopilot-agents-2026-04 microsoft-autopilot-agents-2026-04.mp4

* warning: Integrated loudness -22.8 LUFS is outside -16 ±4 LU for online video.
* info: Left and right channels carry identical mono narration.
* warning: The visual layer flickers at about 15 Hz for 12.8 s.

Evidence: [analysis](microsoft-autopilot-agents-2026-04/microsoft-autopilot-agents-2026-04/analysis.json), [spectrogram](microsoft-autopilot-agents-2026-04/microsoft-autopilot-agents-2026-04/spectrogram.jpg), [speech spectrogram](microsoft-autopilot-agents-2026-04/microsoft-autopilot-agents-2026-04/spectrogram-speech.jpg), [video spectrogram](microsoft-autopilot-agents-2026-04/microsoft-autopilot-agents-2026-04/video-spectrogram.jpg), [spatial spectrogram](microsoft-autopilot-agents-2026-04/microsoft-autopilot-agents-2026-04/spatial-spectrogram.jpg), [layers](microsoft-autopilot-agents-2026-04/microsoft-autopilot-agents-2026-04/layers.png), [frames](microsoft-autopilot-agents-2026-04/microsoft-autopilot-agents-2026-04/contact-sheet.jpg).

### microsoft-autopilot-agents-2026-05 microsoft-autopilot-agents-2026-05-am_michael-kokoro_onnx.mp4

* info: Left and right channels carry identical mono narration.
* warning: The visual layer flickers at about 3.75 Hz for 12.8 s.

Evidence: [analysis](microsoft-autopilot-agents-2026-05/microsoft-autopilot-agents-2026-05-am_michael-kokoro_onnx/analysis.json), [spectrogram](microsoft-autopilot-agents-2026-05/microsoft-autopilot-agents-2026-05-am_michael-kokoro_onnx/spectrogram.jpg), [speech spectrogram](microsoft-autopilot-agents-2026-05/microsoft-autopilot-agents-2026-05-am_michael-kokoro_onnx/spectrogram-speech.jpg), [video spectrogram](microsoft-autopilot-agents-2026-05/microsoft-autopilot-agents-2026-05-am_michael-kokoro_onnx/video-spectrogram.jpg), [spatial spectrogram](microsoft-autopilot-agents-2026-05/microsoft-autopilot-agents-2026-05-am_michael-kokoro_onnx/spatial-spectrogram.jpg), [layers](microsoft-autopilot-agents-2026-05/microsoft-autopilot-agents-2026-05-am_michael-kokoro_onnx/layers.png), [frames](microsoft-autopilot-agents-2026-05/microsoft-autopilot-agents-2026-05-am_michael-kokoro_onnx/contact-sheet.jpg).

### microsoft-autopilot-agents-2026-05 microsoft-autopilot-agents-2026-05-af_heart-kokoro_onnx.mp4

* info: Left and right channels carry identical mono narration.
* warning: The visual layer flickers at about 7.5 Hz for 11.73 s.

Evidence: [analysis](microsoft-autopilot-agents-2026-05/microsoft-autopilot-agents-2026-05-af_heart-kokoro_onnx/analysis.json), [spectrogram](microsoft-autopilot-agents-2026-05/microsoft-autopilot-agents-2026-05-af_heart-kokoro_onnx/spectrogram.jpg), [speech spectrogram](microsoft-autopilot-agents-2026-05/microsoft-autopilot-agents-2026-05-af_heart-kokoro_onnx/spectrogram-speech.jpg), [video spectrogram](microsoft-autopilot-agents-2026-05/microsoft-autopilot-agents-2026-05-af_heart-kokoro_onnx/video-spectrogram.jpg), [spatial spectrogram](microsoft-autopilot-agents-2026-05/microsoft-autopilot-agents-2026-05-af_heart-kokoro_onnx/spatial-spectrogram.jpg), [layers](microsoft-autopilot-agents-2026-05/microsoft-autopilot-agents-2026-05-af_heart-kokoro_onnx/layers.png), [frames](microsoft-autopilot-agents-2026-05/microsoft-autopilot-agents-2026-05-af_heart-kokoro_onnx/contact-sheet.jpg).

### microsoft-autopilot-agents-2026-05 microsoft-autopilot-agents-2026-05-af_bella-kokoro_onnx.mp4

* info: Left and right channels carry identical mono narration.
* warning: The visual layer flickers at about 3.75 Hz for 12.27 s.

Evidence: [analysis](microsoft-autopilot-agents-2026-05/microsoft-autopilot-agents-2026-05-af_bella-kokoro_onnx/analysis.json), [spectrogram](microsoft-autopilot-agents-2026-05/microsoft-autopilot-agents-2026-05-af_bella-kokoro_onnx/spectrogram.jpg), [speech spectrogram](microsoft-autopilot-agents-2026-05/microsoft-autopilot-agents-2026-05-af_bella-kokoro_onnx/spectrogram-speech.jpg), [video spectrogram](microsoft-autopilot-agents-2026-05/microsoft-autopilot-agents-2026-05-af_bella-kokoro_onnx/video-spectrogram.jpg), [spatial spectrogram](microsoft-autopilot-agents-2026-05/microsoft-autopilot-agents-2026-05-af_bella-kokoro_onnx/spatial-spectrogram.jpg), [layers](microsoft-autopilot-agents-2026-05/microsoft-autopilot-agents-2026-05-af_bella-kokoro_onnx/layers.png), [frames](microsoft-autopilot-agents-2026-05/microsoft-autopilot-agents-2026-05-af_bella-kokoro_onnx/contact-sheet.jpg).

### microsoft-autopilot-agents-2026-05 microsoft-autopilot-agents-2026-05-am_michael-kokoro.mp4

* info: Left and right channels carry identical mono narration.
* warning: The visual layer flickers at about 7.5 Hz for 13.33 s.

Evidence: [analysis](microsoft-autopilot-agents-2026-05/microsoft-autopilot-agents-2026-05-am_michael-kokoro/analysis.json), [spectrogram](microsoft-autopilot-agents-2026-05/microsoft-autopilot-agents-2026-05-am_michael-kokoro/spectrogram.jpg), [speech spectrogram](microsoft-autopilot-agents-2026-05/microsoft-autopilot-agents-2026-05-am_michael-kokoro/spectrogram-speech.jpg), [video spectrogram](microsoft-autopilot-agents-2026-05/microsoft-autopilot-agents-2026-05-am_michael-kokoro/video-spectrogram.jpg), [spatial spectrogram](microsoft-autopilot-agents-2026-05/microsoft-autopilot-agents-2026-05-am_michael-kokoro/spatial-spectrogram.jpg), [layers](microsoft-autopilot-agents-2026-05/microsoft-autopilot-agents-2026-05-am_michael-kokoro/layers.png), [frames](microsoft-autopilot-agents-2026-05/microsoft-autopilot-agents-2026-05-am_michael-kokoro/contact-sheet.jpg).

### microsoft-autopilot-agents-2026-06 microsoft-autopilot-agents-2026-06-am_michael-kokoro_onnx.mp4

* info: Left and right channels carry identical mono narration.
* warning: The visual layer flickers at about 7.5 Hz for 12.8 s.

Evidence: [analysis](microsoft-autopilot-agents-2026-06/microsoft-autopilot-agents-2026-06-am_michael-kokoro_onnx/analysis.json), [spectrogram](microsoft-autopilot-agents-2026-06/microsoft-autopilot-agents-2026-06-am_michael-kokoro_onnx/spectrogram.jpg), [speech spectrogram](microsoft-autopilot-agents-2026-06/microsoft-autopilot-agents-2026-06-am_michael-kokoro_onnx/spectrogram-speech.jpg), [video spectrogram](microsoft-autopilot-agents-2026-06/microsoft-autopilot-agents-2026-06-am_michael-kokoro_onnx/video-spectrogram.jpg), [spatial spectrogram](microsoft-autopilot-agents-2026-06/microsoft-autopilot-agents-2026-06-am_michael-kokoro_onnx/spatial-spectrogram.jpg), [layers](microsoft-autopilot-agents-2026-06/microsoft-autopilot-agents-2026-06-am_michael-kokoro_onnx/layers.png), [frames](microsoft-autopilot-agents-2026-06/microsoft-autopilot-agents-2026-06-am_michael-kokoro_onnx/contact-sheet.jpg).

### microsoft-autopilot-agents-2026-06 microsoft-autopilot-agents-2026-06-af_heart-kokoro_onnx.mp4

* info: Left and right channels carry identical mono narration.
* warning: The visual layer flickers at about 11.25 Hz for 11.73 s.

Evidence: [analysis](microsoft-autopilot-agents-2026-06/microsoft-autopilot-agents-2026-06-af_heart-kokoro_onnx/analysis.json), [spectrogram](microsoft-autopilot-agents-2026-06/microsoft-autopilot-agents-2026-06-af_heart-kokoro_onnx/spectrogram.jpg), [speech spectrogram](microsoft-autopilot-agents-2026-06/microsoft-autopilot-agents-2026-06-af_heart-kokoro_onnx/spectrogram-speech.jpg), [video spectrogram](microsoft-autopilot-agents-2026-06/microsoft-autopilot-agents-2026-06-af_heart-kokoro_onnx/video-spectrogram.jpg), [spatial spectrogram](microsoft-autopilot-agents-2026-06/microsoft-autopilot-agents-2026-06-af_heart-kokoro_onnx/spatial-spectrogram.jpg), [layers](microsoft-autopilot-agents-2026-06/microsoft-autopilot-agents-2026-06-af_heart-kokoro_onnx/layers.png), [frames](microsoft-autopilot-agents-2026-06/microsoft-autopilot-agents-2026-06-af_heart-kokoro_onnx/contact-sheet.jpg).

### microsoft-autopilot-agents-2026-06 microsoft-autopilot-agents-2026-06-af_bella-kokoro_onnx.mp4

* info: Left and right channels carry identical mono narration.
* warning: The visual layer flickers at about 7.5 Hz for 12.27 s.

Evidence: [analysis](microsoft-autopilot-agents-2026-06/microsoft-autopilot-agents-2026-06-af_bella-kokoro_onnx/analysis.json), [spectrogram](microsoft-autopilot-agents-2026-06/microsoft-autopilot-agents-2026-06-af_bella-kokoro_onnx/spectrogram.jpg), [speech spectrogram](microsoft-autopilot-agents-2026-06/microsoft-autopilot-agents-2026-06-af_bella-kokoro_onnx/spectrogram-speech.jpg), [video spectrogram](microsoft-autopilot-agents-2026-06/microsoft-autopilot-agents-2026-06-af_bella-kokoro_onnx/video-spectrogram.jpg), [spatial spectrogram](microsoft-autopilot-agents-2026-06/microsoft-autopilot-agents-2026-06-af_bella-kokoro_onnx/spatial-spectrogram.jpg), [layers](microsoft-autopilot-agents-2026-06/microsoft-autopilot-agents-2026-06-af_bella-kokoro_onnx/layers.png), [frames](microsoft-autopilot-agents-2026-06/microsoft-autopilot-agents-2026-06-af_bella-kokoro_onnx/contact-sheet.jpg).

### microsoft-autopilot-agents-2026-06 microsoft-autopilot-agents-2026-06-am_michael-kokoro.mp4

* info: Left and right channels carry identical mono narration.
* warning: The visual layer flickers at about 11.25 Hz for 12.8 s.

Evidence: [analysis](microsoft-autopilot-agents-2026-06/microsoft-autopilot-agents-2026-06-am_michael-kokoro/analysis.json), [spectrogram](microsoft-autopilot-agents-2026-06/microsoft-autopilot-agents-2026-06-am_michael-kokoro/spectrogram.jpg), [speech spectrogram](microsoft-autopilot-agents-2026-06/microsoft-autopilot-agents-2026-06-am_michael-kokoro/spectrogram-speech.jpg), [video spectrogram](microsoft-autopilot-agents-2026-06/microsoft-autopilot-agents-2026-06-am_michael-kokoro/video-spectrogram.jpg), [spatial spectrogram](microsoft-autopilot-agents-2026-06/microsoft-autopilot-agents-2026-06-am_michael-kokoro/spatial-spectrogram.jpg), [layers](microsoft-autopilot-agents-2026-06/microsoft-autopilot-agents-2026-06-am_michael-kokoro/layers.png), [frames](microsoft-autopilot-agents-2026-06/microsoft-autopilot-agents-2026-06-am_michael-kokoro/contact-sheet.jpg).

### microsoft-autopilot-agents-2026-07 microsoft-autopilot-agents-2026-07-am_michael-kokoro_onnx.mp4

* info: Left and right channels carry identical mono narration.
* warning: The visual layer flickers at about 15 Hz for 12.8 s.

Evidence: [analysis](microsoft-autopilot-agents-2026-07/microsoft-autopilot-agents-2026-07-am_michael-kokoro_onnx/analysis.json), [spectrogram](microsoft-autopilot-agents-2026-07/microsoft-autopilot-agents-2026-07-am_michael-kokoro_onnx/spectrogram.jpg), [speech spectrogram](microsoft-autopilot-agents-2026-07/microsoft-autopilot-agents-2026-07-am_michael-kokoro_onnx/spectrogram-speech.jpg), [video spectrogram](microsoft-autopilot-agents-2026-07/microsoft-autopilot-agents-2026-07-am_michael-kokoro_onnx/video-spectrogram.jpg), [spatial spectrogram](microsoft-autopilot-agents-2026-07/microsoft-autopilot-agents-2026-07-am_michael-kokoro_onnx/spatial-spectrogram.jpg), [layers](microsoft-autopilot-agents-2026-07/microsoft-autopilot-agents-2026-07-am_michael-kokoro_onnx/layers.png), [frames](microsoft-autopilot-agents-2026-07/microsoft-autopilot-agents-2026-07-am_michael-kokoro_onnx/contact-sheet.jpg).

### microsoft-autopilot-agents-2026-07 microsoft-autopilot-agents-2026-07-af_heart-kokoro_onnx.mp4

* info: Left and right channels carry identical mono narration.
* warning: The visual layer flickers at about 11.25 Hz for 11.73 s.

Evidence: [analysis](microsoft-autopilot-agents-2026-07/microsoft-autopilot-agents-2026-07-af_heart-kokoro_onnx/analysis.json), [spectrogram](microsoft-autopilot-agents-2026-07/microsoft-autopilot-agents-2026-07-af_heart-kokoro_onnx/spectrogram.jpg), [speech spectrogram](microsoft-autopilot-agents-2026-07/microsoft-autopilot-agents-2026-07-af_heart-kokoro_onnx/spectrogram-speech.jpg), [video spectrogram](microsoft-autopilot-agents-2026-07/microsoft-autopilot-agents-2026-07-af_heart-kokoro_onnx/video-spectrogram.jpg), [spatial spectrogram](microsoft-autopilot-agents-2026-07/microsoft-autopilot-agents-2026-07-af_heart-kokoro_onnx/spatial-spectrogram.jpg), [layers](microsoft-autopilot-agents-2026-07/microsoft-autopilot-agents-2026-07-af_heart-kokoro_onnx/layers.png), [frames](microsoft-autopilot-agents-2026-07/microsoft-autopilot-agents-2026-07-af_heart-kokoro_onnx/contact-sheet.jpg).

### microsoft-autopilot-agents-2026-07 microsoft-autopilot-agents-2026-07-af_bella-kokoro_onnx.mp4

* info: Left and right channels carry identical mono narration.
* warning: The visual layer flickers at about 15 Hz for 12.27 s.

Evidence: [analysis](microsoft-autopilot-agents-2026-07/microsoft-autopilot-agents-2026-07-af_bella-kokoro_onnx/analysis.json), [spectrogram](microsoft-autopilot-agents-2026-07/microsoft-autopilot-agents-2026-07-af_bella-kokoro_onnx/spectrogram.jpg), [speech spectrogram](microsoft-autopilot-agents-2026-07/microsoft-autopilot-agents-2026-07-af_bella-kokoro_onnx/spectrogram-speech.jpg), [video spectrogram](microsoft-autopilot-agents-2026-07/microsoft-autopilot-agents-2026-07-af_bella-kokoro_onnx/video-spectrogram.jpg), [spatial spectrogram](microsoft-autopilot-agents-2026-07/microsoft-autopilot-agents-2026-07-af_bella-kokoro_onnx/spatial-spectrogram.jpg), [layers](microsoft-autopilot-agents-2026-07/microsoft-autopilot-agents-2026-07-af_bella-kokoro_onnx/layers.png), [frames](microsoft-autopilot-agents-2026-07/microsoft-autopilot-agents-2026-07-af_bella-kokoro_onnx/contact-sheet.jpg).

### microsoft-autopilot-agents-2026-07 microsoft-autopilot-agents-2026-07-am_michael-kokoro.mp4

* info: Left and right channels carry identical mono narration.
* warning: The visual layer flickers at about 15 Hz for 12.8 s.

Evidence: [analysis](microsoft-autopilot-agents-2026-07/microsoft-autopilot-agents-2026-07-am_michael-kokoro/analysis.json), [spectrogram](microsoft-autopilot-agents-2026-07/microsoft-autopilot-agents-2026-07-am_michael-kokoro/spectrogram.jpg), [speech spectrogram](microsoft-autopilot-agents-2026-07/microsoft-autopilot-agents-2026-07-am_michael-kokoro/spectrogram-speech.jpg), [video spectrogram](microsoft-autopilot-agents-2026-07/microsoft-autopilot-agents-2026-07-am_michael-kokoro/video-spectrogram.jpg), [spatial spectrogram](microsoft-autopilot-agents-2026-07/microsoft-autopilot-agents-2026-07-am_michael-kokoro/spatial-spectrogram.jpg), [layers](microsoft-autopilot-agents-2026-07/microsoft-autopilot-agents-2026-07-am_michael-kokoro/layers.png), [frames](microsoft-autopilot-agents-2026-07/microsoft-autopilot-agents-2026-07-am_michael-kokoro/contact-sheet.jpg).

### microsoft-autopilot-agents-2026-08 microsoft-autopilot-agents-2026-08-am_michael-kokoro_onnx.mp4

* info: Left and right channels carry identical mono narration.
* info: No visible motion for 10.567 s from 33.2 s.

Evidence: [analysis](microsoft-autopilot-agents-2026-08/microsoft-autopilot-agents-2026-08-am_michael-kokoro_onnx/analysis.json), [spectrogram](microsoft-autopilot-agents-2026-08/microsoft-autopilot-agents-2026-08-am_michael-kokoro_onnx/spectrogram.jpg), [speech spectrogram](microsoft-autopilot-agents-2026-08/microsoft-autopilot-agents-2026-08-am_michael-kokoro_onnx/spectrogram-speech.jpg), [video spectrogram](microsoft-autopilot-agents-2026-08/microsoft-autopilot-agents-2026-08-am_michael-kokoro_onnx/video-spectrogram.jpg), [spatial spectrogram](microsoft-autopilot-agents-2026-08/microsoft-autopilot-agents-2026-08-am_michael-kokoro_onnx/spatial-spectrogram.jpg), [layers](microsoft-autopilot-agents-2026-08/microsoft-autopilot-agents-2026-08-am_michael-kokoro_onnx/layers.png), [frames](microsoft-autopilot-agents-2026-08/microsoft-autopilot-agents-2026-08-am_michael-kokoro_onnx/contact-sheet.jpg).

### microsoft-autopilot-agents-2026-08 microsoft-autopilot-agents-2026-08-af_heart-kokoro_onnx.mp4

* info: Left and right channels carry identical mono narration.
* info: No visible motion for 9.633 s from 30.333 s.

Evidence: [analysis](microsoft-autopilot-agents-2026-08/microsoft-autopilot-agents-2026-08-af_heart-kokoro_onnx/analysis.json), [spectrogram](microsoft-autopilot-agents-2026-08/microsoft-autopilot-agents-2026-08-af_heart-kokoro_onnx/spectrogram.jpg), [speech spectrogram](microsoft-autopilot-agents-2026-08/microsoft-autopilot-agents-2026-08-af_heart-kokoro_onnx/spectrogram-speech.jpg), [video spectrogram](microsoft-autopilot-agents-2026-08/microsoft-autopilot-agents-2026-08-af_heart-kokoro_onnx/video-spectrogram.jpg), [spatial spectrogram](microsoft-autopilot-agents-2026-08/microsoft-autopilot-agents-2026-08-af_heart-kokoro_onnx/spatial-spectrogram.jpg), [layers](microsoft-autopilot-agents-2026-08/microsoft-autopilot-agents-2026-08-af_heart-kokoro_onnx/layers.png), [frames](microsoft-autopilot-agents-2026-08/microsoft-autopilot-agents-2026-08-af_heart-kokoro_onnx/contact-sheet.jpg).

### microsoft-autopilot-agents-2026-08 microsoft-autopilot-agents-2026-08-af_bella-kokoro_onnx.mp4

* info: Left and right channels carry identical mono narration.
* info: No visible motion for 9.9 s from 31.533 s.

Evidence: [analysis](microsoft-autopilot-agents-2026-08/microsoft-autopilot-agents-2026-08-af_bella-kokoro_onnx/analysis.json), [spectrogram](microsoft-autopilot-agents-2026-08/microsoft-autopilot-agents-2026-08-af_bella-kokoro_onnx/spectrogram.jpg), [speech spectrogram](microsoft-autopilot-agents-2026-08/microsoft-autopilot-agents-2026-08-af_bella-kokoro_onnx/spectrogram-speech.jpg), [video spectrogram](microsoft-autopilot-agents-2026-08/microsoft-autopilot-agents-2026-08-af_bella-kokoro_onnx/video-spectrogram.jpg), [spatial spectrogram](microsoft-autopilot-agents-2026-08/microsoft-autopilot-agents-2026-08-af_bella-kokoro_onnx/spatial-spectrogram.jpg), [layers](microsoft-autopilot-agents-2026-08/microsoft-autopilot-agents-2026-08-af_bella-kokoro_onnx/layers.png), [frames](microsoft-autopilot-agents-2026-08/microsoft-autopilot-agents-2026-08-af_bella-kokoro_onnx/contact-sheet.jpg).

### microsoft-autopilot-agents-2026-08 microsoft-autopilot-agents-2026-08-am_michael-kokoro.mp4

* info: Left and right channels carry identical mono narration.
* info: No visible motion for 10.567 s from 33.2 s.

Evidence: [analysis](microsoft-autopilot-agents-2026-08/microsoft-autopilot-agents-2026-08-am_michael-kokoro/analysis.json), [spectrogram](microsoft-autopilot-agents-2026-08/microsoft-autopilot-agents-2026-08-am_michael-kokoro/spectrogram.jpg), [speech spectrogram](microsoft-autopilot-agents-2026-08/microsoft-autopilot-agents-2026-08-am_michael-kokoro/spectrogram-speech.jpg), [video spectrogram](microsoft-autopilot-agents-2026-08/microsoft-autopilot-agents-2026-08-am_michael-kokoro/video-spectrogram.jpg), [spatial spectrogram](microsoft-autopilot-agents-2026-08/microsoft-autopilot-agents-2026-08-am_michael-kokoro/spatial-spectrogram.jpg), [layers](microsoft-autopilot-agents-2026-08/microsoft-autopilot-agents-2026-08-am_michael-kokoro/layers.png), [frames](microsoft-autopilot-agents-2026-08/microsoft-autopilot-agents-2026-08-am_michael-kokoro/contact-sheet.jpg).

## Comparison images

* [Spectrogram stack](spectrogram-stack.jpg)
* [Video spectrogram stack](video-spectrogram-stack.jpg)
* [Spatial spectrogram stack](spatial-spectrogram-stack.jpg)
* [Frame grid](frames-grid.jpg)
* [Layer activity stack](layers-stack.jpg)
