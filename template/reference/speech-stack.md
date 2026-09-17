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

Narration cache keys include package versions, direct wheel provenance, pipeline
source, model fingerprints, and the requested ONNX provider. Upgrading a fork
build invalidates old cache identities even if its version string is unchanged.
Timeline output records the runtime fingerprint.

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
