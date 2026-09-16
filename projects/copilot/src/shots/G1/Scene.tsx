import React from 'react';
import {interpolate, useCurrentFrame} from 'remotion';
import {SENTENCES, TOTAL_FRAMES} from '../../common';
import {VIDEO} from '../../config';

type SceneSpec = {title: string; kind: string; labels: string[]; icons: string[]; note?: string};
const CATALOG: Record<string, {brand: string; accent: string; scenes: SceneSpec[]}> = {
  'john-deere': {brand: 'JOHN DEERE', accent: '#a9dc6e', scenes: [
    {title: 'One field. Different conditions.', kind: 'field', labels: ['Variable field', 'Illustrative map'], icons: []},
    {title: 'Precision needs connected information.', kind: 'network', labels: ['Positioning', 'Machine display', 'Field data'], icons: ['satellite', 'display', 'field']},
    {title: 'StarFire helps align each pass.', kind: 'field', labels: ['StarFire', 'Aligned passes'], icons: []},
    {title: 'Machine data becomes the next plan.', kind: 'network', labels: ['Equipment', 'JDLink', 'Operations Center', 'Next job'], icons: ['tractor', 'signal', 'display', 'plan']},
    {title: 'More than a smarter tractor.', kind: 'network', labels: ['Field', 'Machine', 'Operation'], icons: ['field', 'tractor', 'plan']},
    {title: 'A connected operation.', kind: 'network', labels: ['Position', 'Operate', 'Review', 'Plan'], icons: ['satellite', 'tractor', 'display', 'plan'], note: 'Guided by better information.'},
  ]},
  copilot: {brand: 'COPILOT', accent: '#70dce2', scenes: [
    {title: 'A family. Different jobs.', kind: 'network', labels: ['Copilot Chat', 'Microsoft 365\nCopilot', 'GitHub Copilot', 'Copilot Studio'], icons: ['chat', 'document', 'code', 'agent']},
    {title: 'Research. Then draft.', kind: 'document', labels: ['Copilot Chat', 'Research', 'Draft'], icons: []},
    {title: 'Work assistance, with access controls.', kind: 'network', labels: ['Work apps', 'Microsoft 365\nCopilot', 'Permitted\ninformation'], icons: ['document', 'agent', 'lock']},
    {title: 'Coding assistance, in context.', kind: 'code', labels: ['GitHub Copilot', 'Code', 'Review'], icons: []},
    {title: 'Build agents around your work.', kind: 'network', labels: ['Knowledge', 'Copilot Studio', 'Tools'], icons: ['document', 'agent', 'tool']},
    {title: 'Choose by the job. Check the result.', kind: 'network', labels: ['Job', 'Permissions', 'Licensing', 'Output'], icons: ['plan', 'lock', 'document', 'check']},
  ]},
  microsoft: {brand: 'MICROSOFT', accent: '#f4c665', scenes: [
    {title: 'From your desk to the cloud.', kind: 'network', labels: ['Your PC', 'Your work', 'Cloud services'], icons: ['display', 'document', 'cloud']},
    {title: 'Windows: the PC experience.', kind: 'desktop', labels: ['Windows', 'Apps', 'Files'], icons: []},
    {title: 'Microsoft 365: work together.', kind: 'network', labels: ['Documents', 'Communication', 'Collaboration'], icons: ['document', 'chat', 'people']},
    {title: 'Azure: services for applications.', kind: 'network', labels: ['Compute', 'Storage', 'AI services', 'Applications'], icons: ['server', 'database', 'agent', 'display']},
    {title: 'Copilot: assistance in the workflow.', kind: 'network', labels: ['Selected workflow', 'AI assistance', 'Your review'], icons: ['plan', 'agent', 'check']},
    {title: 'Connected products. Distinct choices.', kind: 'network', labels: ['Product', 'Configuration', 'Subscription'], icons: ['display', 'tool', 'document'], note: 'Availability depends on all three.'},
  ]},
};

