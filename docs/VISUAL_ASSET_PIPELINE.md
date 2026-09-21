# Visual Asset Pipeline

Implementation checkpoint: 2026-09-18. These are working evaluation tools, not a
completed agent-to-executive-output system. Production and release remain disabled.

## What Changed

The previous iteration improved evidence records and prompts without producing a
working visual asset pipeline. Its reviewer also awarded passes to unsupported
answers. This iteration addresses executable boundaries first: actual raster
generation, decoding, provenance, durable jobs, constrained inference adapters,
and signature verification. Tests and model-written reviews are not human approval.

| Component | Implemented behavior | Remaining limit |
| --- | --- | --- |
| Asset contracts | Strict requests/records; dimensions, purpose, role, provenance and hashes | Evaluation only; no approved brand pack |
| Procedural diagrams | Lucide symbols, pinned bundled font, measured labels, contrast checks, 1080p output | Sequential 2-5 node layouts only; no arbitrary semantic graph or animation |
| Raster import | Bounded PNG/JPEG/WebP decode and PNG normalization; metadata stripped | No SVG, archives, video, PDF, Office, animation or OS decoder sandbox |
| Public raster fetch | HTTPS, public DNS/IP checks, pinned connection, TLS hostname verification, same-host redirects, time/byte limits | No general research ingestion; no live public-download acceptance run |
| Durable asset jobs | Store receipts, leases, fencing, verified artifacts, replay and export | Fixed diagram worker only; no worker subprocess isolation or general scheduler |
| Local diffusion | ComfyUI fixed graph, seed, checkpoint name, durable prompt ID, bounded history/output collection | Transport tests are synthetic; local server unavailable; weights/version not verified |
| Approval verification | Ed25519 signatures tied to scope, subject/evidence digests, reviewer policy and expiry | Local key trust, not remote identity or proof a human performed a review |
| Domain certification | Independent QA/user keys, current-date verifying pack, reviewed claims, execution attestations | Standalone primitive, not integrated production authorization; source verification is attested |
| Copilot integration | Existing-profile SDK, native CLI bridges, persistent sessions; separate no-tools evidence query | Profile auth, live turn, resume and catalog discovery passed; restricted query's earlier inference failures are not reclassified |

## Generate a Proof

From the repository root:

```powershell
npm ci --ignore-scripts
npm run assets:proof
```

The command creates a new UUID-named directory beneath `.a2swe/`, generates three
synthetic diagrams through the durable worker, verifies their bundles, and writes
a contact sheet and proof manifest. An optional `-- --out NEW_DIRECTORY` selects
the directory; an existing destination is never overwritten. These images are
engineering fixtures, not factual Power Platform content or approved style frames.

Each bundle contains `request.json`, `asset.json`, and `asset.png`. The record binds
the request and domain digests to the raster digest, dimensions, alt text and
generation method. Both rights and visual review remain pending. Integrity hashes
are not authenticity, factual support, or licensing decisions.

Example request, with the domain digest replaced by the actual pack digest:

```json
{
  "schemaVersion": "1.0.0",
  "assetId": "delivery-flow",
  "domainDigest": "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
  "purpose": "evaluation",
  "method": "diagram",
  "role": "diagram",
  "title": "Source to release artifact",
  "prompt": "Synthetic engineering diagram, not a product capability claim.",
  "alt": "Versioned source leads to an immutable artifact and independent review.",
  "width": 1920,
  "height": 1080,
  "seed": 42,
  "palette": ["#fbfcfd", "#182322", "#00786b"],
  "nodes": [
    { "symbol": "code", "label": "Source", "detail": "Versioned components" },
    { "symbol": "artifact", "label": "Artifact", "detail": "One immutable build" },
    { "symbol": "review", "label": "Review", "detail": "Independent checks" }
  ]
}
```

`seed` is retained for a common request format; diagrams are deterministic without
randomness. Diffusion consumes the seed, but it does not guarantee byte-identical
results across hardware or model versions. Diagrams record font, Lucide, Sharp and
libvips versions; byte equality is tested within one environment, not across OSes.

