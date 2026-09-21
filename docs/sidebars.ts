import type {SidebarsConfig} from '@docusaurus/plugin-content-docs';

const sidebars: SidebarsConfig = {
  guideSidebar: [
    'overview',
    {
      type: 'category',
      label: 'Getting started',
      items: [
        'getting-started/installation',
        'getting-started/first-project',
        'getting-started/repository-tour',
      ],
    },
    {
      type: 'category',
      label: 'Architecture',
      items: [
        'architecture/system-overview',
        'architecture/remotion-runtime',
        'architecture/component-model',
        'architecture/data-flow',
      ],
    },
    {
      type: 'category',
      label: 'Production pipeline',
      items: [
        'pipeline/lifecycle',
        'pipeline/research-and-narration',
        'pipeline/storyboard-and-build',
        'pipeline/render-and-quality',
        'pipeline/revisions-and-follow-ups',
      ],
    },
    {
      type: 'category',
      label: 'SDK',
      items: [
        'sdk/overview',
        'sdk/typescript',
        'sdk/python',
        'sdk/extension-points',
      ],
    },
    {
      type: 'category',
      label: 'Reference',
      items: [
        'reference/command-line',
        'reference/environment-variables',
        'reference/project-layout',
        'reference/dependencies',
      ],
    },
    {
      type: 'category',
      label: 'Specifications',
      items: [
        'specifications/system-contract',
        'specifications/artifact-contracts',
        'specifications/storyboard-format',
        'specifications/timing-and-subtitles',
        'specifications/quality-gates',
      ],
    },
    {
      type: 'category',
      label: 'Platform',
      items: [
        'platform/video-library',
        'platform/templates',
        'platform/tagging',
      ],
    },
    {
      type: 'category',
      label: 'Governance',
      items: [
        'governance/brand-content-and-assets',
        'governance/provenance-and-licensing',
        'governance/agent-companion',
      ],
    },
    {
      type: 'category',
      label: 'Examples and library',
      items: [
        'examples/verified-pilots',
        'examples/skill-library',
      ],
    },
    {
      type: 'category',
      label: 'Contributing',
      items: ['contributing/development', 'contributing/documentation'],
    },
  ],
};

export default sidebars;