const Glyph: React.FC<{kind: string; accent: string}> = ({kind, accent}) => {
  const common = {fill: 'none', stroke: '#f2f4f2', strokeWidth: 3, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const};
  return <g {...common}>
    {kind === 'tractor' ? <><path d="M20 120V70H95V35H150V115H180V143H35"/><path d="M106 48H140V85H106Z" fill={accent}/><circle cx="58" cy="140" r="32"/><circle cx="150" cy="140" r="22"/></> :
      kind === 'satellite' ? <><path d="M80 60L120 100M105 40L150 85M40 100L85 145M62 75L90 47L137 94L109 122Z"/><path d="M100 130Q145 130 145 175M100 145Q130 145 130 175" stroke={accent}/></> :
      kind === 'field' ? <><path d="M12 160L50 30H150L188 160Z"/><path d="M40 160L70 30M70 160L90 30M100 160V30M130 160L110 30M160 160L130 30" stroke={accent}/></> :
      kind === 'display' ? <><rect x="10" y="30" width="180" height="115" rx="6"/><path d="M100 145V172M60 172H140"/><path d="M30 110L65 86L100 105L145 60L170 75" stroke={accent}/></> :
      kind === 'code' ? <><path d="M65 55L20 100L65 145M135 55L180 100L135 145"/><path d="M120 35L80 165" stroke={accent}/></> :
      kind === 'chat' ? <><path d="M20 30H180V140H100L60 175V140H20Z"/><path d="M45 65H150M45 90H130M45 115H105" stroke={accent}/></> :
      kind === 'lock' ? <><rect x="40" y="85" width="120" height="95" rx="5"/><path d="M65 85V55A35 35 0 0 1 70 0V85"/><circle cx="100" cy="125" r="8" fill={accent}/><path d="M100 130V151"/></> :
      kind === 'cloud' ? <><path d="M45 145C0 145 0 78 48 78C55 15 145 15 153 78C199 78 210 145 160 145Z"/><path d="M100 155V190M60 172H140" stroke={accent}/></> :
      kind === 'database' ? <><ellipse cx="100" cy="40" rx="70" ry="25"/><path d="M30 40V150C30 185 170 185 170 150V40M30 95C30 130 170 130 170 95"/><path d="M45 135C60 148 140 148 155 135" stroke={accent}/></> :
      kind === 'server' ? <>{[35, 85, 135].map((top) => <g key={top}><rect x="20" y={top} width="160" height="35"/><circle cx="45" cy={top + 17} r="5" fill={accent}/><path d={`M75 ${top + 17}H155`}/></g>)}</> :
      kind === 'check' ? <><circle cx="100" cy="100" r="78"/><path d="M55 100L85 130L145 65" stroke={accent} strokeWidth="7"/></> :
      kind === 'signal' ? <><circle cx="100" cy="150" r="10" fill={accent}/><path d="M65 115Q100 80 135 115M40 85Q100 25 160 85M15 55Q100 -20 185 55"/></> :
      kind === 'agent' ? <><circle cx="100" cy="90" r="50"/><circle cx="82" cy="80" r="5" fill={accent}/><circle cx="118" cy="80" r="5" fill={accent}/><path d="M78 109H122M100 40V20M40 175Q100 130 160 175"/><circle cx="100" cy="15" r="6" fill={accent}/></> :
      kind === 'people' ? <><circle cx="100" cy="60" r="25"/><circle cx="38" cy="90" r="20"/><circle cx="162" cy="90" r="20"/><path d="M60 165V130Q100 92 140 130V165M8 175V145Q30 115 55 137M145 137Q170 115 192 145V175" stroke={accent}/></> :
      kind === 'tool' ? <><path d="M115 25A48 48 0 0 0 60 90L18 145L48 175L110 120A48 48 0 0 0 175 65L140 95L105 60Z"/><circle cx="42" cy="147" r="6" fill={accent}/></> :
      <><path d="M40 15H125L165 55V180H40Z"/><path d="M125 15V55H165M65 85H140M65 110H140M65 135H115" stroke={accent}/></>}
  </g>;
};

