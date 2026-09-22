#!/usr/bin/env python3
"""Build deterministic local English narration and Remotion timing with Windows SAPI."""
from __future__ import annotations

import array
import audioop
import hashlib
import json
import os
import re
import subprocess
import sys
import wave
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
SLUG = "power-platform-2026"
FPS = 30
SAMPLE_RATE = 48_000
LEAD_FRAMES = 24
GAP_FRAMES = 10
TAIL_FRAMES = 45
VOICE = os.environ.get("SAPI_VOICE", "Microsoft Mark")
RATE = int(os.environ.get("SAPI_RATE", "4"))


def parse_narration(path: Path) -> tuple[list[dict], list[dict]]:
    chapter = 0
    chapters: list[dict] = []
    sentences: list[dict] = []
    for raw in path.read_text(encoding="utf-8").splitlines():
        line = raw.strip()
        if not line:
            continue
        match = re.match(r"^#\s*CHAPTER\s+(\d+)\s+(.*)$", line)
        if match:
            chapter = int(match.group(1))
            chapters.append({"n": chapter, "title": match.group(2).strip()})
            continue
        if line.startswith("#"):
            continue
        if re.search(r"[\u3400-\u9fff]", line):
            raise SystemExit("English-only narration is required")
        chunks = [part.strip() for part in line.split("|") if part.strip()]
        if chunks:
            sentences.append({"chapter": chapter, "chunks": chunks, "text": " ".join(chunks)})
    if not sentences:
        raise SystemExit("Narration must contain at least one sentence")
    return chapters, sentences


def synthesize(text: str, output: Path) -> None:
    output.parent.mkdir(parents=True, exist_ok=True)
    env = os.environ.copy()
    env.update({"SAPI_TEXT": text, "SAPI_OUT": str(output), "SAPI_VOICE": VOICE, "SAPI_RATE": str(RATE)})
    command = (
        "Add-Type -AssemblyName System.Speech; "
        "$s=New-Object System.Speech.Synthesis.SpeechSynthesizer; "
        "$s.SelectVoice($env:SAPI_VOICE); $s.Rate=[int]$env:SAPI_RATE; "
        "$s.SetOutputToWaveFile($env:SAPI_OUT); $s.Speak($env:SAPI_TEXT); $s.Dispose()"
    )
    completed = subprocess.run(
        ["powershell", "-NoProfile", "-NonInteractive", "-Command", command],
        env=env,
        capture_output=True,
        text=True,
    )
    if completed.returncode:
        raise SystemExit(f"SAPI narration failed: {(completed.stderr or completed.stdout).strip()}")


def read_pcm(path: Path) -> tuple[bytes, int]:
    with wave.open(str(path), "rb") as source:
        if source.getsampwidth() != 2:
            raise SystemExit(f"Expected 16-bit SAPI audio: {path}")
        data = source.readframes(source.getnframes())
        channels = source.getnchannels()
        if channels == 2:
            data = audioop.tomono(data, 2, 0.5, 0.5)
        elif channels != 1:
            raise SystemExit(f"Unsupported SAPI channel count {channels}: {path}")
        return data, source.getframerate()


def trim_and_resample(data: bytes, rate: int) -> bytes:
    samples = array.array("h")
    samples.frombytes(data)
    threshold = 120
    active = [index for index, value in enumerate(samples) if abs(value) >= threshold]
    if not active:
        raise SystemExit("SAPI returned silent narration")
    start = max(0, active[0] - int(rate * 0.025))
    end = min(len(samples), active[-1] + int(rate * 0.10))
    mono = samples[start:end].tobytes()
    if rate != SAMPLE_RATE:
        mono, _ = audioop.ratecv(mono, 2, 1, rate, SAMPLE_RATE, None)
    return mono


def frames_for_bytes(data: bytes) -> int:
    return round(len(data) / 2 / SAMPLE_RATE * FPS)


