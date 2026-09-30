---
title: TypeScript SDK
---

# TypeScript SDK

This page covers both the project authoring API and the repository's GitHub
Copilot SDK integration. The Copilot integration is not a generated video
runtime; it is the TypeScript bridge in `integrations/copilot/` that lets a2swe
start, resume, inspect, and constrain SDK-driven assistant sessions.

## Copilot SDK bridge

The bridge uses `@github/copilot-sdk` and has two runtime modes:

- SDK session mode (`npm run copilot:sdk`) creates or resumes Copilot SDK
  sessions. It defaults to the SDK runtime connection and no longer requires a
  preinstalled `copilot` executable for the non-native SDK path.
- Native passthrough mode (`npm run copilot` and `npm run agency:copilot`)
  forwards arguments to an existing executable without a shell. This is for
  native CLI behavior and remains intentionally separate from SDK sessions.

Direct `node integrations/copilot/session.ts ...` invocations are the clearest
way to pass flags. With npm 11, use an extra separator such as
`npm run copilot:sdk -- -- --capabilities`.

SDK session options:

| Option | Behavior |
| --- | --- |
| `--capabilities` | Prints a JSON description of the integration. When no executable is configured, native command/option probing is reported as `not_probed_sdk_default_runtime` rather than fabricated. |
| `--doctor` | Starts the SDK client and reports authentication, status, session count, permissions mode, and managed-policy handling. |
| `--sessions` | Lists persisted SDK sessions. |
| `--catalogs` | Lists runtime-discovered agents, skills, and plugins. |
| `--prompt TEXT` | Creates or resumes a session and waits for the final assistant message. |
| `--resume ID` | Resumes a stored SDK session ID. |
| `--permissions auto\|ask\|deny` | Controls the SDK permission handler. `auto` still rejects managed-policy-required requests instead of bypassing policy. |
| `--cli PATH` | Overrides the SDK default runtime with an absolute existing Copilot executable. |
| `--runtime-home DIR` | Sets the Copilot base directory used for session/config state. |
| `--cwd DIR` | Sets the session working directory. |

Known limitations:

- The SDK bridge does not implement live attachments.
- `ask` permissions need an interactive terminal.
- The non-live test suite verifies option shaping, permission behavior, runtime
  resolution, and native argument forwarding. Authenticated prompt execution must
  be verified in the target environment before documenting a specific deployment
  as operational.

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
