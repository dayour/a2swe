import React from 'react';
import {AbsoluteFill, Audio, interpolate, spring, staticFile, useCurrentFrame, useVideoConfig} from 'remotion';
import {CHAPTER_STARTS, Fonts, SENTENCES, Subtitles, TOTAL_FRAMES} from './common';

const C = {paper: '#F7F9FC', ink: '#101828', muted: '#526173', blue: '#2563EB', pale: '#E8F0FF', line: '#CAD5E3'};

const Pill: React.FC<{children: React.ReactNode; active?: boolean}> = ({children, active}) => (
  <div style={{
    padding: '14px 22px', borderRadius: 999, border: `2px solid ${active ? C.blue : C.line}`,
    background: active ? C.blue : '#FFFFFF', color: active ? '#FFFFFF' : C.ink,
    fontSize: 27, fontWeight: 700,
  }}>{children}</div>
);

const ChapterVisual: React.FC<{chapter: number; progress: number}> = ({chapter, progress}) => {
  const opacity = interpolate(progress, [0, 0.12, 0.88, 1], [0, 1, 1, 0], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});
  const y = interpolate(progress, [0, 0.18], [34, 0], {extrapolateRight: 'clamp'});
  const common = {opacity, transform: `translateY(${y}px)`};
  if (chapter === 1) return <div style={{...common, display: 'flex', gap: 22}}>
    {['Who owns it?', 'What can it access?', 'Can you trace it?'].map((x, i) => <Pill key={x} active={i === 2}>{x}</Pill>)}
  </div>;
  if (chapter === 2) return <div style={{...common, display: 'flex', alignItems: 'center', gap: 34}}>
    <Pill>Agent builders + runtimes</Pill><div style={{fontSize: 40, color: C.blue}}>→</div><Pill active>Agent 365 control plane</Pill>
  </div>;
  if (chapter >= 3 && chapter <= 5) {
    const labels = ['Observe', 'Govern', 'Secure'];
    return <div style={{...common, display: 'flex', gap: 26}}>
      {labels.map((x, i) => <Pill key={x} active={chapter - 3 === i}>{x}</Pill>)}
    </div>;
  }
  if (chapter === 6) return <div style={{...common, display: 'flex', gap: 22}}>
    {['Identity', 'Observability', 'Tooling', 'Notifications'].map((x, i) => <Pill key={x} active={i < 2}>{x}</Pill>)}
  </div>;
  return <div style={{...common, display: 'flex', gap: 20}}>
    {['Verify eligibility', 'Test controls', 'Expand with evidence'].map((x, i) => <Pill key={x} active={i === 0}>{x}</Pill>)}
  </div>;
};

export const Video: React.FC = () => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  let chapterIndex = 0;
  for (let index = 0; index < CHAPTER_STARTS.length; index++) {
    if (frame + 1 >= CHAPTER_STARTS[index].from) chapterIndex = index;
  }
  const chapter = CHAPTER_STARTS[chapterIndex] ?? CHAPTER_STARTS[0];
  const next = CHAPTER_STARTS[chapterIndex + 1]?.from ?? TOTAL_FRAMES + 1;
  const local = (frame + 1 - chapter.from) / Math.max(1, next - chapter.from);
  const intro = spring({frame, fps, config: {damping: 18, stiffness: 95}});
  const sentence = SENTENCES.find((item) => frame + 1 >= item.from && frame + 1 <= item.to);
  return (
    <AbsoluteFill style={{background: C.paper, color: C.ink, fontFamily: 'Arial, sans-serif'}}>
      <Fonts />
      <Audio src={staticFile('assets/agent-365/audio.wav')} />
      <div style={{position: 'absolute', left: 72, top: 54, right: 72, display: 'flex', justifyContent: 'space-between', alignItems: 'center'}}>
        <div style={{display: 'flex', alignItems: 'center', gap: 14}}>
          <div style={{width: 22, height: 22, borderRadius: 6, background: C.blue}} />
          <div style={{fontSize: 25, fontWeight: 800, letterSpacing: 0.4}}>AGENT 365</div>
        </div>
        <div style={{fontSize: 18, color: C.muted}}>Public-evidence engineering explainer · unofficial</div>
      </div>
      <div style={{position: 'absolute', left: 72, right: 72, top: 130, height: 2, background: C.line}} />
      <div style={{position: 'absolute', left: 92, right: 92, top: 155, bottom: 275, display: 'flex', flexDirection: 'column', justifyContent: 'center'}}>
        <div style={{fontSize: 21, color: C.blue, fontWeight: 800, textTransform: 'uppercase', letterSpacing: 2.2, marginBottom: 20}}>
          {String(chapter.n).padStart(2, '0')} / 07
        </div>
        <div style={{fontSize: chapter.n === 1 ? 82 : 72, lineHeight: 1.02, maxWidth: 1030, fontWeight: 800, letterSpacing: -2.6,
          opacity: intro, transform: `translateY(${(1 - intro) * 20}px)`}}>
          {chapter.title}
        </div>
        <div style={{marginTop: 34, minHeight: 118}}>
          <div style={{fontSize: 34, lineHeight: 1.28, color: C.muted, maxWidth: 1080}}>
            {sentence?.text ?? (chapter.n === 1 ? 'An accountable control plane starts with explicit ownership, access, and traceability.' : '')}
          </div>
        </div>
        <div style={{marginTop: 28}}><ChapterVisual chapter={chapter.n} progress={local} /></div>
      </div>
      <div style={{position: 'absolute', right: 72, top: 176, width: 150, height: 150, borderRadius: 75,
        background: C.pale, display: 'grid', placeItems: 'center', color: C.blue, fontSize: 52, fontWeight: 800}}>
        {chapter.n}
      </div>
      <div style={{position: 'absolute', left: 0, right: 0, bottom: 0, height: 8, background: C.pale}}>
        <div style={{height: '100%', width: `${((frame + 1) / TOTAL_FRAMES) * 100}%`, background: C.blue}} />
      </div>
      <Subtitles />
    </AbsoluteFill>
  );
};
