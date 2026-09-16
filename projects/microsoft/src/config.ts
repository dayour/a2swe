
export type HudEntry = {fromS: string; toS: string; text: string; tech?: string; fromOffset?: number; toOffset?: number; w?: number};
export type RailSpec = {steps: string[]; switchS: string[]; fromS: string; toS: string};
export const VIDEO = {
  slug: 'microsoft', 
  
  lang: 'en' as const,
  
  bg: 'stars' as 'stars' | 'dots',
  
  title: {big: 'TOPIC', rest: '', en: 'Full Name of the Topic', tagline: 'One idea, clearly explained'},
  
  credit: null as {kicker: string; title: string; byline: string; note: string} | null,
  
  chapterTech: ['Chapter One', 'Chapter Two'],
  
  hud: [
    {fromS: 'S01', toS: 'S01', text: 'The problem'},
    {fromS: 'S02', toS: 'S02', text: 'How it works', tech: 'Explained'},
  ] as HudEntry[],
  
  rails: [] as RailSpec[],
  
  endingFade: 30,
};
