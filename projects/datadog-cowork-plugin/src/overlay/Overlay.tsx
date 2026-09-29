import React from 'react';
import {useCurrentFrame} from 'remotion';
import {GlitchIn, kf, emphasisPulse, easeInOutPow, SENTENCES, TOTAL_FRAMES, CHAPTER_STARTS, FONT_HEAVY, FONT_WIDE, FONT_ORB, clamp01, SQUEEZE, fitSize, EM_WIDE} from '../common';
import {CText, TechText, Pill, TopCapsule, ArrowH, PURPLE, PURPLE_TECH, GREY, GREY_MID, WHITE, GLOW_PURPLE_S, PILL_SHADOW, fadeIn, slideUp} from '../ui';
import {VIDEO} from '../config';
const clampFrames = (n: number, len: number) => clamp01(n / len);


export const S = (id: string) => {
  const s = SENTENCES.find((x) => x.id === id);
  if (!s) throw new Error(`Config references missing sentence ${id}; check script/timeline.md`);
  return s;
};


const exitOut = (n: number) => {
  if (n < 0) return {dy: 0, op: 1};
  const t = Math.min(1, n / 11);
  return {dy: t * t * 440, op: 1 - Math.pow(t, 1.6)};
};



export const TITLE_RANGE: [number, number] = [1, (SENTENCES[0]?.from ?? 100) - 9];
export const Title: React.FC = () => {
  const N = useCurrentFrame() + TITLE_RANGE[0];
  const [a, b] = TITLE_RANGE;
  const exitN = N - (b - 11); 
  const dy = -exitOut(exitN).dy;
  const op = exitOut(exitN).op;
  const glow = 0.5 + 0.5 * Math.sin((N / 30) * Math.PI); 
  return (
    <div style={{position: 'absolute', inset: 0, transform: `translateY(${dy}px)`, opacity: op}}>
      <GlitchIn N={N} f0={a + 11} rgbSplit={6} slices={14} seed={3}>
        <div style={{position: 'absolute', left: 0, top: 268, width: 1280, display: 'flex', justifyContent: 'center', alignItems: 'baseline', gap: 26}}>
          <span style={{fontFamily: FONT_WIDE, fontSize: fitSize(VIDEO.title.big, VIDEO.title.rest ? 620 : 1120, 118, 64, EM_WIDE, 6), color: WHITE, lineHeight: 1, letterSpacing: 6, textShadow: `0 0 ${18 + 14 * glow}px rgba(102,45,248,${0.55 + 0.3 * glow}), 6px 6px 0 ${PURPLE}`}}>{VIDEO.title.big}</span>
          {VIDEO.title.rest ? (
            <span style={{fontFamily: FONT_HEAVY, fontWeight: 900, fontSize: fitSize(VIDEO.title.rest, 520, 96, 60, 1, 2), color: WHITE, lineHeight: 1, transform: `scaleX(${SQUEEZE})`, transformOrigin: '0 100%', letterSpacing: 2, WebkitTextStroke: '1px #000', paintOrder: 'stroke fill'}}>{VIDEO.title.rest}</span>
          ) : null}
        </div>
      </GlitchIn>
      <div style={{position: 'absolute', inset: 0, opacity: fadeIn(N - (a + 20), 10), transform: `translateY(${slideUp(N - (a + 20), 60, 18)}px)`}}>
        <TechText cx={640} cy={446} text={VIDEO.title.en} fontSize={38} scaleX={0.82} weight={700} />
      </div>
      <div style={{position: 'absolute', inset: 0, opacity: fadeIn(N - (a + 28), 10)}}>
        <CText cx={640} cy={520} size={30} weight={500} color={GREY} letterSpacing={6}>
          {VIDEO.title.tagline}
        </CText>
        <div style={{position: 'absolute', left: 520, top: 496, width: 240, height: 2, background: 'rgba(255,255,255,0.35)', transform: `scaleX(${fadeIn(N - (a + 28), 14)})`}} />
      </div>
    </div>
  );
};



