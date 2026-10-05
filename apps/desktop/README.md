---
title: a2swe native desktop
description: Native Rust workspace and floating Copilot agent connected to a2swe through MCP.
---

This is the Tauri v2 desktop shell for a2swe. The React UI is intentionally
not a standalone mock: it only displays projects, library entries, statuses,
messages, permissions, inputs, and tool events returned by the native Rust
bridge.

The shell follows Tauri's command/event IPC model:
[Calling Rust](https://v2.tauri.app/develop/calling-rust/),
[capabilities](https://v2.tauri.app/security/capabilities/), and the
[configuration reference](https://v2.tauri.app/reference/config/).

## Development

From the repository root:

```powershell
npm --prefix library/integrations/copilot ci
npm --prefix apps/desktop ci
npm --prefix apps/desktop run tauri:dev
```

The Rust process starts one Node child:

```text
<node> library/integrations/copilot/desktop.ts --workspace <selected workspace>
```

Node is resolved in this order:

1. The saved `nodePath` setting.
2. `A2SWE_NODE`.
3. `node` on `PATH`.

The default workspace is the repository root resolved from the Rust source
location. The workspace and optional Node path are persisted in the native app
config directory. The backend adapter is supplied by
`library/integrations/copilot/desktop.ts`; if it is missing, the shell starts
but reports the concrete bridge error and does not fabricate data.

## Protocol

The Rust bridge accepts only the methods listed in `src-tauri/src/main.rs`,
forwards newline-delimited JSON asynchronously, waits up to 45 seconds for control
replies (30 minutes for a core tool operation),
and emits backend events as `a2swe-bridge-event`. No arbitrary shell command is
exposed to the webview. Image previews use the scoped Rust `read_image`
command, limited to the selected workspace and 10 MB.

## Production build

```powershell
npm run desktop:build
```

The root `desktop`, `desktop:build`, and `desktop:check` commands launch, package,
and compile the native app. The packaged host uses the configured checkout and
installed Node 24. It does not bundle model weights or private knowledge files.

## Shared agent and tools

Both windows display one SDK session, including streamed messages, tool activity,
pending permission prompts and user-input requests. The workspace-local session
receipt supports reconnect/resume. Stop cancels the SDK turn and active local
tool operations. The Tools tab invokes the same a2swe routes exposed through MCP.

Brand intake captures public URLs or company/product briefs. After capture,
Research and build with agent starts source-backed enrichment through the
existing core tools. A saved input is not falsely labeled a verified domain.

Private PDF collections and their derived assets remain local. The Library tab
previews extracted visuals and searches bounded text chunks with source pages.
