import React from 'react';
import {AbsoluteFill, Audio, Sequence, staticFile} from 'remotion';
import {Fonts, BgTrack, DotFieldBg, FootageTrack, ProgressBar, Subtitles, SENTENCES, DESIGN_W, DESIGN_H, W, H} from './common';
import type {ShotDef, BgSpec, FootageSpec} from './common';
import {VIDEO} from './config';
import {SHOTS_OVERLAY, SHOTS_OVERLAY_TOP, BG_OVERLAY} from './overlay';
import {SHOTS_G1, BG_G1, FOOTAGE_G1} from './shots/G1';
import {SHOTS_G2, BG_G2, FOOTAGE_G2} from './shots/G2';
import {SHOTS_G3, BG_G3, FOOTAGE_G3} from './shots/G3';
import {SHOTS_G4, BG_G4, FOOTAGE_G4} from './shots/G4';
import {SHOTS_G5, BG_G5, FOOTAGE_G5} from './shots/G5';
import {SHOTS_G6, BG_G6, FOOTAGE_G6} from './shots/G6';
import {SHOTS_G7, BG_G7, FOOTAGE_G7} from './shots/G7';
import {SHOTS_G8, BG_G8, FOOTAGE_G8} from './shots/G8';




export const Stage: React.FC<{shots: ShotDef[]; bg: BgSpec[]; footage?: FootageSpec[]; audio?: boolean}> = ({shots, bg, footage = [], audio = false}) => (
  <AbsoluteFill style={{background: '#000'}}>
    <Fonts />
    {audio ? <Audio src={staticFile(`assets/${VIDEO.slug}/audio.wav`)} /> : null}
    <AbsoluteFill style={{width: DESIGN_W, height: DESIGN_H, transform: `scale(${W / DESIGN_W}, ${H / DESIGN_H})`, transformOrigin: 'top left'}}>
      {VIDEO.bg === 'dots' ? <DotFieldBg specs={bg} /> : <BgTrack specs={bg} />}
      <FootageTrack specs={footage} />
      {shots.filter((s) => s.layer !== 'aboveBar').map((s) => (
        <Sequence key={s.id} from={s.from - 1} durationInFrames={s.to - s.from + 1}>
          <s.Comp />
        </Sequence>
      ))}
      <ProgressBar />
      {shots.filter((s) => s.layer === 'aboveBar').map((s) => (
        <Sequence key={s.id} from={s.from - 1} durationInFrames={s.to - s.from + 1}>
          <s.Comp />
        </Sequence>
      ))}
      <Subtitles />
    </AbsoluteFill>
  </AbsoluteFill>
);

const SHOTS = [...SHOTS_OVERLAY, ...SHOTS_G1, ...SHOTS_G2, ...SHOTS_G3, ...SHOTS_G4, ...SHOTS_G5, ...SHOTS_G6, ...SHOTS_G7, ...SHOTS_G8, ...SHOTS_OVERLAY_TOP];
const BG = [...BG_OVERLAY, ...BG_G1, ...BG_G2, ...BG_G3, ...BG_G4, ...BG_G5, ...BG_G6, ...BG_G7, ...BG_G8];
const FOOTAGE = [...FOOTAGE_G1, ...FOOTAGE_G2, ...FOOTAGE_G3, ...FOOTAGE_G4, ...FOOTAGE_G5, ...FOOTAGE_G6, ...FOOTAGE_G7, ...FOOTAGE_G8];
export const Video: React.FC = () => <Stage shots={SHOTS} bg={BG} footage={FOOTAGE} audio={SENTENCES.length > 0} />;
