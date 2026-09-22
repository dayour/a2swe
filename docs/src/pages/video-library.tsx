import {useState} from 'react';
import Link from '@docusaurus/Link';
import {catalog, LibraryShell, Modal, Player, Poster, SourceLink, Stats, videos, type Project, type Video} from '../components/library/shared';

function RevisionViewer({video, onClose}: {video: Video; onClose: () => void}) {
  const [compare, setCompare] = useState('');
  const other = videos.find((item) => item.id === compare);
  const project = catalog.projects.find((item) => item.id === video.projectId)!;
  return <Modal title={video.title} onClose={onClose}>
    <p className="library-notice">{project.note}</p>
    <div className={other ? 'library-comparison' : ''}>
      <section><h3>{video.title}</h3><Player key={video.id} video={video} /></section>
      {other && <section><h3>{other.title}</h3><Player key={other.id} video={other} /></section>}
    </div>
    <label className="library-field">Compare another revision
      <select value={compare} onChange={(event) => setCompare(event.target.value)}>
        <option value="">No comparison</option>
        {project.revisions.filter((item) => item.id !== video.id).map((item) => <option key={item.id} value={item.id}>{item.title}</option>)}
      </select>
    </label>
    <p className="library-meta">Independent playback controls let you pause and seek each revision. Videos include burned-in subtitles; optional English captions are provided for the latest revisions.</p>
    {other?.digest === video.digest && <p className="library-notice">These revisions contain identical movie bytes (matching SHA-256).</p>}
    <details><summary>File integrity and evidence</summary>
      <p>SHA-256 <code className="library-digest">{video.digest}</code></p>
      <div className="library-actions"><SourceLink source={video.source}>Source movie</SourceLink>
        {video.qc ? <SourceLink source={video.qc}>Matching media QC report</SourceLink> : <span>No matching media QC report recorded.</span>}
        {project.evidence.map((source) => <SourceLink key={source} source={source} />)}
      </div>
    </details>
    <Link className="button button--primary" to={`/tagging?video=${encodeURIComponent(video.id)}`}>Tag this revision</Link>
  </Modal>;
}

function ProjectCard({project, video, onPlay}: {project: Project; video?: Video; onPlay: (video: Video) => void}) {
  const [revisionId, setRevisionId] = useState(video?.id ?? project.revisions[0]?.id ?? '');
  const selected = video ?? project.revisions.find((item) => item.id === revisionId);
  return <article className="library-card">
    {selected ? <button className="library-play" onClick={() => onPlay(selected)} aria-label={`Play ${selected.title}`}>
      <Poster video={selected} /><span className="library-play-icon" aria-hidden="true">&#9654;</span>
    </button> : <div className="library-unrendered"><span aria-hidden="true">&#9719;</span><strong>No video rendered</strong><p>Evidence and next steps below</p></div>}
    <div className="library-card-body">
      <div className="library-meta"><span className={`library-badge ${selected ? '' : 'library-badge--warning'}`}>{selected?.state ?? 'Not rendered'}</span>
        <span>{project.revisions.length} revisions</span></div>
      <h2>{video ? video.title : project.title}</h2><p>{project.description}</p>
      {selected && !video && <label className="library-field">Revision
        <select value={revisionId} onChange={(event) => setRevisionId(event.target.value)}>
          {project.revisions.map((item) => <option key={item.id} value={item.id}>{item.revision}{item.latest ? ' / latest candidate' : ' / historical'}</option>)}
        </select>
      </label>}
      {selected ? <div className="library-actions">
        <button className="library-primary" onClick={() => onPlay(selected)}>Watch &amp; compare</button>
        <Link to={`/tagging?video=${encodeURIComponent(selected.id)}`}>Add feedback</Link>
      </div> : <><ul className="library-blockers">{project.blockers.map((reason) => <li key={reason}>{reason}</li>)}</ul>
        <details><summary>Why it stopped</summary><p>{project.note}</p></details></>}
      <div className="library-actions library-card-footer">{project.evidence.slice(0, 2).map((source) => <SourceLink key={source} source={source} />)}</div>
    </div>
  </article>;
}

export default function VideoLibrary() {
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState('all');
  const [allRevisions, setAllRevisions] = useState(false);
  const [selected, setSelected] = useState<Video | null>(null);
  const projects = catalog.projects.filter((project) =>
    (filter === 'all' || (filter === 'rendered' ? project.revisions.length > 0 : project.revisions.length === 0)) &&
    `${project.title} ${project.description} ${project.revisions.map((v) => v.title).join(' ')}`.toLowerCase().includes(query.toLowerCase()));
  const count = projects.reduce((total, project) => total + (allRevisions ? Math.max(1, project.revisions.length) : 1), 0);
  return <LibraryShell title="Video Library" description="Watch the work. Compare the iterations. See exactly what shipped as a candidate and what is still waiting to be made.">
    <Stats items={[{value: videos.length, label: 'Playable revisions'}, {value: catalog.projects.length, label: 'Projects'}, {value: catalog.projects.filter((p) => !p.revisions.length).length, label: 'Not rendered'}, {value: 'Pending', label: 'Human pilot acceptance'}]} />
    <p className="library-notice">These are review artifacts, not approved releases. Copilot is the earlier family-overview pilot; Copilot Studio 2026 and Power Platform 2026 are separate projects. Render availability and approval status are tracked independently. <Link to="/docs/platform/video-library">Catalog contract</Link></p>
    <div className="library-toolbar">
      <label className="library-field library-search">Search projects<input type="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Copilot, Deere, Microsoft..." /></label>
      <label className="library-field">Production state<select value={filter} onChange={(event) => setFilter(event.target.value)}><option value="all">All projects</option><option value="rendered">Has video</option><option value="blocked">Not rendered</option></select></label>
      <label className="library-checkbox"><input type="checkbox" checked={allRevisions} onChange={(event) => setAllRevisions(event.target.checked)} />Show every revision</label>
    </div>
    <p role="status">{count} {allRevisions ? 'items' : 'projects'} shown</p>
    <div className="library-grid">{projects.flatMap((project) => allRevisions && project.revisions.length
      ? project.revisions.map((video) => <ProjectCard key={video.id} project={project} video={video} onPlay={setSelected} />)
      : [<ProjectCard key={project.id} project={project} onPlay={setSelected} />])}</div>
    {!projects.length && <p className="library-empty">No projects match. Change the search or production-state filter.</p>}
    {selected && <RevisionViewer video={selected} onClose={() => setSelected(null)} />}
  </LibraryShell>;
}
