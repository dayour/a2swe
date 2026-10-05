export type PermissionMode = 'ask' | 'auto' | 'deny';

export type Project = {
  id: string;
  name: string;
  path: string;
  hasCanonical?: boolean;
  hasQc?: boolean;
};

export type LibraryItem = {
  id: string;
  name?: string;
  title?: string;
  path?: string;
  description?: string;
  tags?: string[];
  source?: { path?: string; digest?: string; page?: number };
  mediaType?: string;
  width?: number;
  height?: number;
  digest?: string;
  extractionStatus?: string;
  citation?: {path?: string; pageStart?: number; pageEnd?: number};
};

export type BridgeEvent = {
  event: string;
  data?: Record<string, unknown>;
};

export type Activity = {
  id: string;
  name: string;
  status: string;
  details?: string;
};

export type ChatMessage = {
  id: string;
  role: 'user' | 'agent' | 'system';
  text: string;
  streaming?: boolean;
};

export type AppSettings = {
  workspace: string;
  nodePath?: string;
};

export type RuntimeStatus = {
  connected?: boolean;
  node?: string;
  workspace?: string;
  [key: string]: unknown;
};
