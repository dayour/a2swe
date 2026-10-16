import React from 'react';
import { AbsoluteFill, Audio, Composition, Img, Sequence, interpolate, spring, staticFile, useCurrentFrame, useVideoConfig } from 'remotion';
import content from './content.json';
import timeline from '../timeline.json';
import assetManifest from '../asset-manifest.json';
import { accentAlpha, brand, captionBackground, captionInk, dark, headingFont, line, mixHex, muted, primaryAlpha, primaryFont, radius, surface } from './palette';
import { VisualPanel, type Visual } from './Visuals';

type Citation = { evidenceId: string; sourceTitle: string; canonicalUrl: string };
type TimelineScene = {
  id: string; kind: string; title: string; body: string; narration: string; decision: string; claims: string[]; claimSources: string[]; citations: Citation[];
  assetIds: string[]; visual: Visual | null; visualId: string | null; startFrame: number; durationInFrames: number; endFrame: number; speechStartFrame: number; speechEndFrame: number;
};
type SubtitleCue = { text: string; startFrame: number; endFrame: number; sourceSegmentIndex: number; sceneId?: string };
type AssetRecord = { assetId: string; path: string; mediaType: string; role: string; alt: string };
const scenes: TimelineScene[] = timeline.scenes as TimelineScene[];
const subtitleCues: SubtitleCue[] = ((timeline as { subtitleCues?: SubtitleCue[] }).subtitleCues ?? []) as SubtitleCue[];
const assets: AssetRecord[] = assetManifest.assets;
const assetsById = new Map<string, AssetRecord>(assets.map((asset) => [asset.assetId, asset]));
const audioPath = staticFile('assets/agent-365/audio.wav');
const assetSrc = (asset: AssetRecord) => staticFile(asset.path.replace(/^public\//, ''));
// The brand band and highlight rule frame every scene like the header of the brand's own cards; the rule doubles as the progress bar.
const BAND = 84;
const RULE = 6;

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

function captionAt(frame: number): string {
  const cue = subtitleCues.find((item) => frame >= item.startFrame && frame < item.endFrame);
  return cue ? displayText(cue.text) : '';
}

function Backdrop() {
  const frame = useCurrentFrame();
  const [near, far] = dark ? [0.28, 0.18] : [0.1, 0.06];
  return <AbsoluteFill style={{ background: brand.canvas }}>
    <AbsoluteFill style={{ background: 'radial-gradient(1100px 720px at ' + (76 + Math.sin(frame / 110) * 5) + '% 4%, ' + primaryAlpha(near) + ', transparent 70%), radial-gradient(900px 620px at 4% 98%, ' + primaryAlpha(far) + ', transparent 70%)' }} />
    <AbsoluteFill style={{ backgroundImage: 'linear-gradient(' + line + ' 1px, transparent 1px), linear-gradient(90deg, ' + line + ' 1px, transparent 1px)', backgroundSize: '96px 96px', backgroundPosition: '0px ' + (frame / 10) + 'px', opacity: dark ? 0.4 : 0.35, WebkitMaskImage: 'linear-gradient(180deg, #000, transparent 82%)' }} />
  </AbsoluteFill>;
}

function HeaderBand() {
  const frame = useCurrentFrame();
  const index = Math.max(0, scenes.findIndex((scene) => frame >= scene.startFrame && frame < scene.startFrame + scene.durationInFrames));
  const progress = frame / Math.max(1, timeline.durationInFrames - 1);
  return <>
    <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: BAND, background: brand.header, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 48, padding: '0 96px', fontFamily: primaryFont, fontSize: 20, letterSpacing: 4, textTransform: 'uppercase' }}>
      <span style={{ color: brand.onHeader, fontWeight: 700, ...clip(1) }}>{splitHeadline(content.title)[0].replace(/[:.]$/, '')}</span>
      <span style={{ color: brand.headerMuted, fontWeight: 600, flex: '0 0 auto' }}>{String(index + 1).padStart(2, '0')} / {String(scenes.length).padStart(2, '0')}</span>
    </div>
    <div style={{ position: 'absolute', top: BAND, left: 0, right: 0, height: RULE, background: mixHex(brand.highlight, brand.header, 0.35) }} />
    <div style={{ position: 'absolute', top: BAND, left: 0, height: RULE, width: progress * 100 + '%', background: brand.highlight }} />
  </>;
}

function Headline({ title, size, maxWidth }: { title: string; size: number; maxWidth: number }) {
  const local = useCurrentFrame();
  const { fps } = useVideoConfig();
  const [lead, tail] = splitHeadline(title);
  const words = [...lead.split(' ').map((word) => ({ word, accent: false })), ...(tail ? tail.split(' ').map((word) => ({ word, accent: true })) : [])];
  return <h1 style={{ fontFamily: headingFont, fontSize: size, lineHeight: 1.05, fontWeight: brand.headingWeight, margin: 0, maxWidth, ...clip(3) }}>
    {words.map((item, index) => {
      const p = spring({ frame: local - index * 3, fps, config: { damping: 200 } });
      return <span key={index} style={{ display: 'inline-block', marginRight: '0.26em', color: item.accent ? brand.accent : brand.text, opacity: p, transform: 'translateY(' + (1 - p) * 26 + 'px)' }}>{item.word}</span>;
    })}
  </h1>;
}

