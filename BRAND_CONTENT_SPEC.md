# a2swe Brand and Content Specification

## Identity

- Name and skill identifier: **a2swe**.
- Expansion: **Anything to SWE Agent: Expert Explainers.**
- Promise: **Topic in, narrated explainer video out.**
- Package: `a2swe-remotion-template`.
- Output: English narrated 1280x720, 30fps H.264 video plus editable project,
  research, narration, timing, storyboard, QC, and a persistent companion artifact.

The parallel SWE expert track manages the full pipeline; it does not replace
the movie. The project companion stores role, domain facts, decisions, approvals,
stage ownership, evidence, limitations, and resume instructions. It is not a
trained model, automatic IDE registration, or continuously running service.

## Language Policy

English is the only authoring and output language. Remove language-selection
options, non-English placeholders, CLI text, comments, workflow documents,
sample source, and images with baked-in non-English copy. Keep English technical
names, source provenance, and authoritative license terms.

Use UTF-8. English subtitle blocks have a 48-character budget, a 1160px safe
width at 44px, and spaces between narration chunks. Default typography has no
horizontal squeeze or alternate-language baseline adjustment. English TTS
defaults on Python 3.14 are local Piper with a supplied English voice model,
or explicit Edge `en-US-AndrewNeural` at +0%. Kokoro and Kokoro ONNX are legacy
adapters incompatible with Python 3.14; they are not in the dependency lock.

## Image Inventory and Disposition

The former archive contained 36 JPEG references, none imported by the runtime:

| Retired set | Count | Content and disposition |
| --- | --- | --- |
| Composition comparisons | 13 | Six bad/good pairs plus a contact sheet: hero scale, reveal, sparse axes, formulas, background clutter, and ending. Remove with the retired sample. |
| RAG overviews | 6 | Full-film contact sheets. Remove because their subtitles and labels are baked into pixels. |
| RAG focus frames | 17 | Title, shortcomings, reveal, paper, chapter, parsing, chunk size, vectors, HNSW, hybrid retrieval, reranking, context, evaluation, graph retrieval, agent loop, long context, ending. Remove with their obsolete source/timing. |

Do not paint translations over archived frames or claim old QC evidence validates
new output. Future English reference images must be rendered from approved English
narration, source, and timing, then inspected and documented in a fresh manifest.

## Runtime Assets

The template uses code-drawn React/CSS/SVG visuals, not reference JPEGs. Generated
audio lives under `public/assets/<slug>/audio.wav`; footage arrays start empty.
Every external image or clip needs a manifest containing path, source URL,
license/permission, SHA-256, purpose, and required attribution. Logos must not
imply endorsement. Do not copy frames from existing videos.

Bundled font copyright notices and SIL OFL text remain authoritative. A font's
historical family name is asset metadata, not a language option. Existing Noto
Sans SC Latin glyphs are retained for calibrated English text metrics; no CJK
copy is authored or exposed. Replacing the font requires recalibrating both
TypeScript and TTS text-width estimates and checking rendered text.

## Companion Lifecycle

Copy `template/agent/SWE_AGENT.md` per project. One owner maintains it through
stages 0-8; workers return bounded evidence. Retain duration/scope, narration,
voiceover, and pilot gates. Update paths and actual verification results before
delivery. New sessions verify recorded artifacts, refresh facts, and resume the
earliest affected stage. Follow-up projects inherit sourced knowledge, not prior
approvals, and never overwrite released originals.

## Acceptance

1. Active source, docs, filenames, narration, and generated UI contain no CJK text;
   no Chinese output option or voice default remains. Binary fonts are not text.
2. Retired JPEGs and sample sources are absent; runtime imports remain valid.
3. Locked dependency installation, TypeScript checking, and production bundling pass.
4. Studio launches and lists Video, Overlay, and G1-G8; rendered overlays load fonts.
5. English narration spaces, storyboard token resolution, coverage failures, and
   subtitle limits are exercised with tests. Empty QC inputs must not pass.
6. Each requested pilot separately records research, approval gates, audio/timing,
   render checks, visual/audio QC, and its companion ledger. Pending gates remain pending.
7. A bundle or starter scaffold is never reported as a completed topic video.
