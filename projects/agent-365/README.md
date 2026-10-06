# Agent 365

Agent 365: pilot the control plane first. Bottom line: use Agent 365 as the control plane for one accountable pilot; verify ownership, access, action traces, licenses, and preview limits before scaling.

## Layout

- `canonical/`: Core-managed DomainPack, content IR, render spec, and approval manifest.
- `research/`: Source receipts and research packets used to build the DomainPack.
- `renders/`: Every render round, with one `revision.json` per revision folder.
- `qc/analysis/`: Measured spectrogram, loudness, layer, and comparison evidence.
- `intake/`: Source inputs kept outside the canonical contracts.
- `agent/`: Native Agent 365 SWE helper, profile notes, evaluations, gates, and offline fixtures.
- `release/`: Final eight output formats after promotion.

## Revisions

`renders/` keeps each render round as `agent-365-2026-NN/` with `revision.json`. The imported legacy revision came from the retired per-project workspace: `agent-365-2026-01` uses the `legacy-template` pipeline and records Kokoro narration with profile `am_liam`. The newest core-managed revision has four voice variants: Michael, Heart, and Bella on Kokoro ONNX, and Michael on PyTorch Kokoro. `qc/analysis/report.md` holds the measured comparison.

## Refresh

```powershell
node packages\core\src\cli.ts canonical-bind --root projects\agent-365
node packages\core\src\cli.ts revision-produce --root projects\agent-365
node packages\core\src\cli.ts revisions-analyze --root projects\agent-365
node packages\core\src\cli.ts office-render --root projects\agent-365
node packages\core\src\cli.ts runbook-project --root projects\agent-365
```
