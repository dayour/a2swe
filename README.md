# a2swe

**Anything to SWE Agent: Expert Explainers.**

**Topic in, narrated explainer video out.** a2swe is an English-only production
skill for coding agents, backed by Remotion, React, and TypeScript. It turns a
topic or source document into a 1280x720, 30fps narrated motion-graphics video
with synchronized subtitles, chapters, and a progress bar.

A parallel domain-expert SWE track manages research, narration, timing,
storyboarding, implementation, rendering, QC, and delivery. Its knowledge,
decisions, approvals, and verified project state ship with the video and editable
sources in a companion artifact. This artifact supports revisions and follow-up
videos; it is not a trained model or a permanently running service.

This repository is a toolkit and agent workflow, not an installed desktop app or
an automatic topic-entry website. Remotion Studio is the local preview interface.
The starter contains placeholder compositions, not a finished video.

## Install and Build

Use Node.js 18 or newer and Python 3.14 (tested on Windows x64 with 3.14.7).
The repository pins the interpreter in `.python-version` and all Python packages
in `template/requirements.lock.txt`. FFmpeg and ffprobe are required for audio
conversion and final media inspection; make both available on PATH.

```powershell
npm --prefix template ci
npm --prefix template run build
uv python install 3.14.7
uv venv --python 3.14.7 .venv --seed
.\.venv\Scripts\python.exe -m pip install -r template/requirements.lock.txt
.\.venv\Scripts\python.exe template/scripts/test_pipeline.py -v
npm --prefix template run studio -- --port 3100
```

`build` runs TypeScript validation and creates the static production bundle in
`template/build_production`. It does not synthesize narration or render a movie.
Open the Studio URL printed by the command. Use another port if occupied.

To make the skill discoverable, place or link this repository in your coding
agent's supported skill directory as `a2swe`, or explicitly ask the agent to read
[SKILL.md](SKILL.md). Skill registration is separate from dependency installation.

## Produce a Video

Ask your coding agent: "Create a 30-second English explainer about vector databases."
Follow [SKILL.md](SKILL.md) and [the production rules](reference/production-rules.md).

1. Scaffold a separate project from the template and initialize its companion ledger.
2. Research claims using primary sources and record source URLs and access dates.
3. Approve narration and the voice engine, then generate audio and frame timing.
4. Write the storyboard, shared overlays, and first shot group.
5. Render and approve a 30-second pilot before building remaining shot groups.
6. Render the full movie, inspect audio and frames, fix defects, and deliver evidence.

On macOS/Linux, the existing scaffold and render wrappers require zsh and rsync:

```bash
template/scripts/new_project.sh ~/work/my-video my-video
```

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
`TTS_ENGINE=auto` uses local Piper, installed with the locked dependencies.
Set `PIPER_MODEL` to a licensed English voice `.onnx` file with its accompanying
`.onnx.json` configuration. Voice models are not bundled. Edge is an explicit
alternative; activate the environment before running project scripts:

```powershell
$env:TTS_ENGINE = 'edge'
$env:VOICE = 'en-US-AndrewNeural'
.\.venv\Scripts\Activate.ps1
python scripts/tts_build.py
```

Run the script from the generated project after activating the repository environment.
Edge sends the approved narration to Microsoft's speech endpoint. Supplied audio
with a matching timeline is also supported.No cloud fallback happens automatically.


## Deliverables and Reuse

Each release includes the H.264 MP4, full source project, sourced research,
approved narration, timing, storyboard, QC evidence, asset manifest, delivery
notes, and populated [companion starter](template/agent/SWE_AGENT.md).

For revisions, the next session reads the delivered companion, verifies files,
refreshes facts, and resumes at the earliest affected stage. Narration edits need
new approval and timing. Follow-ups use separate projects and approval ledgers,
while reusing verified knowledge and licensed primitives with provenance.

## Content and Assets

See [BRAND_CONTENT_SPEC.md](BRAND_CONTENT_SPEC.md) for identity, media, language,
and acceptance requirements. The former non-English sample archive and its 36
reference JPEGs are retired. The active template draws original diagrams in code.
Optional footage requires a source, license, SHA-256, and usage manifest.

The original visual vocabulary was inspired by the Douyin creator Tuling Yuzhou.
No frames or clips from that creator are bundled. The existing black canvas,
white line art, accent highlights, and two backdrop choices remain available.

## Licensing and Limits

The prior README claimed PolyForm Noncommercial terms, but this checkout has no
root license text. Resolve toolkit licensing before redistribution or commercial
use; this README does not grant new rights. Bundled fonts retain their separate
[OFL notices](template/public/fonts/LICENSE.md). Remotion has its own
[licensing terms](https://remotion.dev/license).

The layout targets landscape 720p only. A successful bundle is not a finished
film or a passing visual QC result. Allow at least 5GB free space for production,
and bound parallel renders to available CPU and memory.
