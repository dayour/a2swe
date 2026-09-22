import {useEffect, useRef, useState, type ReactNode} from 'react';
import Link from '@docusaurus/Link';
import useBaseUrl from '@docusaurus/useBaseUrl';
import Layout from '@theme/Layout';
import catalog from '../../data/library.json';
import './library.css';

export {catalog};
export type Project = (typeof catalog.projects)[number];
export type Video = Project['revisions'][number];
export type Template = (typeof catalog.templates)[number];
export const videos = catalog.projects.flatMap((project) => project.revisions);
export const sourceUrl = (source: string) =>
  `https://github.com/dayour/a2swe/blob/main/${source.split('/').map(encodeURIComponent).join('/')}`;
export const minutes = (seconds: number) => `${Math.floor(seconds / 60)}:${String(Math.round(seconds % 60)).padStart(2, '0')}`;

export function LibraryShell({title, description, children}: {title: string; description: string; children: ReactNode}) {
  return <Layout title={title} description={description}>
    <main className="library">
      <header className="library-header">
        <p className="library-eyebrow">a2swe / Production workspace</p>
        <h1>{title}</h1><p>{description}</p>
      </header>
      <nav className="library-tabs" aria-label="Production workspace">
        <Link isNavLink activeClassName="library-active" to="/video-library">Video Library</Link>
        <Link isNavLink activeClassName="library-active" to="/templates">Templates</Link>
        <Link isNavLink activeClassName="library-active" to="/tagging">Tagging</Link>
      </nav>
      {children}
    </main>
  </Layout>;
}

export function Stats({items}: {items: {value: number | string; label: string}[]}) {
  return <dl className="library-stats">{items.map((item) =>
    <div key={item.label}><dt>{item.label}</dt><dd>{item.value}</dd></div>)}</dl>;
}

export function SourceLink({source, children}: {source: string; children?: ReactNode}) {
  return <a href={sourceUrl(source)} target="_blank" rel="noopener noreferrer">{children ?? source.split('/').at(-1)} <span aria-hidden="true">&#8599;</span></a>;
}

export function Poster({video}: {video: Video}) {
  const src = useBaseUrl(`/${video.poster}`);
  return <img className="library-poster" src={src} alt={`${video.title}, frame captured at two seconds`} loading="lazy" width={640} height={360} />;
}

export function Player({video}: {video: Video}) {
  const [failed, setFailed] = useState(false);
  const movie = useBaseUrl(`/${video.movie}`);
  const poster = useBaseUrl(`/${video.poster}`);
  const captions = useBaseUrl(`/${video.captions ?? ''}`);
  return <div className="library-player">
    <video key={video.id} controls playsInline preload="metadata" poster={poster} aria-label={video.title} onError={() => setFailed(true)}>
      <source src={movie} type={video.movie.endsWith('.webm') ? 'video/webm' : 'video/mp4'} />
      {video.captions && <track kind="captions" src={captions} srcLang="en" label="English" />}
      Your browser does not support embedded video.
    </video>
    {failed && <p role="alert">Video could not load. Try the download link, or check that the site media build was deployed.</p>}
    <div className="library-meta"><span>{video.width} x {video.height} / {video.fps} fps / {minutes(video.duration)}</span>
      <a href={movie} download>Download {video.revision} ({(video.bytes / 1000000).toFixed(1)} MB)</a></div>
  </div>;
}

export function Modal({title, children, onClose}: {title: string; children: ReactNode; onClose: () => void}) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const dialog = ref.current;
    dialog?.showModal();
    return () => { dialog?.close(); };
  }, []);
  return <dialog className="library-dialog" ref={ref} onClose={onClose} aria-labelledby="library-dialog-title">
    <header><h2 id="library-dialog-title">{title}</h2><button type="button" onClick={onClose} autoFocus>Close</button></header>
    {children}
  </dialog>;
}

export function download(name: string, value: string, type = 'application/json') {
  const url = URL.createObjectURL(new Blob([value], {type}));
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = name;
  anchor.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function Blueprint({kind, name}: {kind: string; name: string}) {
  return <div className={`library-blueprint library-blueprint--${kind}`} aria-hidden="true">
    <svg viewBox="0 0 320 150" fill="none">
      {kind === 'storyline' ? <>
        <path d="M40 75H280" />
        {[45, 120, 195, 270].map((x, i) => <g key={x}><circle cx={x} cy="75" r="15" /><text x={x} y="80" textAnchor="middle">{i + 1}</text><path d={`M${x - 20} 112h40`} /></g>)}
      </> : kind === 'agent' || kind === 'skill' ? <>
        <rect x="120" y="42" width="80" height="65" rx="8" /><path d="M138 63h44m-44 14h28m-28 14h36M80 38l40 24m80 0 40-24M80 116l40-24m80 0 40 24" />
        {[[65, 30], [255, 30], [65, 122], [255, 122]].map(([cx, cy]) => <circle key={`${cx}-${cy}`} cx={cx} cy={cy} r="12" />)}
      </> : kind === 'layout' ? <>
        <rect x="36" y="20" width="248" height="110" rx="4" /><path d="M50 37h130M50 48h80" />
        <rect x="52" y="64" width="88" height="40" /><rect x="156" y="64" width="108" height="40" /><path d="M50 116h214" />
      </> : <>
        <ellipse cx="160" cy="104" rx="98" ry="18" /><circle cx="160" cy="68" r="35" /><path d="m115 60-32 15 32 15m90-30 32 15-32 15M160 21v-9M125 35l-10-10M195 35l10-10" />
        <path d="m146 69 10 10 20-22" />
      </>}
    </svg>
    <span>{name}</span><small>Pattern illustration / inspect source for implementation</small>
  </div>;
}
