import argparse
from pathlib import Path

from pipeline_media import (
    audio_alignment,
    decode_movie_audio,
    ensure_new_file,
    fail,
    read_audio_mono,
    require_file,
    run,
    write_json_new,
)


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('movie', type=Path)
    parser.add_argument('reference', type=Path)
    parser.add_argument('output', type=Path)
    parser.add_argument('--ffmpeg', required=True)
    parser.add_argument('--min-similarity', type=float, default=0.98)
    parser.add_argument('--max-offset-seconds', type=float, default=0.1)
    args = parser.parse_args()
    movie = require_file(args.movie, 'movie')
    reference_path = require_file(args.reference, 'reference audio')
    output = ensure_new_file(args.output, 'aligned output')
    report_path = output.with_suffix('.alignment.json')
    ensure_new_file(report_path, 'alignment report')
    if output == movie:
        fail('Choose a new output path; existing releases are never overwritten')
    reference, rate = read_audio_mono(reference_path)
    actual, actual_rate, _ = decode_movie_audio(args.ffmpeg, movie)
    if rate != actual_rate:
        fail(f'Audio sample rates differ: reference {rate}Hz, movie {actual_rate}Hz')
    measured = audio_alignment(actual, reference)
    lag = int(measured['lag_samples'])
    similarity = float(measured['similarity'])
    if similarity <= args.min_similarity:
        fail(f'Audio differs from the reference; similarity {similarity:.6f} <= {args.min_similarity}')
    if abs(lag) / rate >= args.max_offset_seconds:
        fail(f'Large offset ({lag / rate:.3f}s) needs investigation, not automatic correction')
    run([args.ffmpeg, '-v', 'error', '-i', movie, '-itsoffset',
         str(-lag / rate), '-i', movie, '-map', '0:v:0', '-map', '1:a:0',
         '-c', 'copy', output], 'ffmpeg alignment remux')
    report = {'input': args.movie.name, 'output': args.output.name, 'sample_rate': rate,
              'measured_lag_samples': lag, 'applied_offset_seconds': -lag / rate,
              'audio_similarity_before_alignment': similarity,
              'method': 'lossless stream-copy remux; run verify_video.py on the result'}
    write_json_new(report_path, report)
    print(f'Aligned {args.output.name}: measured {lag} samples; similarity {similarity:.6f}; verify the output before delivery')


if __name__ == '__main__':
    main()
