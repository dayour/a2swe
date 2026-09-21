# a2swe Brand and Content Specification

## Identity

- Name and skill identifier: **a2swe**.
- Expansion: **Anything to SWE Agent: Expert Explainers.**
- Promise: **Grounded domain SWE agent first, then executive explainers.**
- Package: `a2swe-remotion-template`.
- Target outputs: independently evaluated domain agent plus narrated MP4, editable
   PPTX, searchable PDF, responsive HTML/AdaptiveDeck, and DOCX. The local adapter
   foundation now uses shared ContentIR/RenderSpec for release candidates; the
   established video architecture remains the active, approval-gated
   Remotion/Python 1280x720, 30fps production video adapter.
- Current surfaces: agent-first core state in `.a2swe/` SQLite, evaluation-only
   synthetic asset proof, local release-candidate adapters, and established 720p
   Remotion/Python production video architecture. None is production-ready without
   the required approvals and rights records.

The domain agent must be useful before media production. Public engineering and
brand evidence, source freshness, rights, independent evaluation, and human approval
are prerequisites, not post-production paperwork. The project companion is a readable
view, not the authoritative runtime database. See the implementation status in
[docs/AGENT_FIRST_BUILD_SPEC.md](docs/AGENT_FIRST_BUILD_SPEC.md).

Verified subject identity takes precedence over any house theme. Do not describe
generic stars, glow, ClippyFlow presets, or original editorial artwork as official
customer branding. Review three representative video frames and two slides before
full production. Metrics cannot confer human visual or voice approval.

## Language Policy

English is the only authoring and output language. Remove language-selection
options, non-English placeholders, CLI text, comments, workflow documents,
sample source, and images with baked-in non-English copy. Keep English technical
names, source provenance, and authoritative license terms.

Use UTF-8. English subtitle blocks have a 48-character budget, a 1160px safe
width at 44px, and spaces between narration chunks. Default typography has no
horizontal squeeze or alternate-language baseline adjustment. English TTS
defaults on Python 3.14 use the upgraded local Kokoro/Misaki stack, or explicit
Edge `en-US-AndrewNeural` at +0%. The dependency lock includes local upgraded
Misaki, Kokoro and Kokoro ONNX wheels and the English spaCy model. Full English
inference is verified on Python 3.14.7; ONNX uses supplied model/voice-bank paths.
Piper remains optional. Do not substitute model imports for real inference evidence.

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

Core evaluation bundles may also include optional asset quality metadata for
dimensions, contrast, label readability, overlap, visual-review notes, and pending
human disposition. These fields are review evidence only. They do not prove brand
authenticity, rights, subject approval, or production readiness. Verify exported
bundle `manifest.json` tamper status with the core verifier before reusing an
evaluation asset proof.

Bundled font copyright notices and SIL OFL text remain authoritative. A font's
historical family name is asset metadata, not a language option. Existing Noto
Sans SC Latin glyphs are retained for calibrated English text metrics; no CJK
copy is authored or exposed. Replacing the font requires recalibrating both
TypeScript and TTS text-width estimates and checking rendered text.

## Companion Lifecycle

Copy `template/agent/SWE_AGENT.md` per established video architecture project. One owner maintains
that projection through stages 0-8; workers return bounded evidence. The
authoritative runtime state for the agent-first core is `.a2swe/` SQLite, including
durable job receipts and verified artifact records. Retain duration/scope,
narration, voiceover, and pilot gates in the projection. Update paths and actual
verification results before delivery. New sessions verify recorded artifacts,
refresh facts, and resume the earliest affected stage. Follow-up projects inherit
sourced knowledge, not prior approvals, and never overwrite released originals.

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
