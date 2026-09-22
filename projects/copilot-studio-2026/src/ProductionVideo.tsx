import React from 'react';
import {
  AbsoluteFill,
  Audio,
  Easing,
  interpolate,
  Sequence,
  spring,
  staticFile,
  useCurrentFrame,
} from 'remotion';
import {Fonts, Subtitles, TOTAL_FRAMES} from './common';

const C = {
  ink: '#07111F',
  navy: '#0B1930',
  cyan: '#54E4FF',
  blue: '#5A8CFF',
  violet: '#A879FF',
  coral: '#FF9877',
  lime: '#8FF0B5',
  white: '#F7FAFF',
  muted: '#AAB9D1',
  line: 'rgba(179, 208, 255, 0.18)',
};

const font = "'Noto Sans SC', 'Segoe UI', sans-serif";
const tech = "'Exo 2', 'Segoe UI', sans-serif";

const fade = (frame: number, start = 0, duration = 16) =>
  interpolate(frame, [start, start + duration], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
    easing: Easing.out(Easing.cubic),
  });

const rise = (frame: number, start = 0, amount = 30) =>
  interpolate(frame, [start, start + 20], [amount, 0], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
    easing: Easing.out(Easing.cubic),
  });

const SceneShell: React.FC<{
  number: string;
  kicker: string;
  title: string;
  children: React.ReactNode;
  accent?: string;
}> = ({number, kicker, title, children, accent = C.cyan}) => {
  const frame = useCurrentFrame();
  return (
    <AbsoluteFill
      style={{
        overflow: 'hidden',
        background:
          'radial-gradient(circle at 78% 28%, rgba(91,74,180,.24), transparent 38%), radial-gradient(circle at 20% 76%, rgba(19,151,181,.17), transparent 34%), linear-gradient(145deg, #07101e 0%, #0a1830 52%, #07111f 100%)',
        color: C.white,
        fontFamily: font,
      }}
    >
      <AbsoluteFill
        style={{
          opacity: 0.42,
          backgroundImage:
            'linear-gradient(rgba(143,184,255,.055) 1px, transparent 1px), linear-gradient(90deg, rgba(143,184,255,.055) 1px, transparent 1px)',
          backgroundSize: '48px 48px',
          transform: `translate(${(frame % 48) * 0.08}px, ${(frame % 48) * 0.04}px)`,
        }}
      />
      <div
        style={{
          position: 'absolute',
          left: 180 + Math.sin(frame / 24) * 150,
          top: 130 + Math.cos(frame / 31) * 65,
          width: 560,
          height: 430,
          borderRadius: '50%',
          background: `radial-gradient(circle, ${accent}24 0%, ${accent}0d 38%, transparent 72%)`,
          filter: 'blur(8px)',
          pointerEvents: 'none',
        }}
      />
      <div
        style={{
          position: 'absolute',
          left: 0,
          top: 145 + ((frame * 2.2) % 430),
          width: 1280,
          height: 8,
          background: `linear-gradient(90deg, transparent 4%, ${accent}3b 35%, ${accent}26 68%, transparent 96%)`,
          filter: 'blur(1.5px)',
          pointerEvents: 'none',
        }}
      />
      <div
        style={{
          position: 'absolute',
          left: -420 + ((frame * 8) % 1900),
          top: -160,
          width: 280,
          height: 1040,
          transform: 'rotate(18deg)',
          background: 'linear-gradient(90deg, transparent, rgba(116,190,255,.055), transparent)',
          pointerEvents: 'none',
        }}
      />
      <div
        style={{
          position: 'absolute',
          left: 66,
          top: 45,
          display: 'flex',
          alignItems: 'center',
          gap: 16,
          opacity: fade(frame, 2),
        }}
      >
        <div
          style={{
            width: 44,
            height: 44,
            borderRadius: 14,
            display: 'grid',
            placeItems: 'center',
            border: `1px solid ${accent}`,
            color: accent,
            fontFamily: tech,
            fontWeight: 800,
            boxShadow: `0 0 22px ${accent}38`,
          }}
        >
          {number}
        </div>
        <div>
          <div style={{fontFamily: tech, fontSize: 14, letterSpacing: 3, color: accent, fontWeight: 800}}>
            {kicker.toUpperCase()}
          </div>
          <div style={{fontSize: 26, fontWeight: 760, letterSpacing: -0.5}}>{title}</div>
        </div>
      </div>
      <div
        style={{
          position: 'absolute',
          right: 68,
          top: 58,
          color: C.muted,
          fontFamily: tech,
          fontSize: 13,
          letterSpacing: 2.2,
        }}
      >
        COPILOT STUDIO · 2026
      </div>
      {children}
    </AbsoluteFill>
  );
};

