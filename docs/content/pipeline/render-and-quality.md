---
title: Render and quality control
---

# Render and quality control

## Build checks

```powershell
npm run typecheck
python scripts\selfcheck.py
python scripts\render_storyboard.py
```

Run commands from the generated project unless otherwise noted.

## Render

```powershell
npx remotion render src\index.ts Video renders\<slug>-v2.mp4
```

Use versioned outputs and preserve the released original. Extract or render frame sequences for visual QC.

## Motion checks

`motion_check.py` can render a named group or consume an existing frame directory. It reports stillness and hold behavior per shot.

```powershell
python scripts\motion_check.py G2 --out qc\motion-g2.md
python scripts\motion_check.py --frames fin_frames --out qc\motion.md
```

The checker flags low mean-frame differences and extended holds; frame-directory mode can add changed-pixel classification.

## Frame metrics

`frame_metrics.py` evaluates shot windows for hero scale, glow, color fragments, background fragments, and long still runs.

```powershell
python scripts\frame_metrics.py --frames fin_frames --out qc\frame-metrics.md
```

Metrics guide inspection; they do not replace watching the movie.

## Encoded media verification

`verify_video.py` validates the expected pilot contract: H.264, 1280×720, 30 fps, 900 frames, AAC 48 kHz stereo, audio correlation above 0.98, lag no greater than 1024 samples, nonclipped audio, complete frames, and nonblank sampled scenes.

```powershell
python scripts\verify_video.py . --version v2 --ffmpeg <ffmpeg> --ffprobe <ffprobe>
```

It writes a media JSON report and visual contact sheets under `qc/`.

## Audio alignment

Use `align_audio.py` only for a small measured encoder offset. It requires similarity above 0.98 and an absolute offset under 0.1 seconds, refuses destructive output paths, remuxes with FFmpeg, and emits an alignment sidecar.

## Human review

Watch the entire result with audio. Verify transitions, facts, text, subtitle readability, motion continuity, asset use, and ending behavior. Repair defects, rerender, and rerun affected checks.
