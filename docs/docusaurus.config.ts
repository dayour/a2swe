import type {Config} from '@docusaurus/types';
import type {Options, ThemeConfig} from '@docusaurus/preset-classic';
import {themes as prismThemes} from 'prism-react-renderer';

const config: Config = {
  title: 'a2swe Documentation',
  tagline: 'Engineering specification for the anything-to-explainer production system',
  favicon: 'img/favicon.svg',
  url: 'https://dayour.github.io',
  baseUrl: '/a2swe/',
  organizationName: 'dayour',
  projectName: 'a2swe',
  trailingSlash: false,
  onBrokenLinks: 'throw',
  markdown: {
    mermaid: true,
    hooks: {
      onBrokenMarkdownLinks: 'throw',
    },
  },
  themes: ['@docusaurus/theme-mermaid'],
  presets: [
    [
      'classic',
      {
        docs: {
          path: 'content',
          routeBasePath: 'docs',
          sidebarPath: './sidebars.ts',
          editUrl: 'https://github.com/dayour/a2swe/edit/main/docs/',
          showLastUpdateAuthor: true,
          showLastUpdateTime: true,
        },
        blog: false,
        theme: {
          customCss: './src/css/custom.css',
        },
        sitemap: {
          changefreq: 'weekly',
          priority: 0.5,
        },
      } satisfies Options,
    ],
  ],
  themeConfig: {
    colorMode: {
      defaultMode: 'dark',
      disableSwitch: false,
      respectPrefersColorScheme: true,
    },
    navbar: {
      title: 'a2swe',
      items: [
        {type: 'docSidebar', sidebarId: 'guideSidebar', position: 'left', label: 'Guide'},
        {to: '/docs/sdk/overview', label: 'SDK', position: 'left'},
        {to: '/docs/specifications/system-contract', label: 'Specifications', position: 'left'},
        {to: '/docs/platform/video-library', label: 'Video Library', position: 'left'},
        {to: '/docs/platform/templates', label: 'Templates', position: 'left'},
        {to: '/docs/platform/tagging', label: 'Tagging', position: 'left'},
        {href: 'https://github.com/dayour/a2swe', label: 'GitHub', position: 'right'},
      ],
    },
    footer: {
      style: 'dark',
      links: [
        {
          title: 'Documentation',
          items: [
            {label: 'Getting started', to: '/docs/getting-started/installation'},
            {label: 'Architecture', to: '/docs/architecture/system-overview'},
            {label: 'CLI reference', to: '/docs/reference/command-line'},
          ],
        },
        {
          title: 'Project',
          items: [
            {label: 'GitHub', href: 'https://github.com/dayour/a2swe'},
            {label: 'Issue tracker', href: 'https://github.com/dayour/a2swe/issues'},
          ],
        },
      ],
      copyright: `Copyright © ${new Date().getFullYear()} a2swe contributors.`,
    },
    prism: {
      theme: prismThemes.github,
      darkTheme: prismThemes.dracula,
      additionalLanguages: ['bash', 'powershell', 'python', 'typescript', 'json', 'markdown'],
    },
  } satisfies ThemeConfig,
};

export default config;
