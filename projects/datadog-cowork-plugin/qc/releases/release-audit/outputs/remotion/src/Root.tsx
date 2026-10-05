import React from 'react';
import { AbsoluteFill, Audio, Composition, Img, Sequence, interpolate, spring, staticFile, useCurrentFrame, useVideoConfig } from 'remotion';
import content from './content.json';
import timeline from '../timeline.json';
import assetManifest from '../asset-manifest.json';
import { accentAlpha, line, muted, panelBackground, primaryFont, surface, theme } from './palette';
import { VisualPanel, type Visual } from './Visuals';

type Citation = { evidenceId: string; sourceTitle: string; canonicalUrl: string };
type TimelineScene = {
  id: string; kind: string; title: string; body: string; narration: string; decision: string; claims: string[]; claimSources: string[]; citations: Citation[];
  assetIds: string[]; visual: Visual | null; visualId: string | null; startFrame: number; durationInFrames: number; endFrame: number; speechStartFrame: number; speechEndFrame: number;
};
type AssetRecord = { assetId: string; path: string; mediaType: string; role: string; alt: string };
const scenes: TimelineScene[] = timeline.scenes as TimelineScene[];
const assets: AssetRecord[] = assetManifest.assets;
const assetsById = new Map<string, AssetRecord>(assets.map((asset) => [asset.assetId, asset]));
const audioPath = staticFile('assets/datadog-cowork-plugin/audio.wav');
const assetSrc = (asset: AssetRecord) => staticFile(asset.path.replace(/^public\//, ''));

const clip = (lines: number): React.CSSProperties => ({
  overflow: 'hidden', display: '-webkit-box', WebkitBoxOrient: 'vertical', WebkitLineClamp: lines, overflowWrap: 'anywhere'
});

function splitHeadline(title: string): [string, string] {
  const match = title.match(/^(.+?[.:!?])\s+(.+)$/);
  return match ? [match[1], match[2]] : [title, ''];
}

function sentences(text: string): string[] {
  const parts = text.match(/[^.!?]+[.!?]+["')\]]*\s*|[^.!?]+$/g) ?? [text];
  return parts.map((part) => part.trim()).filter(Boolean);
}

// Narration is written for speech ("H I P A A", "O Auth"); captions show the written form.
const displayText = (text: string) => text.replace(/\b(?:[A-Z] )+[A-Z]\b/g, (spelled) => spelled.replace(/ /g, '')).replace(/\bO Auth\b/g, 'OAuth');

function captionAt(scene: TimelineScene, frame: number): string {
  const parts = sentences(displayText(scene.narration));
  const total = parts.reduce((sum, part) => sum + part.length, 0) || 1;
  const span = Math.max(1, scene.speechEndFrame - scene.speechStartFrame);
  if (frame < scene.speechStartFrame || frame > scene.speechEndFrame) return '';
  let cursor = scene.speechStartFrame;
  for (const part of parts) {
    const length = Math.max(1, Math.round((span * part.length) / total));
    if (frame < cursor + length) return part;
    cursor += length;
  }
  return parts[parts.length - 1] ?? '';
}

function Backdrop() {
  const frame = useCurrentFrame();
  return <AbsoluteFill style={{ background: theme.background }}>
    <AbsoluteFill style={{ background: 'radial-gradient(1100px 720px at ' + (76 + Math.sin(frame / 110) * 5) + '% 4%, ' + accentAlpha(0.28) + ', transparent 70%), radial-gradient(900px 620px at 4% 98%, ' + accentAlpha(0.18) + ', transparent 70%)' }} />
    <AbsoluteFill style={{ backgroundImage: 'linear-gradient(' + line + ' 1px, transparent 1px), linear-gradient(90deg, ' + line + ' 1px, transparent 1px)', backgroundSize: '96px 96px', backgroundPosition: '0px ' + (frame / 10) + 'px', opacity: 0.4, WebkitMaskImage: 'linear-gradient(180deg, #000, transparent 82%)' }} />
  </AbsoluteFill>;
}

function Headline({ title, size, maxWidth }: { title: string; size: number; maxWidth: number }) {
  const local = useCurrentFrame();
  const { fps } = useVideoConfig();
  const [lead, tail] = splitHeadline(title);
  const words = [...lead.split(' ').map((word) => ({ word, accent: false })), ...(tail ? tail.split(' ').map((word) => ({ word, accent: true })) : [])];
  return <h1 style={{ fontSize: size, lineHeight: 1.05, fontWeight: 800, margin: 0, maxWidth, ...clip(3) }}>
    {words.map((item, index) => {
      const p = spring({ frame: local - index * 3, fps, config: { damping: 200 } });
      return <span key={index} style={{ display: 'inline-block', marginRight: '0.26em', color: item.accent ? theme.accent : theme.foreground, opacity: p, transform: 'translateY(' + (1 - p) * 26 + 'px)' }}>{item.word}</span>;
    })}
  </h1>;
}

function ClaimCard({ claim, source, number, progress, large, compact }: { claim: string; source?: string; number: number; progress: number; large: boolean; compact: boolean }) {
  const size = compact ? 22 : large ? 34 : 26;
  return <div style={{ display: 'flex', gap: 20, padding: compact ? '14px 20px' : '20px 26px', borderRadius: 22, background: surface, border: '1px solid ' + line, opacity: progress, transform: 'translateY(' + (1 - progress) * 26 + 'px)' }}>
    <div style={{ flex: compact ? '0 0 44px' : '0 0 56px', height: compact ? 44 : 56, borderRadius: 28, background: accentAlpha(0.24), color: theme.accent, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: compact ? 22 : 28, fontWeight: 800 }}>{number}</div>
    <div style={{ minWidth: 0 }}>
      <div style={{ fontSize: size, lineHeight: 1.25, fontWeight: 600, ...clip(compact ? 5 : large ? 5 : 4) }}>{claim}</div>
      {source ? <div style={{ marginTop: 6, fontSize: compact ? 15 : 17, color: muted, ...clip(1) }}>{source}</div> : null}
    </div>
  </div>;
}

function SceneView({ scene, index }: { scene: TimelineScene; index: number }) {
  const local = useCurrentFrame();
  const { fps } = useVideoConfig();
  const frame = scene.startFrame + local;
  const last = scene.durationInFrames - 1;
  const fade = last < 24 ? 1 : interpolate(local, [0, 10, last - 10, last], [0, 1, 1, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  const enter = (delay: number) => spring({ frame: local - delay, fps, config: { damping: 200 } });
  const caption = captionAt(scene, frame);
  const sceneAssets = scene.assetIds.map((id) => assetsById.get(id)).filter((asset): asset is AssetRecord => Boolean(asset) && Boolean(asset?.mediaType.startsWith('image/'))).slice(0, 2);
  const isTitle = scene.kind === 'title';
  const isLast = index === scenes.length - 1;
  const hasVisual = Boolean(scene.visual);
  const cardCount = hasVisual ? 1 : 3;
  return <AbsoluteFill style={{ fontFamily: primaryFont, color: theme.foreground, opacity: fade }}>
    <div style={{ position: 'absolute', top: 40, left: 96, right: 96, display: 'flex', justifyContent: 'space-between', fontSize: 20, letterSpacing: 4, textTransform: 'uppercase' }}>
      <span style={{ color: theme.accent, fontWeight: 700 }}>{splitHeadline(content.title)[0]}</span>
      <span style={{ color: muted }}>{String(index + 1).padStart(2, '0')} / {String(scenes.length).padStart(2, '0')}</span>
    </div>
    {isTitle ? <div style={{ position: 'absolute', left: 96, right: 96, top: 150 }}>
      <div style={{ fontSize: 24, letterSpacing: 5, textTransform: 'uppercase', color: theme.accent, fontWeight: 700, opacity: enter(0), marginBottom: 20 }}>{content.audience}</div>
      <Headline title={scene.title} size={92} maxWidth={1650} />
      <p style={{ fontSize: 38, lineHeight: 1.35, color: muted, maxWidth: 1400, margin: '28px 0 0', opacity: enter(14), ...clip(3) }}>{scene.body}</p>
      <div style={{ display: 'inline-flex', alignItems: 'center', gap: 22, marginTop: 36, padding: '18px 30px', borderRadius: 22, border: '1px solid ' + accentAlpha(0.6), background: accentAlpha(0.12), opacity: enter(24), maxWidth: 1500 }}>
        <span style={{ fontSize: 20, letterSpacing: 4, textTransform: 'uppercase', color: theme.accent, fontWeight: 800 }}>Decision</span>
        <span style={{ fontSize: 30, fontWeight: 600, ...clip(2) }}>{scene.decision}</span>
      </div>
    </div> : <>
      <div style={{ position: 'absolute', left: 96, right: 96, top: 116 }}><Headline title={scene.title} size={84} maxWidth={1650} /></div>
      <div style={{ position: 'absolute', left: 96, right: 96, top: 380, height: 470, display: 'grid', gridTemplateColumns: hasVisual ? '600px 1fr' : '0.9fr 1.1fr', gap: hasVisual ? 48 : 64 }}>
        <div style={{ alignSelf: 'start', minWidth: 0 }}>
          <div style={{ borderLeft: '6px solid ' + theme.accent, paddingLeft: 30, opacity: enter(6) }}>
            <p style={{ fontSize: hasVisual ? 30 : 38, lineHeight: hasVisual ? 1.32 : 1.4, margin: 0, ...clip(isLast && !hasVisual ? 5 : hasVisual ? 6 : 7) }}>{scene.body}</p>
            {isLast && !hasVisual ? <p style={{ fontSize: 28, lineHeight: 1.3, margin: '28px 0 0', color: theme.accent, fontWeight: 700, ...clip(3) }}>Decision: {scene.decision}</p> : null}
            {!hasVisual ? sceneAssets.map((asset) => <div key={asset.assetId} style={{ marginTop: 28, opacity: enter(10) }}>
              <Img src={assetSrc(asset)} alt={asset.alt} style={{ width: '100%', maxHeight: 250, objectFit: 'contain', borderRadius: 18, border: '1px solid ' + line }} />
            </div>) : null}
          </div>
          {hasVisual ? <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginTop: 24 }}>
            {scene.claims.slice(0, cardCount).map((claim, claimIndex) => <ClaimCard key={claim} claim={claim} source={scene.claimSources[claimIndex]} number={claimIndex + 1} progress={enter(16 + claimIndex * 8)} large={false} compact />)}
          </div> : null}
        </div>
        {hasVisual && scene.visual
          ? <div style={{ opacity: enter(4) }}><VisualPanel visual={scene.visual} id={scene.id} width={1080} height={470} frame={local} /></div>
          : <div style={{ display: 'flex', flexDirection: 'column', gap: 18, minWidth: 0 }}>
            {scene.claims.slice(0, cardCount).map((claim, claimIndex) => <ClaimCard key={claim} claim={claim} source={scene.claimSources[claimIndex]} number={claimIndex + 1} progress={enter(14 + claimIndex * 10)} large={scene.claims.length === 1} compact={false} />)}
          </div>}
      </div>
    </>}
    {caption ? <div style={{ position: 'absolute', left: 160, right: 160, bottom: 92, padding: '18px 36px', borderRadius: 22, background: panelBackground, border: '1px solid ' + line, textAlign: 'center', fontSize: 40, lineHeight: 1.25, fontWeight: 700, ...clip(3) }}>{caption}</div> : null}
    <div style={{ position: 'absolute', left: 96, right: 96, bottom: 32, fontSize: 18, color: muted, ...clip(1) }}>Sources: {scene.citations.slice(0, 3).map((citation) => '[' + citation.evidenceId + '] ' + citation.sourceTitle).join('  ·  ')}</div>
  </AbsoluteFill>;
}

function Progress() {
  const frame = useCurrentFrame();
  return <div style={{ position: 'absolute', top: 0, left: 0, height: 6, width: (frame / Math.max(1, timeline.durationInFrames - 1)) * 100 + '%', background: theme.accent }} />;
}

export function Explainer() {
  return <AbsoluteFill>
    <Backdrop />
    {scenes.map((scene, index) => <Sequence key={index} from={scene.startFrame} durationInFrames={scene.durationInFrames}><SceneView scene={scene} index={index} /></Sequence>)}
    <Progress />
  </AbsoluteFill>;
}

// A settled, full-frame render of one visual; documents embed this exact image.
function VisualStill({ scene }: { scene: TimelineScene }) {
  return <AbsoluteFill style={{ background: theme.background, padding: 40 }}>
    {scene.visual ? <VisualPanel visual={scene.visual} id={scene.id} width={1520} height={820} frame={0} settled /> : null}
  </AbsoluteFill>;
}

export function Root() {
  const WithAudio = () => <><Audio src={audioPath} /><Explainer /></>;
  return <>
    <Composition id="datadog-cowork-plugin" component={WithAudio} durationInFrames={timeline.durationInFrames} fps={timeline.fps} width={timeline.width} height={timeline.height} defaultProps={{ contentTitle: content.title }} />
    {scenes.filter((scene) => scene.visual && scene.visualId).map((scene) => <Composition key={scene.id} id={'visual-' + scene.visualId} component={() => <VisualStill scene={scene} />} durationInFrames={1} fps={timeline.fps} width={1600} height={900} />)}
  </>;
}

export default Root;
