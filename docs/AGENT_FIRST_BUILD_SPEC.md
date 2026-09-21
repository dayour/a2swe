# Agent-First a2swe Build Specification

Version: 1.0.0. Decision date: 2026-09-17. The user authorized implementation with
"Start implementation" after reviewing the agent-first plan. This authorizes the
build, not subject readiness, content, voice, rights, style, or release approval.
This repository document supersedes the session-only planning copy for build status.

## Product Contract

Create a runnable domain SWE agent FIRST, grounded in reputable public evidence,
real engineering context, and verified subject branding. It must support useful
cited engineering questions and scoped tasks independently of a video. Then create
executive outputs from that approved immutable domain version. Markdown instructions
or a branding dossier alone are not a working SWE agent.

- Support company, customer, topic, framework, repository, and tool profiles.
- Default host: VS Code/GitHub Copilot plus a local runner using supported interfaces.
- Public-source grounding only. No private M365/customer connectors or publication
  actions are enabled by this scope. Installed customization discovery is authorized;
  copying, execution, private access, and redistribution are separate decisions.
- Recent claims require the preceding nine CALENDAR months, with inclusive endpoints
  and month-end clamping. For 2026-09-17, the window starts 2025-12-17. Never use 270 days.
- Preserve separate publication, substantive update, event/market observation,
  retrieval, and source-revision fields. Access today does not make old content fresh.
- Older official foundations require marked exceptions, original dates/unknown status,
  justification, revalidation, scope, reviewer, and approval. They cannot substantiate
  a claim of a recent announcement. Undated/future sources do not pass as recent.
- Source categories include public documentation/code/APIs, materials, logos, icons,
  design language, blogs, reputable news, investor relations, and market observations
  where applicable. Unsupported categories are explicit gaps or not-applicable decisions.
- Financial evidence retains period, fiscal/calendar basis, currency, units/multiplier,
  reported/estimated/adjusted status, timestamp/timezone, restatements, and methodology.
  Live-price claims require a tighter age limit than the nine-month outer bound.
- Target formats: narrated MP4, editable PPTX, searchable PDF, responsive HTML with
  canonical AdaptiveDeck, and editable DOCX. All consume the same cited ContentIR.
- Preserve English-only production, current speech stack, approved WAVs, historical
  pilots, user changes, and separate consent for external speech transfer.
- No cloud deployment, trading, automatic publishing, new commits, or relicensing.

## Architecture

The root Node/TypeScript workspace owns contracts, registry, intake, and durable state.
Remotion/React rendering and Python speech/QC are the active production video
adapter and should attach to the same orchestration, ContentIR, RenderSpec, and
approval records as the planned PPTX, PDF, HTML/AdaptiveDeck, and DOCX adapters.
The documentation site is also independent. Avoid a distributed service stack before
there is a measured requirement.

Proposed flow: intake -> public research -> evidence/brand/code pack -> candidate domain
SWE -> independent evaluation and human approval -> ready version -> ContentIR/style
proof -> format adapters -> independent QA -> final approval -> portable release.

The conductor alone coordinates validated transitions. Bounded roles cover public
research, evidence verification, brand/asset curation, domain engineering, executive
editing, visual direction, production, QA, and release. Roles are declarative capability
profiles, not ten separate services. Imported text cannot grant itself permissions.

`.a2swe/` stores local state and non-distributable evidence. SQLite WAL transactions
own job metadata and receipts; artifacts are content addressed. Future domain packages
are immutable versions identified by a digest. Worker attempts own their directories
and process trees. Never remove another job's global temporary files.

## Current Implementation

### 2026-09-18 Asset Pipeline Increment

