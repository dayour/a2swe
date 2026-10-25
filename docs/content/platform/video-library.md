---
title: Video Library
description: Catalog and evidence model for retained repository video outputs.
---

## Purpose

[Open the interactive Video Library](/video-library) to browse retained repository
movies, revisions, QC links, and source evidence.

The library is a catalog layer. It is not a publication or rights-clearance
system.

## Current repository boundary

Repository projects can be works in progress. A media file or gallery card does not
prove that a project is complete or cleared for sharing.

Matching QC is shown only when the report digest matches the selected media file.

## Visual comparisons

An archived video can retain its **Original** alongside two visual variations:
**Editorial** and **Studio**. The Visual version filter selects these separately
from narration voice and engine. Each variation points to the original filename
and SHA-256, its design digest, and optional project-relative design evidence.
The original video and revision status remain unchanged.

These variations use `reference-recomposition`: a new visual composition with
the original narration. They are not historical release-package rebuilds. Older
revisions often retain the movie without the authoring package needed for an
exact rebuild. Visual comparisons do not inherit a package or release digest.

The catalog indexes all recorded videos. The site copies only the current and
previous superseded revisions for playback; other revisions link to retained
repository sources. Comparing a playable variation opens its original alongside
it when that original is also available for playback.

Visual-variation posters are derived from the retained MP4 during a clean build,
so documentation builds need FFmpeg. The media catalog, movie digests and review
contact sheets remain versioned; generated variation thumbnails stay local.

## Recommended states

| State | Meaning |
| --- | --- |
| `draft` | Project exists but required inputs are incomplete |
| `candidate` | A render exists and automated checks have run |
| `verified` | Package digests and QC evidence are present |
| `superseded` | A newer revision exists and the older one is retained |
| `withdrawn` | The artifact remains auditable but should not be reused |

## Verification checklist

1. Verify the package digests.
2. Verify the output QC evidence.
3. Link the source project and release records.
4. Record limitations and unresolved gaps.

Sharing or publication decisions remain external to the library.