export const Scene: React.FC<{index: number}> = ({index}) => {
  const frame = useCurrentFrame();
  const topic = CATALOG[VIDEO.slug];
  const scene = topic.scenes[index];
  const start = index === 0 ? 1 : SENTENCES[index].from;
  const end = SENTENCES[index + 1]?.from ?? TOTAL_FRAMES + 1;
  const duration = end - start;
  const opacity = interpolate(frame, [0, 5, duration - 5, duration - 1], [0, 1, 1, 0], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});
  const motion = frame / Math.max(1, duration - 1);
  const accent = topic.accent;
  const label = (text: string, center: number, top: number) => <text x={center} y={top} fill="#eef2ef" fontSize="24" textAnchor="middle">{text.split('\n').map((line, lineIndex) => <tspan key={line} x={center} dy={lineIndex ? 30 : 0}>{line}</tspan>)}</text>;
  return <div style={{position: 'absolute', inset: 0, color: '#f2f4f2', fontFamily: 'Noto Sans SC', opacity}}>
    <div style={{position: 'absolute', left: 70, top: 30, color: accent, fontFamily: 'Orbitron', fontSize: 22}}>{topic.brand}</div>
    <div style={{position: 'absolute', right: 70, top: 30, fontFamily: 'Orbitron', fontSize: 22, color: '#b6bdb9'}}>0{index + 1} / 06</div>
    <div style={{position: 'absolute', left: 70, top: 89, right: 60, fontSize: 49, fontWeight: 700, lineHeight: 1.2}}>{scene.title}</div>
    <svg width="1100" height="380" viewBox="0 0 1100 380" style={{position: 'absolute', left: 90, top: 205, transform: `scale(${1 + motion * 0.05})`}}>
      {scene.kind === 'field' ? <>
        <path d="M40 310L130 35H650L740 310Z" fill="#15281a" stroke={accent} strokeWidth="3"/>
        {Array.from({length: 8}, (_, column) => <g key={column}>
          <path d={`M${60 + column * 83} 290L${142 + column * 62} 54`} stroke={index === 0 ? ['#7baf58', '#4c793f', '#b4d88b'][column % 3] : '#95c961'} strokeWidth="35" opacity={index === 0 ? 0.65 : 0.2}/>
          {index === 2 ? <path d={`M${60 + column * 83} 290L${142 + column * 62} 54`} stroke={accent} strokeWidth="2" strokeDasharray="9 7" strokeDashoffset={-frame * 1.3}/> : null}
        </g>)}
        <g transform={`translate(${280 + motion * 55},${200 - motion * 160}) scale(.38)`}><Glyph kind="tractor" accent={accent}/></g>
        <g transform="translate(825,55) scale(.8)"><Glyph kind={index === 2 ? 'satellite' : 'field'} accent={accent}/></g>
        {label(scene.labels[0], 915, 255)}{label(scene.labels[1], 915, 290)}
        <text x="390" y="352" textAnchor="middle" fontSize="22" fill="#b6bdb9">{index === 2 ? 'Guidance pattern (illustration)' : 'Field conditions vary (illustration)'}</text>
      </> : scene.kind === 'network' ? <>
        {scene.labels.slice(0, -1).map((_, node) => {
          const step = 860 / (scene.labels.length - 1);
          const startX = 120 + node * step;
          const trackWidth = step - 210;
          return <g key={node}><path d={`M${startX + 105} 140H${startX + step - 105}`} stroke={accent} strokeWidth="4" strokeDasharray="18 12" strokeDashoffset={-frame * 3}/>
            {[0, 1, 2].map((packet) => <rect key={packet} x={startX + 105 + ((frame * 3 + packet * trackWidth / 3) % (trackWidth - 16))} y={126 + packet * 12} width="16" height="8" fill={accent}/>)}</g>;
        })}
        {scene.labels.map((text, node) => {
          const center = 120 + node * 860 / (scene.labels.length - 1);
          return <g key={text} opacity={0.8 + 0.2 * Math.sin(frame / 22 - node)}><g transform={`translate(${center - 100},40)`}><Glyph kind={scene.icons[node]} accent={accent}/></g>{label(text, center, 290)}</g>;
        })}
        {scene.note ? <text x="550" y="362" fontSize="26" fill={accent} textAnchor="middle">{scene.note}</text> : null}
      </> : <>
        <rect x="65" y="12" width="680" height="325" rx="6" fill="#111a19" stroke="#e8eeeb" strokeWidth="3"/>
        <path d="M65 54H745" stroke="#60706a" strokeWidth="2"/>
        {[90, 110, 130].map((center) => <circle key={center} cx={center} cy="33" r="5" fill={accent}/>)}
        {scene.kind === 'code' ? <>
          {['function explain(topic) {', '  const sources = research(topic);', '  const draft = createDraft(sources);', '  return review(draft);', '}'].map((line, row) => <text key={line} x="95" y={103 + row * 44} fontFamily="monospace" fontSize="25" fill={row === 2 ? accent : '#e7ece9'} opacity={row <= Math.floor(frame / 18) ? 1 : 0.18}>{line}</text>)}
        </> : scene.kind === 'desktop' ? <>
          <path d="M280 110H365V190H280ZM380 110H465V190H380ZM280 205H365V285H280ZM380 205H465V285H380Z" fill={accent}/>
          <path d="M100 310H710" stroke="#71837b" strokeWidth="6"/>
        </> : <>
          <rect x="92" y="85" width="260" height="215" fill="#233630"/>
          {[0, 1, 2, 3, 4].map((row) => <path key={row} d={`M112 ${115 + row * 35}H${row === 4 ? 240 : 320}`} stroke="#c5d7cd" strokeWidth="7"/>)}
          {[0, 1, 2, 3, 4].map((row) => <path key={row} d={`M400 ${115 + row * 35}H${410 + Math.min(260, Math.max(0, frame - row * 14) * 7)}`} stroke={row === 0 ? accent : '#dae3de'} strokeWidth="7"/>)}
        </>}
        <g transform="translate(825,55)"><Glyph kind={scene.kind === 'desktop' ? 'display' : 'agent'} accent={accent}/></g>
        {label(scene.labels[0], 915, 290)}
        <text x="405" y="372" textAnchor="middle" fontSize="22" fill="#b6bdb9">{scene.kind === 'code' ? 'Illustrative code. Human review required.' : scene.kind === 'desktop' ? 'PC experience (schematic)' : 'Research to draft (schematic)'}</text>
      </>}
    </svg>
  </div>;
};

export const SC01: React.FC = () => <Scene index={0}/>;
export const SC02: React.FC = () => <Scene index={1}/>;
export const SC03: React.FC = () => <Scene index={2}/>;
export const SC04: React.FC = () => <Scene index={3}/>;
export const SC05: React.FC = () => <Scene index={4}/>;
export const SC06: React.FC = () => <Scene index={5}/>;