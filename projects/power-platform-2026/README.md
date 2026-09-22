# Power Platform 2026 production explainer

An isolated 1920x1080, 30 fps Remotion/React production using the custom Python
3.14 Kokoro/Misaki fork builds. Original code-drawn visuals only.

The v6 review candidate is 1,090 frames (36.33 seconds), voiced locally by
Kokoro `am_liam` at speed `1.0`. It uses the approved shorter narration.
Subtitle breaks no longer split model inference: each full sentence is synthesized
once, with caption starts mapped to model token timestamps.

```powershell
npm ci
npm run audio
npm run typecheck
npm run build
npm run render
```

`npm run audio` selects the nearest ancestor `.venv`, or the absolute interpreter
path in `A2SWE_PYTHON`, and requires Python 3.14. Install the project's
`requirements.lock.txt` there first. It never falls back to system Python, SAPI,
or a cloud speech provider. `script/speech.json` persists voice, speed, and pauses.
Set `HF_HUB_OFFLINE=1` to require already-cached pinned model files.

The render gate rejects stale narration, WAVs, timing, producer code, and a
non-approved engine/voice/speed. The render command refuses existing v6 output;
use `node scripts/python.mjs scripts/render_video.py --version v7` only when
intentionally creating a new candidate. It retains the unaligned encode under
`qc/encoded/`, then uses measured AAC delay for a lossless remux, not a source trim.
Run `scripts/verify_video.py` on the final movie with all decoded frames before
handoff. Machine waveform alignment is not a listening approval.

## Retained evidence

- [v6 video](renders/power-platform-2026-v6.mp4)
- [v6 narration WAV](audio/narration-v6.wav)
- [Voice, model, fork, and input fingerprints](audio/narration-v6.metadata.json)
- [Encoded media checks](qc/media-v6.json)
- [Full Kokoro and ONNX model checks](qc/model-verification-v6/verification.json)
- [Review state](REVIEW.md)

The custom ONNX build was also exercised locally with `am_michael`; that is
separate model verification, not the voice used in this movie. Compared sibling
projects (John Deere, Copilot, Microsoft) use the same local builder defaults,
but their retained delivered timelines identify Edge AndrewNeural. Their
separate Kokoro model checks must not be presented as their delivered voices.

v1-v5 movies remain unchanged. v5 source/timing/producer inputs are archived under
`audio/history/v5/`. The active SAPI-only producer has been removed; its historical
source is retained there for audit.

See `research/`, `script/`, `storyboard.md`, `RIGHTS.md`, and `REVIEW.md`.
