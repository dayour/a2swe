---
title: Remotion runtime
---

# Remotion runtime

## Composition registry

`src/index.ts` calls `registerRoot(Root)`. `Root.tsx` registers:

- `Video`: the complete production composition;
- `Overlay`: overlay-only inspection;
- `G1` through `G8`: isolated group previews.

All compositions use centralized dimensions and rate: `W = 1280`, `H = 720`, and `FPS = 30`. Their duration derives from `TOTAL_FRAMES`.

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

## Background selection

`VIDEO.bg` selects the supported background system, including the dot-field and shared background track implementations. Time-windowed `BgSpec` entries can add stars and fog.

## Preview strategy

Use isolated group compositions for local scene development, `Overlay` for editorial UI checks, a 30-second `Video` frame range for the pilot, and the complete `Video` composition only after pilot approval.