def main() -> None:
    narration = Path(sys.argv[1]) if len(sys.argv) > 1 else ROOT / "script" / "narration.txt"
    chapters, source_sentences = parse_narration(narration)
    cache = ROOT / "audio" / "sapi-cache"
    cache.mkdir(parents=True, exist_ok=True)

    rendered: list[bytes] = []
    for sentence in source_sentences:
        digest = hashlib.sha256(f"{VOICE}|{RATE}|{sentence['text']}".encode()).hexdigest()[:16]
        raw = cache / f"{digest}.wav"
        if not raw.exists():
            synthesize(sentence["text"], raw)
        data, rate = read_pcm(raw)
        rendered.append(trim_and_resample(data, rate))

    cursor = LEAD_FRAMES
    timeline_sentences: list[dict] = []
    chapter_starts: dict[int, int] = {}
    for index, (sentence, audio) in enumerate(zip(source_sentences, rendered), 1):
        start = cursor + 1
        duration_frames = max(1, frames_for_bytes(audio))
        end = start + duration_frames - 1
        chapter_starts.setdefault(sentence["chapter"], start)
        chunks = sentence["chunks"]
        weights = [max(1, len(re.sub(r"\s+", "", chunk))) for chunk in chunks]
        total_weight = sum(weights)
        boundaries = [start]
        consumed = 0
        for weight in weights[:-1]:
            consumed += weight
            boundaries.append(start + round(duration_frames * consumed / total_weight))
        boundaries.append(end + 1)
        subs = [
            {"from": boundaries[i], "to": max(boundaries[i], boundaries[i + 1] - 1), "text": chunk}
            for i, chunk in enumerate(chunks)
        ]
        timeline_sentences.append(
            {
                "id": f"S{index:02d}",
                "chapter": sentence["chapter"],
                "from": start,
                "to": end,
                "text": sentence["text"],
                "subs": subs,
            }
        )
        cursor = end + GAP_FRAMES

    total_frames = cursor - GAP_FRAMES + TAIL_FRAMES
    mono = bytearray(total_frames * SAMPLE_RATE // FPS * 2)
    for sentence, audio in zip(timeline_sentences, rendered):
        offset = (sentence["from"] - 1) * SAMPLE_RATE // FPS * 2
        mono[offset : offset + len(audio)] = audio
    peak = audioop.max(bytes(mono), 2)
    if not peak:
        raise SystemExit("Narration mix is silent")
    normalized = audioop.mul(bytes(mono), 2, min(1.0, 29_000 / peak))
    stereo = audioop.tostereo(normalized, 2, 1.0, 1.0)

    public_audio = ROOT / "public" / "assets" / SLUG / "audio.wav"
    public_audio.parent.mkdir(parents=True, exist_ok=True)
    with wave.open(str(public_audio), "wb") as output:
        output.setnchannels(2)
        output.setsampwidth(2)
        output.setframerate(SAMPLE_RATE)
        output.writeframes(stereo)

    chapter_rows = [
        {"n": chapter["n"], "title": chapter["title"], "from": chapter_starts[chapter["n"]]}
        for chapter in chapters
        if chapter["n"] in chapter_starts
    ]
    speech_seconds = sum(len(audio) / 2 / SAMPLE_RATE for audio in rendered)
    timeline = {
        "fps": FPS,
        "total_frames": total_frames,
        "engine": "windows-sapi-local",
        "voice": VOICE,
        "rate": RATE,
        "lead": LEAD_FRAMES,
        "gap": GAP_FRAMES,
        "tail": TAIL_FRAMES,
        "lang": "en",
        "chapters": chapter_rows,
        "sentences": timeline_sentences,
        "words": sum(len(sentence["text"].split()) for sentence in source_sentences),
        "speech_sec": round(speech_seconds, 3),
    }
    script = ROOT / "script"
    (script / "timeline.json").write_text(json.dumps(timeline, indent=2), encoding="utf-8")
    rows = [
        f"# Timeline (local Windows SAPI, {VOICE}, rate {RATE}, {total_frames} frames = {total_frames / FPS:.1f}s)",
        "",
        "| Sentence | Frames | Duration | Subtitle blocks |",
        "| --- | --- | --- | --- |",
    ]
    for sentence in timeline_sentences:
        blocks = "｜".join(item["text"] for item in sentence["subs"])
        rows.append(
            f"| {sentence['id']} | {sentence['from']}–{sentence['to']} | "
            f"{(sentence['to'] - sentence['from'] + 1) / FPS:.1f}s | {blocks} |"
        )
    (script / "timeline.md").write_text("\n".join(rows) + "\n", encoding="utf-8")

    subs = [
        "// Generated by scripts/sapi_build.py from script/narration.txt.",
        "export type SubEntry = {from: number; to: number; text: string};",
        "export const SUBS: SubEntry[] = [",
    ]
    for sentence in timeline_sentences:
        for block in sentence["subs"]:
            subs.append(f"  {{from: {block['from']}, to: {block['to']}, text: {json.dumps(block['text'])}}},")
    subs.append("];")
    (ROOT / "src" / "common" / "subs.ts").write_text("\n".join(subs) + "\n", encoding="utf-8")

    generated = [
        "// Generated by scripts/sapi_build.py. Frames are 1-based and inclusive.",
        f"export const TOTAL_FRAMES = {total_frames};",
        "export const CHAPTER_STARTS: Array<{n: number; title: string; from: number}> = [",
    ]
    for chapter in chapter_rows:
        generated.append(
            f"  {{n: {chapter['n']}, title: {json.dumps(chapter['title'])}, from: {chapter['from']}}},"
        )
    generated.extend(
        [
            "];",
            "export type Sentence = {id: string; chapter: number; from: number; to: number; text: string};",
            "export const SENTENCES: Sentence[] = [",
        ]
    )
    for sentence in timeline_sentences:
        generated.append(
            f"  {{id: {json.dumps(sentence['id'])}, chapter: {sentence['chapter']}, "
            f"from: {sentence['from']}, to: {sentence['to']}, text: {json.dumps(sentence['text'])}}},"
        )
    generated.append("];")
    (ROOT / "src" / "common" / "timeline.ts").write_text("\n".join(generated) + "\n", encoding="utf-8")

    metadata = {
        "engine": "Windows System.Speech (local/offline)",
        "voice": VOICE,
        "rate": RATE,
        "language": "en-US",
        "sample_rate": SAMPLE_RATE,
        "channels": 2,
        "duration_seconds": total_frames / FPS,
        "human_listening_review": "pending",
    }
    (ROOT / "audio" / "narration-metadata.json").write_text(json.dumps(metadata, indent=2), encoding="utf-8")
    print(
        f"Local English narration: {VOICE}, {total_frames} frames "
        f"({total_frames / FPS:.2f}s), {len(timeline_sentences)} sentences"
    )


if __name__ == "__main__":
    main()
