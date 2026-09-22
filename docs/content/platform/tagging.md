---
title: Tagging for RLHF
description: Human-feedback tagging contract for evaluation, ranking, and future RLHF datasets.
---

# Tagging for RLHF

[Open the tagging workspace](/tagging). Review an exact video revision, mark a
time range, select quality/defect tags, score it, or compare two revisions.
Annotations persist in this browser's local storage and export as JSON or JSONL.

This is a **local review tool**, not an RLHF backend. Records are unadjudicated,
unsigned, and not authorized for training use. No feedback is transmitted and no
release approval is granted. Reviewer consent, rights, independent adjudication,
and dataset governance are still required before downstream use.

Tagging captures structured human feedback about videos, scenes, assets, and model-assisted production decisions. The repository has evaluation jobs, signed approval scopes, canonical digests, and immutable artifact storage, but it does **not** yet implement an RLHF training-data service. This page defines the contract that such a service should follow.

## Goals

- preserve reviewer intent as structured data;
- bind feedback to the exact artifact version reviewed;
- separate objective defects from subjective preferences;
- support pairwise ranking and rubric scoring;
- retain provenance, reviewer scope, and consent;
- export privacy-reviewed datasets for downstream training or evaluation.

## Tag target

Every tag must identify an immutable subject:

| Target | Required identity |
| --- | --- |
| Release | `releaseDigest` |
| Video | file digest plus release digest |
| Shot | release digest, shot ID, and frame range |
| Frame | release digest and frame number |
| Narration segment | content digest and sentence ID |
| Asset | asset ID and asset digest |
| Template | library entry ID and version |
| Model output | request digest, model provenance, and output digest |

## Tag classes

### Quality

`readability`, `pacing`, `motion`, `composition`, `subtitle_sync`, `audio_quality`, `factuality`, `continuity`, `accessibility`

### Preference

`preferred`, `rejected`, `more_clear`, `more_engaging`, `more_trustworthy`, `better_brand_fit`

### Defect

`hallucination`, `unsupported_claim`, `rights_risk`, `unsafe_asset`, `visual_artifact`, `clipped_text`, `dead_air`, `excessive_motion`, `missing_attribution`

### Production signal

`template_fit`, `shot_reusable`, `prompt_effective`, `requires_human_edit`, `approval_blocker`, `gold_example`

## Annotation record

```json
{
  "annotationId": "ann_01...",
  "subject": {
    "kind": "shot",
    "releaseDigest": "sha256:...",
    "shotId": "G2-S03",
    "fromFrame": 412,
    "toFrame": 566
  },
  "reviewer": {
    "reviewerId": "reviewer-123",
    "scope": "style"
  },
  "labels": [
    {
      "tag": "readability",
      "score": 2,
      "confidence": 0.9
    },
    {
      "tag": "clipped_text",
      "severity": "high"
    }
  ],
  "comment": "The final line enters the subtitle safe area.",
  "createdAt": "2026-09-21T17:00:00Z",
  "schemaVersion": "1.0.0"
}
```

## Pairwise preference record

RLHF-oriented ranking should compare two digest-bound candidates under one rubric:

```json
{
  "promptDigest": "sha256:...",
  "candidateA": "sha256:...",
  "candidateB": "sha256:...",
  "winner": "candidateB",
  "rubric": "storyboard-clarity-v1",
  "reasonCodes": ["more_clear", "better_pacing"],
  "reviewerId": "reviewer-123"
}
```

## Governance requirements

- Feedback must never contain credentials or unnecessary personal data.
- Reviewer identity must be pseudonymous in exported datasets unless explicit consent permits otherwise.
- Approval records and preference tags must remain separate: a preference is not release authorization.
- Tags must be append-only; corrections supersede earlier records rather than rewriting history.
- Training exports must include license, consent, retention, and permitted-use metadata.
- Low-confidence or disputed annotations must remain distinguishable from adjudicated labels.
- Automated labels must identify their model and must not masquerade as human feedback.

## Suggested workflow

1. Select a digest-bound release, shot, or candidate pair.
2. Load the applicable rubric and reviewer scope.
3. Capture scores, labels, reason codes, and optional comments.
4. Validate tag vocabulary and target integrity.
5. Sign or attest the annotation.
6. Run disagreement and inter-rater analysis.
7. Adjudicate disputed high-impact labels.
8. Export only approved, privacy-reviewed dataset slices.

## Next: shared storage and governed datasets

1. Add JSON Schemas for annotations, rubrics, and pairwise preferences.
2. Add canonical digest and validation support in `packages/core`.
3. Store annotations as immutable artifacts through `Store`.
4. Add CLI commands for tag creation, verification, adjudication, and export.
5. Connect the existing browser review workspace to authenticated shared storage,
   with explicit migration from its local, unadjudicated annotations.
6. Add dataset cards, consent metadata, and export manifests.
7. Add tests for tamper detection, reviewer scope, redaction, and deterministic exports.
