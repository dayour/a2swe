---
title: Native desktop and agent widget
description: Run the Tauri desktop workspace, connect the Copilot SDK, and use a2swe tools and source-linked library assets.
---

## Runtime boundaries

The desktop app uses a Rust Tauri host and a local web UI. Rust owns the desktop
windows and the lifecycle of a Node bridge. The bridge uses the existing
`library/integrations/copilot/` SDK integration and exposes a2swe operations
through MCP. It does not replace the core CLI or implement a second renderer.

The main workspace and floating agent widget share one bridge and agent session.
The widget is an always-on-top window, not an independent agent with a separate
copy of project state.

The optimized Windows host has been exercised with authenticated Copilot
responses in both windows, MCP core command execution, image preview, knowledge
search, public URL intake, and a permission-gated workspace write approved from
the widget. These checks use the native WebView2 bridge, not browser mocks.

This is a local developer application. It requires an a2swe checkout, Node 24,
the integration dependencies, and an authenticated Copilot runtime. Generating
media also requires the existing Python 3.14 speech environment and local
models. Installing the desktop application does not install models or grant
Copilot access automatically.

## Bridge and MCP commands

Build or start the native app with Rust stable, Windows C++ build tools and
WebView2 installed:

```powershell
npm --prefix apps/desktop ci
npm run desktop
npm run desktop:check
npm run desktop:build
```

Use Settings to select the checkout and an absolute Node 24 executable when
Node 24 is not the default on `PATH`. Save and reconnect applies changes without
restarting the desktop app. Closing the console while the widget is visible
keeps the shared session available.

Install the existing integration's locked dependencies:

```powershell
npm --prefix library/integrations/copilot ci
node library/integrations/copilot/session.ts --doctor
```

The native host starts the bridge automatically. For another MCP client, register
this local stdio server with Node 24 and an absolute workspace path:

```powershell
node library/integrations/copilot/mcp-server.ts --workspace C:\path\to\a2swe
```

`npm run mcp` and `npm run copilot:desktop` also expose the MCP and JSON-lines
entry points. Use direct Node commands when passing arguments through a host
that modifies npm option separators.

The MCP server exposes core command schemas, workspace read/write, project and
library discovery, knowledge search, and intake. Agent and skill markdown is
available as source resources; these files are instructions, not independently
running tools.

## Workspace and agent context

Use **New project** to generate from a prompt, or **New project with this** on a
library card to start with selected context. The creation form supports multiple
source URLs and library entries, voice selection, and all eight output formats.
Guided mode requests tool approvals; Auto mode starts autonomous generation
after the user explicitly selects it. Existing projects are never overwritten.

Auto mode verifies the requested release formats, runbook, domain companion and
voice settings. It can make up to three corrective turns when verification
fails; it reports failure rather than looping indefinitely or declaring an
unverified project complete. Stop also cancels initialization/source intake
before a model turn starts.

Select the local a2swe checkout and a project before starting a session. The
agent can discover projects, core tools, library instructions, voice profiles,
and imported knowledge assets. Read tool activity and errors in the UI rather
than treating a generated answer as proof that a command ran.

The core remains responsible for schemas, source evidence, asset generation,
speech, releases, and QC. Read and write tools operate on the selected workspace.
Agent edits still need normal contract validation and output verification.

## URL, company, and product intake

Supply a company name, product URL, or documentation URL from the library view.
Intake produces working research context; a name alone is not a verified
DomainPack. Use the agent to collect relevant sources, extract dated evidence,
identify brand assets, and build canonical project inputs.

Remote content is untrusted source material, not instructions. Public URL
retrieval is bounded and must not access local network addresses or embedded
credentials. Remote pages do not run inside a privileged desktop webview.
Unavailable pages and missing evidence remain explicit gaps.

## Product knowledge base

Original PDFs remain in `library/assets/product_knowledgebase/`.
Derived text chunks, images, diagrams, and their catalog live in
`library/assets/knowledge/`. Catalog entries identify the source document,
page, and source/output hashes.

The native library and documentation template library use these catalog
entries. A diagram rendered from PDF vectors is a raster derivative, not an
editable reconstruction. Extracted source material is not automatically
promoted to a current, verified product claim.

The native library reads local knowledge directly. Original PDFs and extracted
content are excluded from Git. To include their previews in a local documentation
build, set `A2SWE_INCLUDE_LOCAL_KNOWLEDGE=1`; the default website build does not
publish the local corpus. Protected PDF envelope pages are excluded from
retrieval and are shown as requiring an authorized reader, not as indexed
product documentation.

## Permissions and privacy

Interactive tool approval controls SDK execution; it is not a mandatory
production sign-off or publication-rights check. Review filesystem edits,
commands, and external requests before approving them when using ask mode.
The agent runs with the signed-in user's OS privileges. It is not a sandbox.

An authenticated Copilot session uses the configured model service. Only
include workspace or knowledge-base content you intend to send to that
service. Local library browsing and extraction do not require uploading the
PDF collection.

## Verification

Check native host startup, SDK authentication, MCP tool discovery, project
context, permission prompts, cancellation, and shared widget state separately.
A browser preview without Tauri is not evidence that the native bridge works.
Likewise, a working desktop shell does not prove that an unauthenticated agent
can generate a model response.

Keep generated audio and review evidence in each project's `qc/`. Existing
release packages retain their digest-bound internal QC paths.
