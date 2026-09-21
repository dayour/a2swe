---
title: Installation
---

# Installation

## Supported baseline

The repository pins and documents the following baseline:

- Node.js 24;
- npm with lockfile-based installation;
- Python 3.14.7;
- Windows x64 as the verified environment;
- FFmpeg and ffprobe for encoded-media inspection.

The Remotion package on Windows includes usable media binaries. Production should have at least 5 GB of free disk space.

## Install the template

From the repository root:

```powershell
npm --prefix template ci
npm --prefix template run build
```

`build` runs TypeScript validation, then creates the static Remotion bundle at `template/build_production`. It does not synthesize narration or render a completed movie.

## Install Python dependencies

```powershell
uv python install 3.14.7
uv venv --python 3.14.7 .venv --seed
Push-Location template
..\.venv\Scripts\python.exe -m pip install -r requirements.lock.txt
Pop-Location
.\.venv\Scripts\python.exe template\scripts\test_pipeline.py -v
```

The lockfile is resolved from the template directory because it may contain template-relative wheel references.

## Start Remotion Studio

```powershell
npm --prefix template run studio -- --port 3100
```

Use another port if `3100` is occupied. Studio exposes the registered `Video`, `Overlay`, and `G1` through `G8` compositions.

## Documentation site

```powershell
npm --prefix docs ci
npm --prefix docs run start
```

The production documentation build is:

```powershell
npm --prefix docs run build
```

## Optional runtime controls

On a disk-constrained host:

```powershell
$env:REMOTION_CACHE = '0'
```

To reuse an installed Chromium binary:

```powershell
$env:REMOTION_BROWSER_EXECUTABLE = 'C:\Path\To\chrome.exe'
```

See [environment variables](../reference/environment-variables.md) for narration and model controls.
