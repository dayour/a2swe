# a2swe

**Anything to SWE Agent: Domain Specific Workforce Explainers.**

**Domain SWE agent first; executive explainers from relevant knowledge available.**
a2swe is an English-only, agent-first toolkit for companies, topics,
frameworks, repositories, and tools. Public evidence, engineering context, and
verified brand assets must ground an independently evaluated domain agent before
it directs videos, editable presentations, and briefings.

Only recent knowledge from reputable sources from the preceding nine calendar
months. Older foundational sources need explicit review and revalidation;
retrieval dates are not publication dates. See the
[agent-first build specification](docs/AGENT_FIRST_BUILD_SPEC.md) and
[context map](docs/audit/CONTEXT_MAP.md) for scope and implementation status.

The current product uses swe agent architecture with several coordinated surfaces that need to be unified:

- **Core orchestration:** passive inventory, schema validation, draft intake, and
  a local `.a2swe/` SQLite job/artifact store. This is the authority for runtime
  state, receipts, and verified artifact records.
- **Evaluation-only asset proof:** durable generation of synthetic 1080p raster
  proofs for engineering validation. These proofs are not subject media, brand
  approval, or production authorization.
- **Active 720p Remotion/Python video adapter:** the established renderer,
  React compositions, speech/timing scripts, QC tools, and verified pilots. It is
  an actively enhanced production video path and a target adapter for the
  agent-first system, not evidence that all new gates or five-format outputs are
  complete.
- **Local release-candidate adapter foundation:** initial approval-gated
  HTML, AdaptiveDeck, PPTX, DOCX, searchable PDF, and Remotion project/render-plan
  outputs consume the same approved ContentIR/RenderSpec. The Remotion release
  adapter does not yet claim an encoded MP4.
- **Target executive adapter set:** narrated MP4, editable PPTX, searchable PDF,
  responsive HTML/AdaptiveDeck, and DOCX should continue to share the same
  evidence graph rather than fork into separate products.

The Copilot SDK integration
reuses the installed CLI, user authentication, profile and sessions; live inference
and cross-process resume have passed. Native Copilot and Agency bridges preserve
their agents, tools and plugins. The restricted evidence-query adapter remains
separate. ACP/MCP, sandboxed
SWE execution with full five-format asset generation remains unfinished. 

See the [visual asset pipeline](docs/VISUAL_ASSET_PIPELINE.md) for commands,
security boundaries, observed blockers and the remaining implementation work.
Generate three real synthetic 1080p proofs with `npm run assets:proof`

a2swe is a complete apim toolkit and agent workflow and should have tauri native windows de4sktop app. Remotion Studio is the local preview interface.


## Agent Core

Use Node 24.8 or newer in the Node 24 line. The root workspace is independent of
the existing template and documentation-site dependency locks.

```powershell
npm ci --ignore-scripts
npm run build
npm run contracts:check
npm test
npm run build:all
npm run test:all
npm run validate:all
npm run a2swe -- capabilities
npm run a2swe -- inventory --root library --source library --kind repository --out .a2swe/inventory/library.json
npm run a2swe -- domain-init --id john-deere --name "John Deere" --kind company --as-of 2026-09-17
```

Intake creates a draft with explicit grounding gaps, not a ready agent. Inventory
never executes or enables imported code. Local state, integrity keys, inventories,
draft packs, durable job receipts, and verified asset records live in the ignored
`.a2swe/` directory. `agent/SWE_AGENT.md` is a portable human-readable projection
for scaffolded video projects, not the authoritative runtime database. This is a
trusted local-user runtime, not a network-authenticated service or OS sandbox.
Node's built-in SQLite API is experimental in the pinned runtime; the warning is
not suppressed.

## Existing Copilot Profile

Use your existing Copilot or Agency CLI, including native permissions, agents,
plugins, skills, MCP configuration and session commands:

```powershell
npm run copilot -- --help
npm run agency:copilot -- --help
npm run copilot -- --resume
npm run agency:copilot -- --agent dayour-dev
```

