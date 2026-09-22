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
import {Fonts, Subtitles} from './common';

const C = {
  bg: '#07121B',
  panel: '#102431',
  ink: '#F5FBFF',
  muted: '#A8BAC5',
  teal: '#32E0C4',
  blue: '#54A7FF',
  violet: '#A27BFF',
  amber: '#FFCB6B',
  coral: '#FF7D7D',
  green: '#81E68A',
};

const ease = Easing.out(Easing.cubic);
const appear = (f: number, at: number) =>
  interpolate(f, [at, at + 18], [0, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: ease});

const Shell: React.FC<{n: string; title: string; source: string; children: React.ReactNode}> = ({
  n,
  title,
  source,
  children,
}) => {
  const f = useCurrentFrame();
  return (
    <AbsoluteFill style={{background: C.bg, color: C.ink, fontFamily: "'Noto Sans SC','Segoe UI',sans-serif", overflow: 'hidden'}}>
      <AbsoluteFill style={{backgroundImage: 'linear-gradient(rgba(84,167,255,.05) 1px,transparent 1px),linear-gradient(90deg,rgba(84,167,255,.05) 1px,transparent 1px)', backgroundSize: '52px 52px', transform: `translateY(${(f % 52) * .08}px)`}} />
      <div style={{position:'absolute',left:-420 + (f * 11) % 2500,top:-180,width:310,height:1450,transform:'rotate(16deg)',background:'linear-gradient(90deg,transparent,rgba(84,167,255,.10),transparent)'}} />
      <div style={{position:'absolute',left:-360 + (f * 8) % 2450,top:742,width:320,height:190,border:`4px solid ${C.teal}`,borderRadius:70,opacity:.18,boxShadow:`0 0 42px ${C.teal}55`}} />
      {[0,1,2].map(i => <div key={i} style={{position:'absolute',left:(180+i*610+f*(1.8+i*.35))%2100-120,top:170+i*250+Math.sin((f+i*27)/15)*42,width:18+i*5,height:18+i*5,borderRadius:30,background:[C.teal,C.violet,C.blue][i],opacity:.28,boxShadow:`0 0 28px ${[C.teal,C.violet,C.blue][i]}`}} />)}
      <div style={{position: 'absolute', width: 720, height: 720, right: -160, top: -260, borderRadius: 500, background: 'radial-gradient(circle,rgba(50,224,196,.16),transparent 68%)'}} />
      <div style={{position: 'absolute', left: 70, top: 48, display: 'flex', alignItems: 'center', gap: 18}}>
        <div style={{width: 50, height: 50, borderRadius: 15, border: `2px solid ${C.teal}`, display: 'grid', placeItems: 'center', color: C.teal, fontWeight: 900}}>{n}</div>
        <div style={{fontSize: 30, fontWeight: 850, letterSpacing: -.8}}>{title}</div>
      </div>
      <div style={{position: 'absolute', right: 70, top: 60, fontSize: 16, color: C.muted, letterSpacing: 2}}>POWER PLATFORM · 2026</div>
      <div style={{position: 'absolute', left: 70, bottom: 36, fontSize: 14, color: C.muted}}>Source: {source}</div>
      {children}
    </AbsoluteFill>
  );
};

const Card: React.FC<{label: string; detail: string; color: string; x: number; y: number; delay: number; w?: number}> = ({
  label, detail, color, x, y, delay, w = 330,
}) => {
  const f = useCurrentFrame();
  const p = spring({frame: f - delay, fps: 30, config: {damping: 16, stiffness: 110}});
  return <div style={{position: 'absolute', left: x, top: y, width: w, height: 160, borderRadius: 28, border: `1px solid ${color}99`, background: 'linear-gradient(145deg,rgba(19,43,57,.97),rgba(8,24,34,.98))', boxShadow: `0 18px 50px #0008, inset 0 0 34px ${color}12`, padding: 26, opacity: p, transform: `translateY(${(1-p)*38}px) scale(${.92+p*.08})`}}>
    <div style={{width: 42, height: 42, borderRadius: 13, background: `${color}22`, border: `1px solid ${color}`, display: 'grid', placeItems: 'center', marginBottom: 15}}>
      <div style={{width: 15, height: 15, borderRadius: 5, background: color, boxShadow: `0 0 16px ${color}`}} />
    </div>
    <div style={{fontSize: 25, fontWeight: 850}}>{label}</div>
    <div style={{fontSize: 16, color: C.muted, marginTop: 6}}>{detail}</div>
  </div>;
};

