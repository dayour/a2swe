# Rights manifest

All production visuals in `src/ProductionVideo.tsx` are original code-drawn React/CSS
geometry created for this project. No Microsoft logos, product icons, screenshots,
stock media, downloaded images, or third-party footage are used.

Bundled fonts are inherited from the repository template and retain their existing
license notice at `public/fonts/LICENSE.md`. Research links are citations, not
redistributed source assets.

v6 narration is locally synthesized using the custom Kokoro/Misaki fork builds,
the pinned `hexgrad/Kokoro-82M` model, and its `am_liam` voice. No speaker cloning
or cloud TTS is used. [The v6 provenance record](audio/narration-v6.metadata.json)
identifies the exact fork release URLs, model/configuration/voice SHA-256 hashes,
and output audio hash. Dependency pins are in `requirements.lock.txt`.

v1-v5 narration used Windows SAPI; those artifacts remain historical evidence,
not the v6 producer. License and source notices for the speech dependencies and
model remain applicable to their distribution. This origin manifest does not
grant a legal or human release approval; see [REVIEW.md](REVIEW.md).
