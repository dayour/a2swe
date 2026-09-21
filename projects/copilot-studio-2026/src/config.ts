
export type HudEntry = {fromS: string; toS: string; text: string; tech?: string; fromOffset?: number; toOffset?: number; w?: number};
export type RailSpec = {steps: string[]; switchS: string[]; fromS: string; toS: string};
export const VIDEO = {
  slug: 'copilot-studio-2026', 
  
  lang: 'en' as const,
  
  bg: 'stars' as 'stars' | 'dots',
  
  title: {big: 'COPILOT', rest: 'STUDIO 2026', en: 'Copilot Studio 2026', tagline: 'Awaiting verified research and script'},
  
  credit: null as {kicker: string; title: string; byline: string; note: string} | null,
  
  chapterTech: ['Verified context', 'Production narrative'],
  
  hud: [
    {fromS: 'S01', toS: 'S01', text: 'Verified premise'},
    {fromS: 'S02', toS: 'S02', text: 'Explainer sequence', tech: 'Original visuals'},
  ] as HudEntry[],
  
  rails: [] as RailSpec[],
  
  endingFade: 30,
};