Implemented and tested evaluation asset requests/records, bounded raster decode and
normalization, Lucide/pinned-font semantic diagram generation, guarded public raster
acquisition, durable diagram jobs and verified export. A fixed loopback ComfyUI
adapter has synthetic transport tests, not real inference acceptance. Local signed
review verification and a separate domain certification primitive are implemented;
they do not yet authorize production jobs. A separately locked no-tools Copilot SDK
query adapter is typechecked; live attempts encountered authentication failure and
then timeout. See [visual asset pipeline](VISUAL_ASSET_PIPELINE.md) for exact scope,
commands, trust boundaries, proof output, and remaining work. No subject approvals
or new production video were generated. This is partial backlog progress, not A21.

### 2026-09-18 Local Release Foundation Increment

Implemented and tested strict local contracts for selected-asset rights manifests,
ContentIR, RenderSpec, approval bundles, release plans, and format parity manifests.
Release candidates now require approved redistribution grants for each selected
asset and signed content, style, voice, and release approvals bound to the exact
domain/content/style/voice/release digests. The producer cannot self-certify, and
release approval must be independently reviewed. The initial deterministic adapters
produce responsive self-contained HTML, AdaptiveDeck JSON, editable OpenXML PPTX,
editable OpenXML DOCX, searchable text PDF, and a Remotion project/render plan.
The Remotion adapter writes `encodedMp4: false`; it does not claim an MP4 was
rendered. CLI commands `release-plan`, `release-produce`, and `release-verify`
create and verify local release candidates while failing closed on pending rights
or approvals.

### Foundation Baseline

Implemented and locally tested initial slices:

- Strict JSON Schema 2020-12 validation with generated TypeScript declarations for
  draft DomainPack, SourceDocument, EvidenceSpan, Claim, LibraryEntry, WorkItem,
  TaskResult, and artifact references. Runtime checks reject mismatched domain/span
  references, quote digests, invalid dates, and self-declared ready packs.
- Deterministic finite-JSON hashes and UTC calendar-window checks. A quote hash proves
  integrity, not that its source really contains it or supports the claim.
- Passive repository/installed-root inventories: relative source aliases, file hashes,
  case-insensitive skill entrypoints, YAML parsing, ZIP quarantine, metadata fallback,
  generated/sensitive subtree exclusions, and disabled component records. Empty
  dependency/capability lists mean not yet extracted, not independently verified absence.
- Conservative public-read-only resolver rejects unreviewed/unvalidated entries,
  unavailable capabilities, unknown rights, missing dependencies, and cycles. This is
  not the future general producer capability profile.
- Local SQLite receipts, principal-scoped job/artifact reads, revisions, lease fencing,
  checkpoints, explicit unknown-outcome reconciliation, cancellation, and verified output
  hashes. Event HMACs detect modification without the local key; they do not authenticate
  a human or protect against an actor controlling that key or the whole local store.
- Baseline CLI: capabilities, inventory, Git checkpoint snapshot, contract validation,
  draft intake, job submission/status/events. Those baseline commands never invoke a
  model or imported code; the new asset commands are described separately above.

Not implemented end to end: general trusted public source ingestion, bounded archive extraction, complete schema
family beyond the new local release foundation, independently evaluated runnable SWE agent, live-verified Copilot backend,
authenticated remote clients, ACP/MCP transports, full cross-protocol handoffs, owned
worker process supervision, production-grade rendering/QC, encoded MP4 generation,
and subject acceptance. Production submission and self-declared DomainReady validation
deliberately fail closed. The new detached local certification and release primitives
are not integrated production authorization. Direct Remotion/Python production video
architecture scripts remain manual adapter tools outside the new state machine, not
an approved bypass.

This first schema version is a foundation contract, not full A02 acceptance. Missing
fields from the target below require an explicit schema migration before adapters use
them. No current test is evidence of real model inference or executive visual quality.

## Target Data Contracts

- DomainPack: identity/aliases/domains/repositories/tickers, scope/exclusions/audience,
  freshness policy, source/claim/context/code/asset indexes, brand/profile/tool locks,
  evaluation report, gaps/applicability, immutable root digest and review metadata.
- SourceDocument: original/final URLs, publisher/author/title/type, all relevant dates
  and evidence, snapshot/extract hashes and rights, parser/ref/revision, provenance,
  freshness, foundation exceptions, and related/syndicated origins.
