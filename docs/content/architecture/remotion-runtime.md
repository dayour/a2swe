---
title: Remotion runtime
---

# Remotion runtime

## Composition registry

`src/index.ts` calls `registerRoot(Root)`. `Root.tsx` registers:

- `Video`: the complete production composition;
- `Overlay`: overlay-only inspection;
- `G1` through `G8`: isolated group previews.

The established template compositions use centralized dimensions and rate:
`W = 1280`, `H = 720`, and `FPS = 30`. The core release-candidate MP4 adapter
targets `1920x1080`, `30fps`, and `48 kHz` audio from `RenderSpec.video`; it is a
separate generated project surface and fails if those MP4 render requirements are
not met.

## Stage graph

`Main.tsx` owns the root render sequence. Conceptually:

```tsx
<Stage>
  <Fonts />
  <Audio />
  <Background />
  <FootageTrack />
  <Shots layer="below-progress" />
  <ProgressBar />
  <Shots layer="above-progress" />
  <Subtitles />
</Stage>
```

Actual shot ordering is controlled by each `ShotDef.layer`. Entries marked `aboveBar` render after the progress bar; all other entries render before it.

## Manifest assembly

The complete `Video` composition combines:

- overlay shots;
- group shots from `G1` through `G8`;
- background specifications;
- footage specifications;
- top-layer overlay shots.

This keeps scene creation declarative: a group exports timed manifests, while the shared stage handles global composition concerns.

## Asset resolution

Narration audio resolves from:

```text
public/assets/<VIDEO.slug>/audio.wav
```

The project slug is therefore both an editorial identifier and a runtime asset namespace. Changing it without moving the associated media breaks audio lookup.

Core-managed Remotion release candidates use the same namespace pattern under the
generated output project:

```text
public/assets/<ContentIR.contentId>/audio.wav
public/assets/<ContentIR.contentId>/<assetId>.<ext>
```

`speech/approved-narration.json` binds the approved narration text to the
`ContentIR` digest. `scripts/synthesize-audio.mjs` selects Python 3.14 from
`A2SWE_PYTHON` or the nearest `.venv`, then runs the generated local producer.
The producer supports only configured local Kokoro/Misaki or Kokoro ONNX model
paths. It does not install packages, download weights, call cloud speech, or
create placeholder audio.

`asset-manifest.json` lists the required digest-bound WAV and visual assets.
`scripts/render-mp4.mjs` invokes audio synthesis when the WAV or metadata is
missing or stale, then refuses to render if local Remotion dependencies,
FFmpeg/ffprobe, the narration WAV, exact audio duration, or any selected asset is
missing or mismatched.

## Background selection

`VIDEO.bg` selects the supported background system, including the dot-field and shared background track implementations. Time-windowed `BgSpec` entries can add stars and fog.

## Preview strategy

Use isolated group compositions for local scene development, `Overlay` for editorial UI checks, a 30-second `Video` frame range for the pilot, and the complete `Video` composition only after pilot approval.
