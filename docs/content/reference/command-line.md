---
title: Command-line reference
description: Root, scaffold, and generated-project commands with their approval boundaries.
---

## Root agent-first core commands

| Command | Behavior |
| --- | --- |
| `npm ci --ignore-scripts` | Install the root core workspace without lifecycle scripts |
| `npm run typecheck` | Typecheck the root core TypeScript project |
| `npm run build` | Alias for the root core typecheck |
| `npm run contracts:check` | Verify generated contract files are current |
| `npm test` | Run root core tests |
| `npm run assets:proof` | Generate evaluation-only synthetic asset proofs under `.a2swe/` |
| `npm run build:all` | Typecheck root core and Copilot integration, then typecheck/build docs |
| `npm run test:all` | Run root core and Copilot integration tests |
| `npm run validate:all` | Run contracts, aggregate build/test, and evaluation-only asset proof |
| `npm run a2swe -- --help` | Show root core CLI help |

The root commands do not render production video and do not certify DomainReady.

## Core release candidate commands

Run from the repository root. Supply your own validated contract files and
reviewer trust policy; a pending runbook or an evaluation asset bundle alone is
not production approval.

```powershell
npm run a2swe -- runbook-verify --root <project-directory>
npm run a2swe -- release-plan --content <content-ir.json> --render <render-spec.json> --approval <approval.json>
npm run a2swe -- release-review-candidate --content <content-ir.json> --render <render-spec.json> --out <new-directory>
npm run a2swe -- release-produce --content <content-ir.json> --render <render-spec.json> --approval <approval.json> --approvals <approvals.json> --trust <policy.json> --assets <bundle-directory> --out <new-directory>
npm run a2swe -- release-verify --root <release-directory> --trust <policy.json>
```

`release-review-candidate` may also take `--assets` for a visual preview; it
remains unapproved. Production requires digest-matching source assets, approved
approval, and signed approval scopes. `release-produce` emits editable document
outputs, searchable PDF, 1080p PNG/JPEG overviews, and an
`outputs/remotion/` project. It does not encode the MP4 itself. In that project,
install local JavaScript dependencies, configure an approved Python 3.14
Kokoro/Kokoro-ONNX environment and model paths, then run `npm run render`.
This command synthesizes missing/stale audio, encodes the movie, runs ffprobe
QC, and fails if QC fails. `npm run qc` repeats encoded checks. Human visual
and audio review remains pending after automated success.

## Copilot integration commands

Run from the repository root:

```powershell
npm --prefix integrations\copilot ci 
npm run copilot -- --help
npm run agency:copilot -- --help
npm run copilot:sdk -- --doctor
```

The native bridges reuse the installed runtime. SDK commands that send prompts require `--trust-profile`; the restricted query path is separate from production readiness.

## Documentation site commands

Run from the repository root:

```powershell
npm --prefix docs ci
npm --prefix docs run typecheck
npm --prefix docs run build
npm --prefix docs run start
```

## Active 720p Remotion/Python video adapter commands

These commands apply to the template or a generated project. They do not bypass agent-first gates.

Use `npm --prefix template ...` from the root or run commands inside a generated project.

| Command | Behavior |
| --- | --- |
| `npm --prefix template run build` | Typecheck and bundle the active Remotion template |
| `npm --prefix template run studio` | Start Remotion Studio for the active video template |
| `npm run studio` | Start Remotion Studio when already inside a generated project |
| `npm run render` | Render the `Video` composition when already inside a generated project |
| `npm run still` | Render a still image when already inside a generated project |

## Scaffolding

```powershell
node template\scripts\new_project.cjs <destination> <slug>
```

The destination must not already exist.

## Storyboard and checks

```powershell
python scripts\render_storyboard.py
python scripts\selfcheck.py
python scripts\motion_check.py <Gn> [options]
python scripts\motion_check.py --frames <directory> [options]
python scripts\frame_metrics.py [options]
```

Shared motion/frame options include `--frames`, `--storyboard`, `--shots`, `--step`, `--out`, `--rail-top`, and `--bg` where supported.

## Speech generation

```powershell
python scripts\tts_build.py [narration-path]
```

The default narration path is `script/narration.txt`.

## Model verification

```powershell
python scripts\verify_models.py \
  --onnx-model <model-path> \
  --onnx-voices <voices-path> \
  --output <directory> \
  <narration-path> [<narration-path> ...]
```

## Encoded video verification

```powershell
python scripts\verify_video.py <project> \
  --version <version> \
  --ffmpeg <ffmpeg-path> \
  --ffprobe <ffprobe-path>
```

## Audio alignment

```powershell
python scripts\align_audio.py <movie> <reference-wav> <output-movie> \
  --ffmpeg <ffmpeg-path>
```

The output must differ from the input and must not already exist.

## Remotion examples

```powershell
npx remotion still src\index.ts Overlay stills\title.png --frame=39
npx remotion render src\index.ts Video renders\pilot.mp4 --frames=0-899
```
