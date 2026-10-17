import React, { useLayoutEffect, useRef, useState } from 'react';
import { cancelRender, continueRender, delayRender, staticFile } from 'remotion';
import mermaid from 'mermaid';
import { Marp } from '@marp-team/marp-core';
import { convertToExcalidrawElements, exportToSvg } from '@excalidraw/excalidraw';
import { accentAlpha, alpha, brand, dark, headingFont, hexToRgb, line, mixHex, muted, panelFill, primaryFont, radius, surface } from './palette';

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
    primaryColor: mixHex(brand.primary, panelFill, 0.22),
    primaryTextColor: brand.text,
    primaryBorderColor: brand.primary,
    secondaryColor: mixHex(brand.text, panelFill, 0.1),
    tertiaryColor: mixHex(brand.text, panelFill, 0.06),
    lineColor: brand.primary,
    textColor: brand.text,
    edgeLabelBackground: panelFill,
    noteBkgColor: mixHex(brand.primary, panelFill, 0.14),
    noteTextColor: brand.text,
    actorBkg: mixHex(brand.primary, panelFill, 0.22),
    actorBorder: brand.primary,
    actorTextColor: brand.text,
    signalColor: brand.text,
    signalTextColor: brand.text,
    // Timeline and journey sections otherwise derive near-black fills from the base palette instead of the brand theme.
    ...Object.fromEntries(Array.from({ length: 12 }, (_, index) => [
      ['cScale' + index, mixHex(brand.primary, panelFill, index % 2 ? 0.3 : 0.2)],
      ['cScaleLabel' + index, brand.text],
      ['cScalePeer' + index, brand.primary]
    ]).flat()),
    fontSize: '28px'
  },
  flowchart: { curve: 'basis', padding: 22, useMaxWidth: false, wrappingWidth: 300, nodeSpacing: 46, rankSpacing: 60 },
  sequence: { useMaxWidth: false }
});

// Excalidraw falls back to a CDN for fonts; point it at the fonts copied next to this project.
(window as unknown as { EXCALIDRAW_ASSET_PATH: string }).EXCALIDRAW_ASSET_PATH = new URL(staticFile('excalidraw/'), window.location.href).href;

