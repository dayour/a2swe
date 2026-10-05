export type ReviewKind = 'video' | 'audio' | 'image' | 'studio';
export type ReviewControlAction = 'seek' | 'play' | 'pause';

export interface ReviewMedia {
  kind: ReviewKind;
  path: string;
  url?: string;
  mediaType: string;
  byteSize: number;
  durationSeconds?: number;
  digest?: string;
}

export interface ReviewSubtitleCue {
  startSeconds: number;
  endSeconds: number;
  text: string;
  sourcePath: string;
}

export interface ReviewState {
  reviewId: string;
  projectId?: string;
  media?: ReviewMedia;
  studio?: { url?: string; root?: string; available: boolean; reason?: string };
  playback: { timeSeconds: number; playing: boolean; rate: number; updatedAt: string };
  tracks: {
    subtitles: Array<{ id: string; path: string; url?: string; cueCount: number; cues?: ReviewSubtitleCue[] }>;
    subtitleCues?: ReviewSubtitleCue[];
    spectrogram?: { available: boolean; url?: string; path?: string };
  };
  qc: { receipts: Array<{ kind: string; path: string; summary?: string }> };
  pendingControls: Array<{ requestId: string; action: ReviewControlAction; requestedAt: string; status: 'pending' | 'applied' | 'failed' | 'expired'; timeSeconds?: number; error?: string }>;
}

export interface ReviewListItem {
  id: string;
  kind: ReviewKind;
  title: string;
  path: string;
  mediaType: string;
  byteSize?: number;
  hasSubtitles: boolean;
  hasSpectrogram: boolean;
  hasQc: boolean;
}
