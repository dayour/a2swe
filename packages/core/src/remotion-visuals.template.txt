import React, { useLayoutEffect, useRef, useState } from 'react';
import { cancelRender, continueRender, delayRender, staticFile } from 'remotion';
import mermaid from 'mermaid';
import { Marp } from '@marp-team/marp-core';
import { convertToExcalidrawElements, exportToSvg } from '@excalidraw/excalidraw';
import { accentAlpha, line, mixHex, muted, primaryFont, surface, theme } from './palette';

export type Visual = { kind: 'mermaid' | 'excalidraw' | 'marp'; source: string; caption: string };

const clamp = (value: number) => Math.min(1, Math.max(0, value));
const ease = (value: number) => 1 - Math.pow(1 - clamp(value), 3);

mermaid.initialize({
  startOnLoad: false,
  securityLevel: 'strict',
  theme: 'base',
  fontFamily: primaryFont,
  themeVariables: {
    background: 'transparent',
    primaryColor: mixHex(theme.accent, theme.background, 0.22),
    primaryTextColor: theme.foreground,
    primaryBorderColor: theme.accent,
    secondaryColor: mixHex(theme.foreground, theme.background, 0.1),
    tertiaryColor: mixHex(theme.foreground, theme.background, 0.06),
    lineColor: theme.accent,
    textColor: theme.foreground,
    edgeLabelBackground: theme.background,
    noteBkgColor: mixHex(theme.accent, theme.background, 0.14),
    noteTextColor: theme.foreground,
    actorBkg: mixHex(theme.accent, theme.background, 0.22),
    actorBorder: theme.accent,
    actorTextColor: theme.foreground,
    signalColor: theme.foreground,
    signalTextColor: theme.foreground,
    fontSize: '28px'
  },
  flowchart: { curve: 'basis', padding: 22, useMaxWidth: false, wrappingWidth: 300, nodeSpacing: 46, rankSpacing: 60 },
  sequence: { useMaxWidth: false }
});

// Excalidraw falls back to a CDN for fonts; point it at the fonts copied next to this project.
(window as unknown as { EXCALIDRAW_ASSET_PATH: string }).EXCALIDRAW_ASSET_PATH = new URL(staticFile('excalidraw/'), window.location.href).href;

function marpTheme(designHeight: number): string {
  const table = mixHex(theme.foreground, theme.background, 0.18);
  return '/* @theme a2swe */\n'
    + 'section { width: 1280px; height: ' + designHeight + 'px; box-sizing: border-box; padding: 56px 72px; background: transparent; color: ' + theme.foreground + '; font-family: ' + primaryFont + '; font-size: 34px; line-height: 1.4; display: flex; flex-direction: column; justify-content: center; }\n'
    + 'h1 { color: ' + theme.accent + '; font-size: 66px; margin: 0 0 24px; line-height: 1.08 }\n'
    + 'h2 { color: ' + theme.accent + '; font-size: 46px; margin: 0 0 18px }\n'
    + 'strong, code { color: ' + theme.accent + ' }\n'
    + 'ul, ol { padding-left: 1.1em } li::marker { color: ' + theme.accent + ' }\n'
    + 'table { border-collapse: collapse; width: 100%; font-size: 32px }\n'
    + 'th { text-align: left; color: ' + theme.accent + '; border-bottom: 2px solid ' + theme.accent + '; padding: 12px 18px }\n'
    + 'td { border-bottom: 1px solid ' + table + '; padding: 12px 18px }\n'
    + 'blockquote { border-left: 6px solid ' + theme.accent + '; margin: 0; padding-left: 24px; color: ' + theme.foreground + ' }\n';
}

function useRendered<T>(label: string, key: string, produce: () => Promise<T>): T | null {
  const [value, setValue] = useState<T | null>(null);
  const [handle] = useState(() => delayRender(label, { timeoutInMilliseconds: 60000 }));
  React.useEffect(() => {
    let alive = true;
    produce().then((result) => {
      if (!alive) return;
      setValue(result);
      continueRender(handle);
    }).catch((error) => cancelRender(error));
    return () => { alive = false; };
  }, [key]);
  return value;
}

// String surgery instead of a DOM parse: mermaid labels contain HTML (<br>) that is not well-formed XML.
function fitSvg(markup: string): string {
  return markup.replace(/^\s*<svg\b([^>]*)>/, (_match, attributes: string) => {
    const kept = attributes.replace(/\s(?:width|height|style|preserveAspectRatio)="[^"]*"/g, '');
    return '<svg' + kept + ' width="100%" height="100%" preserveAspectRatio="xMidYMid meet" style="display:block;max-width:none;overflow:visible">';
  });
}
function reveal(host: HTMLElement, kind: Visual['kind'], frame: number, settled: boolean) {
  const progress = (start: number, span = 14) => (settled ? 1 : ease((frame - start) / span));
  const stagger = (elements: Element[], first: number, step: number) => elements.forEach((element, index) => {
    const p = progress(first + index * step);
    const style = (element as HTMLElement | SVGElement).style;
    // Individual transform properties compose with the SVG transform attribute that positions each element.
    style.opacity = String(p);
    style.transformBox = 'fill-box';
    style.transformOrigin = 'center';
    style.scale = String(0.94 + 0.06 * p);
    style.translate = '0px ' + (1 - p) * 10 + 'px';
  });
  if (kind === 'mermaid') {
    const nodes = [...host.querySelectorAll('g.node, g.cluster, rect.actor, text.actor, .actor-line')];
    const edges = [...host.querySelectorAll<SVGPathElement>('path.flowchart-link, path.messageLine0, path.messageLine1')];
    const labels = [...host.querySelectorAll('.edgeLabel, .messageText, .loopText')];
    if (nodes.length) stagger(nodes, 4, 7);
    else (host.firstElementChild as HTMLElement | null)?.style.setProperty('opacity', String(progress(2, 20)));
    const edgeStart = 4 + nodes.length * 7 - 4;
    edges.forEach((edge, index) => {
      const length = edge.getTotalLength?.() ?? 0;
      const p = progress(edgeStart + index * 6, 16);
      edge.style.strokeDasharray = length ? String(length) : '';
      edge.style.strokeDashoffset = length ? String(length * (1 - p)) : '';
      edge.style.opacity = length ? '1' : String(p);
    });
    stagger(labels, edgeStart + 8, 5);
  } else if (kind === 'excalidraw') {
    stagger([...(host.querySelector('svg')?.children ?? [])].filter((child) => child.tagName.toLowerCase() === 'g'), 3, 5);
  } else {
    stagger([...host.querySelectorAll('section > *')], 3, 8);
  }
}

