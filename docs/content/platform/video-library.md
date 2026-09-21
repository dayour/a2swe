---
title: Video Library
description: Catalog, release, provenance, and quality model for a2swe videos.
---

# Video Library

The Video Library is the catalog layer for produced explainers and their reproducibility evidence. A library entry is more than an MP4: it connects the rendered video to its source project, content contract, approvals, rights, quality reports, and release digest.

## Current repository library

| Video | Project | Available evidence |
| --- | --- | --- |
| Copilot pilot | `projects/copilot/` | Source, research, storyboard, manifests, QC, delivery record, versioned renders |
| John Deere pilot | `projects/john-deere/` | Source, research, storyboard, manifests, QC, delivery record, versioned renders |
| Microsoft pilot | `projects/microsoft/` | Source, research, storyboard, manifests, QC, delivery record, versioned renders |
| Copilot Studio 2026 | `projects/copilot-studio-2026/` | Product documentation and project implementation |
| Power Platform | `projects/power-platform/` | Product documentation and project implementation |

Repository projects can be works in progress. A directory is not a published release unless its required approvals, rights, outputs, and verification evidence are complete.

## Library entry model

The core registry recognizes reusable entries including agents, skills, plugins, assets, templates, automations, and archives. A video catalog should retain the same integrity model and add release-specific metadata:

```json
{
  "videoId": "copilot-pilot-v6",
  "title": "Copilot",
  "projectPath": "projects/copilot",
  "releaseDigest": "sha256:...",
  "render": {
    "path": "projects/copilot/renders/copilot-v6.mp4",
    "width": 1280,
    "height": 720,
    "fps": 30
  },
  "artifacts": {
    "delivery": "projects/copilot/delivery.md",
    "rights": "projects/copilot/asset-manifest.json",
    "quality": "projects/copilot/qc/media-v6.json"
  },
  "status": "approved"
}
```

## Release integrity

`packages/core/src/release.ts` creates digest-bound release plans and verifies release candidates. Publication must remain blocked when:

- content, domain, style, voice, or render digests do not match;
- selected assets lack approved redistribution rights;
- required approval scopes are missing or invalid;
- independent review requirements are not met;
- output hashes or byte sizes differ from the parity manifest.

## Recommended library states

| State | Meaning |
| --- | --- |
| `draft` | Project exists but narration or implementation is incomplete |
| `pilot` | First approved segment and pilot evidence exist |
| `candidate` | Complete render exists and automated checks have run |
| `approved` | Human release approvals and rights checks are valid |
| `superseded` | A newer version exists; the historical release is preserved |
| `withdrawn` | The artifact remains auditable but should not be distributed |

## Browsing dimensions

A future interactive library can filter videos by domain, audience, duration, template, visual style, voice, source freshness, approval state, rights state, quality score, and tags. Filters must be derived from manifests rather than inferred from filenames.

## Publication checklist

1. Verify the release candidate and output parity.
2. Verify asset rights and attribution.
3. Attach research, storyboard, timing, and QC evidence.
4. Record the immutable release digest.
5. Record human approval identities and scopes.
6. Add searchable metadata and feedback tags.
7. Preserve earlier approved versions.
