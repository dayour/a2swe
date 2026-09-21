---
title: Project layout
---

# Generated project layout

```text
project/
├── agent/
│   └── SWE_AGENT.md
├── public/
│   ├── assets/<slug>/audio.wav
│   └── fonts/
├── research/research.md
├── script/
│   ├── narration.txt
│   ├── storyboard_src.md
│   └── timeline.json
├── src/
│   ├── common/
│   ├── overlay/
│   ├── shots/G1 ... G8/
│   ├── config.ts
│   ├── Main.tsx
│   ├── Root.tsx
│   └── index.ts
├── scripts/
├── qc/
├── renders/
├── storyboard.md
├── asset-manifest.json
├── delivery.md
├── package.json
├── requirements.lock.txt
└── tsconfig.json
```

## Authored versus generated

| Artifact | Kind |
| --- | --- |
| `research/research.md` | Authored evidence |
| `script/narration.txt` | Authored and approved |
| `script/storyboard_src.md` | Authored template |
| `script/timeline.json` | Generated from audio pipeline |
| `src/common/subs.ts` | Generated subtitle module |
| `storyboard.md` | Generated token-resolved plan |
| `src/config.ts` | Authored project configuration |
| `src/shots/G*/` | Authored scene implementation |
| `renders/*.mp4` | Generated release candidate |
| `qc/*` | Generated and authored review evidence |
| `delivery.md` | Authored release index |
| `agent/SWE_AGENT.md` | Continuously maintained state ledger |

Generated files should be regenerated through their owning scripts rather than manually patched unless the script contract explicitly permits manual input.