// Excalidraw measures bound labels with a fallback font before Excalifont loads, so a label it thinks fits on one line can overflow once
// the wider handwritten face renders. Wrap labels explicitly with a conservative glyph width, then shrink only if the lines cannot fit.
function fitLabels(elements: unknown[]): unknown[] {
  return elements.map((element) => {
    const item = element as { width?: number; height?: number; label?: { text?: unknown; fontSize?: number } };
    if (!item?.label || typeof item.label.text !== 'string' || typeof item.width !== 'number' || typeof item.height !== 'number') return element;
    const source = item.label.text;
    const usableWidth = item.width - 28;
    const usableHeight = item.height - 16;
    const wrap = (size: number) => {
      const perLine = Math.max(1, Math.floor(usableWidth / (size * 0.7)));
      return source.split('\n').flatMap((line) => {
        const out: string[] = [];
        for (const word of line.split(/\s+/).filter(Boolean)) {
          const last = out.length ? out[out.length - 1] : '';
          if (last && (last + ' ' + word).length <= perLine) out[out.length - 1] = last + ' ' + word;
          else out.push(word);
        }
        return out.length ? out : [''];
      });
    };
    let size = item.label.fontSize ?? 20;
    let lines = wrap(size);
    while (size > 12 && (Math.max(...lines.map((line) => line.length)) * size * 0.7 > usableWidth || lines.length * size * 1.25 > usableHeight)) {
      size -= 1;
      lines = wrap(size);
    }
    return { ...item, label: { ...item.label, text: lines.join('\n'), fontSize: size } };
  });
}

function useVisual(visual: Visual, id: string, designHeight: number) {
  const rendered = useRendered<{ html: string; css?: string }>('visual ' + visual.kind + ' ' + id, visual.kind + ':' + visual.source, async () => {
    if (visual.kind === 'mermaid') {
      const { svg } = await mermaid.render('mmd-' + id.replace(/[^a-zA-Z0-9]/g, ''), visual.source);
      return { html: fitSvg(svg) };
    }
    if (visual.kind === 'excalidraw') {
      const parsed = JSON.parse(visual.source);
      const skeleton = Array.isArray(parsed) ? parsed : parsed.elements;
      const elements = convertToExcalidrawElements(fitLabels(skeleton) as never);
      await document.fonts.ready;
      const svg = await exportToSvg({ elements, appState: { exportBackground: false, exportWithDarkMode: false, exportPadding: 32 } as never, files: null });
      return { html: fitSvg(new XMLSerializer().serializeToString(svg)) };
    }
    const marp = new Marp({ inlineSVG: false, html: false, script: false });
    marp.themeSet.add(marpTheme(designHeight));
    const output = marp.render('---\nmarp: true\ntheme: a2swe\n---\n' + visual.source);
    return { html: output.html, css: output.css };
  });
  const host = useRef<HTMLDivElement>(null);
  return { rendered, host };
}

export function VisualPanel({ visual, id, width, height, frame, settled = false }: { visual: Visual; id: string; width: number; height: number; frame: number; settled?: boolean }) {
  // Marp slides are designed 1280 wide and as tall as the panel's aspect ratio, so text scales with the panel width.
  const designHeight = Math.round(1280 * height / width);
  const { rendered, host } = useVisual(visual, id, designHeight);
  useLayoutEffect(() => {
    if (host.current && rendered) reveal(host.current, visual.kind, frame, settled);
  });
  const scale = width / 1280;
  return <div role="img" aria-label={visual.caption} style={{ width, height, borderRadius: 26, border: '1px solid ' + line, background: surface, boxShadow: '0 0 0 1px ' + accentAlpha(0.12) + ', 0 24px 60px rgba(0,0,0,0.25)', overflow: 'hidden', position: 'relative', color: muted }}>
    {visual.kind === 'marp'
      ? <div ref={host} style={{ position: 'absolute', left: 0, top: 0, width: 1280, height: designHeight, transform: 'scale(' + scale + ')', transformOrigin: 'top left' }}>
        {rendered ? <><style>{rendered.css}</style><div dangerouslySetInnerHTML={{ __html: rendered.html }} /></> : null}
      </div>
      : <div ref={host} style={{ position: 'absolute', inset: 24 }} dangerouslySetInnerHTML={{ __html: rendered?.html ?? '' }} />}
  </div>;
}