For SDK sessions, install only the lightweight integration, not another runtime:

```powershell
npm --prefix integrations/copilot ci 
npm run copilot:sdk -- --capabilities
npm run copilot:sdk -- --doctor
npm run copilot:sdk -- --catalogs
npm run copilot:sdk -- --prompt "Review this repository"
npm run copilot:sdk -- --permissions ask --prompt "Review this repository"
```

Defaults use `COPILOT_HOME` or your user home `.copilot` directory and the calling
workspace. Normal SDK sessions automatically approve tool requests without
terminal prompts, subject to managed-policy restrictions. Use `--permissions ask`
or `--permissions deny` to override; `--trust-profile` is accepted for compatibility
but no longer required. Configured plugins, hooks, MCP servers and tools execute
with your OS-user access, not in a sandbox. Automatic tool permission is not
editorial or release approval. The restricted evidence-query profile remains
no-tools. `--capabilities` reports the selected CLI's version and advertised
features without authentication or inference, with auto-updates disabled. Agency is
supported through its native CLI, not SDK headless transport. See
[profile options, session resume and safety boundaries](docs/VISUAL_ASSET_PIPELINE.md#existing-copilot-profile).

## Install and Build

Use Node.js 24 and Python 3.14 (tested on Windows x64 with Node 24.8.0 and Python 3.14.7).
The repository pins the interpreter in `.python-version` and all Python packages
in `template/requirements.lock.txt`. SoundFile and SciPy decode/resample narration.
FFmpeg and ffprobe are needed for encoded-media QC; the Windows Remotion package
includes suitable binaries. Local wheel paths resolve from the template directory.

```powershell
npm --prefix template ci
npm --prefix template run build
uv python install 3.14.7
uv venv --python 3.14.7 .venv --seed
Push-Location template
..\.venv\Scripts\python.exe -m pip install -r requirements.lock.txt
Pop-Location
.\.venv\Scripts\python.exe template/scripts/test_pipeline.py -v
npm --prefix template run studio -- --port 3100
```

`build` runs TypeScript validation and creates the static production bundle in
`template/build_production`. It does not synthesize narration or render a movie.
Open the Studio URL printed by the command. Use another port if occupied.

To make the skill discoverable, place or link this repository in your coding
agent's supported skill directory as `a2swe`, or explicitly ask the agent to read
[SKILL.md](SKILL.md). Skill registration is separate from dependency installation.

First-party reusable entries under `library/` are local discovery aids, not
approval or execution authority:

- `library/agents/a2swe-conductor.agent.md` coordinates validated a2swe project
  transitions.
- `library/skills/a2swe/SKILL.md` inspects and resumes runbook-based projects.
- `library/plugins/a2swe/` packages the local conductor, skill, and pending
  runbook starter asset for compatible hosts.
- `library/assets/runbook/runbook-starter.json` seeds scaffolded runbooks with
  all gates pending.

Indexing any of these files does not install a backend, grant credentials,
approve DomainReady status, or prove that a renderer or release format is
available.

## Documentation Website

The [Docusaurus site source](docs/) describes the core orchestration,
ContentIR/RenderSpec contracts, active Remotion/Python video adapter, and planned
format adapters as one system. Run the site locally with:

```powershell
npm --prefix docs ci
npm --prefix docs run start
```

Build the static GitHub Pages site with `npm --prefix docs run typecheck` and
`npm --prefix docs run build`. Pushes that
change `docs/` on `main` deploy through `.github/workflows/docs-pages.yml` to
`https://dayour.github.io/a2swe/` after GitHub Pages is configured for Actions.

## Active 720p Remotion/Python Video Adapter

Ask your coding agent: "Create a 30-second English explainer about vector databases."
Follow [SKILL.md](SKILL.md) and [the production rules](reference/production-rules.md).

For new agent-first production, first obtain a verified domain version and its
independent/human approvals. Core production submission currently fails closed.
Direct Remotion/Python scripts do not enforce the new state machine and must not
be used to bypass those gates. The following documents the established video
adapter workflow.

1. Create new projects from the template and initialize its companion ledger.
2. Research anything-topic using primary sources and record source URLs and access dates.
3. Write the storyboard, shared overlays, and first shot group.
4. Generate audio voiceover narration first and iterate the voice engine, then generate audio and frame timing.
5. Render and approve a 30-second pilot before building remaining shot groups.
6. Render the full movie, inspect audio and frames, fix defects, and deliver evidence.


On Windows, scaffold a new directory without zsh or rsync:

```powershell
node template/scripts/new_project.cjs projects/my-video my-video
```

The scaffold copies the companion and production rules, excludes generated
outputs, installs locked dependencies, and typechecks. It refuses to overwrite
an existing directory. Direct Remotion CLI commands also work without zsh:

```powershell
npx remotion still src/index.ts Overlay stills/title.png --frame=39
npx remotion render src/index.ts Video renders/pilot.mp4 --frames=0-899
```

The video render requires project-specific narration, timing, and shots first.

## Four Checkpoints

- Duration, audience, and scope before writing narration.
- Full narration sign-off before synthesis.
- Voiceover choice and external speech-service disclosure before synthesis.
- First 30 seconds before remaining shot groups are built.

English is fixed; there is no language-selection step. On Python 3.14,
`TTS_ENGINE=auto` uses the locally upgraded Kokoro stack. The lock includes wheel
snapshots built from the local Misaki, Kokoro and Kokoro ONNX repositories, plus
the English spaCy model. Full Kokoro downloads model/voice weights from Hugging Face
when not cached. ONNX requires `KOKORO_ONNX_MODEL` and `KOKORO_ONNX_VOICES` paths.
Piper remains optional with `PIPER_MODEL` and its matching JSON configuration.
Model licenses apply separately; model weights are not bundled. Edge is an explicit
alternative; activate the environment before running project scripts:

```powershell
$env:TTS_ENGINE = 'edge'
$env:VOICE = 'en-US-AndrewNeural'
.\.venv\Scripts\Activate.ps1
python scripts/tts_build.py
```

Run the script from the generated project after activating the repository environment.
Edge sends the approved narration to Microsoft's speech endpoint. Supplied audio
with a matching timeline is also supported. No cloud fallback happens automatically.

## Verified 720p Video Pilots

Full-script inference samples from
both local Kokoro engines and Misaki phoneme evidence are in `qc/models/`.
Run `scripts/verify_models.py --help` from a generated project to repeat that check.
Use `scripts/align_audio.py` to measure and correct small AAC encoder offsets,
then `scripts/verify_video.py` to validate the encoded output against its WAV.
Subjective voice/pacing approval remains a human gate, not an automated pass.
On a disk-constrained machine set `REMOTION_CACHE=0`; use
`REMOTION_BROWSER_EXECUTABLE` to share an existing Chromium installation.

## Deliverables and Reuse

Each release includes the H.264 MP4, full source project, sourced research,
approved narration, timing, storyboard, QC evidence, asset manifest, delivery
notes, and populated [companion starter](template/agent/SWE_AGENT.md).



## Content and Assets

Create a brand spec doc for relevant content in scratchpad [BRAND_CONTENT_SPEC.md](BRAND_CONTENT_SPEC.md) for identity, media, language,
and acceptance requirements for each a2swe. The former non-English sample archive and its 36
reference JPEGs are retired. The active template draws original diagrams in code.
Evaluation asset bundles generated by the core include request, asset, raster, and
manifest records are not intended for distribution.



## Licensing and Limits

Bundled fonts retain their separate
[OFL notices](template/public/fonts/LICENSE.md). Remotion has its own
[licensing terms](https://remotion.dev/license).

The layout targets all popular video formasts. A successful bundle is not a finished
film or a passing visual QC result. Allow at least 5GB free space for production,
and bound parallel renders to available CPU and memory.
