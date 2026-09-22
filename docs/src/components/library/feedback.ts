export const feedbackTags = ['readability', 'pacing', 'motion', 'composition', 'subtitle_sync', 'audio_quality', 'factuality', 'accessibility', 'unsupported_claim', 'clipped_text', 'missing_attribution', 'gold_example'] as const;
export const storageKey = 'a2swe.feedback.v1';
export type Subject = {id: string; digest: string; duration: number; fps: number};
export type Annotation = {
  schemaVersion: 1;
  id: string;
  createdAt: string;
  subject: {id: string; digest: string; fromSeconds: number; toSeconds: number};
  comparison: {id: string; digest: string; preference: 'primary' | 'comparison' | 'tie'} | null;
  tags: string[];
  rating: number;
  comment: string;
  status: 'unadjudicated';
  origin: 'browser-local-human-feedback';
};

function object(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}
export function validateAnnotation(value: unknown, subjects: Subject[]): asserts value is Annotation {
  if (!object(value) || value.schemaVersion !== 1 || typeof value.id !== 'string' || !value.id ||
      typeof value.createdAt !== 'string' || !Number.isFinite(Date.parse(value.createdAt)) ||
      value.status !== 'unadjudicated' || value.origin !== 'browser-local-human-feedback') throw new Error('Invalid feedback record.');
  const subject = value.subject;
  if (!object(subject)) throw new Error('Missing video identity.');
  const known = subjects.find((item) => item.id === subject.id && item.digest === subject.digest);
  if (!known) throw new Error('Feedback refers to a missing or changed movie. Export the existing data before upgrading it.');
  if (typeof subject.fromSeconds !== 'number' || typeof subject.toSeconds !== 'number' ||
      !Number.isFinite(subject.fromSeconds) || !Number.isFinite(subject.toSeconds) ||
      subject.fromSeconds < 0 || subject.toSeconds > known.duration || subject.fromSeconds >= subject.toSeconds) {
    throw new Error(`Time range must be inside the movie (0-${known.duration.toFixed(2)} seconds), with end after start.`);
  }
  if (!Array.isArray(value.tags) || !value.tags.length || !value.tags.every((tag) => typeof tag === 'string' && feedbackTags.some((item) => item === tag)) ||
      new Set(value.tags).size !== value.tags.length) throw new Error('Select at least one valid, unique feedback tag.');
  if (typeof value.rating !== 'number' || !Number.isInteger(value.rating) || value.rating < 1 || value.rating > 5) throw new Error('Rating must be 1-5.');
  if (typeof value.comment !== 'string' || value.comment.length > 2000) throw new Error('Comments must be at most 2,000 characters.');
  if (value.comparison !== null) {
    const other = value.comparison;
    if (!object(other) || other.id === subject.id || !subjects.some((item) => item.id === other.id && item.digest === other.digest) ||
        !['primary', 'comparison', 'tie'].includes(String(other.preference))) throw new Error('Choose a different, valid comparison movie and a preference.');
  }
}
export function parseAnnotations(raw: string | null, subjects: Subject[]): Annotation[] {
  if (raw === null) return [];
  const parsed: unknown = JSON.parse(raw);
  if (!Array.isArray(parsed)) throw new Error('Stored feedback is not an array; it has not been overwritten.');
  for (const item of parsed) validateAnnotation(item, subjects);
  if (new Set(parsed.map((item: Annotation) => item.id)).size !== parsed.length) throw new Error('Stored feedback contains duplicate record IDs.');
  return parsed;
}
