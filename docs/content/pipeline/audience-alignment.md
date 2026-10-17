---
title: Audience alignment
description: Rank claims, sections and video scenes for internal and external audiences, and align content for either one.
---

# Audience alignment

Every project is aligned for an audience before delivery:

- **Internal** readers belong to the organization that owns the engagement or
  product. Internal-only sources may be used, and every output carries an
  Internal marking.
- **External** readers are customers and partners. Content for them may cite only
  public or customer-shared sources and must not restate or name internal-only
  material.

## Source distribution

Each DomainPack source has a distribution: `public`, `customer` or `internal`.
`account-import` records it explicitly:

- CRM, Success Hub, Microsoft 365 mail and chat, and tracker records are internal.
- Market, company and news facts are public.

When a source has no recorded distribution, it is inferred from its host. CRM,
Success Hub, Outlook, Teams, SharePoint, Loop, Office and Azure DevOps hosts are
internal; every other HTTPS host is public. Set `distribution` on the source to
override the inference, for example `customer` for a document the customer
shared with you.

## Content distribution

`ContentIR.distribution` is `internal` or `external`. When a project does not
declare one, `canonical-bind` derives it from the cited evidence: internal when
anything cited is internal-only, otherwise external.

The ContentIR contract rejects external content that cites internal-only
evidence (`content_distribution_violation`). Content aligned for internal readers
is marked in every format:

| Format | Internal marking |
| --- | --- |
| Video | "Internal ·" before the deck kicker in the header band of every frame |
| PowerPoint | The same label in the brand band of every slide |
| Word | "Internal: not for external distribution" page header |
| PDF and PNG/JPEG overviews | The label in the brand band |
| HTML | The label in the masthead |
| AdaptiveDeck | An `internal` tag and a notice on the title slide |

External content and content without a declared distribution carry no marking.

## Semantic alignment ranking

```powershell
node packages/core/bin/a2swe.mjs alignment-rank --root projects/<id>
```

The command ranks the release content, or the canonical content with
`--canonical`, for both audiences. It writes `qc/alignment/report.md` and
`qc/alignment/alignment.json`. It embeds every claim, section, narration
sentence, speaker note, diagram label and evidence quote with a local sentence
model, then measures:

| Measure | Meaning |
| --- | --- |
| Relevance | Similarity to the audience's priorities, with the best-matching priority named |
| Grounding | How closely each narration sentence matches its own cited claims and evidence; weak sentences are listed |
| Decision support | Similarity of each section and claim to the decision |
| Eligibility | Whether every cited evidence span is allowed for the audience |
| Leakage (external) | Sentences that use an internal marker term, restate internal-only evidence (similarity 0.6 or more, and at least 0.08 closer to internal than to shareable evidence), or name acronyms and multi-word names found only in internal sources |
| Said versus shown | Per video scene, similarity between the narration and what is on screen: the diagram labels, the evidence cards or the headline and decision |

Claims and sections are ranked per audience. The report lists blockers, warnings,
the recommended section order, the lead claim and the scene table. An audience is
ready when it has no blockers.

The audience priorities, allowed distributions and internal marker terms live in
`library/assets/alignment/audience-profiles.json`. Edit that file to change what
each audience cares about; the report records its digest.

Scores are cosine similarities of local sentence embeddings, scaled to 0-1 for
ranking. They measure semantic closeness, not truth. The ContentIR contract still
binds every claim to verbatim evidence.

## Aligning content

```powershell
node packages/core/bin/a2swe.mjs alignment-apply --root projects/<id> --audience internal
node packages/core/bin/a2swe.mjs alignment-apply --root projects/<id> --audience external
```

- `internal` sets the distribution so every output is marked, then rebinds the
  canonical inputs.
- `external` keeps only claims whose evidence is shareable and drops sections
  left without claims. It then checks the remaining titles, narration, notes and
  diagram labels for leakage. If any blocker remains, it writes
  `qc/alignment/external-candidate.md`, leaves the canonical content unchanged
  and stops. Rewrite the listed sentences, or author a separate external
  briefing from shareable sources.

Render a new revision after aligning so the outputs carry the change.

In the desktop app, Pro mode's **Align for** option sets the audience for a
generated project. The project VS Code workspace has an **a2swe: align for
audience** task, and its full pipeline task runs `alignment-rank` before
`runbook-project`.

## Runbook gate

`runbook-project` adds an `audience-alignment` gate. It passes when
`qc/alignment/alignment.json` analyzed exactly the current release and the
effective audience has no blockers.

## Model

The ranking uses
[sentence-transformers/all-MiniLM-L6-v2](https://huggingface.co/sentence-transformers/all-MiniLM-L6-v2)
(Apache-2.0) as an ONNX graph. The model runs on the CPU in the repository
`.venv` with no network access. The revision and file SHA-256 digests are pinned in
`library/assets/semantic/models.json`; every run verifies them.

Install the model once:

```powershell
node packages/core/bin/a2swe.mjs semantic-model --install
```

Without `--install`, `semantic-model` reports the verified model.
