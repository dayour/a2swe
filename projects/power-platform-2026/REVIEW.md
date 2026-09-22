# Review candidate

State: **review-candidate**, not released.

| Gate | State |
|---|---|
| Evidence traceability | Complete for candidate |
| Automated type/build/media/timeline QC | Passed for v6 |
| Revised narration and voice selection | Approved in conversation |
| Rendered-candidate content/pilot approval | Pending |
| Human style/brand approval | Pending |
| Human voice/listening approval | Pending |
| Human release approval | Pending |

Automated checks cannot grant these approvals. The rendered MP4 remains a review
artifact until a human explicitly accepts content, style, voice, and release.

## Candidate artifact

- Video: [power-platform-2026-v6.mp4](renders/power-platform-2026-v6.mp4)
- Narration: [narration-v6.wav](audio/narration-v6.wav)
- Voice/provenance: [narration-v6.metadata.json](audio/narration-v6.metadata.json)
- Contact sheet: [overview-v6.jpg](qc/overview-v6.jpg)
- Machine report: [media-v6.json](qc/media-v6.json)
- Motion report: [motion-v6.txt](qc/motion-v6.txt)
- Composition report: [frame-metrics-v6.md](qc/frame-metrics-v6.md)
- SHA-256: `f2d09f4cdcd308d788bb3d11012f5a889ab295f8b5365322426f948233a900de`

v6 uses the custom Kokoro/Misaki fork builds on Python 3.14.7, `am_liam`,
speed 1.0, and the approved shortened script. Synthesis and model verification ran
with `HF_HUB_OFFLINE=1`. The separate ONNX verification uses the custom
`kokoro-onnx` fork and `am_michael`; it is not the delivered voice.

Automated media result: H.264 1920x1080 at 30 fps, 1,090 frames (36.33 seconds);
AAC stereo at 48 kHz; all 1,090 frames decoded; all six motion checks passed.
Measured AAC delay was corrected by a lossless stream-copy remux, without trimming
the source WAV. Final audio lag is **0 samples**, waveform similarity is
**0.999967**, and decoded peak is **0.888367** (no clipping). Encoded loudness is
**-17.5 LUFS**, with **1.3 LU** loudness range and **-1.0 dBFS** true peak.

These checks establish technical integrity, not subjective voice quality. Human
listening, style/brand, pilot, and release approval remain pending. The existing
visual design was retained; the scene-six title/badge spacing still needs visual
review and is not granted a style approval by the automated checks.

## Historical v5 artifact (preserved unchanged)

- Video: `renders/power-platform-2026-v5.mp4`
- Contact sheet: `qc/overview-v5.jpg`
- Machine report: `qc/media-v5.json`
- Motion report: `qc/motion-v5.txt`
- Composition report: `qc/frame-metrics-v5.md`
- SHA-256: `b6587dba649502f69e4547c007fd5bcdc1cc9d00b313a04e23163b603c475a70`

Automated result: H.264 1920x1080 at 30 fps, 1,264 frames (42.13 seconds);
AAC stereo at 48 kHz; 1,264 decoded frames; all six motion checks passed.
AAC alignment measured 448 samples with 0.999952 waveform similarity and passes
the shared default 1,024-sample tolerance. Composition heuristics
reported no high or medium flags and five low “hero size/purple fragment” advisories.