const Pill: React.FC<{label: string; x: number; y: number; color: string; delay: number}> = ({
  label,
  x,
  y,
  color,
  delay,
}) => {
  const frame = useCurrentFrame();
  const scale = spring({frame: frame - delay, fps: 30, config: {damping: 15, stiffness: 120}});
  return (
    <div
      style={{
        position: 'absolute',
        left: x,
        top: y,
        width: 224,
        height: 84,
        borderRadius: 22,
        border: `1px solid ${color}88`,
        background: 'linear-gradient(145deg, rgba(18,35,62,.96), rgba(9,20,38,.95))',
        boxShadow: `0 14px 35px rgba(0,0,0,.28), inset 0 0 26px ${color}16`,
        transform: `scale(${scale}) translateY(${(1 - scale) * 20}px)`,
        opacity: scale,
        display: 'flex',
        alignItems: 'center',
        padding: '0 24px',
        gap: 17,
      }}
    >
      <div
        style={{
          width: 38,
          height: 38,
          borderRadius: 12,
          background: `${color}18`,
          border: `1px solid ${color}66`,
          display: 'grid',
          placeItems: 'center',
        }}
      >
        <div style={{width: 13, height: 13, borderRadius: 4, background: color, boxShadow: `0 0 14px ${color}`}} />
      </div>
      <div style={{fontFamily: tech, fontWeight: 760, fontSize: 22, letterSpacing: 0.5}}>{label}</div>
    </div>
  );
};

export const Scene1: React.FC = () => {
  const frame = useCurrentFrame();
  const open = spring({frame: frame + 4, fps: 30, config: {damping: 16, stiffness: 95}});
  const split = spring({frame: frame - 35, fps: 30, config: {damping: 18, stiffness: 90}});
  const lanes = [
    {label: 'AGENT', color: C.cyan, x: 190},
    {label: 'WORKFLOW', color: C.violet, x: 528},
    {label: 'GOVERNANCE', color: C.lime, x: 866},
  ];
  return (
    <SceneShell number="01" kicker="The shift" title="Beyond the chatbot frame">
      <div
        style={{
          position: 'absolute',
          left: 438,
          top: 170,
          width: 404,
          height: 178,
          borderRadius: 42,
          border: `2px solid ${C.cyan}`,
          background: 'linear-gradient(145deg, rgba(28,58,91,.92), rgba(11,24,45,.95))',
          boxShadow: `0 0 65px ${C.cyan}28, inset 0 0 38px rgba(84,228,255,.08)`,
          transform: `scale(${0.8 + open * 0.2}) translateY(${(1 - open) * 35}px)`,
          opacity: open,
        }}
      >
        <div style={{display: 'flex', gap: 18, padding: '58px 72px'}}>
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              style={{
                width: 58 + i * 12,
                height: 12,
                borderRadius: 8,
                background: i === 1 ? C.violet : C.cyan,
                opacity: 0.75,
                transform: `scaleX(${0.75 + 0.25 * Math.sin((frame + i * 13) / 12)})`,
              }}
            />
          ))}
        </div>
        <div
          style={{
            position: 'absolute',
            left: 96,
            bottom: -27,
            width: 52,
            height: 30,
            background: '#132947',
            clipPath: 'polygon(0 0, 100% 0, 72% 100%)',
          }}
        />
      </div>
      <svg width="1280" height="720" style={{position: 'absolute', inset: 0}}>
        {lanes.map((lane, i) => {
          const x2 = lane.x + 112;
          const startX = 640;
          const startY = 350;
          const endY = 430;
          const path = `M ${startX} ${startY} C ${startX} ${380 + i * 10}, ${x2} ${390 + i * 8}, ${x2} ${endY}`;
          return (
            <path
              key={lane.label}
              d={path}
              fill="none"
              stroke={lane.color}
              strokeWidth="3"
              strokeDasharray="8 12"
              strokeDashoffset={-frame * 1.4}
              opacity={split * 0.8}
            />
          );
        })}
      </svg>
      {lanes.map((lane, i) => (
        <Pill key={lane.label} label={lane.label} x={lane.x} y={425} color={lane.color} delay={43 + i * 9} />
      ))}
      <div
        style={{
          position: 'absolute',
          width: '100%',
          top: 570,
          textAlign: 'center',
          color: C.muted,
          fontSize: 18,
          letterSpacing: 1.4,
          opacity: fade(frame, 58),
        }}
      >
        One studio · three operating lanes
      </div>
    </SceneShell>
  );
};

