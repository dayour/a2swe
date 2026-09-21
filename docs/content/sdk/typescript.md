---
title: TypeScript SDK
---

# TypeScript SDK

## Manifest types

### `ShotDef`

A declarative component window:

```ts
type ShotDef = {
  id: string;
  from: number;
  to: number;
  Comp: React.ComponentType;
  layer?: 'aboveBar';
};
```

`id` should be unique and stable for diagnostics. `from` and `to` are frame boundaries. `layer` controls whether the shot renders before or after the global progress bar.

### `BgSpec`

A time-windowed background instruction:

```ts
type BgSpec = {
  from: number;
  to: number;
  stars?: boolean;
  fog?: boolean;
};
```

## Project configuration

`VIDEO` is the main content and presentation configuration. It carries the project slug, title material, language metadata, background mode, chapters, HUD entries, rails, ending behavior, and credits. The exact object should remain serializable and deterministic.

`HudEntry` and `RailSpec` model repeated overlay content. Authors should update these objects instead of hard-coding project text into shared overlay components.

## Timeline exports

```ts
export const TOTAL_FRAMES: number;
export const CHAPTER_STARTS: number[];
export type Sentence = /* generated sentence timing shape */;
export const SENTENCES: Sentence[];
```

`SENTENCES` is consumed by overlay logic to derive narrative windows. `CHAPTER_STARTS` aligns chapter cards and navigation overlays. `TOTAL_FRAMES` controls every registered composition duration.

## Common numeric helpers

| Export | Use |
| --- | --- |
| `clamp` | Restrict a value to a bounded interval |
| `lerp` | Linear interpolation between values |
| `keyframes` | Evaluate piecewise frame-based animation values |
| `stepHold` | Hold stepped values over defined windows |
| `DirBlur` | Apply directional blur presentation |
| `Fonts` | Load bundled font resources |

## Composition exports

`Stage` accepts the assembled visual tracks and implements global ordering. `Video` binds the current project manifests to `Stage`. Overlay exports include title, chapter, HUD, rail, and ending components plus their derived manifest arrays.

## Example shot

```tsx
const ExplainVector = () => {
  const frame = useCurrentFrame();
  const opacity = interpolate(frame, [0, 12], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  return <AbsoluteFill style={{opacity}}>Vector embedding</AbsoluteFill>;
};

export const SHOTS: ShotDef[] = [
  {id: 'g2-vector', from: 360, to: 510, Comp: ExplainVector},
];
```

Use project-relative frames consistently with the group manifest convention.
