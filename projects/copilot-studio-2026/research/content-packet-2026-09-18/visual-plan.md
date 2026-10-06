# Original/code-drawn visual plan

Goal: create a modern executive explainer using only original generated vector geometry. Do not download or embed Microsoft logos, product screenshots, blog images, customer logos, third-party screenshots, stock photos, or icon packs.

## Visual system

- Format: SVG, Canvas, CSS, or programmatic vector shapes generated during a later media pass.
- Palette: deep navy background, cyan/blue/violet gradients, white text, amber accent for governance/cost, green accent for validation. These are generic technology colors, not a Microsoft brand-lockup recreation.
- Typography: system sans-serif or project-default font. Do not use proprietary brand fonts unless already licensed in the project.
- Motifs: rounded rectangles, node graphs, route lines, data cylinders, shields, gauges, checklists, environment columns.
- Motion language: line draws, node pulses, card slides, package transfer from DEV to TEST to PROD.

## Scene-by-scene drawing recipe

1. Beyond chatbot
   - Draw one rounded speech bubble at center.
   - Morph or crossfade into three lanes: "Agent", "Workflow", "Governance".
   - Add small dots moving down each lane to imply operational work.

2. Build surface
   - Draw an abstract low-code canvas with draggable blocks.
   - Left: data cylinder labeled "Business data".
   - Center: stacked blocks labeled "Agents", "Workflows", "Agent flows".
   - Right: channel cards labeled "Teams", "M365", "Web", "Mobile". Text labels only; no product logos.

3. Orchestration
   - Draw a circular router labeled "Generative orchestration".
   - Incoming arrow: "Request".
   - Outgoing nodes: "Topic", "Tool", "Knowledge", "Agent".
   - Add a small "Descriptions" tag as routing metadata.

4. Tools
   - Draw six original line icons:
     - Connector: plug shape.
     - Agent flow: branching path.
     - Prompt: document card with sparkle-free star omitted; use simple text lines.
     - REST API: braces `{ }`.
     - MCP: three connected nodes.
     - Computer use: monitor with cursor arrow.
   - All icons feed into a single action arrow labeled "Execute work".

5. Governance and quality
   - Draw dashboard panels:
     - Shield: "DLP/data policies".
     - Badge: "Agent identity".
     - Ledger: "Audit".
     - Gauge: "Credits".
     - Checklist: "Evaluations".
   - Add footer disclaimer: "Evaluation supports quality; it does not guarantee safety."

6. Managed platform
   - Draw three columns: DEV, TEST, PROD.
   - A neutral package labeled "Solution" moves through gates labeled "Test", "Deploy", "Monitor".
   - Final line: "Scale adaptive automation with operating discipline."

## Rendering constraints for later generation

- Keep all UI panels abstract; do not mimic Copilot Studio screens exactly.
- Do not include Microsoft, Copilot, Teams, Dynamics, GitHub, or partner logos.
- Do not use customer names, customer quotes, or customer marks in visuals.
- Include citations in metadata or end card, not as tiny unreadable text inside scenes.
- If a2swe supports generated SVG assets, generate SVG paths from primitives. If it supports HTML canvas, draw with code primitives only.