const CanvasNode: React.FC<{
  x: number;
  y: number;
  w: number;
  label: string;
  sub: string;
  color: string;
  delay: number;
}> = ({x, y, w, label, sub, color, delay}) => {
  const frame = useCurrentFrame();
  const p = spring({frame: frame - delay, fps: 30, config: {damping: 17, stiffness: 115}});
  return (
    <div
      style={{
        position: 'absolute',
        left: x,
        top: y,
        width: w,
        height: 92,
        borderRadius: 20,
        border: `1px solid ${color}80`,
        background: 'rgba(10,24,44,.94)',
        boxShadow: `0 12px 30px rgba(0,0,0,.25), inset 4px 0 0 ${color}`,
        padding: '18px 20px 16px 28px',
        opacity: p,
        transform: `translateY(${(1 - p) * 28}px) scale(${0.94 + 0.06 * p})`,
      }}
    >
      <div style={{fontSize: 21, fontWeight: 780}}>{label}</div>
      <div style={{fontFamily: tech, fontSize: 14, color: C.muted, marginTop: 6, letterSpacing: 0.7}}>{sub}</div>
    </div>
  );
};

export const Scene2: React.FC = () => {
  const frame = useCurrentFrame();
  const nodes = [
    {x: 92, y: 202, w: 238, label: 'Business data', sub: 'grounded context', color: C.cyan, delay: 10},
    {x: 92, y: 350, w: 238, label: 'Systems', sub: 'connectors + APIs', color: C.blue, delay: 20},
    {x: 950, y: 202, w: 238, label: 'Work channels', sub: 'publish in context', color: C.lime, delay: 34},
    {x: 950, y: 350, w: 238, label: 'Operations', sub: 'observe + improve', color: C.coral, delay: 42},
  ];
  const packet = (frame * 3.2) % 580;
  return (
    <SceneShell number="02" kicker="Low-code canvas" title="Build agents and workflows" accent={C.violet}>
      <svg width="1280" height="720" style={{position: 'absolute', inset: 0}}>
        {[
          [330, 248, 510, 318],
          [330, 396, 510, 362],
          [770, 318, 950, 248],
          [770, 362, 950, 396],
        ].map(([x1, y1, x2, y2], index) => (
          <g key={index}>
            <path d={`M${x1} ${y1} C${x1 + 90} ${y1}, ${x2 - 90} ${y2}, ${x2} ${y2}`} fill="none" stroke={C.line} strokeWidth="4" />
            <circle
              cx={x1 + ((x2 - x1) * ((packet + index * 120) % 580)) / 580}
              cy={y1 + ((y2 - y1) * ((packet + index * 120) % 580)) / 580}
              r="5"
              fill={[C.cyan, C.blue, C.lime, C.coral][index]}
            />
          </g>
        ))}
      </svg>
      {nodes.map((node) => (
        <CanvasNode key={node.label} {...node} />
      ))}
      <div
        style={{
          position: 'absolute',
          left: 510,
          top: 217,
          width: 260,
          height: 250,
          borderRadius: 34,
          background: 'linear-gradient(160deg, rgba(63,45,118,.92), rgba(14,28,52,.98))',
          border: `1px solid ${C.violet}`,
          boxShadow: `0 0 60px ${C.violet}2f`,
          opacity: fade(frame, 5),
          transform: `translateY(${rise(frame, 5, 24)}px)`,
        }}
      >
        <div style={{padding: '29px 30px'}}>
          <div style={{fontFamily: tech, color: C.violet, letterSpacing: 2.2, fontSize: 14}}>COMPOSE</div>
          <div style={{fontSize: 28, fontWeight: 800, marginTop: 8}}>Copilot Studio</div>
          <div style={{height: 1, background: C.line, margin: '22px 0'}} />
          {['Agent', 'Workflow', 'Agent flow'].map((item, i) => (
            <div key={item} style={{display: 'flex', alignItems: 'center', gap: 14, marginTop: 13, opacity: fade(frame, 22 + i * 8)}}>
              <div style={{width: 22, height: 22, borderRadius: 7, background: [C.cyan, C.violet, C.lime][i], boxShadow: `0 0 15px ${[C.cyan, C.violet, C.lime][i]}66`}} />
              <div style={{fontSize: 18, fontWeight: 690}}>{item}</div>
            </div>
          ))}
        </div>
      </div>
      <div style={{position: 'absolute', left: 401, top: 532, width: 478, display: 'flex', justifyContent: 'center', gap: 14}}>
        {['DESIGN', 'TEST', 'PUBLISH'].map((label, i) => (
          <div
            key={label}
            style={{
              padding: '11px 18px',
              borderRadius: 99,
              border: `1px solid ${i === 2 ? C.lime : C.line}`,
              color: i === 2 ? C.lime : C.muted,
              fontFamily: tech,
              fontSize: 13,
              letterSpacing: 1.6,
              opacity: fade(frame, 58 + i * 7),
            }}
          >
            {label}
          </div>
        ))}
      </div>
    </SceneShell>
  );
};

