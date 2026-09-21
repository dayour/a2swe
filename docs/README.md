# a2swe documentation site

This directory contains the Docusaurus source for the a2swe architecture, SDK, workflow, reference, and specification website.

```powershell
npm ci
npm run start
npm run typecheck
npm run build
```

GitHub Pages deployment is defined in `../.github/workflows/docs-pages.yml`.
Product-documentation validation is defined in
`../.github/workflows/product-docs-validate.yml` and checks the agent-first core,
evaluation-only asset proof, active 720p Remotion/Python video adapter, and
`.a2swe` state anchors.
