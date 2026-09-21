# Copilot Studio 2026 production video

Fresh isolated Remotion/Python project scaffolded from the improved `template` package.

## Contract

- Output target: 1920x1080, 30fps, 30-45 seconds.
- Language: English narration.
- Media policy: original code-drawn visuals only; no external logos, screenshots, stock footage, icons, or downloaded media.
- Outputs: versioned and non-overwriting under `renders/` and `qc/`.
- QC: timeline-driven media verification through `scripts/verify_video.py` after rendering.
- Approvals: do not fabricate or imply human approval. `human_listening_review` and `pilot_approval` remain pending unless a human explicitly supplies them.

## Required external inputs

Another agent may provide these files before production can continue:

- `research/research.md` or `research/sources.json` with verified Copilot Studio 2026 claims and source traceability.
- `script/narration.txt` replaced with final English narration, not the placeholder comments in this scaffold.
- Optional `script/storyboard_src.md` if beat-specific visuals are supplied.

Run:

```powershell
npm run check:inputs
```

If inputs are missing, the command writes a versioned dependency report under `qc/` and exits non-zero. Only after the inputs exist should production proceed with:

```powershell
npm run audio
npm run build
npm run render
```
