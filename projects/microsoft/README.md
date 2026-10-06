# Microsoft

Microsoft: map needs to the right layer. Bottom line: Microsoft is a portfolio, not one system; first map the need to Windows, Microsoft 365, Azure, or Copilot, then verify entitlements early.

## Layout

- `canonical/`: Core-managed DomainPack, content IR, render spec, and approval manifest.
- `research/`: Source receipts and research notes used to build the DomainPack.
- `renders/`: Every render round, with one `revision.json` per revision folder.
- `qc/analysis/`: Measured spectrogram, loudness, layer, and comparison evidence.
- `intake/`: Source inputs kept outside the canonical contracts.
- `agent/`: Project SWE agent instructions for this core-managed package.
- `release/`: Final eight output formats after promotion.

## Revisions

`renders/` keeps each render round as `microsoft-2026-NN/` with `revision.json`. The imported legacy revisions `microsoft-2026-01` through `microsoft-2026-03` came from the retired per-project workspace. `microsoft-2026-03` uses the `legacy-template` pipeline and records an Edge Neural voice, `en-US-AndrewNeural`, for the latest legacy narration. The earlier imported revisions do not record a voice. The newest core-managed revision has four voice variants: Michael, Heart, and Bella on Kokoro ONNX, and Michael on PyTorch Kokoro. `qc/analysis/report.md` holds the measured comparison.

## Refresh

```powershell
node packages\core\src\cli.ts canonical-bind --root projects\microsoft
node packages\core\src\cli.ts revision-produce --root projects\microsoft
node packages\core\src\cli.ts revisions-analyze --root projects\microsoft
node packages\core\src\cli.ts office-render --root projects\microsoft
node packages\core\src\cli.ts runbook-project --root projects\microsoft
```
