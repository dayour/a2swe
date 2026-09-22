
export type HudEntry = {fromS: string; toS: string; text: string; tech?: string; fromOffset?: number; toOffset?: number; w?: number};
export type RailSpec = {steps: string[]; switchS: string[]; fromS: string; toS: string};
export const VIDEO = {
  slug: 'power-platform-2026', 
  
  lang: 'en' as const,
  
  bg: 'stars' as 'stars' | 'dots',
  
  title: {big: 'POWER', rest: 'PLATFORM 2026', en: 'Power Platform 2026', tagline: 'Build fast. Ship with discipline.'},
  
  credit: null as {kicker: string; title: string; byline: string; note: string} | null,
  
  chapterTech: ['Verified context', 'Production narrative'],
  
  hud: [
    {fromS: 'S01', toS: 'S01', text: 'Verified premise'},
    {fromS: 'S02', toS: 'S02', text: 'Explainer sequence', tech: 'Original visuals'},
  ] as HudEntry[],
  
  rails: [] as RailSpec[],
  
  endingFade: 30,
};
