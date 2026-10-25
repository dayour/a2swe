# Third-party notices

`packages/core/src/visual-fingerprint.ts` adapts CIELAB histogram comparison,
coarse frame descriptors, and descriptive visual metrics from ReelMimic's
`video-clone/scripts/perception/look.py`, `perception/fingerprint.py`,
`perception/distance.py`, and `scripts/analyze.py` at commit
`d445b23f404dc6f577b8fdff50255fdbf85d1e97`:
<https://github.com/edenfunf/reelmimic>.

The a2swe implementation uses exact sRGB/D65 conversion, deterministic color
quantization, bounded midpoint sampling, and a separate descriptive comparison.
It does not include ReelMimic's production engines or third-party bundled skills.

## ReelMimic MIT license

Copyright (c) 2026 ReelMimic contributors

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