const lastSentenceBefore = (frame: number) => [...SENTENCES].reverse().find((x) => x.to < frame)!;
export const CHAPTER_CARDS: Array<{n: number; title: string; tech: string; from: number; to: number}> = CHAPTER_STARTS.slice(1).map((c, i) => {
  const first = SENTENCES.find((x) => x.chapter === c.n)!;
  const prev = lastSentenceBefore(first.from);
  return {n: c.n, title: c.title, tech: VIDEO.chapterTech[i + 1] ?? '', from: prev.to + 3, to: first.from - 9};
});
export const ChapterCard: React.FC<{card: (typeof CHAPTER_CARDS)[number]}> = ({card}) => {
  const N = useCurrentFrame() + card.from;
  const n = N - card.from;
  const exitN = N - (card.to - 11);
  const dy = -exitOut(exitN).dy;
  const op = exitOut(exitN).op;
  const w = kf(n, [[0, 0], [20, 300]], easeInOutPow(2.5));
  return (
    <div style={{position: 'absolute', inset: 0, transform: `translateY(${dy}px)`, opacity: op}}>
      <div style={{position: 'absolute', opacity: fadeIn(n, 8)}}>
        <CText cx={640} cy={268} size={54} weight={700} family={FONT_ORB} color={PURPLE_TECH} letterSpacing={4} shadow="0 0 14px rgba(102,45,248,.6)">{`0${card.n}`}</CText>
      </div>
      <GlitchIn N={N} f0={card.from + 3} rgbSplit={5} seed={card.n}>
        <CText cx={640} cy={372} size={fitSize(card.title, 1100, 80, 46, 1, 3)} weight={900} scaleX={SQUEEZE} letterSpacing={3} style={{WebkitTextStroke: '1px #000', paintOrder: 'stroke fill'}}>{card.title}</CText>
      </GlitchIn>
      <div style={{position: 'absolute', left: 640 - w / 2, top: 428, width: w, height: 3, background: WHITE, opacity: 0.85}} />
      {card.tech ? (
        <div style={{position: 'absolute', opacity: fadeIn(n - 10, 10)}}>
          <TechText cx={640} cy={470} text={card.tech} fontSize={32} scaleX={0.82} />
        </div>
      ) : null}
    </div>
  );
};


export type HudEntry = {from: number; to: number; text: string; tech?: string; w?: number};

export const HUD: HudEntry[] = (SENTENCES.length ? VIDEO.hud : []).map((h) => {
  const a = S(h.fromS), b = S(h.toS);
  const isChapterFirst = SENTENCES.find((x) => x.chapter === a.chapter)!.id === a.id && a.chapter > 1;
  const from = a.from + (h.fromOffset ?? (isChapterFirst ? -8 : 0));
  const isChapterLast = [...SENTENCES].reverse().find((x) => x.chapter === b.chapter)!.id === b.id;
  const to = b.to + (h.toOffset ?? (isChapterLast ? 2 : 0));
  return {from, to, text: h.text, tech: h.tech, w: h.w};
});

for (let i = 0; i < HUD.length - 1; i++) if (HUD[i + 1].from - HUD[i].to < 30) HUD[i].to = HUD[i + 1].from - 1;
export const HUD_RANGE: [number, number] = HUD.length ? [HUD[0].from, HUD[HUD.length - 1].to] : [0, 0];
const hudW = (h: HudEntry) => h.w ?? Math.max(216, Math.round(h.text.replace(/\s/g, '').length * 20 + (h.text.match(/\s/g)?.length ?? 0) * 10 + 60));
export const Hud: React.FC = () => {
  const N = useCurrentFrame() + HUD_RANGE[0];
  const idx = HUD.findIndex((h) => N >= h.from && N <= h.to);
  if (idx < 0) return null;
  const e = HUD[idx];
  
  const nextGap = idx < HUD.length - 1 ? HUD[idx + 1].from - e.to : 999;
  const fadeTail = nextGap >= 30 ? 1 - clampFrames(N - (e.to - 8), 8) : 1;
  const w = hudW(e);
  
  const prev = idx > 0 ? HUD[idx - 1] : undefined;
  const n = N - e.from;
  const sameChapter = !!prev && e.from - prev.to < 30;
  if (sameChapter && prev && n < 10) {
    const t = easeInOutPow(2.5)(clampFrames(n, 10));
    const wNow = hudW(prev) + (w - hudW(prev)) * t;
    const oldOp = 1 - clampFrames(n, 6);
    const newOp = 1 - Math.pow(1 - clampFrames(n + 1, 9), 2.5);
    return (
      <div style={{position: 'absolute', inset: 0, opacity: fadeTail}}>
        <Pill x={640 - wNow / 2} y={28} w={wNow} h={51} fill={PURPLE} sw={2} style={{filter: PILL_SHADOW}} />
        {oldOp > 0.01 ? <CText cx={640} cy={53.5} size={33} weight={700} letterSpacing={1} opacity={oldOp}>{prev.text}</CText> : null}
        <div style={{position: 'absolute', inset: 0, opacity: newOp, transform: `translateY(${((1 - newOp) * 4).toFixed(2)}px)`}}>
          <CText cx={640} cy={53.5} size={33} weight={700} letterSpacing={1}>{e.text}</CText>
          {e.tech ? <TechText cx={640} cy={94} text={e.tech} fontSize={30} scaleX={0.8} /> : null}
        </div>
      </div>
    );
  }
  
  return <TopCapsule N={N} f0={e.from} text={e.text} w={w} tech={e.tech} opacity={fadeTail} />;
};