const Scene1 = () => {
  const f = useCurrentFrame();
  const products = [
    ['POWER APPS', 'Business apps', C.blue],
    ['POWER AUTOMATE', 'Workflow automation', C.teal],
    ['POWER PAGES', 'External sites', C.violet],
    ['COPILOT STUDIO', 'Agents + workflows', C.amber],
  ] as const;
  return <Shell n="01" title="One platform, four experiences" source="Microsoft Learn product overviews">
    <div style={{position: 'absolute', left: 120, top: 165, fontSize: 66, lineHeight: 1.03, fontWeight: 900, letterSpacing: -3, width: 820, opacity: appear(f, 0)}}>Build the experience.<br/><span style={{color: C.teal}}>Connect the work.</span></div>
    {products.map((p, i) => <Card key={p[0]} label={p[0]} detail={p[1]} color={p[2]} x={120 + (i % 2) * 390} y={410 + Math.floor(i / 2) * 190} delay={28 + i * 14} w={350}/>)}
    <div style={{position: 'absolute', right: 170, top: 250, width: 500, height: 500, borderRadius: 250, border: `2px solid ${C.teal}66`, transform: `rotate(${f*.12}deg)`, boxShadow: `0 0 80px ${C.teal}18`}}>
      {[0,1,2,3].map(i => <div key={i} style={{position: 'absolute', width: 84, height: 84, borderRadius: 26, background: [C.blue,C.teal,C.violet,C.amber][i], left: 208 + Math.cos(i*Math.PI/2)*200, top: 208 + Math.sin(i*Math.PI/2)*200, transform: `rotate(${-f*.12}deg)`, boxShadow: '0 10px 40px #0008'}} />)}
      <div style={{position: 'absolute', inset: 120, borderRadius: 160, background: C.panel, display: 'grid', placeItems: 'center', textAlign: 'center', fontSize: 34, fontWeight: 900}}>BUSINESS<br/>SOLUTION</div>
    </div>
  </Shell>;
};

const Scene2 = () => {
  const f = useCurrentFrame();
  const layers = [['EXPERIENCES', C.blue], ['LOGIC + PROCESS', C.violet], ['SECURITY + DATA', C.teal], ['SOLUTIONS', C.amber]] as const;
  return <Shell n="02" title="Dataverse is the shared foundation" source="What is Microsoft Dataverse?">
    <div style={{position: 'absolute', left: 145, top: 215, width: 620}}>
      <div style={{fontSize: 64, fontWeight: 900, letterSpacing: -3}}>One model.<br/><span style={{color:C.teal}}>Many surfaces.</span></div>
      <div style={{fontSize: 24, color:C.muted, lineHeight:1.5, marginTop:28}}>Tables · relationships · security · solutions</div>
    </div>
    <div style={{position:'absolute', right:170, top:190, width:760, height:610}}>
      {layers.map((l,i) => {
        const p=appear(f, i*18);
        return <div key={l[0]} style={{position:'absolute', left:i*38, right:i*38, top:i*105, height:120, borderRadius:28, border:`1px solid ${l[1]}99`, background:`linear-gradient(90deg,${l[1]}24,${C.panel})`, padding:'34px 42px', fontSize:27, fontWeight:850, opacity:p, transform:`translateX(${(1-p)*90}px)`}}>{l[0]}<span style={{float:'right', color:l[1]}}>0{i+1}</span></div>
      })}
    </div>
  </Shell>;
};