function ClaimCard({ claim, source, number, progress, large, compact, lines }: { claim: string; source?: string; number: number; progress: number; large: boolean; compact: boolean; lines: number }) {
  const size = compact ? 22 : large ? 34 : 26;
  return <div style={{ display: 'flex', gap: 20, padding: compact ? '14px 20px' : '20px 26px', borderRadius: radius, background: surface, border: '1px solid ' + line, opacity: progress, transform: 'translateY(' + (1 - progress) * 26 + 'px)' }}>
    <div style={{ flex: compact ? '0 0 44px' : '0 0 56px', height: compact ? 44 : 56, borderRadius: 28, background: dark ? accentAlpha(0.24) : brand.primary, color: dark ? brand.accent : brand.onPrimary, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: compact ? 22 : 28, fontWeight: 800 }}>{number}</div>
    <div style={{ minWidth: 0 }}>
      <div style={{ fontSize: size, lineHeight: 1.25, fontWeight: 600, ...clip(lines) }}>{claim}</div>
      {source ? <div style={{ marginTop: 6, fontSize: compact ? 15 : 17, color: muted, ...clip(1) }}>{source}</div> : null}
    </div>
  </div>;
}

const GRID_HEIGHT = 466;
// Evidence cards share the column height: show as many cards (up to three) as can each display three lines, or their full text when shorter,
// and derive the line clamp from that share so cards never run past the column into the caption band.
function cardPlan(claims: string[], size: number): { count: number; lines: number } {
  const lineHeight = size * 1.25;
  const chrome = 69;
  const charsPerLine = Math.floor(780 / (size * 0.53));
  for (let count = Math.min(3, claims.length); count >= 1; count--) {
    const share = (GRID_HEIGHT - 18 * (count - 1)) / count;
    const lines = Math.floor((share - chrome) / lineHeight);
    const needed = Math.max(...claims.slice(0, count).map((claim) => Math.ceil(claim.length / charsPerLine)));
    if (count === 1 || lines >= Math.min(needed, 3)) return { count, lines: Math.max(1, Math.min(lines, 5)) };
  }
  return { count: 0, lines: 0 };
}