- EvidenceSpan/Claim: exact bounded extract, locator/page/line/cell/time, source version,
  quote hash, claim wording/applicability/confidence/qualifications, contradictions,
  factual/inferred/hypothetical label, valid-as-of, reviewer, and disposition.
- Asset/BrandProfile: original logo/media/icons, source-backed palette/type/grid/clearspace,
  font rights/fallbacks, permitted uses/transformations, attribution and expiry. Unknown
  permission blocks bundling; publicly readable is not freely redistributable.
- ContentIR: audience and decision, thesis/sections, shared claim IDs, cited datasets
  with units/transforms, semantic diagrams, code refs, assets/alt text, speaker notes,
  qualifications and citation placements. Video/deck/document mappings share facts.
- WorkItem/Handoff: run/task/parent/domain/version, producer/intended role, objective,
  dependency graph, immutable input/context/claim/brand refs, schema/plugin/skill locks,
  revision, scoped capabilities/path/network/transfer policy, approvals, expected output
  schemas/checks, budgets/deadline, idempotency/trace IDs, checkpoint and blockers.
- TaskResult: task/run/attempt/input/profile/plugin digests, actual outcome, output refs,
  observable summary, command/tool/check results including not-run, usage/timings,
  limitations and next action. Do not persist hidden reasoning.
- Artifact/Event/Approval: logical IDs and portable relative export paths, digest/media
  type/size/producer/input hash/rights, monotonic event cursor, independently authenticated
  reviewer, exact approved operation/content digests, timestamp and expiry.

Date-only fields currently use UTC. Transport paths resolve at trusted boundaries;
ACP paths are absolute, portable exports are relative. Established storyboard frames are
one-based inclusive; Remotion CLI is zero-based. RenderSpec must explicitly map
sample/frame time, dimensions, fps, duration, shot topology, and source-WAV hash.

## Protocol and Durability

Adapters must share the core store, never depend on chat history or sticky transport
state. Stateless MCP does not mean stateless jobs. Use official pinned SDKs and test
against their schemas before advertising conformance. No adapter is present yet.

MCP target from the audit: modern 2026-07-28 plus a separate 2025-11-25 compatibility profile.
Reverify SDK support during A09. Modern requests carry protocolVersion/clientInfo/
clientCapabilities under `params._meta` namespaced `io.modelcontextprotocol/*` keys.
Implement discovery and only advertised tools/resources/prompts. HTTP POST uses
MCP-Protocol-Version/Mcp-Method/applicable Mcp-Name matching body metadata; reject
mismatches and unsupported versions. No modern initialize/session IDs/standalone
GET or DELETE streams/Last-Event-ID replay. Legacy handshake behavior stays separate.
Modern MRTR continuations require principal/input binding, integrity, TTL, replay
prevention, and a new RPC ID with unchanged application idempotency key. Auth and
Origin checks apply on every request. Handles are names, never credentials.

ACP target: protocolVersion 1, official initialize/new/prompt/update/cancel contracts;
permission requests go to the client. Advertise loadSession only when durable replay
exists; resume without replay is separate. Return actual standard stop reasons,
including cancelled after cleanup. Permission to run a tool is not content/release
approval. Copilot SDK/CLI transport is distinct from ACP; native VS Code must not be
assumed to speak ACP. Default Copilot tools require an explicit restrictive allowlist.

Job receipt and input digest commit atomically. Workers claim revisions/fencing tokens,
load immutable inputs, acknowledge/start, checkpoint, and stage results. The coordinator
validates hashes, policy, checks and current lease before publishing a result. Unknown
outcomes require evidence-based reconciliation; do not blindly retry external effects.
Fresh clients recover via IDs and durable state. Cross-protocol tests must include
lost replies, stale approvals, cancellation, transaction failure and terminated workers.
Do not claim exactly-once external execution. Initial target: two workers, one heavy
render, 60-second leases/15-second heartbeats, explicit resource budgets and retention.