const Scene3 = () => {
  const f=useCurrentFrame();
  const nodes=[['UNMANAGED','DEV',C.blue],['SOURCE','TRUTH',C.teal],['MANAGED','ARTIFACT',C.amber],['TEST','GATE',C.violet],['PRODUCTION','RELEASE',C.green]] as const;
  return <Shell n="03" title="Ship the same artifact" source="Power Platform ALM overview; solution concepts">
    <div style={{position:'absolute',left:110,top:180,fontSize:54,fontWeight:900}}>Maker speed <span style={{color:C.teal}}>meets release discipline.</span></div>
    <div style={{position:'absolute',left:105,top:390,width:1710,height:12,background:'#193746',borderRadius:8}}>
      <div style={{height:'100%',width:`${interpolate(f,[12,150],[0,100],{extrapolateLeft:'clamp',extrapolateRight:'clamp'})}%`,background:`linear-gradient(90deg,${C.blue},${C.teal},${C.amber},${C.violet},${C.green})`,borderRadius:8}}/>
    </div>
    {nodes.map((n,i)=><div key={n[0]} style={{position:'absolute',left:80+i*350,top:310,width:260,height:190,borderRadius:30,border:`2px solid ${n[2]}`,background:C.panel,padding:28,opacity:appear(f,18+i*22),boxShadow:`0 20px 50px #0008,0 0 30px ${n[2]}18`}}>
      <div style={{fontSize:16,color:n[2],letterSpacing:2}}>{n[1]}</div><div style={{fontSize:29,fontWeight:900,marginTop:45}}>{n[0]}</div>
    </div>)}
    <div style={{position:'absolute',left:500,top:620,width:920,padding:'24px 36px',borderRadius:22,background:'rgba(50,224,196,.10)',border:`1px solid ${C.teal}77`,fontSize:24,textAlign:'center'}}>SOURCE CONTROL IS THE SYSTEM OF RECORD</div>
  </Shell>;
};

const Scene4 = () => {
  const f=useCurrentFrame();
  return <Shell n="04" title="Configuration moves. Records do not." source="Power Platform pipelines FAQ">
    <div style={{position:'absolute',left:120,top:190,width:760,height:600,borderRadius:36,border:`1px solid ${C.blue}88`,backgroundColor:C.panel,backgroundImage:'repeating-linear-gradient(135deg,rgba(84,167,255,.055) 0 18px,transparent 18px 42px)',backgroundPosition:`${f*4}px 0`,padding:42}}>
      <div style={{fontSize:20,color:C.blue,letterSpacing:3}}>SOLUTION ARTIFACT</div>
      {['Components','Connection references','Environment variables'].map((x,i)=><div key={x} style={{marginTop:34,padding:'24px 28px',borderRadius:20,background:'#0A1B27',fontSize:25,opacity:appear(f,15+i*18)}}><span style={{color:C.green}}>✓</span> {x}</div>)}
    </div>
    <div style={{position:'absolute',right:120,top:190,width:760,height:600,borderRadius:36,border:`1px solid ${C.coral}88`,backgroundColor:C.panel,backgroundImage:'repeating-linear-gradient(45deg,rgba(255,125,125,.055) 0 18px,transparent 18px 42px)',backgroundPosition:`-${f*4}px 0`,padding:42}}>
      <div style={{fontSize:20,color:C.coral,letterSpacing:3}}>SEPARATE DATA PATH</div>
      <div style={{marginTop:90,fontSize:58,fontWeight:900}}>DATAVERSE<br/>TABLE RECORDS</div>
      <div style={{marginTop:42,fontSize:24,color:C.muted,lineHeight:1.5}}>Plan migration, validation, backup, and recovery independently.</div>
    </div>
    <div style={{position:'absolute',left:913,top:420,fontSize:62,color:C.coral,opacity:appear(f,70)}}>≠</div>
    <div style={{position:'absolute',left:780 + (f*7)%360,top:690,width:180,height:18,borderRadius:20,background:`linear-gradient(90deg,transparent,${C.amber},transparent)`,boxShadow:`0 0 28px ${C.amber}`}} />
  </Shell>;
};