Run `npm run a2swe -- --help` for direct and durable commands. Durable submission
requires the actual domain pack, checks its digest, and returns a task ID. Run that
ID with `asset-job-run`, then use `asset-job-export` to materialize its verified
evaluation bundle. Completed jobs replay without rerendering. Cancelled or expired
running work is not silently retried. Export is not production approval.

## Import and Diffusion

`asset-import` uses a local raster and a user-declared HTTPS provenance URL. It does
not establish that the local bytes came from that URL. `asset-fetch` retrieves the
bytes itself with the guarded HTTPS client. Both require `method: import`, known
exact dimensions, and a new output directory. Normalization does not resize, crop
or rotate; unknown rights remain pending. Original source bodies are not bundled.
Public acquisition retains the final URL, retrieval time and original-byte digest;
it is not the full source-snapshot/revision contract required for general research.

An `official_mark` can only be imported, never generated. This is a role check,
not visual trademark detection. It cannot prove an imported image is authentic.
Generated artwork is restricted to illustration use and still needs human review.

Diffusion requires an already-running trusted ComfyUI service at
`http://127.0.0.1:PORT`, an already-installed compatible `.safetensors` checkpoint,
`method: diffusion`, `role: illustration`, empty `nodes`, and dimensions divisible
by 64, at most 1536 per axis. The adapter supports a fixed standard checkpoint /
CLIP / empty latent / Euler sampler / VAE / SaveImage workflow. It does not support
arbitrary custom workflows or guarantee compatibility with every model family.

Submit once with `asset-diffusion-submit`, then collect using its saved receipt.
The receipt is written before submission. A lost reply leaves `outcome_unknown`;
collection queries the same prompt ID rather than blindly submitting again.
Collection returning `pending_or_unknown` is not success or proof of nonexecution.
No global ComfyUI interruption command is sent. Active external jobs are not
cancelled or resource-supervised by this adapter. No model is auto-downloaded and
no cloud endpoint is allowed. A loopback service is trusted software, not a sandbox.

## Local Review Signatures

The approval API accepts canonical-JSON Ed25519 signatures over an
`ApprovalStatement`: reviewer ID, scope, subject digest, evidence digest, approve /
reject decision, issuance and expiry. A trusted local policy supplies reviewer
public keys, permitted scopes, producer identity and revoked approval digests.
The producer is not allowed to approve its own output. Domain QA and user decisions
must use distinct IDs and distinct keys. Private keys never belong in a DomainPack.

`domain-certify` verifies an exact domain/profile pair and a signed review with
20 question, three engineering, and eight adversarial passes, actual execution and
source-verification attestations, no unresolved gaps, and reviewed older foundations.
The pack must be `verifying`, have supported claims, and be reviewed for the current
UTC date. A detached certificate does not change the pack's state or unlock jobs.
Re-run verification against trusted policy, current time and exact evidence on use;
never trust a stored `status: ready` string. No actual approval was created here.

This is a local attestation primitive. It does not independently establish signer
identity, role assignment, evidence truth, source-update substance, or actual test
execution. Authenticated enrollment, detailed foundation/rights records and
integration with production/release transitions are still required.

## Existing Copilot Profile

The normal SDK command uses `mode: "copilot-cli"`, the installed standalone CLI,
and `COPILOT_HOME` or the current user's `~/.copilot`. It leaves native catalogs
unoverridden and enables configuration, instructions, skills, file hooks and
session-store discovery. The runtime performs credential/keychain lookup; a2swe
does not read, copy or ask you to paste tokens. No new runtime is installed by
the SDK adapter. It is a trusted local-user integration, not a multi-user service.

```powershell
npm --prefix integrations/copilot ci --omit=optional --ignore-scripts
npm run copilot:sdk -- --capabilities
npm run copilot:sdk -- --doctor
npm run copilot:sdk -- --sessions
npm run copilot:sdk -- --catalogs
npm run copilot:sdk -- --agent dayour-dev --prompt "Review this repository"
npm run copilot:sdk -- --resume SESSION_ID --prompt "Continue the review"
npm run copilot:sdk -- --permissions ask --prompt "Review this repository"
```

