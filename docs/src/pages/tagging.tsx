import {useEffect, useState, type FormEvent} from 'react';
import Link from '@docusaurus/Link';
import {download, LibraryShell, Player, Stats, videos} from '../components/library/shared';
import {feedbackTags, parseAnnotations, storageKey, validateAnnotation, type Annotation} from '../components/library/feedback';

export default function Tagging() {
  const [videoId, setVideoId] = useState(videos[0]?.id ?? '');
  const [compareId, setCompareId] = useState('');
  const [preference, setPreference] = useState<'primary' | 'comparison' | 'tie'>('tie');
  const [from, setFrom] = useState('0');
  const [to, setTo] = useState(String(videos[0]?.duration ?? 0));
  const [tags, setTags] = useState<string[]>([]);
  const [rating, setRating] = useState('3');
  const [comment, setComment] = useState('');
  const [records, setRecords] = useState<Annotation[]>([]);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const video = videos.find((item) => item.id === videoId);
  const compare = videos.find((item) => item.id === compareId);
  useEffect(() => {
    const requested = new URLSearchParams(window.location.search).get('video');
    const found = videos.find((item) => item.id === requested);
    if (found) { setVideoId(found.id); setTo(String(found.duration)); }
    try { setRecords(parseAnnotations(localStorage.getItem(storageKey), videos)); setReady(true); }
    catch (cause) { setError(`Cannot load browser feedback: ${cause instanceof Error ? cause.message : String(cause)}`); }
  }, []);
  function chooseVideo(id: string) {
    const next = videos.find((item) => item.id === id);
    if (!next) return;
    setVideoId(id); setFrom('0'); setTo(String(next.duration)); setCompareId('');
    setTags([]); setComment(''); setMessage('');
  }
  function save(event: FormEvent) {
    event.preventDefault();
    if (!video || !ready) return;
    const record: Annotation = {schemaVersion: 1, id: crypto.randomUUID(), createdAt: new Date().toISOString(),
      subject: {id: video.id, digest: video.digest, fromSeconds: Number(from), toSeconds: Number(to)},
      comparison: compare ? {id: compare.id, digest: compare.digest, preference} : null,
      tags, rating: Number(rating), comment: comment.trim(), status: 'unadjudicated', origin: 'browser-local-human-feedback'};
    try {
      validateAnnotation(record, videos);
      const current = parseAnnotations(localStorage.getItem(storageKey), videos);
      const next = [...current, record];
      localStorage.setItem(storageKey, JSON.stringify(next));
      setRecords(next); setError(''); setMessage('Feedback saved in this browser only. No approval was granted and nothing was sent to a server.');
    } catch (cause) { setError(`Feedback not saved: ${cause instanceof Error ? cause.message : String(cause)}`); setMessage(''); }
  }
  function recover() {
    try {
      const raw = localStorage.getItem(storageKey);
      if (raw === null) throw new Error('There is no stored feedback to export.');
      download('a2swe-feedback-recovery.txt', raw, 'text/plain');
      setMessage('Stored data exported unchanged. It has not been validated or removed.');
    } catch (cause) { setError(`Recovery export failed: ${cause instanceof Error ? cause.message : String(cause)}`); }
  }
  return <LibraryShell title="Tagging workspace" description="Turn review into usable feedback. Watch a specific revision, mark a time range, score it, or compare two candidates.">
    <Stats items={[{value: videos.length, label: 'Reviewable revisions'}, {value: records.length, label: 'Local annotations'}, {value: 'Local only', label: 'Storage'}, {value: 'Not authorized', label: 'Training use'}]} />
    <p className="library-notice">Browser-local feedback for future evaluation/RLHF curation. No backend, model training, reviewer authentication, or release approval is connected. Export before clearing browser data. Do not enter secrets or personal information. <Link to="/docs/platform/tagging">Feedback governance</Link></p>
    {video ? <>
      <div className="library-toolbar">
        <label className="library-field library-search">Video revision<select value={videoId} onChange={(event) => chooseVideo(event.target.value)}>{videos.map((item) => <option key={item.id} value={item.id}>{item.title}</option>)}</select></label>
        <label className="library-field library-search">Compare with<select value={compareId} onChange={(event) => setCompareId(event.target.value)}><option value="">Single-video review</option>{videos.filter((item) => item.id !== videoId).map((item) => <option key={item.id} value={item.id}>{item.title}</option>)}</select></label>
      </div>
      <div className="library-review">
        <div>
          <h2>{video.title}</h2><Player key={video.id} video={video} />
          {compare && <><h2>{compare.title}</h2><Player key={compare.id} video={compare} /></>}
          <details><summary>Exact artifact identity</summary><code className="library-digest">{video.digest}</code></details>
        </div>
        <form className="library-review-form" onSubmit={save}>
          <h2>Annotate this revision</h2>
          <div className="library-time-range">
            <label className="library-field">From (seconds)<input type="number" required min="0" max={video.duration} step="any" value={from} onChange={(event) => setFrom(event.target.value)} /></label>
            <label className="library-field">To (seconds)<input type="number" required min="0" max={video.duration} step="any" value={to} onChange={(event) => setTo(event.target.value)} /></label>
          </div>
          <label className="library-field">Quality rating<select value={rating} onChange={(event) => setRating(event.target.value)}>{['1 / Poor', '2 / Needs work', '3 / Adequate', '4 / Good', '5 / Excellent'].map((label, i) => <option value={i + 1} key={label}>{label}</option>)}</select></label>
          <fieldset><legend>Feedback tags</legend><div className="library-tag-options">{feedbackTags.map((tag) =>
            <label key={tag}><input type="checkbox" checked={tags.includes(tag)} onChange={(event) => setTags(event.target.checked ? [...tags, tag] : tags.filter((value) => value !== tag))} />{tag.replaceAll('_', ' ')}</label>)}</div></fieldset>
          {compare && <label className="library-field">Pairwise preference<select value={preference} onChange={(event) => {
            const value = event.target.value;
            if (value === 'primary' || value === 'comparison' || value === 'tie') setPreference(value);
          }}><option value="tie">Tie / no preference</option><option value="primary">{video.title}</option><option value="comparison">{compare.title}</option></select></label>}
          <label className="library-field">Reason / observed issue<textarea value={comment} onChange={(event) => setComment(event.target.value)} maxLength={2000} rows={4} placeholder="Describe what happens at this time range and how to improve it." /></label>
          <button className="library-primary" type="submit" disabled={!ready}>Save local feedback</button>
          {error && <p role="alert" className="library-error">{error}</p>}
          {!ready && error && <button type="button" onClick={recover}>Export stored data for recovery</button>}
          <p role="status">{message}</p>
        </form>
      </div>
    </> : <p className="library-empty">No videos are available for annotation.</p>}
    <section className="library-records"><div className="library-toolbar"><h2>Review queue</h2>
      <button disabled={!records.length} onClick={() => download('a2swe-feedback.json', JSON.stringify({schemaVersion: 1, trainingUse: 'not-authorized', reviewState: 'unadjudicated', annotations: records}, null, 2))}>Export feedback JSON</button>
      <button disabled={!records.length} onClick={() => download('a2swe-feedback.jsonl', `${records.map((record) => JSON.stringify({...record, trainingUse: 'not-authorized'})).join('\n')}\n`, 'application/x-ndjson')}>Export JSONL</button>
    </div>
      {records.length ? <div className="library-record-list">{records.slice().reverse().map((record) =>
        <article key={record.id}><strong>{videos.find((item) => item.id === record.subject.id)?.title ?? record.subject.id}</strong>
          <p>{record.subject.fromSeconds}-{record.subject.toSeconds}s / {record.rating} of 5 / unadjudicated</p>
          <div className="library-tags">{record.tags.map((tag) => <span key={tag}>{tag}</span>)}</div><p>{record.comment}</p>
          {record.comparison && <p>Compared with {record.comparison.id}: {record.comparison.preference}</p>}
          <small>{new Date(record.createdAt).toLocaleString()}</small>
        </article>)}</div> : <p className="library-empty">No feedback saved yet. Select tags and save your first review.</p>}
    </section>
  </LibraryShell>;
}