export type RailSpec = {steps: string[]; switches: number[]; from: number; to: number};
export const RAILS: RailSpec[] = (SENTENCES.length ? VIDEO.rails : []).map((r) => ({steps: r.steps, switches: r.switchS.map((id) => S(id).from), from: S(r.fromS).from - 8, to: S(r.toS).to + 2}));
const RAIL_CX = [240, 440, 640, 840, 1040];
const RAIL_W = 150, RAIL_H = 44, RAIL_Y = 118;
export const Rail: React.FC<{spec: RailSpec}> = ({spec}) => {
  const N = useCurrentFrame() + spec.from;
  let active = -1;
  spec.switches.forEach((f, i) => { if (N >= f) active = i; });
  const railOut = 1 - clampFrames(N - (spec.to - 8), 8); 
  return (
    <div style={{position: 'absolute', inset: 0, opacity: railOut}}>
      {spec.steps.map((t, i) => {
        const state = i === active ? 'active' : i < active ? 'done' : 'todo';
        const pulse = i === active ? emphasisPulse(N - spec.switches[i], {peak: 1.1, up: 10, hold: 3, down: 10}) : 1;
        const fill = state === 'active' ? PURPLE : state === 'done' ? '#2A2A2A' : '#000';
        const stroke = state === 'active' ? WHITE : state === 'done' ? GREY_MID : GREY;
        const color = state === 'todo' ? GREY : WHITE;
        return (
          <React.Fragment key={t}>
            <div style={{position: 'absolute', left: RAIL_CX[i] - RAIL_W / 2, top: RAIL_Y + slideUp(N - (spec.from + i * 2), 40, 16), width: RAIL_W, height: RAIL_H, transform: `scale(${pulse})`, opacity: fadeIn(N - (spec.from + i * 2), 8)}}>
              <Pill x={0} y={0} w={RAIL_W} h={RAIL_H} fill={fill} stroke={stroke} sw={2} text={t} fontSize={24} weight={700} color={color} letterSpacing={1} textDy={-1.5} glow={state === 'active' ? GLOW_PURPLE_S : undefined} />
            </div>
            {i < spec.steps.length - 1 ? (
              <ArrowH x={RAIL_CX[i] + RAIL_W / 2 + 6} y={RAIL_Y + RAIL_H / 2 - 9} w={38} h={18} p={clampFrames(N - (spec.from + 4 + i * 2), 10)} color={i < active ? WHITE : GREY} shaft={2} />
            ) : null}
          </React.Fragment>
        );
      })}
    </div>
  );
};




const LAST_TO = SENTENCES[SENTENCES.length - 1]?.to ?? TOTAL_FRAMES - 60;
export const ENDING_RANGE: [number, number] = [LAST_TO - VIDEO.endingFade, TOTAL_FRAMES];
export const Ending: React.FC = () => {
  const N = useCurrentFrame() + ENDING_RANGE[0];
  const n = N - ENDING_RANGE[0];
  const op = fadeIn(n, VIDEO.endingFade);
  return <div style={{position: 'absolute', inset: 0, background: '#000', opacity: op}} />;
};

export const END_CREDIT_RANGE: [number, number] = [LAST_TO + 1, TOTAL_FRAMES - 26];  
export const EndCredit: React.FC = () => {
  const N = useCurrentFrame() + END_CREDIT_RANGE[0];
  const n = N - END_CREDIT_RANGE[0];
  const len = END_CREDIT_RANGE[1] - END_CREDIT_RANGE[0];
  const op = Math.min(fadeIn(n, 8), 1 - clampFrames(N - (END_CREDIT_RANGE[1] - 8), 8));
  const c = VIDEO.credit;
  if (!c) return null;
  return (
    <div style={{position: 'absolute', inset: 0, opacity: op}}>
      <CText cx={640} cy={300} size={26} weight={500} color={GREY} letterSpacing={4}>{c.kicker}</CText>
      <CText cx={640} cy={352} size={40} weight={700} color={WHITE}>{c.title}</CText>
      <CText cx={640} cy={404} size={26} weight={500} color={GREY}>{c.byline}</CText>
      <div style={{position: 'absolute', left: 560, top: 440, width: 160, height: 2, background: 'rgba(255,255,255,0.35)', transform: `scaleX(${fadeIn(n - 6, 16)})`}} />
      <CText cx={640} cy={476} size={22} weight={500} color={GREY}>{c.note}</CText>
    </div>
  );
};

export const ENDING_TOP_RANGE: [number, number] = [LAST_TO - VIDEO.endingFade, TOTAL_FRAMES];
export const EndingTop: React.FC = () => {
  const N = useCurrentFrame() + ENDING_TOP_RANGE[0];
  const op = fadeIn(N - ENDING_TOP_RANGE[0], VIDEO.endingFade);
  return <div style={{position: 'absolute', inset: 0, background: '#000', opacity: op}} />;
};
