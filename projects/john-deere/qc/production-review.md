# Production Review

## Verified

- The final MP4 linked in delivery.md has 900 H.264 frames, 1280x720 resolution, 30fps, stereo 48kHz AAC and less than 100ms container padding.
- All 900 frames were decoded from that final MP4. All six shots pass the unchanged motion thresholds (at most 40% still frames, longest static run at most one second).
- Six full-resolution content samples per shot pass the nonblank check. Contact sheets and the six-shot overview are retained. Visual review found and corrected the fallback font, weak sustained motion, and Copilot-specific lock/reveal defects.
- Final decoded AAC versus source WAV: correlation above 0.99998, zero sample lag. This proves content preservation and synchronization, not subjective pronunciation quality.
- Full pretrained PyTorch Kokoro inference passed with actual weights. ONNX batch synthesis, WAV round-trip and streaming passed. Complete approved scripts for all three topics were synthesized through both engines, with nonzero finite waveforms and WAV round-trip checks. Misaki generated real English phonemes/tokens. See qc/models/verification.json and retained WAVs.
- Node installations completed with zero reported npm audit vulnerabilities. Latest-stable package pins: Remotion 4.0.522, React 19.2.8, TypeScript 7.0.2. Python 3.14.7 uses the bundled local upgraded wheels and explicit spaCy English model.

## Defects and Retests

| Defect | Resolution | Evidence |
| --- | --- | --- |
| Bundled FFmpeg lacks raw f32le muxer used by TTS | SoundFile decoding and SciPy resampling | Real Edge narration generated for all projects |
| Partial npm installation locked by Windows | Completed npm install from upgraded lock | Successful builds and zero audit vulnerabilities |
| Disk exhausted by browser duplication and caches | Removed only failed task archive and disposable webpack caches; reused installed browser; REMOTION_CACHE=0 uses supported Config API | All final builds and renders completed |
| Scene font alias fell back to serif | Use the loaded Noto Sans SC family | Corrected encoded-frame inspection |
| Network scenes failed sustained-motion gate | Visible packet transfer and 1.05x push; no threshold relaxation | Final motion report has zero failing shots |
| AAC encoder added 2048 samples of delay | Measured correlation, lossless negative timestamp shift | Final media report has zero sample lag |
| Copilot lock arc and short code reveal were incorrect | Correct arc endpoint and duration-relative reveal | Corrected Copilot final contact sheets and passing rerender |

## Reproduction

Both local engines also passed the actual a2swe TTS adapter in isolated QC projects:
the complete approved Deere script produced real WAV audio, six sentence timings
and subtitles with Kokoro and Kokoro ONNX. This check did not overwrite the approved
Edge voice in any delivered movie. Direct full-script model evidence covers all
three topics; adapter evidence is retained in the repository's qc/model-pipeline/.

From the project directory, with the root Python environment active:

```powershell
$env:REMOTION_CACHE = '0'
npm ci
npm run build
python scripts/render_storyboard.py
python scripts/selfcheck.py G1
npm run render -- renders/new-raw.mp4 --codec=h264 --concurrency=2
python scripts/align_audio.py renders/new-raw.mp4 public/assets/PROJECT_SLUG/audio.wav renders/PROJECT_SLUG-new.mp4 --ffmpeg PATH_TO_FFMPEG
ffmpeg -i renders/PROJECT_SLUG-new.mp4 -q:v 2 fin_frames/f_%04d.jpg
python scripts/motion_check.py --frames fin_frames
python scripts/verify_video.py . --version new --ffmpeg PATH_TO_FFMPEG --ffprobe PATH_TO_FFPROBE
```

Replace the explicit PROJECT_SLUG and binary-path arguments with this project's
values. For a shared browser, set REMOTION_BROWSER_EXECUTABLE to its executable.
Use a new version name; do not overwrite prior releases. Narration text changes
require approval, new TTS/timing, and shot realignment. The alignment helper refuses
mismatched content, large offsets and existing output paths.

## Open Gates

Human listening for pronunciation, subjective pacing and pilot approval is pending.
No tool result is presented as a human listening pass. Automated model tests cover
the complete English scripts and selected American voices, not all supported
languages/voices. Full model/voice weights are externally cached, not bundled in
the source; local wheel snapshots are bundled. Do not silently substitute a local
voice for the approved Edge voice. Root toolkit licensing remains unresolved.

Studio launched locally; integrated browser automation lost page handles during
playback attempts. Treat browser playback verification separately from the passing
encoded MP4 checks. This candidate can be watched directly in a video player.
