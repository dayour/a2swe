---
title: SDK overview
---

# SDK overview

The a2swe SDK is the collection of reusable TypeScript visual modules, declarative manifests, Python media utilities, scaffold contracts, and artifact formats in the template. It is source-level rather than a published package.

## TypeScript surface

The stable authoring surfaces are:

- `VIDEO`, `HudEntry`, and `RailSpec` in `src/config.ts`;
- `ShotDef` and `BgSpec` in `src/common/types.ts`;
- `TOTAL_FRAMES`, `CHAPTER_STARTS`, `Sentence`, and `SENTENCES` in `src/common/timeline.ts`;
- `SUBS` in `src/common/subs.ts`;
- common animation, typography, and drawing primitives;
- overlay manifests;
- group manifests under `src/shots/G*/`.

## Python surface

The project scripts expose command-line workflows for:

- scaffolding a project;
- generating speech;
- building and validating timing;
- checking model readiness;
- aligning encoded audio;
- validating rendered media;
- running pipeline tests.

See the [Python SDK](./python.md) and [command-line reference](../reference/command-line.md).

## Compatibility contract

A generated project should preserve:

1. the registered composition names used by render commands;
2. centralized dimensions and frame rate;
3. the `VIDEO.slug` asset namespace;
4. the shot/background manifest shapes;
5. sentence-driven overlay timing;
6. the project artifact layout expected by scripts and delivery checks.

## Reuse model

Prefer extending the template with reusable primitives, then consuming them through project configuration and manifests. Avoid editing identical runtime files independently across every project unless the project intentionally forks the runtime behavior.
