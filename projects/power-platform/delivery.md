# Power Platform SWE and Explainer Review Package

Status: candidate/pre-production review, not a completed video or approved domain.
As of 2026-09-17. The user asked for an agent, video, and comparison with original
assets, and delegated routine choices while unavailable. This package records what
could be completed without inventing approvals or bypassing the a2swe core.

## Artifacts

- [Native VS Code candidate profile](../../.github/agents/power-platform-swe.agent.md):
  Power Platform SWE (Candidate), read/search only. It can be selected in the host
  for grounded architecture review and test planning; actual host invocation has
  not been verified. It cannot edit, execute code, access tenants, or produce media.
- [Domain candidate](domain/candidate.json): seven sources, 21 claim/evidence links,
  still draft. This is not a trained model or standalone reasoning service.
- [Source records and applicability](research/sources.json): official URLs, dates,
  reported Git revisions, bounded excerpts, qualifications and explicit gaps.
- [Explainer brief and complete proposed narration](brief.md): 60-second target,
  115 words, local Kokoro proposal, one maintenance-request delivery example.
- [Evaluation cases](qc/evaluation-cases.json): 20 questions, three engineering
  tasks, eight adversarial cases. Case presence alone does not mean tests passed.
- [Artifact manifest](qc/manifest.json) and [baseline hashes](qc/baseline.json):
  reproducible integrity and structural checks; original assets are unchanged.
- [Findings-first comparison and replay adjudication](qc/comparison.md): original
  assets versus candidate, actual answer defects, applied refinements, and limits.
- [Initial replay](qc/instruction-replay-initial.txt) and
  [targeted refined replay](qc/instruction-replay-refined.txt): verbatim model
  outputs; reviewer self-awarded grades are not authoritative results.

## Approval and Capability State

| Gate | State | Exact limitation |
| --- | --- | --- |
| Working audience, length and comparison choice | Selected autonomously | Engineering leaders, 60 seconds, prior Microsoft/Copilot assets; not recorded as user sign-off |
| Evidence and engineering scope | Candidate | Narrow ALM/plug-in/governance review, not complete Power Platform expertise |
| Foundational exceptions | Pending | ALM and solution concepts have 2025 documentation dates |
| Brand/asset use | Pending | Official icon terms inspected; no archive imported or approved brand pack |
| Independent evaluation | Partial | 31-case instruction replay adjudicated; 12 assisted regression cases rerun after refinement; native-host execution and tenant tests not run |
| DomainReady | Blocked | Core certification is unimplemented; no user approval |
| Content and voice | Pending | Proposed narration and local voice choice have not been approved |
| Video/style/audio QA | Not run | No new TTS, stills, timeline or MP4; no claim of visual improvement |
| Release | Blocked | Depends on preceding gates and selected-component rights |

## Reproduce

From the repository root, run:

```powershell
node projects/power-platform/build-review.mjs
npm run a2swe -- validate --schema DomainPack --file projects/power-platform/domain/candidate.json
```

The review builder validates the graph and profile, hashes local excerpt records,
measures proposed narration length, and verifies the original baseline files have
not changed since capture. It also tests rejection of a forced ready state. It does not call a model, network service, tenant, or
renderer. Its manifest is a build/check record, not independent fact verification.

## Next Gate

Review the source/foundation scope and proposed script/voice. Complete the core's
DomainReady/approval implementation and actual host/backend evaluation; do not simply
set state to ready or run the legacy renderer around the guard. Then inspect three
full-resolution style frames and the pilot before final video production and the
requested audiovisual comparison. The missing MP4 is an unmet deliverable, not an
equivalent substitution by this document.
