# Script input handoff

Replace `narration.txt` with final English narration before audio or render work.

Rules:

- One sentence or sentence group per line.
- Use `|` to split subtitle blocks of at most 48 characters.
- Use `# CHAPTER n Title` for chapter starts.
- Keep generated runtime between 30 and 45 seconds.
- Keep the content grounded in `research/research.md` or `research/sources.json`.