function marpTheme(designHeight: number): string {
  const table = mixHex(brand.text, panelFill, 0.18);
  const headingColor = dark ? brand.accent : brand.header;
  return '/* @theme a2swe */\n'
    + 'section { width: 1280px; height: ' + designHeight + 'px; box-sizing: border-box; padding: 56px 72px; background: transparent; color: ' + brand.text + '; font-family: ' + primaryFont + '; font-size: 34px; line-height: 1.4; display: flex; flex-direction: column; justify-content: center; }\n'
    + 'h1 { color: ' + headingColor + '; font-family: ' + headingFont + '; font-weight: ' + brand.headingWeight + '; font-size: 66px; margin: 0 0 24px; line-height: 1.08 }\n'
    + 'h2 { color: ' + headingColor + '; font-family: ' + headingFont + '; font-weight: ' + brand.headingWeight + '; font-size: 46px; margin: 0 0 18px }\n'
    + 'strong, code { color: ' + brand.accent + ' }\n'
    + 'ul, ol { padding-left: 1.1em } li::marker { color: ' + brand.accent + ' }\n'
    + 'table { border-collapse: collapse; width: 100%; font-size: 32px }\n'
    + 'th { text-align: left; color: ' + brand.accent + '; border-bottom: 2px solid ' + brand.accent + '; padding: 12px 18px }\n'
    + 'td { border-bottom: 1px solid ' + table + '; padding: 12px 18px }\n'
    + 'blockquote { border-left: 6px solid ' + brand.accent + '; margin: 0; padding-left: 24px; color: ' + brand.text + ' }\n';
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
    const item = element as { type?: string; width?: number; height?: number; label?: { text?: unknown; fontSize?: number } };
    if (!item?.label || typeof item.label.text !== 'string' || typeof item.width !== 'number' || typeof item.height !== 'number') return element;
    const source = item.label.text;
    // Diamonds and ellipses hold their label in the inscribed box, half and about 70% of the outer size respectively.
    const inset = item.type === 'diamond' ? 0.5 : item.type === 'ellipse' ? 0.7 : 1;
    const usableWidth = item.width * inset - 28;
    const usableHeight = item.height * inset - 16;
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

// convertToExcalidrawElements draws a random rough.js seed per element, and Remotion renders frames in parallel browser tabs that each
// convert the diagram, so every tab drew different hand-drawn strokes and the diagram boiled at the frame rate divided by the tab count.
// Seeds derived from the source keep the strokes identical across tabs, renders and the settled image that documents embed.
function stableSeeds<T extends object>(elements: readonly T[], source: string): T[] {
  let hash = 2166136261;
  for (let index = 0; index < source.length; index += 1) hash = Math.imul(hash ^ source.charCodeAt(index), 16777619);
  return elements.map((element, index) => ({ ...element, seed: (Math.imul(hash ^ (index + 1), 2654435761) >>> 1) || 1 }));
}

const isHex = (value: unknown): value is string => typeof value === 'string' && /^#[0-9a-fA-F]{6}$/.test(value);

function relativeLuminance(hex: string): number {
  const [r, g, b] = hexToRgb(hex).map((value) => { const unit = value / 255; return unit <= 0.03928 ? unit / 12.92 : Math.pow((unit + 0.055) / 1.055, 2.4); });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function contrastRatio(a: string, b: string): number {
  const [light, darker] = [relativeLuminance(a), relativeLuminance(b)].sort((x, y) => y - x);
  return (light + 0.05) / (darker + 0.05);
}

function saturation(hex: string): number {
  const values = hexToRgb(hex);
  const max = Math.max(...values);
  return max ? (max - Math.min(...values)) / max : 0;
}

// Keeps an authored hue at a new lightness, so semantic colors such as a red risk or a green status survive a theme change.
function retone(hex: string, lightness: number): string {
  const [r, g, b] = hexToRgb(hex).map((value) => value / 255);
  const max = Math.max(r, g, b), min = Math.min(r, g, b), delta = max - min;
  const hue = delta ? ((max === r ? ((g - b) / delta) % 6 : max === g ? (b - r) / delta + 2 : (r - g) / delta + 4) * 60 + 360) % 360 : 0;
  const sat = Math.min(delta ? delta / (1 - Math.abs(max + min - 1)) : 0, 0.65);
  const chroma = (1 - Math.abs(2 * lightness - 1)) * sat;
  const x = chroma * (1 - Math.abs(((hue / 60) % 2) - 1));
  const m = lightness - chroma / 2;
  const [r1, g1, b1] = hue < 60 ? [chroma, x, 0] : hue < 120 ? [x, chroma, 0] : hue < 180 ? [0, chroma, x] : hue < 240 ? [0, x, chroma] : hue < 300 ? [x, 0, chroma] : [chroma, 0, x];
  return '#' + [r1, g1, b1].map((value) => Math.round((value + m) * 255).toString(16).padStart(2, '0')).join('');
}

function inkFor(background: string): string {
  if (contrastRatio(brand.text, background) >= 4.5) return brand.text;
  return contrastRatio('#FFFFFF', background) >= contrastRatio('#111111', background) ? '#FFFFFF' : '#111111';
}

// Excalidraw skeletons carry colors authored for one theme. Fills are re-toned to the panel's light or dark mode and strokes and labels
// regain contrast against their actual background, so every diagram reads on any brand theme without re-authoring.
function adaptColors(elements: unknown[]): unknown[] {
  return elements.map((element) => {
    const item = element as { type?: string; strokeColor?: unknown; backgroundColor?: unknown; label?: Record<string, unknown> };
    const next: Record<string, unknown> = { ...item };
    let fill = panelFill;
    if (isHex(item.backgroundColor)) {
      const lightness = relativeLuminance(item.backgroundColor);
      if (!dark && lightness < 0.3) next.backgroundColor = retone(item.backgroundColor, 0.92);
      else if (dark && lightness > 0.45) next.backgroundColor = retone(item.backgroundColor, 0.16);
      fill = next.backgroundColor as string;
    }
    if (isHex(item.strokeColor)) {
      const text = item.type === 'text';
      if (contrastRatio(item.strokeColor, panelFill) < (text ? 4.5 : 3)) {
        next.strokeColor = text ? inkFor(panelFill) : saturation(item.strokeColor) < 0.15 ? (dark ? brand.text : brand.muted) : retone(item.strokeColor, dark ? 0.7 : 0.38);
      }
    }
    if (item.label && isHex(item.label.strokeColor) && contrastRatio(item.label.strokeColor, fill) < 4.5) next.label = { ...item.label, strokeColor: inkFor(fill) };
    return next;
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
      const elements = stableSeeds(convertToExcalidrawElements(adaptColors(fitLabels(skeleton)) as never), visual.source);
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
  return <div role="img" aria-label={visual.caption} style={{ width, height, borderRadius: radius + 8, border: '1px solid ' + line, background: surface, boxShadow: dark ? '0 0 0 1px ' + accentAlpha(0.12) + ', 0 24px 60px rgba(0,0,0,0.25)' : '0 12px 32px ' + alpha(brand.header, 0.1), overflow: 'hidden', position: 'relative', color: muted }}>
    {visual.kind === 'marp'
      ? <div ref={host} style={{ position: 'absolute', left: 0, top: 0, width: 1280, height: designHeight, transform: 'scale(' + scale + ')', transformOrigin: 'top left' }}>
        {rendered ? <><style>{rendered.css}</style><div dangerouslySetInnerHTML={{ __html: rendered.html }} /></> : null}
      </div>
      : <div ref={host} style={{ position: 'absolute', inset: 24 }} dangerouslySetInnerHTML={{ __html: rendered?.html ?? '' }} />}
  </div>;
}
