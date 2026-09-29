import React from 'react';
import {AbsoluteFill, Sequence} from 'remotion';
import {SUBS} from './subs';
import {fitSize, textW} from './textfit';


export const SUB_STYLE = {fontSize: 44, weight: 700, top: 637, color: '#FFFFFF', stroke: 4, strokeColor: '#000000'};
export const SUB_MAX_W = 1160; 
const ring = (r: number, k: number, col: string) => Array.from({length: k}, (_, i) => {
  const a = (i / k) * Math.PI * 2;
  return `${(Math.cos(a) * r).toFixed(2)}px ${(Math.sin(a) * r).toFixed(2)}px 0 ${col}`;
});
export const strokeShadow = (w = SUB_STYLE.stroke, col = SUB_STYLE.strokeColor) => [...ring(w, 16, col), ...ring(w * 0.6, 8, col), ...ring(w * 0.3, 4, col)].join(', ');

export const SubtitleLine: React.FC<{text: string; top?: number; left?: number; color?: string; stroke?: number}> = ({text, top = SUB_STYLE.top, left = 640, color = SUB_STYLE.color, stroke = SUB_STYLE.stroke}) => {
  
  
  
  const size = fitSize(text, SUB_MAX_W, SUB_STYLE.fontSize, 34);
  const lh = 1.2;
  const font: React.CSSProperties = {fontFamily: `'Noto Sans SC', 'PingFang SC', sans-serif`, fontWeight: SUB_STYLE.weight, fontSize: size, lineHeight: lh, color, textShadow: strokeShadow(stroke)};
  if (textW(text, size) <= SUB_MAX_W) {
    return <div style={{position: 'absolute', left, top, transform: 'translateX(-50%)', whiteSpace: 'nowrap', ...font}}>{text}</div>;
  }
  
  
  
  const lineH = Math.round(size * lh);
  return (
    <div style={{position: 'absolute', left, top: top - lineH, transform: 'translateX(-50%)', width: SUB_MAX_W, height: lineH * 2, display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', textAlign: 'center', whiteSpace: 'normal', ...font}}>
      <div>{text}</div>
    </div>
  );
};
export const Subtitles: React.FC = () => (
  <AbsoluteFill style={{pointerEvents: 'none'}}>
    {SUBS.map((s, k) => (
      <Sequence key={k} from={s.from - 1} durationInFrames={Math.max(1, s.to - s.from + 1)}>
        <SubtitleLine text={s.text} />
      </Sequence>
    ))}
  </AbsoluteFill>
);