function SceneView({ scene, index }: { scene: TimelineScene; index: number }) {
  const local = useCurrentFrame();
  const { fps } = useVideoConfig();
  const last = scene.durationInFrames - 1;
  const fadeIn = last < 24 ? 1 : interpolate(local, [0, 10], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  const fadeOut = last >= 24
    ? interpolate(local, [last - 10, last], [1, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }) : 1;
  const fade = fadeIn * fadeOut;
  const enter = (delay: number) => spring({ frame: local - delay, fps, config: { damping: 200 } });
  const sceneAssets = scene.assetIds.map((id) => assetsById.get(id)).filter((asset): asset is AssetRecord => Boolean(asset) && Boolean(asset?.mediaType.startsWith('image/'))).slice(0, 2);
  const isTitle = scene.kind === 'title';
  const isLast = index === scenes.length - 1;
  const hasVisual = Boolean(scene.visual) || sceneAssets.length > 0;
  const cards = cardPlan(scene.claims, scene.claims.length === 1 ? 34 : 26);
  return <AbsoluteFill style={{ fontFamily: primaryFont, color: brand.text, opacity: fade }}>
    {isTitle ? <div style={{ position: 'absolute', left: 96, right: 96, top: 150 }}>
      <div style={{ fontSize: 24, letterSpacing: 5, textTransform: 'uppercase', color: brand.accent, fontWeight: 700, opacity: enter(0), marginBottom: 20 }}>{content.audience}</div>
      <Headline title={scene.title} size={92} maxWidth={1650} />
      <p style={{ fontSize: 38, lineHeight: 1.35, color: muted, maxWidth: 1400, margin: '28px 0 0', opacity: enter(14), ...clip(3) }}>{scene.body}</p>
      <div style={{ display: 'inline-flex', alignItems: 'center', gap: 22, marginTop: 36, padding: '18px 30px', borderRadius: radius, border: '1px solid ' + (dark ? accentAlpha(0.6) : brand.calloutLine), borderLeft: dark ? '1px solid ' + accentAlpha(0.6) : '8px solid ' + brand.calloutLine, background: dark ? accentAlpha(0.12) : brand.callout, opacity: enter(24), maxWidth: 1500 }}>
        <span style={{ fontSize: 20, letterSpacing: 4, textTransform: 'uppercase', color: brand.accent, fontWeight: 800 }}>Decision</span>
        <span style={{ fontSize: 30, fontWeight: 600, ...clip(2) }}>{scene.decision}</span>
      </div>
    </div> : <>
      <div style={{ position: 'absolute', left: 96, right: 96, top: 120 }}><Headline title={scene.title} size={84} maxWidth={1650} /></div>
      <div style={{ position: 'absolute', left: 96, right: 96, top: 384, height: 466, display: 'grid', gridTemplateColumns: hasVisual ? '600px 1fr' : '0.9fr 1.1fr', gap: hasVisual ? 48 : 64 }}>
        <div style={{ alignSelf: 'start', minWidth: 0 }}>
          <div style={{ borderLeft: '6px solid ' + brand.accent, paddingLeft: 30, opacity: enter(6) }}>
            <p style={{ fontSize: hasVisual ? 30 : 38, lineHeight: hasVisual ? 1.32 : 1.4, margin: 0, ...clip(isLast && !hasVisual ? 5 : hasVisual ? 6 : 7) }}>{scene.body}</p>
            {isLast && !hasVisual ? <p style={{ fontSize: 28, lineHeight: 1.3, margin: '28px 0 0', color: brand.accent, fontWeight: 700, ...clip(3) }}>Decision: {scene.decision}</p> : null}
          </div>
          {hasVisual ? <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginTop: 24 }}>
            {scene.claims.slice(0, 1).map((claim, claimIndex) => <ClaimCard key={claim} claim={claim} source={scene.claimSources[claimIndex]} number={claimIndex + 1} progress={enter(16 + claimIndex * 8)} large={false} compact lines={4} />)}
          </div> : null}
        </div>
        {hasVisual && scene.visual
          ? <div style={{ opacity: enter(4) }}><VisualPanel visual={scene.visual} id={scene.id} width={1080} height={466} frame={local} /></div>
          : sceneAssets.length
            ? <div style={{ display: 'grid', gridTemplateColumns: `repeat(${sceneAssets.length}, minmax(0, 1fr))`, gap: 16, opacity: enter(4), minWidth: 0 }}>
              {sceneAssets.map(asset => <Img key={asset.assetId} src={assetSrc(asset)} alt={asset.alt}
                style={{ width: '100%', height: 466, objectFit: 'contain', borderRadius: radius, border: '1px solid ' + line, background: surface }} />)}
            </div>
          : <div style={{ display: 'flex', flexDirection: 'column', gap: 18, minWidth: 0 }}>
            {scene.claims.slice(0, cards.count).map((claim, claimIndex) => <ClaimCard key={claim} claim={claim} source={scene.claimSources[claimIndex]} number={claimIndex + 1} progress={enter(14 + claimIndex * 10)} large={scene.claims.length === 1} compact={false} lines={cards.lines} />)}
          </div>}
      </div>
    </>}
    <div style={{ position: 'absolute', left: 96, right: 96, bottom: 32, fontSize: 18, color: muted, ...clip(1) }}>Sources: {[...new Set(scene.citations.map((citation) => citation.sourceTitle))].slice(0, 3).join('  ·  ')}</div>
  </AbsoluteFill>;
}

function GlobalCaption() {
  const frame = useCurrentFrame();
  const caption = captionAt(frame);
  return caption ? <div style={{ position: 'absolute', left: 160, right: 160, bottom: 92, padding: '18px 36px', borderRadius: radius, background: captionBackground, border: dark ? '1px solid ' + line : 'none', textAlign: 'center', fontSize: 40, lineHeight: 1.25, fontWeight: 700, fontFamily: primaryFont, color: captionInk, ...clip(3) }}>{caption}</div> : null;
}

export function Explainer() {
  return <AbsoluteFill>
    <Backdrop />
    {scenes.map((scene, index) => <Sequence key={index} from={scene.startFrame} durationInFrames={scene.durationInFrames}><SceneView scene={scene} index={index} /></Sequence>)}
    <HeaderBand />
    <GlobalCaption />
  </AbsoluteFill>;
}

// A settled, full-frame render of one visual; documents embed this exact image.
function VisualStill({ scene }: { scene: TimelineScene }) {
  return <AbsoluteFill style={{ background: brand.canvas, padding: 40 }}>
    {scene.visual ? <VisualPanel visual={scene.visual} id={scene.id} width={1520} height={820} frame={0} settled /> : null}
  </AbsoluteFill>;
}

export function Root() {
  const WithAudio = () => <><Audio src={audioPath} /><Explainer /></>;
  return <>
    <Composition id="agent-365" component={WithAudio} durationInFrames={timeline.durationInFrames} fps={timeline.fps} width={timeline.width} height={timeline.height} defaultProps={{ contentTitle: content.title }} />
    {scenes.filter((scene) => scene.visual && scene.visualId).map((scene) => <Composition key={scene.id} id={'visual-' + scene.visualId} component={() => <VisualStill scene={scene} />} durationInFrames={1} fps={timeline.fps} width={1600} height={900} />)}
  </>;
}

export default Root;
