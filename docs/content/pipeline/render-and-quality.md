---
title: Render and quality control
description: Produce and verify the managed 1080p release, master its audio, and measure every revision.
---

## Brand themes

Every format renders from one brand theme: `canonical/render-theme.json`, which
`canonical-bind` copies into `RenderSpec.theme`. The `RenderTheme` contract
holds:

- the page canvas, body ink and emphasis accent
- the brand roles of the card system: primary, header band, deep, highlight rule, paper tiles, line, muted, soft and danger
- the heading and body font stacks
- a corner radius
- provenance

The contract rejects themes that cannot meet WCAG AA for body ink, header text
and muted text.

`brand-theme` installs a theme from one of three sources:

| Source | Derivation |
| --- | --- |
| `--source` kit theme | The LayeredCards kit derivation, so outputs match the delivered cards |
| `--url` brand site | Weighted color and font votes from the page and up to ten stylesheets |
| `--file` theme | A hand-written `RenderTheme` |

Site extraction discounts CSS-framework defaults and debug colors. It prefers a
brand-tinted near-black for the header band and uses a bright primary as the
highlight. It records every fetched document and vote in
`qc/brand/brand-source.json`. If the strongest brand color has too little
evidence, the command fails instead of installing a guess. New projects start
with a neutral default theme. The desktop New Project dialog's Pro mode accepts
a brand site, and the coordinator installs it before the agent starts.

Each format applies the same resolved tokens:

| Format | Brand treatment |
| --- | --- |
| Video | Persistent header band with deck kicker and scene counter. The highlight rule doubles as the progress bar. Heading font, paper tiles, callouts and caption panel come from the brand. Mermaid and Marp visuals use the brand fonts and roles |
| PPTX | Header band, highlight rule, kicker and slide number on every slide. The theme color scheme and major/minor fonts are the brand's, so edits in PowerPoint stay on brand |
| DOCX | Brand heading font and color, highlight rule under the title, brand hyperlinks, body font |
| PDF | Header band, highlight rule and page numbers on every page. Brand-colored headings. Standard Times faces for serif stacks and Helvetica for sans stacks keep the PDF searchable without embedding fonts |
| HTML and AdaptiveDeck | Masthead band, CSS variables or deck theme for every role, heading font. The print stylesheet switches to print ink |
| PNG and JPEG | Band, rule, callout and tiles, with the first installed family in each font stack and the bundled face as glyph fallback |

`brand-theme` also regenerates semantic diagram assets, those with a `diagram`
request, with the brand palette, so embedded diagrams match. Imported photos
and logos are left as they are.

Fonts are referenced by name and never redistributed. Office downloads brand
cloud fonts on first use, so the first native render on a new machine can show a
substitute face. Run `office-render` again once the font is cached.

## Managed release render

Generate the release package first:

```powershell
node packages/core/src/cli.ts release-produce --domain domain-pack.json --content content-ir.json --render render-spec.json --approval approval-manifest.json --assets asset-bundles --out release
node packages/core/src/cli.ts release-verify --root release
```

When the release includes `remotion`, the package contains a generated Remotion
project under `release/outputs/remotion/`.

Inside that project, the managed render commands are:

```powershell
npm install --ignore-scripts
npm run audio
npm run typecheck
npm run render
npm run qc
```

The generated project enforces:

- 1920x1080 video
- 30 fps
- 48 kHz stereo audio
- local Python 3.14 speech dependencies
- local model paths
- local Remotion dependencies
- FFmpeg and ffprobe

`npm run render` synthesizes missing or stale audio, renders the MP4, and reruns
encoded-media QC. `npm run qc` rechecks an existing render.

Captions use measured narration segments and sentence boundaries that preserve
decimal versions such as `1.0`. The desktop review player and documentation
library read the resulting frame-based timeline cues, so previews use the same
text and timing as the video rather than a separately reconstructed transcript.

Managed renders reuse installed packages but keep each project's mutable
Webpack cache isolated. Concurrent releases do not clear another render's cache,
and each render binds its own bundle-server port from 20000-29999 after checking
it on every loopback host, so parallel renders never load each other's chunks.

