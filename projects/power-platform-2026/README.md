# Power Platform 2026

Power Platform ALM: govern one release path. Bottom line: use one ALM path; ship a managed artifact, set target config, move data apart, and do DLP, test, license, and release-authorization checks before final go-live.

## Layout

- `canonical/`: Core-managed DomainPack, content IR, render spec, and approval manifest.
- `research/`: Source receipts and research notes used to build the DomainPack.
- `renders/`: Every render round, with one `revision.json` per revision folder.
- `qc/analysis/`: Measured spectrogram, loudness, layer, and comparison evidence.
- `intake/`: Source inputs kept outside the canonical contracts.
- `agent/`: Project SWE agent instructions for this core-managed package.
- `release/`: Final eight output formats after promotion.

## Revisions

`renders/` keeps each render round as `power-platform-2026-NN/` with `revision.json`. The imported legacy revisions `power-platform-2026-01` through `power-platform-2026-06` came from the retired per-project workspace. `power-platform-2026-06` uses the `legacy-template` pipeline, records Kokoro narration with profile `am_liam`, and notes an audio/video remux from `power-platform-2026-v6-encoded.mp4`. The earlier imported revisions do not record a voice. The newest core-managed revision has four voice variants: Michael, Heart, and Bella on Kokoro ONNX, and Michael on PyTorch Kokoro. `qc/analysis/report.md` holds the measured comparison.

## Refresh

```powershell
node packages\core\src\cli.ts canonical-bind --root projects\power-platform-2026
node packages\core\src\cli.ts revision-produce --root projects\power-platform-2026
node packages\core\src\cli.ts revisions-analyze --root projects\power-platform-2026
node packages\core\src\cli.ts office-render --root projects\power-platform-2026
node packages\core\src\cli.ts runbook-project --root projects\power-platform-2026
```
