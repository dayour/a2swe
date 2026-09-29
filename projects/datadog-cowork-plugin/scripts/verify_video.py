import argparse
import json
from pathlib import Path

import numpy as np
from PIL import Image, ImageDraw
from pipeline_media import (
    AUDIO_CHANNELS,
    AUDIO_RATE,
    FPS,
    HEIGHT,
    WIDTH,
    audio_alignment,
    decode_movie_audio,
    fail,
    file_sha256,
    first_stream,
    parse_rate,
    parse_shots,
    probe_media,
    read_audio_mono,
    resolve_frames_dir,
    stream_duration,
    validate_shot_coverage,
    write_json_new,
)


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('project', type=Path)
    parser.add_argument('--version', default='v2')
    parser.add_argument('--ffmpeg', required=True)
    parser.add_argument('--ffprobe', required=True)
    parser.add_argument('--min-similarity', type=float, default=0.98)
    parser.add_argument('--max-lag-samples', type=int, default=1024)
    parser.add_argument('--duration-tolerance', type=float, default=0.1)
    parser.add_argument('--frames-dir', type=Path, default=None,
                        help='Decoded frame directory. Defaults to fin_frames_<version>, with legacy fin_frames fallback only when absent.')
    args = parser.parse_args()
    project = args.project.resolve()
    slug = project.name
    movie = project / 'renders' / f'{slug}-{args.version}.mp4'
    report_dir = project / 'qc'
    report_dir.mkdir(parents=True, exist_ok=True)
    timeline = json.loads((project / 'script/timeline.json').read_text(encoding='utf-8'))
    total_frames = int(timeline['total_frames'])
    expected_seconds = total_frames / FPS
    media = probe_media(args.ffprobe, movie)
    video = first_stream(media, 'video')
    audio = first_stream(media, 'audio')
    if video.get('codec_name') != 'h264':
        fail(f'Expected H.264 video, got {video.get("codec_name")}')
    if (int(video.get('width', 0)), int(video.get('height', 0))) != (WIDTH, HEIGHT):
        fail(f'Expected {WIDTH}x{HEIGHT}, got {video.get("width")}x{video.get("height")}')
    if abs(parse_rate(video.get('r_frame_rate', '0/1')) - FPS) > 0.001:
        fail(f'Expected {FPS}fps, got {video.get("r_frame_rate")}')
    nb_frames = int(video.get('nb_frames') or 0)
    if nb_frames != total_frames:
        fail(f'Expected {total_frames} video frames, got {nb_frames}')
    video_duration = stream_duration(video, media['format'])
    if abs(video_duration - expected_seconds) > args.duration_tolerance:
        fail(f'Expected {expected_seconds:.3f}s video, got {video_duration:.3f}s')
    if audio.get('codec_name') != 'aac':
        fail(f'Expected AAC audio, got {audio.get("codec_name")}')
    if int(audio.get('sample_rate', 0)) != AUDIO_RATE or int(audio.get('channels', 0)) != AUDIO_CHANNELS:
        fail(f'Expected {AUDIO_RATE}Hz stereo audio, got {audio.get("sample_rate")}Hz/{audio.get("channels")}ch')
    audio_duration = stream_duration(audio, media['format'])
    if abs(audio_duration - expected_seconds) > args.duration_tolerance:
        fail(f'Expected {expected_seconds:.3f}s audio, got {audio_duration:.3f}s')
    actual, rate, audio_peak = decode_movie_audio(args.ffmpeg, movie)
    reference, original_rate = read_audio_mono(project / 'public/assets' / slug / 'audio.wav')
    if rate != original_rate or rate != AUDIO_RATE:
        fail(f'Expected decoded/reference audio at {AUDIO_RATE}Hz, got {rate}Hz/{original_rate}Hz')
    measured = audio_alignment(actual, reference)
    lag = int(measured['lag_samples'])
    similarity = float(measured['similarity'])
    if similarity <= args.min_similarity:
        fail(f'Audio similarity is only {similarity:.6f}')
    if abs(lag) > args.max_lag_samples:
        fail(f'Audio shifted by {lag} samples')
    if audio_peak >= 1:
        fail('Clipped decoded audio')
    shots = [(shot, start, end) for shot, start, end, _group in validate_shot_coverage(parse_shots(project), total_frames)]
    frames_dir = resolve_frames_dir(project, args.version, args.frames_dir)
    files = sorted(frames_dir.glob('f_*.jpg'))
    if len(files) != total_frames:
        fail(f'Expected every encoded frame for QC ({total_frames}), got {len(files)} in {frames_dir}')
    overview_height = max(390, ((len(shots) + 1) // 2) * 390)
    overview = Image.new('RGB', (WIDTH, overview_height), '#101514')
    samples = {}
    for shot_index, (shot, start, end) in enumerate(shots):
        frames = [max(start + 6, min(end - 6, round(start + (end - start) * fraction)))
                  for fraction in (0.05, 0.2, 0.4, 0.6, 0.8, 0.95)]
        sheet_path = report_dir / f'{shot}-{args.version}.jpg'
        if sheet_path.exists():
            fail(f'QC image already exists; choose a new --version to preserve local work: {sheet_path}')
        sheet = Image.new('RGB', (WIDTH, 1170), '#101514')
        drawing = ImageDraw.Draw(sheet)
        for sample_index, frame in enumerate(frames):
            with Image.open(frames_dir / f'f_{frame:04d}.jpg') as source:
                if source.size != (WIDTH, HEIGHT):
                    fail(f'Frame {frame} has size {source.size}, expected {(WIDTH, HEIGHT)}')
                image = source.convert('RGB')
                scale_y = HEIGHT / 720
                content = np.asarray(image)[round(90 * scale_y):round(621 * scale_y)]
                if np.count_nonzero(content.max(axis=2) > 160) <= 1000:
                    fail(f'Empty scene {shot} frame {frame}')
                image.thumbnail((640, 360))
                left, top = sample_index % 2 * 640, sample_index // 2 * 390
                sheet.paste(image, (left, top + 30))
                drawing.text((left + 10, top + 8), f'{slug} / {shot} / frame {frame}', fill='white')
                if sample_index == 3:
                    overview.paste(image, (shot_index % 2 * 640, shot_index // 2 * 390 + 30))
                    ImageDraw.Draw(overview).text((shot_index % 2 * 640 + 10, shot_index // 2 * 390 + 8), f'{shot} / frame {frame}', fill='white')
        sheet.save(sheet_path, quality=92)
        samples[shot] = frames
    overview_path = report_dir / f'overview-{args.version}.jpg'
    if overview_path.exists():
        fail(f'QC overview already exists; choose a new --version to preserve local work: {overview_path}')
    overview.save(overview_path, quality=95)
    result = {'file': str(movie.relative_to(project)), 'sha256': file_sha256(movie),
              'video': video, 'audio': audio, 'container': media['format'],
              'audio_similarity': similarity, 'audio_lag_samples': lag,
              'audio_peak': audio_peak, 'decoded_frames': len(files),
              'frames_dir': str(frames_dir.relative_to(project) if frames_dir.is_relative_to(project) else frames_dir),
              'visual_samples': samples, 'human_listening_review': 'pending',
              'pilot_approval': 'pending'}
    write_json_new(report_dir / f'media-{args.version}.json', result)
    print(f'{slug}: PASS; H.264 {WIDTH}x{HEIGHT} {FPS}fps {total_frames} frames; AAC {AUDIO_RATE}Hz stereo; audio similarity {similarity:.6f}, lag {lag} samples; {len(shots) * 6} nonblank samples')


if __name__ == '__main__':
    main()
