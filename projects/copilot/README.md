# Copilot

Copilot: choose the right AI assistant for the job. Bottom line: Copilot is a family, not one tool; choose Chat, Microsoft 365, GitHub, or Studio by job, then verify access, licensing, and grounding.

## Layout

- `canonical/`: Core-managed DomainPack, content IR, render spec, and approval manifest.
- `research/`: Source receipts and research notes used to build the DomainPack.
- `renders/`: Every render round, with one `revision.json` per revision folder.
- `qc/analysis/`: Measured spectrogram, loudness, layer, and comparison evidence.
- `intake/`: Source inputs kept outside the canonical contracts.
- `agent/`: Project SWE agent instructions for this core-managed package.
- `release/`: Final eight output formats after promotion.

## Revisions

`renders/` keeps each render round as `copilot-2026-NN/` with `revision.json`. The imported legacy revisions `copilot-2026-01` through `copilot-2026-06` came from the retired per-project workspace. `copilot-2026-06` uses the `legacy-template` pipeline, records an Edge Neural voice, `en-US-AndrewNeural`, and notes an audio/video remux from `copilot-v4.mp4`; its video bytes match `copilot-2026-05`. The earlier imported revisions do not record a voice. The newest core-managed revision has four voice variants: Michael, Heart, and Bella on Kokoro ONNX, and Michael on PyTorch Kokoro. `qc/analysis/report.md` holds the measured comparison.

## Refresh

```powershell
node packages\core\src\cli.ts canonical-bind --root projects\copilot
node packages\core\src\cli.ts revision-produce --root projects\copilot
node packages\core\src\cli.ts revisions-analyze --root projects\copilot
node packages\core\src\cli.ts office-render --root projects\copilot
node packages\core\src\cli.ts runbook-project --root projects\copilot
```