## Audio mastering

Kokoro produces 24 kHz speech. The producer resamples it to 48 kHz with a steep
Kaiser anti-imaging filter, then masters it to -16 LUFS integrated (ITU-R
BS.1770-4) through a 4x-oversampled true-peak limiter at -1.5 dBTP. The
narration metadata records the gain and limiter activity. Audio QA fails a
render outside -16 ±1 LU or above -1 dBTP, in addition to its noise-floor,
signal-to-noise, high-frequency and boundary checks.

## Managed QC

The managed MP4 QC verifies:

- expected width, height, frame rate, and pixel format
- expected AAC sample rate and channel count
- bounded duration drift
- output digest binding through the render receipt

`release-verify` also rechecks the package digests and reruns MP4 QC.

## Revision analysis

`revisions-analyze` measures every video in `renders/` and writes
`qc/analysis/`. For each video it records:

- EBU R128 integrated loudness, loudness range and true peak
- speech activity, pause lengths, noise floor and speech-to-silence ratio
- Welch spectrum metrics, including high-frequency energy above 8 kHz
- mains hum prominence and stereo correlation
- scene cuts, black frames and frozen frames
- per-zone layer motion and edge detail
- per-layer temporal-frequency spectra with flicker detection, and spatial detail per content band

It also writes full and speech-band spectrograms with legends, per-section
spectrogram chunks, a contact sheet, a proportional frame strip, and a layer
activity image. `qc/analysis/report.md` compares every revision, with stacked
spectrogram, frame and layer images.

### Video spectrograms

`video-spectrogram.jpg` is the visual counterpart of the audio spectrogram. Each
pixel's brightness is treated as a signal sampled at the frame rate. A
short-time Fourier transform of every pixel (64-frame Hann windows), averaged
per layout zone, shows the temporal frequencies each layer carries over time:
header, headline, narrative, visual, caption and footer.

| Pattern | Meaning |
| --- | --- |
| Broadband vertical burst | A scene change, cross-fade or caption change |
| Energy below 2 Hz | Eased animation such as entrances and springs |
| Sustained narrow horizontal line | Flicker, strobing or shimmer at that rate |
| Evenly spaced lines at multiples of one rate | A pattern that repeats every few frames, such as nondeterministic drawing across parallel render tabs |
| Dark band | A layer that does not change |

A comb with its first line at the frame rate divided by N means N different
images alternate frame by frame. The renderer draws frames in parallel browser
tabs, so anything a tab computes randomly differs between tabs. Hand-drawn
Excalidraw strokes therefore use seeds derived from the diagram source, which
keeps every tab, render and embedded document image identical.

A layer with a peak at 3 Hz or above that stands 12 dB over the rest of that
band, carries 15% of the window's motion, and persists for 1.5 s or more raises
a `video-flicker` warning. The report table records the longest flicker per
video and the share of motion below 2 Hz.

`spatial-spectrogram.jpg` shows horizontal detail per content band (headline,
body and caption) over time, on a log cycles-per-pixel axis. The fine-detail
share above 0.18 cycles per pixel tracks text sharpness and density; the
report compares the body band's median share across revisions. Stacked
comparisons of both spectrograms are written as
`video-spectrogram-stack.jpg` and `spatial-spectrogram-stack.jpg`.

Run `alignment-rank` after the analysis to compare what each scene says with
what it shows; see [Audience alignment](./audience-alignment.md).

## Native Office QA

`office-render` opens the release PPTX and DOCX in Microsoft PowerPoint and Word
on Windows, exports slides and pages, and reports any text frame whose rendered
text exceeds its shape. The project runbook passes the `native-office` gate only
when the rendered file digests match the release and no text overflows. Slides
show readable source titles; evidence IDs stay in the speaker notes.

## Visual output coupling

When sections include `visual` blocks and the release requests `remotion`, the
renderer produces settled PNG diagrams. HTML, AdaptiveDeck, PPTX, DOCX, PDF, and
overview images then embed those PNGs.

## Human review

Human review remains useful for readability, pacing, and style. It is optional and
separate from the automated verification path.