const Scene5 = () => {
  const f=useCurrentFrame();
  const lanes=[['POWER PLATFORM PIPELINES','Approachable in-product promotion',C.teal],['GITHUB ACTIONS','Repository-native workflows',C.violet],['AZURE DEVOPS BUILD TOOLS','Enterprise build and release',C.blue]] as const;
  return <Shell n="05" title="Choose the CI/CD path that fits" source="Pipelines; GitHub Actions; Azure DevOps Build Tools">
    <div style={{position:'absolute',left:120,top:170,fontSize:58,fontWeight:900}}>Automate the <span style={{color:C.teal}}>repeatable path.</span></div>
    {lanes.map((l,i)=><div key={l[0]} style={{position:'absolute',left:150,top:330+i*165,width:1620,height:125,borderRadius:26,border:`1px solid ${l[2]}88`,background:`linear-gradient(90deg,${l[2]}1f,${C.panel})`,padding:'28px 38px',opacity:appear(f,15+i*25),transform:`translateX(${Math.sin((f+i*17)/18)*5}px)`}}>
      <span style={{fontSize:25,fontWeight:900}}>{l[0]}</span><span style={{position:'absolute',left:620,fontSize:23,color:C.muted}}>{l[1]}</span>
      <div style={{position:'absolute',right:38,top:34,display:'flex',gap:12}}>{['BUILD','TEST','PACKAGE','DEPLOY'].map(x=><span key={x} style={{padding:'12px 16px',borderRadius:14,background:'#081923',fontSize:14,color:l[2]}}>{x}</span>)}</div>
    </div>)}
  </Shell>;
};

const Scene6 = () => {
  const f=useCurrentFrame();
  const checks=['Connector policy','Solution checks','End-to-end tests','Monitoring','Licensing','Feature availability','Human approval'];
  return <Shell n="06" title="Govern the release, not just the build" source="Data policies; ALM overview; release-plan caveats">
    <div style={{position:'absolute',left:120,top:160,fontSize:59,fontWeight:900,width:820}}>Low code accelerates delivery.<br/><span style={{color:C.teal}}>Responsibility remains.</span></div>
    <div style={{position:'absolute',left:125,top:390,width:760,display:'grid',gridTemplateColumns:'1fr 1fr',gap:18}}>
      {checks.map((x,i)=><div key={x} style={{padding:'20px 22px',borderRadius:18,background:C.panel,border:`1px solid ${i===6?C.amber:C.teal}66`,fontSize:21,opacity:appear(f,12+i*12)}}><span style={{color:i===6?C.amber:C.green,marginRight:12}}>●</span>{x}</div>)}
    </div>
    <div style={{position:'absolute',right:160,top:225,width:600,height:560,borderRadius:300,border:`2px solid ${C.teal}66`,display:'grid',placeItems:'center',transform:`scale(${.96+Math.sin(f/18)*.02})`}}>
      <div style={{width:410,height:410,borderRadius:220,border:`1px solid ${C.violet}77`,display:'grid',placeItems:'center',textAlign:'center',background:'radial-gradient(circle,rgba(50,224,196,.16),rgba(16,36,49,.9) 65%)'}}>
        <div><div style={{fontSize:22,color:C.teal,letterSpacing:3}}>REVIEW CANDIDATE</div><div style={{fontSize:52,fontWeight:900,marginTop:22}}>HUMAN<br/>APPROVAL<br/>PENDING</div></div>
      </div>
    </div>
  </Shell>;
};

export const ProductionVideo: React.FC = () => (
  <AbsoluteFill style={{background:C.bg}}>
    <Fonts />
    <Audio src={staticFile('assets/power-platform-2026/audio.wav')} startFrom={1} />
    <Sequence from={0} durationInFrames={268}><Scene1/></Sequence>
    <Sequence from={268} durationInFrames={113}><Scene2/></Sequence>
    <Sequence from={381} durationInFrames={198}><Scene3/></Sequence>
    <Sequence from={579} durationInFrames={162}><Scene4/></Sequence>
    <Sequence from={741} durationInFrames={200}><Scene5/></Sequence>
    <Sequence from={941} durationInFrames={323}><Scene6/></Sequence>
    <Subtitles />
  </AbsoluteFill>
);