export const Scene3: React.FC = () => {
  const frame = useCurrentFrame();
  const orbit = frame * 0.42;
  const options = [
    {label: 'TOPIC', color: C.blue, angle: -145},
    {label: 'TOOL', color: C.coral, angle: -35},
    {label: 'KNOWLEDGE', color: C.cyan, angle: 35},
    {label: 'AGENT', color: C.violet, angle: 145},
  ];
  return (
    <SceneShell number="03" kicker="Generative orchestration" title="Choose the right capability" accent={C.cyan}>
      <div
        style={{
          position: 'absolute',
          left: 88,
          top: 264,
          width: 264,
          minHeight: 104,
          padding: '22px 25px',
          borderRadius: 24,
          background: 'rgba(12,29,54,.96)',
          border: `1px solid ${C.cyan}88`,
          boxShadow: `0 0 35px ${C.cyan}1f`,
          opacity: fade(frame, 8),
          transform: `translateX(${interpolate(frame, [8, 30], [-50, 0], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'})}px)`,
        }}
      >
        <div style={{fontFamily: tech, fontSize: 13, color: C.cyan, letterSpacing: 2}}>REQUEST</div>
        <div style={{fontSize: 20, lineHeight: 1.35, fontWeight: 680, marginTop: 10}}>“Resolve the customer’s service issue.”</div>
      </div>
      <svg width="1280" height="720" style={{position: 'absolute', inset: 0}}>
        <path d="M352 318 C410 318 420 318 467 318" fill="none" stroke={C.cyan} strokeWidth="3" strokeDasharray="8 9" strokeDashoffset={-frame * 2} />
        {options.map((item) => {
          const radians = (item.angle * Math.PI) / 180;
          const x = 640 + Math.cos(radians) * 238;
          const y = 330 + Math.sin(radians) * 176;
          return <path key={item.label} d={`M640 330 Q${(640 + x) / 2} ${(330 + y) / 2 - 25} ${x} ${y}`} fill="none" stroke={item.color} strokeWidth="2" opacity=".55" />;
        })}
      </svg>
      <div
        style={{
          position: 'absolute',
          left: 500,
          top: 190,
          width: 280,
          height: 280,
          borderRadius: '50%',
          border: `2px solid ${C.cyan}99`,
          boxShadow: `0 0 70px ${C.cyan}26, inset 0 0 55px ${C.violet}18`,
          transform: `rotate(${orbit}deg)`,
        }}
      >
        {[0, 1, 2, 3].map((i) => (
          <div
            key={i}
            style={{
              position: 'absolute',
              left: 131,
              top: -7,
              width: 16,
              height: 16,
              borderRadius: '50%',
              background: [C.cyan, C.violet, C.coral, C.lime][i],
              transformOrigin: '8px 147px',
              transform: `rotate(${i * 90}deg)`,
              boxShadow: `0 0 18px ${[C.cyan, C.violet, C.coral, C.lime][i]}`,
            }}
          />
        ))}
      </div>
      <div
        style={{
          position: 'absolute',
          left: 548,
          top: 279,
          width: 184,
          height: 102,
          borderRadius: 26,
          background: 'rgba(8,20,40,.96)',
          border: `1px solid ${C.violet}`,
          display: 'grid',
          placeItems: 'center',
          textAlign: 'center',
          boxShadow: `0 0 34px ${C.violet}35`,
        }}
      >
        <div>
          <div style={{fontFamily: tech, fontSize: 13, color: C.violet, letterSpacing: 2}}>ORCHESTRATE</div>
          <div style={{fontSize: 23, fontWeight: 800, marginTop: 6}}>Plan + route</div>
        </div>
      </div>
      {options.map((item, i) => {
        const radians = (item.angle * Math.PI) / 180;
        const x = 640 + Math.cos(radians) * 325 - 78;
        const y = 330 + Math.sin(radians) * 235 - 28;
        const p = spring({frame: frame - 30 - i * 8, fps: 30, config: {damping: 15, stiffness: 120}});
        return (
          <div
            key={item.label}
            style={{
              position: 'absolute',
              left: x,
              top: y,
              width: 156,
              height: 56,
              borderRadius: 18,
              border: `1px solid ${item.color}88`,
              background: 'rgba(9,22,42,.97)',
              display: 'grid',
              placeItems: 'center',
              color: item.color,
              fontFamily: tech,
              fontWeight: 800,
              letterSpacing: 1.2,
              opacity: p,
              transform: `scale(${0.8 + p * 0.2})`,
            }}
          >
            {item.label}
          </div>
        );
      })}
      <div style={{position: 'absolute', right: 90, top: 560, color: C.muted, fontFamily: tech, fontSize: 15, opacity: fade(frame, 70)}}>
        DESCRIPTIONS + CONTEXT GUIDE SELECTION
      </div>
    </SceneShell>
  );
};

