---
title: copilot-code render analysis
description: Measured audio, spectrogram and video-layer comparison for every copilot-code revision.
---

## Method

Every revision video is decoded with FFmpeg and measured with the core `media-analyze` method. Spectrograms use a Hann window, logarithmic magnitude and a 120 dB range, with frequency, time and dBFS legends. Loudness uses ITU-R BS.1770 (EBU R128). Video layers are measured per layout zone as frame-to-frame motion and edge detail.

The video spectrogram is the visual counterpart of the audio spectrogram. Each pixel's brightness is a signal sampled at the frame rate, and a short-time Fourier transform of every pixel, averaged per layout zone, shows the temporal frequencies each layer carries. Scene and caption changes appear as broadband bursts, eased animation below 2 Hz, and flicker or shimmer as sustained narrow lines. The spatial spectrogram shows horizontal detail per content band over time; the fine-detail share above 0.18 cycles per pixel tracks text sharpness and density.

These are objective measurements. They do not replace listening and viewing.

## Revisions

| Revision | Status | Output | Voice | Size | Duration | LUFS | True peak | Pause floor | Speech HF>8k | Longest pause | Flicker | Motion <2 Hz | Body detail | Findings |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| copilot-code-2026-01 | superseded | copilot-code-2026-01.mp4 | am_michael / kokoro_onnx | 1920x1080 | 79.7 s | -16.1 | -1.5 dBTP | -63.3 dBFS | 0.34% | 1.63 s | 0.00 s | 87.7% | 21.5% | none |
| copilot-code-2026-02 | current | copilot-code-2026-02-am_michael-kokoro_onnx.mp4 | am_michael / kokoro_onnx | 1920x1080 | 79.4 s | -16.0 | -1.5 dBTP | -62.2 dBFS | 0.34% | 1.63 s | 0.00 s | 87.7% | 21.5% | none |

## Findings by revision

### copilot-code-2026-01 copilot-code-2026-01.mp4

* info: Left and right channels carry identical mono narration.
* info: No visible motion for 12.3 s from 1.4 s.
* info: No visible motion for 15.033 s from 19.567 s.
* info: No visible motion for 9.133 s from 36.4 s.
* info: No visible motion for 9.567 s from 48.633 s.
* info: No visible motion for 8.867 s from 59.667 s.
* info: No visible motion for 10.6 s from 68.533 s.

Evidence: [analysis](copilot-code-2026-01/copilot-code-2026-01/analysis.json), [spectrogram](copilot-code-2026-01/copilot-code-2026-01/spectrogram.jpg), [speech spectrogram](copilot-code-2026-01/copilot-code-2026-01/spectrogram-speech.jpg), [video spectrogram](copilot-code-2026-01/copilot-code-2026-01/video-spectrogram.jpg), [spatial spectrogram](copilot-code-2026-01/copilot-code-2026-01/spatial-spectrogram.jpg), [layers](copilot-code-2026-01/copilot-code-2026-01/layers.png), [frames](copilot-code-2026-01/copilot-code-2026-01/contact-sheet.jpg).

### copilot-code-2026-02 copilot-code-2026-02-am_michael-kokoro_onnx.mp4

* info: Left and right channels carry identical mono narration.
* info: No visible motion for 12.433 s from 1.433 s.
* info: No visible motion for 14.8 s from 19.733 s.
* info: No visible motion for 9.567 s from 48.567 s.
* info: No visible motion for 10.5 s from 68.367 s.

Evidence: [analysis](copilot-code-2026-02/copilot-code-2026-02-am_michael-kokoro_onnx/analysis.json), [spectrogram](copilot-code-2026-02/copilot-code-2026-02-am_michael-kokoro_onnx/spectrogram.jpg), [speech spectrogram](copilot-code-2026-02/copilot-code-2026-02-am_michael-kokoro_onnx/spectrogram-speech.jpg), [video spectrogram](copilot-code-2026-02/copilot-code-2026-02-am_michael-kokoro_onnx/video-spectrogram.jpg), [spatial spectrogram](copilot-code-2026-02/copilot-code-2026-02-am_michael-kokoro_onnx/spatial-spectrogram.jpg), [layers](copilot-code-2026-02/copilot-code-2026-02-am_michael-kokoro_onnx/layers.png), [frames](copilot-code-2026-02/copilot-code-2026-02-am_michael-kokoro_onnx/contact-sheet.jpg).

## Comparison images

* [Spectrogram stack](spectrogram-stack.jpg)
* [Video spectrogram stack](video-spectrogram-stack.jpg)
* [Spatial spectrogram stack](spatial-spectrogram-stack.jpg)
* [Frame grid](frames-grid.jpg)
* [Layer activity stack](layers-stack.jpg)
