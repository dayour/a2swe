---
title: Provenance and licensing
---

# Provenance and licensing

## Claim provenance

Every narration and on-screen fact must trace to `research/research.md`. Qualifications, dates, and uncertainty must survive the transformation from source to script.

## Media provenance

For every external asset, record:

- project-relative path;
- canonical source URL;
- creator or publisher;
- access date;
- license and relevant terms;
- SHA-256 digest;
- attribution text;
- shot or frame usage.

## Model provenance

`verify_models.py` can synthesize real samples and hash model files and installed runtime packages, including Kokoro, Kokoro ONNX, Misaki, Torch, ONNX Runtime, spaCy, and the English model. Preserve its `verification.json` with model QC evidence.

## Licensing boundaries

The checkout does not contain a root license grant. Repository documentation must not be interpreted as permission for redistribution or commercial use. Bundled fonts retain separate OFL notices. Remotion and speech/model components have their own terms.

## Reuse

Reusable facts, components, and assets retain their provenance. Reuse never transfers a prior human approval to a new video.