const ToolGlyph: React.FC<{kind: number; color: string}> = ({kind, color}) => {
  if (kind === 0) return <div style={{width: 38, height: 22, border: `4px solid ${color}`, borderRadius: 8, transform: 'rotate(-10deg)'}} />;
  if (kind === 1) return <div style={{width: 42, height: 30, borderLeft: `4px solid ${color}`, borderBottom: `4px solid ${color}`, borderRadius: 8}} />;
  if (kind === 2) return <div style={{width: 42, height: 30, border: `3px solid ${color}`, borderRadius: 6}}><div style={{height: 3, background: color, margin: '7px 7px'}} /></div>;
  if (kind === 3) return <div style={{fontFamily: tech, color, fontSize: 30, fontWeight: 900}}>{'{ }'}</div>;
  if (kind === 4) return <div style={{width: 42, height: 42, borderRadius: '50%', border: `3px dashed ${color}`}} />;
  return <div style={{width: 45, height: 31, border: `3px solid ${color}`, borderRadius: 5}}><div style={{width: 9, height: 9, borderRadius: '50%', background: color, margin: '9px auto'}} /></div>;
};

export const Scene4: React.FC = () => {
  const frame = useCurrentFrame();
  const tools = [
    ['CONNECTOR', C.cyan],
    ['AGENT FLOW', C.violet],
    ['PROMPT', C.coral],
    ['REST API', C.blue],
    ['MCP', C.lime],
    ['COMPUTER USE', '#F1C75B'],
  ] as const;
  return (
    <SceneShell number="04" kicker="Tools" title="Intent becomes action" accent={C.coral}>
      <div style={{position: 'absolute', left: 76, top: 167, width: 776, display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 18}}>
        {tools.map(([label, color], i) => {
          const p = spring({frame: frame - 8 - i * 7, fps: 30, config: {damping: 16, stiffness: 125}});
          return (
            <div
              key={label}
              style={{
                height: 148,
                borderRadius: 24,
                background: 'linear-gradient(150deg, rgba(20,38,67,.95), rgba(8,20,38,.96))',
                border: `1px solid ${color}70`,
                boxShadow: `inset 0 0 30px ${color}0d`,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 17,
                opacity: p,
                transform: `translateY(${(1 - p) * 30 + Math.sin((frame + i * 9) / 11) * 4}px) scale(${0.94 + p * 0.06})`,
              }}
            >
              <ToolGlyph kind={i} color={color} />
              <div style={{fontFamily: tech, fontSize: 14, fontWeight: 800, color, letterSpacing: 1.3}}>{label}</div>
            </div>
          );
        })}
      </div>
      <svg width="1280" height="720" style={{position: 'absolute', inset: 0}}>
        <path d="M866 335 H1018" fill="none" stroke={C.coral} strokeWidth="5" strokeLinecap="round" />
        <path d="M992 314 L1021 335 L992 356" fill="none" stroke={C.coral} strokeWidth="5" strokeLinecap="round" strokeLinejoin="round" />
        <circle cx={880 + ((frame * 4) % 120)} cy="335" r="6" fill={C.white} />
      </svg>
      <div
        style={{
          position: 'absolute',
          left: 1023,
          top: 218,
          width: 196,
          height: 234,
          borderRadius: 28,
          background: 'rgba(10,24,43,.98)',
          border: `1px solid ${C.coral}`,
          boxShadow: `0 0 46px ${C.coral}22`,
          opacity: fade(frame, 54),
          transform: `translateY(${Math.sin(frame / 10) * 5}px)`,
        }}
      >
        <div style={{height: 38, borderBottom: `1px solid ${C.line}`, display: 'flex', alignItems: 'center', paddingLeft: 16, gap: 7}}>
          {[C.coral, '#F1C75B', C.lime].map((color) => <div key={color} style={{width: 7, height: 7, borderRadius: '50%', background: color}} />)}
        </div>
        <div style={{padding: 20, fontFamily: tech, fontSize: 13, lineHeight: 1.8}}>
          <div style={{color: C.cyan}}>intent.detected</div>
          <div style={{color: C.muted}}>tool.select()</div>
          <div style={{color: C.violet}}>context.bind()</div>
          <div style={{color: C.lime}}>action.complete</div>
        </div>
        <div style={{position: 'absolute', left: 20, right: 20, bottom: 20, height: 8, borderRadius: 9, background: C.line}}>
          <div style={{height: '100%', borderRadius: 9, background: C.lime, width: `${interpolate(frame, [60, 120], [0, 100], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'})}%`}} />
        </div>
      </div>
      <div style={{position: 'absolute', right: 96, top: 488, width: 310, textAlign: 'right', color: C.muted, fontSize: 16, lineHeight: 1.5, opacity: fade(frame, 78)}}>
        Use computer interaction where a system exposes only a screen.
      </div>
    </SceneShell>
  );
};

