/** Collapses whitespace runs to single spaces and trims; nullish values become empty strings. */
export const clean = (value: unknown) => String(value ?? '').replace(/\s+/g, ' ').trim();

/** Splits text into whitespace-normalized English sentences, dropping empty segments. */
export function sentences(text: string): string[] {
  return Array.from(new Intl.Segmenter('en', { granularity: 'sentence' }).segment(text), (part) => clean(part.segment)).filter(Boolean);
}
