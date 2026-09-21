import React from 'react';
import {interpolate, useCurrentFrame} from 'remotion';
import {FONT_EN, FONT_MONO, TOTAL_FRAMES, SENTENCES} from '../../common';

const cyan = '#6ee7f2';
const blue = '#5a8cff';
const violet = '#9b6dff';
const amber = '#f5c45e';
const green = '#7fe38c';
const ink = '#f7fbff';
const muted = '#aeb9c8';

const sceneStart = (index: number) => (index === 0 ? 1 : SENTENCES[index]?.from ?? 1);
const sceneEnd = (index: number) => (SENTENCES[index + 1]?.from ? SENTENCES[index + 1].from - 1 : TOTAL_FRAMES);

const fade = (frame: number, duration: number) =>
  interpolate(frame, [0, 10, Math.max(11, duration - 10), duration], [0, 1, 1, 0], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

const Label: React.FC<{x: number; y: number; children: React.ReactNode; size?: number; color?: string}> = ({x, y, children, size = 23, color = ink}) => (
  <text x={x} y={y} textAnchor="middle" fill={color} fontSize={size} fontFamily={FONT_EN} fontWeight={700}>
    {children}
  </text>
);

const Card: React.FC<{x: number; y: number; w: number; h: number; stroke?: string; fill?: string; children?: React.ReactNode}> = ({x, y, w, h, stroke = cyan, fill = '#111a30', children}) => (
  <g>
    <rect x={x} y={y} width={w} height={h} rx={18} fill={fill} stroke={stroke} strokeWidth={3} opacity={0.96} />
    {children}
  </g>
);

const Arrow: React.FC<{x1: number; y1: number; x2: number; y2: number; color?: string; dash?: boolean}> = ({x1, y1, x2, y2, color = cyan, dash = false}) => (
  <g stroke={color} strokeWidth={4} fill="none" strokeLinecap="round" strokeLinejoin="round" opacity={0.92}>
    <path d={`M${x1} ${y1}L${x2} ${y2}`} strokeDasharray={dash ? '12 10' : undefined} />
    <path d={`M${x2 - 16} ${y2 - 10}L${x2} ${y2}L${x2 - 16} ${y2 + 10}`} />
  </g>
);

const BubbleLanes: React.FC<{t: number}> = ({t}) => {
  const split = interpolate(t, [0, 0.55, 1], [0, 1, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});
  const lanes = [
    {label: 'Agent', x: 245, color: cyan},
    {label: 'Workflow', x: 640, color: blue},
    {label: 'Governance', x: 1035, color: violet},
  ];
  return (
    <>
      <Card x={395 - split * 260} y={210} w={490} h={150} stroke={cyan} fill="#10233a">
        <path d="M520 360L470 420L580 360" fill="#10233a" stroke={cyan} strokeWidth={3} />
        <Label x={640} y={295} size={36}>Conversation</Label>
      </Card>
      {lanes.map((lane, i) => (
        <g key={lane.label} opacity={split} transform={`translate(0 ${18 * Math.sin(t * Math.PI * 2 + i)})`}>
          <Arrow x1={640} y1={430} x2={lane.x} y2={505} color={lane.color} dash />
          <Card x={lane.x - 135} y={500} w={270} h={78} stroke={lane.color} fill="#10172a">
            <Label x={lane.x} y={550} size={29}>{lane.label}</Label>
          </Card>
          {[0, 1, 2].map((dot) => (
            <circle key={dot} cx={lane.x} cy={590 + dot * 28 + ((t * 90 + dot * 20) % 24)} r={6} fill={lane.color} opacity={0.8 - dot * 0.14} />
          ))}
        </g>
      ))}
    </>
  );
};

const BuildSurface: React.FC<{t: number}> = ({t}) => (
  <>
    <Card x={85} y={260} w={230} h={185} stroke={blue} fill="#122036">
      <ellipse cx={200} cy={298} rx={70} ry={24} fill="#182a46" stroke={blue} strokeWidth={3} />
      <path d="M130 298V390C130 423 270 423 270 390V298" fill="none" stroke={blue} strokeWidth={3} />
      <Label x={200} y={498} size={24}>Business data</Label>
    </Card>
    <Card x={420} y={185} w={440} h={360} stroke={cyan} fill="#10182d">
      <Label x={640} y={228} size={29}>Copilot Studio</Label>
      {['Agents', 'Workflows', 'Agent flows'].map((label, i) => (
        <g key={label} transform={`translate(${0} ${Math.sin(t * 5 + i) * 5})`}>
          <rect x={500} y={270 + i * 72} width={280} height={50} rx={12} fill={i === 0 ? '#16385a' : i === 1 ? '#25204b' : '#173d36'} stroke={[cyan, violet, green][i]} strokeWidth={2} />
          <Label x={640} y={303 + i * 72} size={23}>{label}</Label>
        </g>
      ))}
    </Card>
    {['Teams', 'M365', 'Web', 'Mobile'].map((label, i) => (
      <Card key={label} x={970} y={190 + i * 86} w={220} h={58} stroke={i % 2 ? violet : cyan} fill="#111827">
        <Label x={1080} y={228 + i * 86} size={22}>{label}</Label>
      </Card>
    ))}
    <Arrow x1={315} y1={352} x2={420} y2={352} color={blue} />
    <Arrow x1={860} y1={352} x2={970} y2={352} color={cyan} />
  </>
);

const Orchestration: React.FC<{t: number}> = ({t}) => {
  const nodes = [
    {label: 'Topic', x: 310, y: 260, color: cyan},
    {label: 'Tool', x: 970, y: 260, color: amber},
    {label: 'Knowledge', x: 330, y: 530, color: blue},
    {label: 'Agent', x: 950, y: 530, color: violet},
  ];
  return (
    <>
      <Arrow x1={115} y1={390} x2={430} y2={390} color={green} />
      <Label x={145} y={360} size={22} color={green}>Request</Label>
      <circle cx={640} cy={390} r={130} fill="#10182d" stroke={cyan} strokeWidth={5} />
      <circle cx={640} cy={390} r={98 + Math.sin(t * 6) * 8} fill="none" stroke={violet} strokeWidth={3} opacity={0.65} />
      <Label x={640} y={375} size={27}>Generative</Label>
      <Label x={640} y={410} size={27}>orchestration</Label>
      <rect x={540} y={455} width={200} height={42} rx={21} fill="#20294a" stroke={blue} strokeWidth={2} />
      <Label x={640} y={483} size={18} color={muted}>Descriptions</Label>
      {nodes.map((node) => (
        <g key={node.label}>
          <Arrow x1={640} y1={390} x2={node.x} y2={node.y} color={node.color} dash />
          <Card x={node.x - 105} y={node.y - 38} w={210} h={76} stroke={node.color} fill="#111827">
            <Label x={node.x} y={node.y + 8} size={24}>{node.label}</Label>
          </Card>
        </g>
      ))}
    </>
  );
};

const ToolIcon: React.FC<{kind: string; x: number; y: number; color: string}> = ({kind, x, y, color}) => (
  <g transform={`translate(${x} ${y})`} fill="none" stroke={color} strokeWidth={4} strokeLinecap="round" strokeLinejoin="round">
    {kind === 'plug' ? <><path d="M25 20V55M65 20V55M18 55H72V82Q72 112 45 112Q18 112 18 82Z" /><path d="M45 112V145" /></> :
      kind === 'flow' ? <><circle cx="24" cy="30" r="18" /><circle cx="88" cy="80" r="18" /><circle cx="24" cy="130" r="18" /><path d="M42 40L70 68M42 120L70 92" /></> :
      kind === 'prompt' ? <><rect x="15" y="15" width="90" height="120" rx="8" /><path d="M35 48H88M35 75H88M35 102H70" /></> :
      kind === 'api' ? <><path d="M38 30Q15 30 22 58L27 76L22 94Q15 122 38 122M82 30Q105 30 98 58L93 76L98 94Q105 122 82 122" /><path d="M52 110L70 42" /></> :
      kind === 'mcp' ? <><circle cx="30" cy="35" r="17" /><circle cx="95" cy="75" r="17" /><circle cx="35" cy="125" r="17" /><path d="M45 44L80 66M81 85L50 116" /></> :
      <><rect x="12" y="28" width="110" height="75" rx="7" /><path d="M67 103V130M38 130H96M86 62L108 84L94 88L101 105L88 110L81 92L70 103Z" /></>}
  </g>
);

const Tools: React.FC<{t: number}> = ({t}) => {
  const items = [
    ['Connector', 'plug', cyan],
    ['Agent flow', 'flow', blue],
    ['Prompt', 'prompt', violet],
    ['REST API', 'api', amber],
    ['MCP', 'mcp', green],
    ['Computer use', 'screen', cyan],
  ] as const;
  return (
    <>
      {items.map(([label, kind, color], i) => {
        const x = 140 + (i % 3) * 245;
        const y = 205 + Math.floor(i / 3) * 215;
        return (
          <g key={label} transform={`translate(0 ${Math.sin(t * 4 + i) * 6})`}>
            <Card x={x - 20} y={y - 25} w={185} h={175} stroke={color} fill="#111827">
              <ToolIcon kind={kind} x={x + 20} y={y} color={color} />
              <Label x={x + 73} y={y + 185} size={19}>{label}</Label>
            </Card>
          </g>
        );
      })}
      <Arrow x1={850} y1={390} x2={1125} y2={390} color={green} />
      <Card x={1000} y={315} w={210} h={150} stroke={green} fill="#10251f">
        <Label x={1105} y={375} size={29}>Execute</Label>
        <Label x={1105} y={413} size={29}>work</Label>
      </Card>
    </>
  );
};

const Governance: React.FC<{t: number}> = ({t}) => {
  const panels = [
    ['DLP/data policies', 'shield', cyan],
    ['Agent identity', 'badge', violet],
    ['Audit', 'ledger', blue],
    ['Credits', 'gauge', amber],
    ['Evaluations', 'checks', green],
  ] as const;
  return (
    <>
      <Card x={95} y={165} w={1090} h={420} stroke={blue} fill="#0f1729" />
      {panels.map(([label, kind, color], i) => {
        const x = 170 + i * 212;
        return (
          <g key={label} transform={`translate(${x} 250)`}>
            <rect x="0" y="0" width="160" height="185" rx="16" fill="#121d33" stroke={color} strokeWidth="3" />
            {kind === 'shield' ? <path d="M80 34L124 50V90Q124 132 80 150Q36 132 36 90V50Z" fill="none" stroke={color} strokeWidth="5" /> :
              kind === 'badge' ? <><circle cx="80" cy="72" r="30" fill="none" stroke={color} strokeWidth="5" /><path d="M45 145Q80 108 115 145" fill="none" stroke={color} strokeWidth="5" /></> :
              kind === 'ledger' ? <><rect x="40" y="34" width="80" height="118" fill="none" stroke={color} strokeWidth="5" /><path d="M57 70H104M57 96H104M57 122H92" stroke={color} strokeWidth="5" /></> :
              kind === 'gauge' ? <><path d="M35 112A45 45 0 0 1 125 112" fill="none" stroke={color} strokeWidth="6" /><path d={`M80 112L${80 + Math.cos(t * 2.2) * 32} ${112 - Math.sin(t * 2.2) * 32}`} stroke={color} strokeWidth="5" /></> :
              <><path d="M45 58L64 77L104 37M45 98L64 117L104 77M45 138L64 157L104 117" fill="none" stroke={color} strokeWidth="5" /></>}
            <Label x={80} y={205} size={18}>{label}</Label>
          </g>
        );
      })}
      <text x="640" y="630" textAnchor="middle" fill={muted} fontSize="23" fontFamily={FONT_EN}>
        Evaluation supports quality; it does not guarantee safety.
      </text>
    </>
  );
};

const ManagedPlatform: React.FC<{t: number}> = ({t}) => {
  const progress = Math.min(1, t * 1.2);
  const pkgX = 245 + progress * 620;
  return (
    <>
      {['DEV', 'TEST', 'PROD'].map((label, i) => (
        <Card key={label} x={120 + i * 385} y={190} w={270} h={340} stroke={[cyan, amber, green][i]} fill="#101827">
          <Label x={255 + i * 385} y={250} size={42}>{label}</Label>
          <rect x={175 + i * 385} y={305} width={160} height={42} rx={10} fill="#16243d" stroke={[cyan, amber, green][i]} strokeWidth={2} />
          <Label x={255 + i * 385} y={333} size={18}>{['Test', 'Deploy', 'Monitor'][i]}</Label>
        </Card>
      ))}
      <Arrow x1={390} y1={360} x2={505} y2={360} color={amber} dash />
      <Arrow x1={775} y1={360} x2={890} y2={360} color={green} dash />
      <g transform={`translate(${pkgX} 420)`}>
        <rect x="-85" y="-44" width="170" height="88" rx="16" fill="#172f49" stroke={blue} strokeWidth="4" />
        <Label x={0} y={10} size={25}>Solution</Label>
      </g>
      <text x="640" y="612" textAnchor="middle" fill={ink} fontSize="31" fontFamily={FONT_EN} fontWeight={800}>
        Scale adaptive automation with operating discipline.
      </text>
    </>
  );
};

const scenes = [
  {headline: 'Beyond chatbot', Comp: BubbleLanes},
  {headline: 'Build agents + workflows', Comp: BuildSurface},
  {headline: 'Generative orchestration', Comp: Orchestration},
  {headline: 'Intent becomes action', Comp: Tools},
  {headline: 'Govern. Test. Operate.', Comp: Governance},
  {headline: 'Adaptive automation, managed', Comp: ManagedPlatform},
];

export const Scene: React.FC<{index: number}> = ({index}) => {
  const frame = useCurrentFrame();
  const start = sceneStart(index);
  const end = sceneEnd(index);
  const local = frame + 1 - start;
  const duration = Math.max(1, end - start + 1);
  const t = Math.max(0, Math.min(1, local / duration));
  const spec = scenes[index];
  const Comp = spec.Comp;
  return (
    <div style={{position: 'absolute', inset: 0, opacity: fade(local, duration), color: ink, fontFamily: FONT_EN}}>
      <div style={{position: 'absolute', left: 70, top: 34, color: cyan, fontFamily: FONT_MONO, fontSize: 21, letterSpacing: 1.5}}>
        MICROSOFT COPILOT STUDIO 2026
      </div>
      <div style={{position: 'absolute', right: 70, top: 34, color: muted, fontFamily: FONT_MONO, fontSize: 21}}>
        0{index + 1} / 06
      </div>
      <div style={{position: 'absolute', left: 70, top: 82, fontSize: 50, fontWeight: 900, lineHeight: 1.05}}>
        {spec.headline}
      </div>
      <svg width="1280" height="720" viewBox="0 0 1280 720" style={{position: 'absolute', inset: 0}}>
        <defs>
          <radialGradient id="glow" cx="50%" cy="45%" r="65%">
            <stop offset="0%" stopColor="#183c64" stopOpacity="0.88" />
            <stop offset="60%" stopColor="#0b1022" stopOpacity="0.55" />
            <stop offset="100%" stopColor="#050812" stopOpacity="0" />
          </radialGradient>
        </defs>
        <rect x="0" y="0" width="1280" height="687" fill="url(#glow)" />
        <Comp t={t} />
      </svg>
    </div>
  );
};

export const SC01: React.FC = () => <Scene index={0} />;
export const SC02: React.FC = () => <Scene index={1} />;
export const SC03: React.FC = () => <Scene index={2} />;
export const SC04: React.FC = () => <Scene index={3} />;
export const SC05: React.FC = () => <Scene index={4} />;
export const SC06: React.FC = () => <Scene index={5} />;
