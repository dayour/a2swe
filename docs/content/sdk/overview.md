---
title: SDK overview
---

# SDK overview

The a2swe SDK is the collection of reusable TypeScript visual modules, declarative manifests, Python media utilities, scaffold contracts, artifact formats, and the Copilot SDK integration used to operate against an existing project. It is source-level rather than a published package.

## Copilot SDK integration

The repository includes a first-class GitHub Copilot SDK integration under
`integrations/copilot/`. It is separate from the retained native Agency wrapper:

| Command | Purpose | Runtime behavior |
| --- | --- | --- |
| `node integrations/copilot/session.ts --help` | Show the SDK session interface | Does not start a session |
| `node integrations/copilot/session.ts --capabilities` | Report supported a2swe SDK controls | Works without probing a native executable; reports when native help was not probed |
| `node integrations/copilot/session.ts --doctor` | Start the SDK runtime and report auth/status/session count | Requires an authenticated Copilot runtime |
| `node integrations/copilot/session.ts --sessions` | List persisted Copilot SDK sessions | Requires an authenticated Copilot runtime |
| `node integrations/copilot/session.ts --catalogs` | List agents, skills, and plugins discovered by the runtime | Requires an authenticated Copilot runtime |
| `node integrations/copilot/session.ts --prompt "..."` | Create a SDK session and wait for the answer | Requires an authenticated Copilot runtime |
| `node integrations/copilot/cli.ts -- --help` | Forward literal arguments to a native Copilot executable | Requires an existing executable |
| `node integrations/copilot/cli.ts --runtime agency -- --help` | Forward literal arguments through the native Agency launcher | Requires an existing Agency executable |

SDK sessions default to the Copilot SDK runtime connection. Use
`--cli`, `A2SWE_COPILOT_CLI`, or `COPILOT_CLI_PATH` only when you need to force an
existing Copilot executable. Native passthrough commands still require an existing
executable because they forward arguments directly rather than creating SDK
sessions.

The SDK path is verified by the integration typecheck and the non-live tests. Live
prompt, doctor, session, and catalog commands are intentionally not claimed as
complete until run in an authenticated environment.

When invoking through npm 11, pass an extra separator before SDK flags, for
example `npm run copilot:sdk -- -- --capabilities`; otherwise npm treats unknown
flags as npm configuration before the script sees them.

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
