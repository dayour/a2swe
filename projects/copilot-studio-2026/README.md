# Copilot Studio 2026

Copilot Studio 2026: govern intent-to-action agents. Bottom line: use Copilot Studio as a governed agent platform, moving from business intent to useful action while funding workflows that merit scale, with rigor.

## Layout

- `canonical/`: Core-managed DomainPack, content IR, render spec, and approval manifest.
- `research/`: Source receipts and research packets used to build the DomainPack.
- `renders/`: Every render round, with one `revision.json` per revision folder.
- `qc/analysis/`: Measured spectrogram, loudness, layer, and comparison evidence.
- `intake/`: Source inputs kept outside the canonical contracts.
- `agent/`: Project SWE agent instructions for this core-managed package.
- `release/`: Final eight output formats after promotion.

The research packet now lives in `research/content-packet-2026-09-18/`. Keep that packet in `research/` and do not restore the retired per-project runtime.

## Revisions

`renders/` keeps each render round as `copilot-studio-2026-NN/` with `revision.json`. The imported legacy revisions `copilot-studio-2026-01` through `copilot-studio-2026-04` came from the retired per-project workspace. Revisions 02, 03, and 04 note audio/video remuxes; `copilot-studio-2026-04` records Microsoft Mark, a Windows SAPI voice, for the latest legacy narration. The earlier imported revisions do not record a voice. The newest core-managed revision has four voice variants: Michael, Heart, and Bella on Kokoro ONNX, and Michael on PyTorch Kokoro. `qc/analysis/report.md` holds the measured comparison.

## Refresh

```powershell
node packages\core\src\cli.ts canonical-bind --root projects\copilot-studio-2026
node packages\core\src\cli.ts revision-produce --root projects\copilot-studio-2026
node packages\core\src\cli.ts revisions-analyze --root projects\copilot-studio-2026
node packages\core\src\cli.ts office-render --root projects\copilot-studio-2026
node packages\core\src\cli.ts runbook-project --root projects\copilot-studio-2026
```
