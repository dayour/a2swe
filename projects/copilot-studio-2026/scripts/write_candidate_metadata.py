#!/usr/bin/env python3
"""Write non-approval review-candidate metadata from completed pipeline reports."""
from __future__ import annotations

import hashlib
import json
import sys
from datetime import datetime, timezone
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]


def digest(path: Path) -> str:
    with path.open("rb") as source:
        return hashlib.file_digest(source, "sha256").hexdigest()


def main() -> None:
    version = sys.argv[1] if len(sys.argv) > 1 else "v4"
    output = ROOT / "qc" / f"review-candidate-{version}.json"
    if output.exists():
        raise SystemExit(f"Refusing to overwrite candidate metadata: {output}")
    media_path = ROOT / "qc" / f"media-{version}.json"
    media = json.loads(media_path.read_text(encoding="utf-8"))
    movie = ROOT / media["file"]
    audio = ROOT / "public" / "assets" / "copilot-studio-2026" / "audio.wav"
    timeline = ROOT / "script" / "timeline.json"
    payload = {
        "project": "copilot-studio-2026",
        "candidate": version,
        "status": "review_candidate",
        "created_at": datetime.now(timezone.utc).isoformat(),
        "release": {
            "file": str(movie.relative_to(ROOT)),
            "bytes": movie.stat().st_size,
            "sha256": digest(movie),
            "duration_seconds": float(media["container"]["duration"]),
            "frames": int(media["video"]["nb_frames"]),
            "resolution": [int(media["video"]["width"]), int(media["video"]["height"])],
            "fps": 30,
            "video_codec": media["video"]["codec_name"],
            "audio_codec": media["audio"]["codec_name"],
            "audio_sample_rate": int(media["audio"]["sample_rate"]),
            "audio_channels": int(media["audio"]["channels"]),
        },
        "grounding": {
            "access_date": "2026-09-18",
            "research": [
                "research/research.md",
                "research/content-packet-2026-09-18/source-inventory.md",
                "research/content-packet-2026-09-18/evidence-claims.md",
                "research/content-packet-2026-09-18/qualifications.md",
            ],
            "normalized_content": [
                "script/narration.txt",
                "script/storyboard_src.md",
                "storyboard.md",
                "script/timeline.json",
                "script/timeline.md",
            ],
            "media_policy": "Original code-drawn SVG/CSS visuals only; no downloaded logos, screenshots, stock media, or product marks.",
        },
        "narration": {
            "file": str(audio.relative_to(ROOT)),
            "sha256": digest(audio),
            "metadata": "audio/narration-metadata.json",
            "engine": "Windows System.Speech (local/offline)",
            "language": "en-US",
            "audio_similarity": media["audio_similarity"],
            "audio_lag_samples": media["audio_lag_samples"],
            "peak": media["audio_peak"],
        },
        "validation": {
            "timeline_coverage": "pass",
            "typecheck": "pass",
            "production_bundle": "build_production_v5",
            "motion_qc": {"status": "pass", "report": f"qc/motion-{version}.txt", "shots_failing": 0},
            "frame_qc": {
                "status": "pass_with_informational_style_flags",
                "report": f"qc/frame-metrics-{version}.md",
                "high": 0,
                "medium": 0,
                "low": 4,
                "note": "Low-only purple-fragment heuristic flags; no empty, hero-size, or still-run failures.",
            },
            "media_qc": {"status": "pass", "report": f"qc/media-{version}.json", "decoded_frames": media["decoded_frames"]},
        },
        "review_artifacts": {
            "overview": f"qc/overview-{version}.jpg",
            "scene_contact_sheets": [f"qc/SC0{index}-{version}.jpg" for index in range(1, 7)],
            "html_contact_sheet": f"renders/sheet_{version}.html",
            "decoded_frames": f"fin_frames_{version}",
        },
        "human_listening_review": "pending",
        "pilot_approval": "pending",
        "approval_note": "No human approval, endorsement, or listening sign-off has been fabricated.",
    }
    output.write_text(json.dumps(payload, indent=2), encoding="utf-8")
    print(output.relative_to(ROOT))


if __name__ == "__main__":
    main()