`--capabilities` probes the selected executable with `--no-auto-update --version`
and `--no-auto-update --help`, without authentication or inference. It lists
advertised commands/options separately from implemented SDK controls; it does
not claim each native feature has been executed successfully. Each subprocess
has a 15-second timeout and a 256 KiB output cap. It never probes Agency, which
may download a runtime. SDK and native executable selection remain explicit;
no silent version upgrade or switching occurs. Native runs retain native update
behavior unless you forward `--no-auto-update` yourself.

`--doctor` reports executable/home/cwd, connected runtime status, authentication,
permission mode and session count, without inference. `--sessions` lists IDs and timestamps, not transcripts.
`--catalogs` creates a persisted session and returns discovered agent, skill and
plugin names without their prompts. Select an available name using `--agent`.
Closing the SDK connection preserves its session for SDK or native CLI resume.
Remote session export/control is not enabled by a2swe.

Normal sessions use `--permissions auto` by default: the official SDK `approveAll`
helper approves unmanaged requests without a TTY or per-tool prompt. Requests
requiring managed approval, or with managed settings enabled, are rejected with
`blocked_by_policy`; use the native policy-aware flow rather than bypassing that
restriction. `--permissions ask` restores one-time terminal confirmation (non-TTY
requests reject), and `--permissions deny` rejects requests reaching the handler.
Neither restrictive mode hides tool catalogs nor prevents native configuration,
plugins, hooks or MCP initialization from executing before a callback. These are
permission policies, not isolation. Actual user questions remain separate from
tool permissions and require an interactive terminal in this command.

`--trust-profile` remains accepted as a compatibility flag but is no longer
required. No global permission file, alias, or installed customization is rewritten.
Tools run with the user's filesystem and network access; automatic approval does
not make private session data public evidence or grant final media release approval.
The restricted evidence evaluator below retains its no-tools policy.
Use the native CLI for its full permission UI, login, slash commands,
plugin/skill/MCP management, Agency profiles and interactive session picker:

```powershell
npm run copilot -- --help
npm run agency:copilot -- --help
npm run copilot -- plugin --help
npm run copilot -- skill --help
npm run copilot -- mcp --help
npm run copilot -- sessions --help
npm run copilot -- memories --help
npm run copilot -- instruction --help
npm run copilot -- lsp --help
npm run copilot -- --resume
npm run agency:copilot -- --agent dayour-dev
```

These bridges inherit terminal I/O, forward arguments without a shell, and use
the calling workspace (`INIT_CWD` under npm). Native runtime behavior, including
Agency's downloads/updates and configuration merging, remains owned by those
tools. a2swe does not duplicate or rewrite their configuration.

Override executable/home/cwd for SDK with `--cli ABSOLUTE_EXECUTABLE`,
`--runtime-home DIRECTORY`, and `--cwd DIRECTORY`. For native bridges, place
`--cli` and `--runtime-home` before forwarded CLI arguments; native `-C` changes
the workspace. `A2SWE_COPILOT_CLI` sets the executable, `A2SWE_COPILOT_RUNTIME`
selects `copilot` or `agency`, and `COPILOT_HOME` sets the profile. SDK sessions
only accept the `copilot` runtime. On Windows, discovery prefers existing WinGet
Copilot / Agency CurrentVersion executables, then PATH executables; auto-install
shell wrappers are not selected. An explicit executable always takes precedence.

Agency's current launcher adds `--session-id`, which conflicts with the SDK's
`--headless` argument. Therefore SDK startup rejects Agency before launch. Use
the native Agency bridge, or point SDK `--cli` directly at an existing Copilot
executable. This does not reproduce Agency's wrapper-specific configuration merge.

