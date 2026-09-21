import type {ReactNode} from 'react';
import Link from '@docusaurus/Link';
import Layout from '@theme/Layout';

const paths = [
  {
    title: 'Operate the pipeline',
    description: 'Install the toolchain, scaffold a project, pass approval gates, and ship a verified explainer.',
    href: '/docs/getting-started/installation',
  },
  {
    title: 'Understand the system',
    description: 'Trace data from sourced research through narration, timing, React compositions, rendering, and QC.',
    href: '/docs/architecture/system-overview',
  },
  {
    title: 'Extend the SDK',
    description: 'Reuse visual primitives, add shot groups, integrate narration engines, and automate validation.',
    href: '/docs/sdk/overview',
  },
  {
    title: 'Implement the contracts',
    description: 'Use the normative artifact, storyboard, timing, companion-ledger, and quality specifications.',
    href: '/docs/specifications/system-contract',
  },
];

export default function Home(): ReactNode {
  return (
    <Layout
      title="Engineering documentation"
      description="Architecture, SDK, workflow, and specifications for a2swe">
      <main className="docs-home">
        <header className="docs-home__intro">
          <p className="docs-home__eyebrow">Anything to SWE Agent</p>
          <h1>Engineering reference for expert explainer production</h1>
          <p>
            a2swe is a reproducible workflow and Remotion toolkit that turns a researched topic into an
            English narrated motion-graphics video, with human approval gates and verifiable delivery evidence.
          </p>
          <div className="docs-home__actions">
            <Link className="button button--primary" to="/docs/overview">Read the documentation</Link>
            <Link className="button button--secondary" to="/docs/reference/command-line">Command reference</Link>
          </div>
        </header>
        <section className="docs-home__grid" aria-label="Documentation paths">
          {paths.map((path) => (
            <article className="docs-home__card" key={path.title}>
              <h2>{path.title}</h2>
              <p>{path.description}</p>
              <Link to={path.href}>Open section</Link>
            </article>
          ))}
        </section>
        <section className="docs-home__flow" aria-labelledby="production-flow-title">
          <h2 id="production-flow-title">Production flow</h2>
          <ol>
            <li>Research and qualify claims.</li>
            <li>Approve narration and voice handling.</li>
            <li>Resolve timing into storyboard beats.</li>
            <li>Build and approve the pilot.</li>
            <li>Render, inspect, repair, and deliver evidence.</li>
          </ol>
        </section>
      </main>
    </Layout>
  );
}
