# Python 3.14 speech-stack integration

The current template and generated projects use TypeScript 7.0.2, stable React
19.3.0, and matching Remotion 4.0.523 packages. Do not replace the stable renderer
with an alpha merely because an npm `latest` tag points to one.

The authoritative speech-stack wiki is
<https://dayour.github.io/kokoro-onnx/>. Release downloads and compatibility gates
are documented at <https://dayour.github.io/kokoro-onnx/releases/>.

## Reproducible Python installation

Use standard CPython 3.14. The requirements files select the fork release wheels
by immutable release URL and SHA-256, not ignored local wheel snapshots or
similarly named upstream PyPI releases. The release tag and hashes identify the
build even when its Python package version is unchanged.

From the template or generated project, install its `requirements.lock.txt`.
The unified stack uses upstream `phonemizer>=3.4.0`, not `phonemizer-fork`.
For an environment created with the older lock, synchronize the new lock and
reinstall phonemizer so stale overlapping module files cannot survive:

```powershell
uv pip sync --python ..\.venv\Scripts\python.exe requirements.lock.txt --reinstall-package phonemizer
```

The interpreter path above assumes the template directory. Use the repository's
absolute interpreter path from a generated project. Do not apply this sync to a
global or unrelated environment.

## Cache and audio correctness

The template's `npm run audio` uses `scripts/python.mjs`, selecting the nearest
ancestor `.venv` or the absolute `A2SWE_PYTHON` override. It checks Python 3.14
before starting the producer and never silently substitutes a global interpreter.
An optional `script/speech.json` can persist `TTS_ENGINE`, `KOKORO_VOICE`,
`KOKORO_SPEED`, `LEAD`, `GAP`, `CHAPTER_GAP`, and `TAIL`; explicit environment
variables override those defaults. A project-specific render gate should enforce
its approved engine/voice/speed.

Narration cache keys include package versions, direct wheel provenance, pipeline
source, model fingerprints, and the requested ONNX provider. Upgrading a fork
build invalidates old cache identities even if its version string is unchanged.
Timeline output records the runtime fingerprint.

The updated template and Power Platform 2026 producer pin the full Kokoro model,
configuration, and selected voice to revision
`f3ff3571791e39611d31c381e3a41a3af07b4987` and record full-file SHA-256 fingerprints.
They verify installed custom fork source URLs against the requirements lock
before using narration caches. Installed `direct_url.json` provenance and the
lock's wheel hashes are recorded separately: an installed source URL is not proof
that installed package contents have been independently wheel-hash verified.

Full Kokoro synthesizes each complete narration line before splitting captions.
English token timestamps, including offsets across multiple model results,
determine subtitle starts. Missing or unmatched alignment fails explicitly;
it is not silently replaced by proportional text timing. The WAV and timestamp
sidecar form a hash-checked cache pair. Caption `|` markers do not restart prosody.
Explicit ONNX/Piper paths retain their per-caption synthesis contract; the new
model-token alignment applies to full Kokoro, not those engines.

The producer writes `audio/narration-metadata.json` alongside the timeline, with
engine, voice, rate, Python interpreter, model/fork identity, and SHA-256 of
narration, WAV, profile, timing, and producer files. The Power Platform render
gate validates these before rendering, regenerates scene/QC ranges from chapters,
and measures/remuxes encoder delay instead of trimming source narration.

Kokoro/ONNX WAV writes reject empty, non-finite, entirely silent, or invalid-channel
audio and use atomic replacement. An interrupted write does not become a valid
cache entry. Decode failures are surfaced before resampling or normalization.

`auto` remains local Kokoro. No failure path selects Edge automatically.
Existing voice/narration approvals, output sample rates, and frame timing are
unchanged. Updating dependencies does not authorize regenerating approved movies.

## Existing validation

Run `scripts/test_pipeline.py`, `npm run typecheck`, and `npm run build` in each
affected project. Use scratch output for real-model checks. A Remotion production
bundle is not a rendered or human-approved video. Preserve existing project
research, storyboards, media, delivery records, and uncommitted work.