Local verification on 2026-09-18: standalone authentication succeeded against
the existing profile (356 sessions at the time), a live marker response passed,
and a fresh process resumed that session with its prior context. Catalog APIs
discovered 82 agents, 24 skills and 2 plugins. Both native help bridges passed.
The initial Agency SDK compatibility probe failed as described above; Agency
automatically installed its configured Copilot 1.0.85 during that probe. No
credentials were copied and no existing sessions were deleted. These checks do
not certify every installed plugin/tool, engineering execution or DomainReady.

Automatic-permission increment, 2026-09-18: a real non-TTY SDK session created an
owned sentinel file using a tool without an approval prompt. A fresh process then
resumed the same session and recalled its marker. The test removed only its
temporary directory; the native session remains in the user's Copilot home.
The selected WinGet executable reported CLI 1.0.86 without updating during the
capability probe, including the sessions/memories/instruction/lsp commands and
fleet/auto-tier options from the supplied CLI help. Native forwarding regression
tests include repeated options, paths with spaces and shell metacharacters.

The live acceptance test is opt-in via `A2SWE_LIVE_COPILOT_TEST=1` when running
the integration tests; it uses existing authentication and model credits. Default
CI skips it. Browser workbench, live attachment, structured controls for the rest
of the CLI, and integrated production video jobs remain planned, not implemented
by this increment.

## Restricted Copilot Query

The optional integration has a separate lock so the root asset tools do not need
a second large Copilot runtime:

```powershell
npm --prefix integrations/copilot ci --omit=optional --ignore-scripts
npm --prefix integrations/copilot run typecheck
```

Use an installed supported CLI executable, not an auto-install bootstrapper. Sign
in through the standalone CLI's normal supported flow outside this chat; do not
send tokens or credentials to the assistant. The SDK uses the CLI's configured
authentication home without reading or copying credentials in application code.
`--cli` is optional and uses the same standalone executable resolver.
`--runtime-home` can select an explicitly configured home. The working directory
is a fresh temporary directory. Owned runtime data is retained for diagnosis.

```powershell
npm --prefix integrations/copilot run query -- --domain ../../projects/power-platform/domain/candidate.json --question "Does deployment include table records?" --out ../../.a2swe/query.json --cli C:/path/to/copilot.exe --allow-copilot-transfer
```

This explicitly transfers the question and selected pack excerpts to Copilot.
It does not authorize private inputs. Default model is `gpt-5-mini`; use `--model`
for an available model. It disables all tools, MCP servers, file hooks, skills,
customization discovery, memory and session-store retrieval. It denies permissions
and applies operation deadlines. It is a bounded Q&A path, not a code executor,
native VS Code profile invocation, OS sandbox, or completed SWE agent.

Returned fact text and citations come from the input pack, not model paraphrases.
Claim relevance and generated proposals still require independent review. The app
does not export raw session events or reasoning traces. CLI authentication/runtime
storage remains under the CLI's own policy. No live inference pass is claimed.
This restricted evaluator intentionally retains SDK `empty` mode, which disables
keychain lookup in SDK 1.0.14. It is not the normal profile-backed session command
above; the successful profile smoke test does not validate this evaluator.

## Validation and Remaining Work

Run the core typecheck, generated-contract check and tests, plus the optional SDK
typecheck and integration tests. Tests cover actual diagram pixels, bounded ingestion, metadata/integrity,
durable jobs, cancellation, synthetic ComfyUI transport and synthetic reviewer keys.
The inspected 2026-09-18 three-image proof had readable labels and no observed
overlap. This is local engineering review, not independent or user style acceptance.

Remaining implementation includes the full source/brand/rights schema and ingestion,
safe archive handling, authenticated review enrollment, sandboxed SWE execution,
ACP/MCP conformance and cross-protocol recovery, shared ContentIR and all five output
adapters, media approval transitions, release packaging and four-subject acceptance.
Power Platform still has no new narrated MP4. Live diffusion is blocked by the absent
local service/model; the restricted domain-query inference has not passed. The
existing-profile SDK path has passed a live turn and resume. A bundled SDK install
hit insufficient disk space and was removed; the lightweight integration succeeded.

Do not describe this checkpoint as complete A00-A21 implementation. The original
Power Platform pack, existing narration/audio and historical movies are unchanged.