Future tools cover capabilities/library list; domain create/status/query/refresh;
production planning; job submit/status/cancel; handoff claim/complete; approval recording;
authorized artifact reads; and review-ready release preparation. No arbitrary shell
passthrough, caller-asserted authority, bearer tokens in URLs, or fabricated PASS output.

## Safety and Approval Authority

Public fetch must defend against DNS/redirect SSRF, private/link-local/metadata IPs,
credentials in URLs, unbounded responses/decompression and unsafe schemes. Ingestion
must reject traversal, ADS, device paths, links/reparse points, collisions, ZIP bombs,
XXE, active HTML/SVG, macros, embedded objects and external Office relationships.
Inventory is not that ingestion boundary. No downloaded script runs during discovery.

This core is for a trusted local OS user. Its Actor argument must come from a trusted
future adapter, never a request body. Local roles and file modes are not Windows OS
isolation or remote authentication. Node's SQLite API remains experimental in 24.8.
Secrets, installed absolute paths, and restricted source bodies stay out of exports.

The user approves scope, foundations, branding, content, voice/external transfer,
style, and release. Independent QA validates the exact candidate's evidence,
engineering and safety results. The conductor binds QA and user decisions to one
DomainPack digest before ready. The producer cannot self-certify. Source/policy/profile
changes create a new verifying version and invalidate dependent gates, not old releases.

Selected-component rights are reviewed separately for use and redistribution. Missing
toolkit license text remains unresolved; do not invent a license. Unrelated disabled
catalog entries need not be cleared to release a different approved selection.

## Prioritized Backlog

Partial means an initial tested slice exists, not task acceptance.

| Task | Priority | Owner and scope | Dependencies | Status / acceptance still required |
| --- | --- | --- | --- | --- |
| A00 | P0 | Architect: spec/context/product contract | First | Implemented docs; local Git/inventory checkpoint records dirty state, not a clean audit |
| A01 | P0 | Registry SWE: catalog/resolve/materialize | A00 | Partial: passive inventories/resolver; complete template ownership, dependency extraction, rights review and import lock remain |
| A02 | P0 | Protocol architect: schemas/types/fixtures | A00 | Partial: initial TS schemas; full schema family, Python parity and migration tests remain |
| A03 | P0 | Runtime SWE: durable jobs/artifacts/workers | A02 | Partial: local store tested; all-boundary fault injection, authenticated approvals, process supervision and resource control remain |
| A04 | P0 | Security SWE: public fetch and safe ingestion | A01,A02 | Partial: guarded raster HTTPS/DNS and decoding tests; general extraction, real-network acceptance and sandbox tests remain |
| A05 | P0 | Research SWE: subject/source/freshness/finance | A02,A04 | Calendar function and draft intake only; live discovery, exact extraction, contradictions and source applicability remain |
| A06 | P0 | Brand curator: brand/asset provenance | A01,A04,A05 | Evaluation asset pipeline implemented; verified subject branding and permitted-use rules remain |
| A06R | P0 | Rights curator: selected rights manifest | A01,A04,A06 | Pending owner-reviewed grants, attribution, expiry and export permission |
| A07 | P0 | Agent SWE: Copilot backend/factory/ready | A01-A06 | Restricted SDK query and local signed certification primitives; live inference, SWE execution and integrated readiness remain |
| A08 | P0 | Independent QA: domain evaluation | A05,A07 | Pending 20 questions, 3 engineering tasks and 8 adversarial cases per subject |
| A09 | P0 | MCP SWE: modern/2025 compatibility SDK adapters | A02,A03 | Pending conformance, per-call auth, metadata/MRTR and fresh-server recovery |
| A10 | P0 | ACP SWE: bridge/native host bindings | A02,A03,A07 | Pending initialize/prompt/permission/load/cancel/replay evidence |
| A11 | P0 | Handoff SWE: complete portable work protocol | A03,A07,A09,A10 | Pending two fresh agents and both cross-protocol directions; partial local lease lifecycle exists |
| A12 | P1 | Executive editor: approved ContentIR | A05-A08 | Pending shared facts/data/citations and content/voice gates |
| A13 | P1 | Renderer SWE: Remotion/TTS/scaffold plugins | A01-A04,A12 | Pending registered adapters, generalized RenderSpec and removal of global cleanup |
| A14 | P1 | Presentation SWE: PPTX/PDF | A01,A02,A06,A12 | Pending native objects/notes/citations, supported browser/converter, rendered-slide review |
| A15 | P1 | Web SWE: HTML/AdaptiveDeck | A01,A02,A06,A12 | Pending pinned canonical schemas, full renderer, responsive/offline/security checks |
| A16 | P1 | Document SWE: DOCX/PDF | A01,A02,A06,A12 | Pending editable headings/tables/TOC/alt text and every-page rendering |
| A17 | P1 | Visual director: authentic topic proof | A06,A12,adapters | Pending 3 video keyframes and 2 slides; independent and user approval before full output |
| A18 | P0 gate | QA: hash-bound fact/media/rights validation | A02 | Pending normal and optimized Python gates, current-artifact evidence and human review |
| A19 | P1 | Release custodian: portable package/revision | A06R,A08,A11,A13-A18 | Pending clean-directory import, complete selected rights/approvals and resume |
| A20 | P0 gate | Build SWE: Windows/Linux CI and profiles | A02 | Core CI added; hosted runs, plugin/model/media/conformance gates remain |
| A21 | P1 | QA and user: four-subject acceptance | A07-A20 | Pending Deere, Copilot, Microsoft and one public repo/tool, all five formats |
| A22 | P2 | Runtime: measured optional scale/cloud/A2A | A21,new scope | Not authorized until measured need and separate approval |

