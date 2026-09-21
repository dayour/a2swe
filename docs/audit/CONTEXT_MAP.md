# Context Map and Audit Boundaries

Audit date: 2026-09-17. This map routes bounded work; it is not security certification
of every binary, installed package, archive, or skill. Source and metadata were reviewed
in chunks; models, rendered media, schema collections and archives were inventoried
without blanket execution. The current dirty worktree includes user changes and an
independent Docusaurus site. Existing files must be read before editing.

| Chunk | Owning surfaces | Evidence and next boundary |
| --- | --- | --- |
| CTX00 Product | README, SKILL, BRAND_CONTENT_SPEC, CITATION, reference rules | Agent-first ordering updated; missing license text still blocks redistribution decisions |
| CTX01 Composition | template/src/{Root,Main,config}, common types/timeline/subs, G1-G8 | Established one-based inclusive frame contracts; RenderSpec must generalize dimensions/duration/topology |
| CTX02 Visuals | template/src/{ui,fx}, common primitives/fonts/overlay | Keep mechanics; active 720p space theme remains the current video profile; required font failures currently need hardening |
| CTX03 Speech | template/scripts/{tts_build,verify_models,test_pipeline}, requirements, speech-stack reference | Preserve runtime fingerprints, atomic WAV writes, immutable fork pins and real inference evidence |
| CTX04 Production | template/scripts scaffold/render/storyboard/QC tools | Generalize fixed six-shot/900-frame checks, eliminate assert-based gates and global temporary cleanup |
| CTX05 Pilots | projects/{john-deere,copilot,microsoft} | Historical media/QC fixtures; technical passes are not executive visual or human listening approval |
| CTX06 Research | library curation/source/governance/evaluation skills | Reuse bounded extraction and source analysis; private tools remain disabled |
| CTX07 Editorial | library media/brand/chart/process/story skills | Host-specific scripts require explicit capability, rights and runtime review |
| CTX08 Office | library/skills/office and archive packs | Bounded Office ingestion and portable browser backend needed; ZIP presence is not execution readiness |
| CTX09 Domain | library analytics, mapping, compliance and specialist skills | Optional specialization; simulations are not public financial facts |
| CTX10 Private/host | M365, Work IQ, SharePoint, automations and publishing skills | Discover only; public-grounding profile cannot invoke private reads or external writes |
| CTX11 Installed | explicitly selected user agent/skill/plugin roots | Local source aliases, reference-only disposition; no copied credentials, private knowledge or inherited tool authority |
| CTX12 Generated | dependencies, models, renders, caches, VCS internals | Explicit excluded subtree or hash-only binary; not model prompt context or audited executable source |

The planning inventory observed 653 library files, 91 case-insensitive skill
entrypoints, and 92 metadata files. These are historical path counts, not capability
counts. The generated inventory is authoritative for its own revision and exclusions.
Office subskills, lowercase entrypoints, ZIP-only packages and automation-only records
must not be silently dropped. Metadata-only classification is provisional until reviewed.

## Reproduce a Local Checkpoint

```powershell
npm run a2swe -- snapshot --root . --out .a2swe/audit/checkpoint.json
npm run a2swe -- inventory --root library --source library --kind repository --out .a2swe/inventory/library.json
npm run a2swe -- inventory --root template --source template --kind repository --out .a2swe/inventory/template.json
```

Use an explicit installed root with `--kind installed` and a portable `--source` alias.
Do not scan a whole user profile. Reports store relative paths, SHA-256, dispositions,
component associations, parse findings and disabled entries. Source locations are local
CLI arguments, not exported absolute paths. Snapshots record actual Git HEAD, dirty
statuses, and available dirty-file hashes. They are implementation checkpoints, not a
reconstructed pre-edit state. Local reports are ignored because source rights remain
unreviewed. Excluded directories represent their entire subtree; file hashes are null
when intentionally not read. Unassigned files remain explicit review work.

## Next Context Index

A01 still needs symbol/heading-aware context records: chunk ID, canonical path/hash,
source revision/dirty status, parser, span, token estimate, summary, dependencies,
entrypoints, risks, tests, review depth and disposition. Target 800-1600 tokens per
chunk with limited overlap; keep tables and citations intact. Pack only the domain
summary and task-relevant immutable chunks. Changed source/policy invalidates dependents.
The passive file inventory is not this semantic index and is not blanket import approval.

## Verified Reuse Anchors

- knowledge-corpus-curator: bounded ZIP validation/extraction and corpus inventory.
- agent-harness-explorer: canonical capability snapshot hashing, not approval hashing.
- classic-text-adventure: checkpoint/idempotency test patterns only, not role behavior.
- office/pptx: object geometry and editability checks; machine-specific browser paths need replacement.
- brand-template-enforcer: disabled manifest patterns, not verified customer brand files.
- process-sop-architect: structured brief feeding multiple editable outputs.

Do not revive disconfirmed audit claims: engine is present in TTS cache keys; audio
timing advances by actual duration, not cumulatively rounded frames; frame metrics
already include median/minimum measurements; stateless MCP can use a durable store.