const MetricCard: React.FC<{x: number; y: number; label: string; value: string; color: string; delay: number}> = ({
  x,
  y,
  label,
  value,
  color,
  delay,
}) => {
  const frame = useCurrentFrame();
  return (
    <div
      style={{
        position: 'absolute',
        left: x,
        top: y,
        width: 220,
        height: 118,
        borderRadius: 22,
        background: 'rgba(10,25,46,.95)',
        border: `1px solid ${color}65`,
        padding: '19px 22px',
        opacity: fade(frame, delay),
        transform: `translateY(${rise(frame, delay, 22) + Math.sin((frame + delay) / 11) * 4}px)`,
      }}
    >
      <div style={{fontFamily: tech, color: C.muted, fontSize: 13, letterSpacing: 1.4}}>{label}</div>
      <div style={{fontSize: 27, fontWeight: 820, marginTop: 12, color}}>{value}</div>
      <div style={{height: 4, borderRadius: 5, background: C.line, marginTop: 13}}>
        <div style={{width: `${55 + ((delay * 3) % 35)}%`, height: '100%', borderRadius: 5, background: color}} />
      </div>
    </div>
  );
};

export const Scene5: React.FC = () => {
  const frame = useCurrentFrame();
  const checks = ['Data policy', 'Audit trail', 'Agent identity', 'Evaluation'];
  return (
    <SceneShell number="05" kicker="Enterprise control" title="Govern. Test. Operate." accent={C.lime}>
      <div
        style={{
          position: 'absolute',
          left: 75,
          top: 166,
          width: 350,
          height: 390,
          borderRadius: 30,
          background: 'linear-gradient(155deg, rgba(18,44,61,.96), rgba(8,22,39,.97))',
          border: `1px solid ${C.lime}77`,
          boxShadow: `0 0 55px ${C.lime}16`,
          opacity: fade(frame, 5),
          transform: `translateY(${Math.sin(frame / 12) * 4}px)`,
        }}
      >
        <div style={{padding: '28px 30px', fontFamily: tech, color: C.lime, fontSize: 14, letterSpacing: 2}}>CONTROL PLANE</div>
        <div style={{position: 'relative', width: 128, height: 146, margin: '3px auto 17px'}}>
          <svg width="128" height="146" viewBox="0 0 128 146">
            <path d="M64 5 L116 25 V68 C116 103 94 128 64 141 C34 128 12 103 12 68 V25 Z" fill="rgba(143,240,181,.09)" stroke={C.lime} strokeWidth="4" />
            <path d="M42 72 L57 87 L89 51" fill="none" stroke={C.lime} strokeWidth="8" strokeLinecap="round" strokeLinejoin="round" pathLength="1" strokeDasharray="1" strokeDashoffset={interpolate(frame, [24, 55], [1, 0], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'})} />
          </svg>
        </div>
        {checks.map((item, i) => (
          <div key={item} style={{display: 'flex', alignItems: 'center', gap: 12, margin: '10px 30px', opacity: fade(frame, 32 + i * 8)}}>
            <div style={{width: 17, height: 17, borderRadius: 6, border: `1px solid ${C.lime}`, background: `${C.lime}24`, display: 'grid', placeItems: 'center', fontSize: 11, color: C.lime}}>✓</div>
            <div style={{fontSize: 17, color: C.white}}>{item}</div>
          </div>
        ))}
      </div>
      <MetricCard x={462} y={166} label="VISIBILITY" value="Agent 365" color={C.cyan} delay={18} />
      <MetricCard x={704} y={166} label="IDENTITY" value="Entra ID" color={C.violet} delay={27} />
      <MetricCard x={946} y={166} label="COST SIGNAL" value="Measured" color={C.coral} delay={36} />
      <div
        style={{
          position: 'absolute',
          left: 462,
          top: 310,
          width: 704,
          height: 246,
          borderRadius: 28,
          background: 'rgba(8,21,40,.94)',
          border: `1px solid ${C.line}`,
          padding: '25px 28px',
          opacity: fade(frame, 44),
          transform: `translateY(${Math.sin(frame / 14) * 4}px)`,
        }}
      >
        <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center'}}>
          <div>
            <div style={{fontFamily: tech, fontSize: 13, color: C.muted, letterSpacing: 1.8}}>REPEATABLE EVALUATION</div>
            <div style={{fontSize: 24, fontWeight: 780, marginTop: 5}}>Quality and safety signals</div>
          </div>
          <div style={{color: C.lime, fontFamily: tech, fontWeight: 800}}>BEFORE + AFTER LAUNCH</div>
        </div>
        <div style={{position: 'relative', height: 110, marginTop: 24}}>
          <svg width="650" height="110">
            <path d="M0 85 C75 76 104 32 172 55 S280 96 360 50 S500 20 650 41" fill="none" stroke={C.cyan} strokeWidth="5" strokeLinecap="round" pathLength="1" strokeDasharray="1" strokeDashoffset={interpolate(frame, [55, 125], [1, 0], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'})} />
            <path d="M0 100 H650" stroke={C.line} strokeWidth="1" />
          </svg>
        </div>
        <div style={{position: 'absolute', left: 28, bottom: 15, fontSize: 13, color: C.muted}}>
          Evaluation supports governance; it does not guarantee safety.
        </div>
      </div>
    </SceneShell>
  );
};

export const Scene6: React.FC = () => {
  const frame = useCurrentFrame();
  const phase = interpolate(frame, [8, 94], [0, 2], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});
  const columns = [
    {label: 'DEV', color: C.cyan, x: 150},
    {label: 'TEST', color: C.violet, x: 490},
    {label: 'PROD', color: C.lime, x: 830},
  ];
  const packageX = interpolate(phase, [0, 1, 2], [245, 585, 925]);
  return (
    <SceneShell number="06" kicker="Managed platform" title="Scale adaptive automation" accent={C.violet}>
      <svg width="1280" height="720" style={{position: 'absolute', inset: 0}}>
        <path d="M260 384 H1020" stroke={C.line} strokeWidth="5" strokeLinecap="round" />
        <path d="M995 367 L1020 384 L995 401" fill="none" stroke={C.lime} strokeWidth="4" strokeLinecap="round" />
      </svg>
      {columns.map((column, i) => (
        <div
          key={column.label}
          style={{
            position: 'absolute',
            left: column.x,
            top: 178,
            width: 260,
            height: 325,
            borderRadius: 28,
            border: `1px solid ${column.color}${i <= Math.round(phase) ? '99' : '40'}`,
            background: i <= phase ? `linear-gradient(180deg, ${column.color}12, rgba(9,22,41,.96))` : 'rgba(9,22,41,.72)',
            boxShadow: i <= phase ? `0 0 40px ${column.color}1c` : 'none',
          }}
        >
          <div style={{fontFamily: tech, fontWeight: 850, letterSpacing: 3, color: column.color, fontSize: 19, padding: '25px 27px'}}>{column.label}</div>
          <div style={{height: 1, background: C.line}} />
          {[i === 0 ? 'Build' : i === 1 ? 'Evaluate' : 'Monitor', i === 0 ? 'Version' : i === 1 ? 'Validate' : 'Improve'].map((item, row) => (
            <div key={item} style={{display: 'flex', gap: 13, alignItems: 'center', margin: `${29 + row * 25}px 26px 0`}}>
              <div style={{width: 20, height: 20, borderRadius: 7, border: `1px solid ${column.color}`, background: `${column.color}18`}} />
              <div style={{fontSize: 18, color: C.muted}}>{item}</div>
            </div>
          ))}
        </div>
      ))}
      <div
        style={{
          position: 'absolute',
          left: packageX,
          top: 347,
          width: 70,
          height: 70,
          borderRadius: 20,
          transform: 'translateX(-50%) rotate(45deg)',
          background: 'linear-gradient(135deg, #fff, #bcd1ff)',
          boxShadow: `0 0 28px ${C.white}66`,
        }}
      >
        <div style={{position: 'absolute', inset: 14, borderRadius: 9, background: C.violet}} />
      </div>
      <div
        style={{
          position: 'absolute',
          left: 0,
          right: 0,
          top: 548,
          textAlign: 'center',
          opacity: fade(frame, 80),
          transform: `translateY(${rise(frame, 80, 22)}px)`,
        }}
      >
        <div style={{fontSize: 39, fontWeight: 850, letterSpacing: -1}}>Adaptive automation, managed.</div>
        <div style={{fontFamily: tech, color: C.muted, fontSize: 13, marginTop: 12, letterSpacing: 1.2}}>
          SOURCE-GROUNDED · MICROSOFT LEARN · ACCESSED 18 SEP 2026 · AVAILABILITY MAY VARY
        </div>
      </div>
    </SceneShell>
  );
};

const shots = [
  {from: 1, to: 112, component: Scene1},
  {from: 113, to: 286, component: Scene2},
  {from: 287, to: 502, component: Scene3},
  {from: 503, to: 753, component: Scene4},
  {from: 754, to: 1042, component: Scene5},
  {from: 1043, to: 1216, component: Scene6},
];

export const ProductionVideo: React.FC = () => {
  const frame = useCurrentFrame();
  return (
    <AbsoluteFill style={{backgroundColor: C.ink}}>
      <Fonts />
      <Audio src={staticFile('assets/copilot-studio-2026/audio.wav')} />
      <AbsoluteFill style={{width: 1280, height: 720, transform: 'scale(1.5)', transformOrigin: 'top left'}}>
        {shots.map((shot, index) => (
          <Sequence key={index} from={shot.from - 1} durationInFrames={shot.to - shot.from + 1}>
            <shot.component />
          </Sequence>
        ))}
        <div style={{position: 'absolute', left: 0, right: 0, bottom: 0, height: 8, background: 'rgba(255,255,255,.08)'}}>
          <div
            style={{
              width: (frame / Math.max(1, TOTAL_FRAMES - 1)) * 1280,
              height: '100%',
              background: `linear-gradient(90deg, ${C.cyan}, ${C.violet}, ${C.lime})`,
              boxShadow: `0 0 18px ${C.cyan}66`,
            }}
          />
        </div>
        <Subtitles />
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
