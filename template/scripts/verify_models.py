import argparse
import subprocess
from pathlib import Path


def main():
    parser = argparse.ArgumentParser(
        description='Generate project-local speech evidence through the core audio pipeline.')
    parser.add_argument('--project', type=Path, required=True)
    parser.add_argument('--voice', default='am_michael')
    parser.add_argument('--engine', choices=('both', 'kokoro', 'kokoro_onnx'), default='both')
    args = parser.parse_args()
    root = next((parent for parent in Path(__file__).resolve().parents
                 if (parent / 'packages/core/src/cli.ts').is_file()), None)
    if root is None:
        parser.error('Run this entry point inside the a2swe repository; the core CLI is required.')
    subprocess.run(['node', str(root / 'packages/core/src/cli.ts'), 'audio-render',
                    '--root', str(args.project.resolve()), '--voice', args.voice,
                    '--engine', args.engine], check=True)


if __name__ == '__main__':
    main()