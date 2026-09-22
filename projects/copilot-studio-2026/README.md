# Copilot Studio 2026 production video

Completed source-grounded Remotion production for a 40.53-second English explainer.

## Contract

- Output target: 1920x1080, 30fps, 30-45 seconds.
- Language: English narration.
- Media policy: original code-drawn visuals only; no external logos, screenshots, stock footage, icons, or downloaded media.
- Outputs: versioned and non-overwriting under `renders/` and `qc/`.
- QC: timeline-driven media verification through `scripts/verify_video.py` after rendering.
- Approvals: do not fabricate or imply human approval. `human_listening_review` and `pilot_approval` remain pending unless a human explicitly supplies them.

## Production inputs and build

```powershell
npm run check:inputs
npm run audio
npm run typecheck
npx remotion bundle src/index.ts --out-dir build_production_next
```

- Grounding packet: `research/content-packet-2026-09-18/`
- Normalized narration/storyboard/timing: `script/`, `storyboard.md`
- Local narration engine: Windows System.Speech (`Microsoft Mark`, rate 3)
- Scene implementation: `src/ProductionVideo.tsx`

## Current review candidate

- Movie: `renders/copilot-studio-2026-v4.mp4`
- Candidate metadata: `qc/review-candidate-v4.json`
- Media verification: `qc/media-v4.json`
- Motion verification: `qc/motion-v4.txt`
- Frame metrics: `qc/frame-metrics-v4.md`
- Contact sheets: `qc/overview-v4.jpg`, `qc/SC01-v4.jpg` through `qc/SC06-v4.jpg`, and `renders/sheet_v4.html`

This is a review candidate only. Human listening review and pilot approval remain pending.