## Verification and Release

Run `npm ci --ignore-scripts`, `npm run contracts:check`, `npm run build`, and `npm test`
for the new core. Synthetic tests must be labeled; they do not replace live inference,
engineering task execution, protocol conformance, or human approval.

After modifying Remotion/Python video adapters, rerun their pipeline tests/typecheck/build and actual
Kokoro/Misaki/ONNX inference as relevant. Preserve approved WAV/timing hashes. Video
visual regression targets the same pinned browser/fonts/profile, SSIM >=0.995 and
text bounds within 1px for non-design changes, not binary-equal MP4s. Never loosen
thresholds after failures. New art direction gets a separate approved baseline.

Executive output defaults target 1920x1080/30fps/48kHz, with a named active 720p video profile.
Verify actual fonts, content recognition, factual mechanisms, citations, accessibility,
voice/pacing, editability, searchable PDFs, responsive HTML, chart units and format
parity. The rejected pilot art direction is a negative benchmark; decorative motion
or brightness cannot certify quality. Release remains blocked while required checks
are failed/not-run, selected rights are unknown, or human approvals are pending.

## References

Audit references, to be reverified against installed SDK versions when implementing:

- [MCP Streamable HTTP](https://modelcontextprotocol.io/specification/2026-07-28/basic/transports/streamable-http)
- [MCP discovery](https://modelcontextprotocol.io/specification/2026-07-28/server/discover)
- [MCP MRTR](https://modelcontextprotocol.io/specification/2026-07-28/basic/patterns/mrtr)
- [ACP initialization](https://agentclientprotocol.com/protocol/v1/initialization)
- [ACP session setup](https://agentclientprotocol.com/protocol/v1/session-setup)
- [ACP prompt turns](https://agentclientprotocol.com/protocol/v1/prompt-turn)
- [GitHub Copilot SDK](https://github.com/github/copilot-sdk)
- [VS Code custom agents](https://code.visualstudio.com/docs/agent-customization/custom-agents)
- [VS Code MCP servers](https://code.visualstudio.com/docs/agent-customization/mcp-servers)
