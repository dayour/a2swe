import {useCallback, useEffect, useRef, useState} from 'react';
import {Camera, Film, Pause, Play, RefreshCw, Waves} from 'lucide-react';
import {bridgeRequest, isNative, subscribeToBridgeEvents} from './bridge';
import type {BridgeEvent} from './types';
import type {ReviewListItem, ReviewState} from '../../../library/integrations/copilot/media-review.types';

type ImageResult = {mimeType: 'image/png'; data: string};
function reviewState(event: BridgeEvent): ReviewState | undefined {
  const state = event.data?.state;
  if (!state || typeof state !== 'object' || !('reviewId' in state) || typeof state.reviewId !== 'string'
    || !('playback' in state) || !('tracks' in state)) return undefined;
  return state as ReviewState;
}

function timeLabel(seconds: number) {
  return `${Math.floor(seconds / 60)}:${(seconds % 60).toFixed(1).padStart(4, '0')}`;
}

export function StudioWorkspace({active, projectId, onActivate, reportError}: {
  active: boolean; projectId: string; onActivate: () => void; reportError: (error: unknown) => void;
}) {
  const [studio, setStudio] = useState<ReviewState>();
  const [scope, setScope] = useState('template');
  const [busy, setBusy] = useState(false);
  const [version, setVersion] = useState(0);
  useEffect(() => {
    let cancelled = false;
    let dispose: (() => void) | undefined;
    void subscribeToBridgeEvents(event => {
      const state = reviewState(event);
      if (event.event === 'review.opened' && state?.studio?.url && (!state.media || state.media.kind === 'studio')) {
        setStudio(state);onActivate();
      }
    }).then(unlisten => {if (cancelled) unlisten(); else dispose = unlisten;}).catch(reportError);
    return () => {cancelled = true;dispose?.();};
  }, [onActivate, reportError]);
  async function open() {
    setBusy(true);
    try {
      const result = await bridgeRequest<{state?: ReviewState; reason?: string}>('review.studio', scope === 'project' ? {projectId} : {});
      if (!result.state?.studio?.url) throw new Error(result.reason ?? 'No compiled Studio bundle is available for this project');
      setStudio(result.state);setVersion(value => value + 1);
    } catch (error) { reportError(error); } finally { setBusy(false); }
  }
  return <section className="studio-workspace" hidden={!active}>
    <div className="review-toolbar"><Film size={18}/><strong>Remotion Studio</strong>
      <select aria-label="Studio source" value={scope} onChange={event => setScope(event.target.value)}>
        <option value="template">Full template Studio</option><option value="project">Selected project Studio</option>
      </select><button className="primary-button" disabled={!isNative || busy || (scope === 'project' && !projectId)} onClick={() => void open()}>
        <RefreshCw size={15}/>{busy ? 'Opening...' : 'Open Studio'}
      </button>
    </div>
    <p className="review-note">The complete compiled Remotion UI: compositions, assets, timeline and preview. This sandboxed view has no native filesystem permissions. Source changes require rebuilding its bundle.</p>
    {active && studio?.studio?.url
      ? <iframe key={`${studio.reviewId}-${version}`} title="Remotion Studio" className="studio-frame" src={studio.studio.url}
          sandbox="allow-scripts allow-same-origin allow-downloads" allow="autoplay; fullscreen" allowFullScreen />
      : <div className="empty-state">Open the template Studio or the selected project's compiled preview.</div>}
  </section>;
}

export function MediaWorkspace({active, projectId, onActivate, reportError}: {
  active: boolean; projectId: string; onActivate: () => void; reportError: (error: unknown) => void;
}) {
  const [items, setItems] = useState<ReviewListItem[]>([]);
  const [review, setReview] = useState<ReviewState>();
  const [time, setTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [frame, setFrame] = useState('');
  const [frameTime, setFrameTime] = useState(0);
  const [spectrogram, setSpectrogram] = useState('');
  const [progress, setProgress] = useState('');
  const [busy, setBusy] = useState(false);
  const [filter, setFilter] = useState('video');
  const [captionOverlay, setCaptionOverlay] = useState(false);
  const media = useRef<HTMLVideoElement | HTMLAudioElement | null>(null);
  const current = useRef<ReviewState | undefined>(undefined);
  const lastUpdate = useRef(0);
  useEffect(() => {
    if (!active) media.current?.pause();
  }, [active]);
  const applyState = useCallback((state: ReviewState) => {
    if (current.current?.reviewId !== state.reviewId) {
      setFrame('');setSpectrogram('');setTime(state.playback.timeSeconds);setDuration(state.media?.durationSeconds ?? 0);
    }
    current.current = state;setReview(state);
  }, []);
  const refresh = useCallback(async () => {
    if (!isNative || !projectId) return;
    const result = await bridgeRequest<{items: ReviewListItem[]}>('review.list', {projectId});
    setItems(result.items);
  }, [projectId]);
  useEffect(() => {if (active) void refresh().catch(reportError);}, [active, refresh, reportError]);
  const applyControl = useCallback(async (event: BridgeEvent) => {
    const data = event.data;
    if (!data || typeof data.reviewId !== 'string' || typeof data.requestId !== 'string' || current.current?.reviewId !== data.reviewId) return;
    onActivate();
    try {
      const element = media.current;
      if (!element || element.dataset.reviewId !== data.reviewId) throw new Error('The requested media player is not ready for playback control');
      if (element.readyState === 0) await new Promise<void>((resolve, reject) => {
        const timer = window.setTimeout(() => finish(new Error('Media metadata did not load')), 7000);
        const finish = (error?: Error) => {clearTimeout(timer);element.removeEventListener('loadedmetadata', loaded);element.removeEventListener('error', failed);error ? reject(error) : resolve();};
        const loaded = () => finish();
        const failed = () => finish(new Error('Media could not be decoded'));
        element.addEventListener('loadedmetadata', loaded, {once: true});element.addEventListener('error', failed, {once: true});
      });
      if (data.action === 'seek') {
        if (typeof data.timeSeconds !== 'number' || !Number.isFinite(data.timeSeconds) || data.timeSeconds < 0 || data.timeSeconds > element.duration) throw new Error('Seek is outside this media duration');
        if (Math.abs(element.currentTime - data.timeSeconds) > 0.01) await new Promise<void>((resolve, reject) => {
          const timer = window.setTimeout(() => {element.removeEventListener('seeked', done);reject(new Error('Media seek timed out'));}, 7000);
          const done = () => {clearTimeout(timer);resolve();};
          element.addEventListener('seeked', done, {once: true});element.currentTime = data.timeSeconds as number;
        });
      } else if (data.action === 'play') await element.play();
      else if (data.action === 'pause') element.pause();
      else throw new Error('Unsupported playback action');
      setTime(element.currentTime);
      await bridgeRequest('review.ack', {reviewId: data.reviewId, requestId: data.requestId, timeSeconds: element.currentTime, playing: !element.paused});
    } catch (error) {
      reportError(error);
      await bridgeRequest('review.ack', {reviewId: data.reviewId, requestId: data.requestId, error: error instanceof Error ? error.message : String(error)});
    }
  }, [onActivate, reportError]);
  useEffect(() => {
    let cancelled = false;
    let dispose: (() => void) | undefined;
    void subscribeToBridgeEvents(event => {
      const state = reviewState(event);
      if (event.event === 'review.opened' && state?.media && state.media.kind !== 'studio') {
        applyState(state);onActivate();
      } else if (event.event === 'review.state' && state && state.reviewId === current.current?.reviewId) applyState(state);
      else if (event.event === 'review.control.requested') void applyControl(event).catch(reportError);
      else if (event.event === 'review.progress' && event.data && event.data.reviewId === current.current?.reviewId) setProgress(`${event.data.action}: ${event.data.status}`);
    }).then(unlisten => {if (cancelled) unlisten();else dispose = unlisten;}).catch(reportError);
    return () => {cancelled = true;dispose?.();};
  }, [applyControl, applyState, onActivate, reportError]);
  async function open(item: ReviewListItem) {
    setBusy(true);
    const previous = current.current?.reviewId;
    try {
      const result = await bridgeRequest<{state: ReviewState}>('review.open', {projectId, path: item.path, kind: item.kind});
      if (current.current?.reviewId === previous || current.current?.reviewId === result.state.reviewId) applyState(result.state);
    }
    catch (error) {reportError(error);} finally {setBusy(false);}
  }
  async function image(kind: 'frame' | 'spectrogram') {
    if (!review) return;
    const captureTime = media.current?.dataset.reviewId === review.reviewId ? media.current.currentTime : time;
    setBusy(true);
    try {
      const result = await bridgeRequest<ImageResult>(`review.${kind}`, {reviewId: review.reviewId, ...(kind === 'frame' ? {timeSeconds: captureTime} : {})});
      if (current.current?.reviewId !== review.reviewId) return;
      const url = `data:${result.mimeType};base64,${result.data}`;
      if (kind === 'frame') {setFrame(url);setFrameTime(captureTime);} else setSpectrogram(url);
    } catch (error) {reportError(error);} finally {setBusy(false);}
  }
  function reportPlayback(force = false) {
    const element = media.current, state = current.current;
    if (!element || !state || element.dataset.reviewId !== state.reviewId) return;
    setTime(element.currentTime);
    if (!force && Date.now() - lastUpdate.current < 750) return;
    lastUpdate.current = Date.now();
    void bridgeRequest('review.update', {reviewId: state.reviewId, timeSeconds: element.currentTime, playing: !element.paused, rate: element.playbackRate}).catch(reportError);
  }
  function seek(seconds: number) {
    if (!review) return;
    void bridgeRequest('review.seek', {reviewId: review.reviewId, timeSeconds: seconds}).catch(reportError);
  }
  const cues = review?.tracks.subtitleCues ?? review?.tracks.subtitles.flatMap(track => track.cues ?? []) ?? [];
  const selectedCue = cues.find(cue => time >= cue.startSeconds && time < cue.endSeconds);
  const displayed = items.filter(item => item.kind !== 'studio' && (filter === 'all' || item.kind === filter));
  return <section className="media-workspace" hidden={!active}>
    <div className="review-toolbar"><Film size={18}/><strong>Output library & review</strong>
      <select aria-label="Output media type" value={filter} onChange={event => setFilter(event.target.value)}><option value="video">Videos</option><option value="audio">Audio</option><option value="image">Images</option><option value="all">All media</option></select>
      <button className="secondary-button" disabled={!isNative || !projectId} onClick={() => void refresh().catch(reportError)}><RefreshCw size={15}/> Refresh</button>
      <span role="status">{progress}</span>
    </div>
    <div className="media-review-layout"><aside className="media-output-list">
      {displayed.map(item => <button key={item.id} className={review?.media?.path === item.path ? 'selected' : ''} disabled={busy} onClick={() => void open(item)}>
        <strong>{item.title}</strong><small>{item.path}</small><span>{item.byteSize ? `${(item.byteSize / 1e6).toFixed(1)} MB` : item.kind}</span>
      </button>)}
      {!displayed.length && <p>No matching output media in the selected project.</p>}
    </aside><div className="media-inspector">
      {review?.media?.url ? <>
        <div className="media-stage">
          {review.media.kind === 'video' ? <video key={review.reviewId} data-review-id={review.reviewId} ref={element => {media.current = element;}} src={review.media.url}
            controls playsInline preload="metadata" onTimeUpdate={() => reportPlayback()} onPlay={() => reportPlayback(true)} onPause={() => reportPlayback(true)}
            onSeeked={() => reportPlayback(true)} onLoadedMetadata={() => {setDuration(media.current?.duration ?? 0);reportPlayback(true);}}
            onError={() => reportError('Video could not be decoded. Check the selected artifact and media service.')} />
            : review.media.kind === 'audio' ? <audio key={review.reviewId} data-review-id={review.reviewId} ref={element => {media.current = element;}} src={review.media.url} controls preload="metadata"
                onTimeUpdate={() => reportPlayback()} onPlay={() => reportPlayback(true)} onPause={() => reportPlayback(true)} onSeeked={() => reportPlayback(true)}
                onLoadedMetadata={() => {setDuration(media.current?.duration ?? 0);reportPlayback(true);}} onError={() => reportError('Audio could not be decoded.')} />
              : <img src={review.media.url} alt={review.media.path}/>}
          {selectedCue && (captionOverlay || review.media.kind === 'audio') && <p className="review-caption">{selectedCue.text}</p>}
        </div>
        <div className="review-toolbar">{['video', 'audio'].includes(review.media.kind) && <><button className="secondary-button" onClick={() => void bridgeRequest('review.play', {reviewId: review.reviewId}).catch(reportError)}><Play size={14}/> Play</button>
          <button className="secondary-button" onClick={() => void bridgeRequest('review.pause', {reviewId: review.reviewId}).catch(reportError)}><Pause size={14}/> Pause</button>
          <input aria-label="Review timestamp" type="number" min={0} max={duration || undefined} step={0.1} value={Number(time.toFixed(1))} onChange={event => seek(Number(event.target.value))}/>
          <span>{timeLabel(time)} / {timeLabel(duration)}</span></>}
          {review.media.kind === 'video' && <label><input type="checkbox" checked={captionOverlay} onChange={event => setCaptionOverlay(event.target.checked)}/> Transcript overlay</label>}
          {review.media.kind === 'video' && <button className="secondary-button" disabled={busy} onClick={() => void image('frame')}><Camera size={14}/> Capture frame</button>}
          {['video', 'audio'].includes(review.media.kind) && <button className="secondary-button" disabled={busy} onClick={() => void image('spectrogram')}><Waves size={14}/> Spectrogram</button>}
        </div>
        <p className="review-note">{review.media.path}{review.media.digest ? ` · SHA-256 ${review.media.digest}` : ''}</p>
        {spectrogram && <figure className="spectrogram-view"><img src={spectrogram} alt="Measured frequency energy over time for the selected media"/><figcaption>Measured audio spectrogram. Use source/encoded QC and listening together; this image alone does not establish perceptual quality.</figcaption></figure>}
        {frame && <figure className="captured-frame"><img src={frame} alt={`Decoded video frame at ${timeLabel(frameTime)}`}/><figcaption>Decoded frame at {timeLabel(frameTime)}</figcaption></figure>}
        <details className="review-evidence"><summary>Subtitles and quality evidence ({cues.length} cues)</summary>
          <div className="subtitle-list">{cues.map((cue, index) => <button key={`${index}-${cue.startSeconds}`} className={selectedCue === cue ? 'active' : ''} onClick={() => seek(cue.startSeconds)}>
            <time>{timeLabel(cue.startSeconds)}</time><span>{cue.text}</span></button>)}</div>
          {!cues.length && <p>No subtitle track is bound to this output.</p>}
          {review.qc.receipts.map(receipt => <p key={receipt.path}><strong>{receipt.kind}</strong>: {receipt.path} {receipt.summary}</p>)}
        </details>
      </> : <div className="empty-state">Select a real output to review its playback, captions, frames and audio. MCP review tools control this same player.</div>}
    </div></div>
  </section>;
}
