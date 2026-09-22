---
title: Video Library
description: Catalog, release, provenance, and quality model for a2swe videos.
---

# Video Library

[Open the interactive Video Library](/video-library) to play all retained
revisions, compare versions side by side, download the exact movies, and follow
QC and source evidence. The gallery includes explicit blocked-project cards.

## Actual media availability

The earlier pilot set contains Copilot v1-v6, John Deere v1-v3,
and Microsoft v1-v3. These movies were previously excluded by each project's
`renders/` ignore rule; those three projects now allow MP4 source files to be
versioned. The website build copies them to its static media directory and
verifies their recorded SHA-256 hashes.

**Copilot Studio 2026 and Power Platform 2026 now have rendered review
candidates.** The gallery discovers their retained revisions from the project
render directories. Human approval is not inferred from media availability.
The earlier `projects/power-platform/` package still records a missing-video
deliverable; it is distinct from `projects/power-platform-2026/`.
The older Copilot pilot is also a separate project.

No gallery card grants release approval. Matching QC is shown only when the
report's movie digest matches the selected revision.

The Video Library is the catalog layer for produced explainers and their reproducibility evidence. A library entry is more than an MP4: it connects the rendered video to its source project, content contract, approvals, rights, quality reports, and release digest.

## Current repository library

| Video | Project | Available evidence |
| --- | --- | --- |
| Copilot pilot | `projects/copilot/` | Source, research, storyboard, manifests, QC, delivery record, versioned renders |
| John Deere pilot | `projects/john-deere/` | Source, research, storyboard, manifests, QC, delivery record, versioned renders |
| Microsoft pilot | `projects/microsoft/` | Source, research, storyboard, manifests, QC, delivery record, versioned renders |
| Copilot Studio 2026 | `projects/copilot-studio-2026/` | Research, narration, timing, storyboard, rendered revisions, QC |
| Power Platform 2026 | `projects/power-platform-2026/` | Research, storyboard, rendered revisions, pending human review |
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
  "status": "candidate"
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

The interactive gallery currently supports project search, production-state
filtering, and either project-level cards or every revision. Domain, audience,
template, voice, rights, and adjudicated-quality filters remain future work;
they require explicit manifest data rather than guesses from filenames.

## Publication checklist

1. Verify the release candidate and output parity.
2. Verify asset rights and attribution.
3. Attach research, storyboard, timing, and QC evidence.
4. Record the immutable release digest.
5. Record human approval identities and scopes.
6. Add searchable metadata and feedback tags.
7. Preserve earlier approved versions.
