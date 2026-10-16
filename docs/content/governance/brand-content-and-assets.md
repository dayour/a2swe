---
title: Brand, content, and assets
---

# Brand, content, and asset governance

## Language and identity

All product copy, narration, subtitles, and delivery output are English. Each
project's visual identity comes from its brand theme (`canonical/render-theme.json`):

- **Customer accounts** use the LayeredCards kit theme that styled their delivered cards.
- **Topics with an owning organization** use a theme derived from that organization's official site.
- **Anything else** uses the neutral default.

A derived theme is inspired by public styling. It is not an official brand asset
and never implies endorsement. Visual inspiration does not grant approval to
copy third-party frames, clips, logos, or imagery.

## Composition rules

- One clear focal point per shot.
- Deterministic, frame-derived motion.
- Seeded randomness when variation is needed.
- Slow camera pushes rather than uncontrolled movement.
- Explicit entrances and exits.
- Readable text sized for 720p.
- Content, subtitle, and progress safe areas remain separate.

## Asset classes

| Class | Governance |
| --- | --- |
| Code-drawn primitive | Source implementation and project ownership |
| Bundled font | Preserve OFL notice and attribution |
| Brand font | Referenced by name from the installed system or Office; never redistributed |
| Brand theme | Kit, site or manual provenance in `RenderTheme.source`; site evidence in `qc/brand/` |
| Generated narration | Record engine, voice/model, and settings |
| External footage or image | Source, license, SHA-256, attribution, and timed use |
| Model weights | External license and provenance; not bundled by default |

## Acceptance

Every visual or media asset used in a release must be reproducible, licensed for the intended use, addressable from the project source, and represented in the delivery evidence.
