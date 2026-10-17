export type CoreContract =
  | LibraryEntry
  | WorkItem
  | TaskResult
  | SourceDocument
  | DomainPack
  | AssetRequest
  | AssetRecord
  | ApprovalManifest
  | ContentIR
  | RenderSpec
  | RenderTheme
  | AssetInventory
  | FormatParityManifest
  | ReleasePlan
  | Runbook
  | GenerationRequest
  | RenderRevision;
export type Identifier = string;
export type RelativePath = string;
export type Digest = string;
export type Date = string;
/**
 * Who may receive content derived from a source: public (published openly), customer (shared with or owned by the customer) or internal (CRM records, trackers, internal mail, chat and meeting transcripts). When absent it is inferred from the source host.
 */
export type SourceDistribution = "public" | "customer" | "internal";
export type IsoInstant = string;
/**
 * The audience a ContentIR is aligned for. External content may cite only public or customer sources; internal outputs carry an Internal marking.
 */
export type ContentDistribution = "internal" | "external";
export type HexColor = string;
export type FontStack = string;

export interface LibraryEntry {
  schemaVersion: "1.0.0";
  id: Identifier;
  kind: "agent" | "skill" | "plugin" | "asset" | "template" | "automation" | "archive";
  displayName: string;
  sourceRoot: Identifier;
  entrypoint: RelativePath;
  contentHash: Digest;
  dependencies: Identifier[];
  requiredCapabilities: Identifier[];
  dataClasses: ("public" | "private" | "unknown")[];
  effects: ("read" | "write" | "network" | "execute" | "publish" | "unknown")[];
  reviewStatus: "pending" | "quarantined" | "approved";
  enablementStatus: "disabled" | "enabled";
  runtimeValidation: "not_run" | "passed" | "failed" | "unavailable";
}
export interface WorkItem {
  schemaVersion: "1.0.0";
  taskId: Identifier;
  runId: Identifier;
  domainId: Identifier;
  domainDigest: Digest;
  stage: "research" | "evaluation" | "production";
  objective: string;
  /**
   * @maxItems 100
   */
  inputs: ArtifactRef[];
  /**
   * @maxItems 100
   */
  dependencies: Identifier[];
  requiredCapabilities: Identifier[];
  idempotencyKey: Identifier;
}
export interface ArtifactRef {
  digest: Digest;
  mediaType: string;
  byteSize: number;
}
export interface TaskResult {
  schemaVersion: "1.0.0";
  taskId: Identifier;
  inputDigest: Digest;
  status: "succeeded" | "failed" | "blocked" | "cancelled" | "outcome_unknown";
  /**
   * @maxItems 100
   */
  outputs: ArtifactRef[];
  /**
   * @maxItems 100
   */
  checks: {
    name: Identifier;
    status: "passed" | "failed" | "not_run";
  }[];
  summary: string;
}
export interface SourceDocument {
  schemaVersion: "1.0.0";
  sourceId: Identifier;
  domainId: Identifier;
  canonicalUrl: string;
  publisher: string;
  title: string;
  publicationDate: Date | null;
  modifiedDate: Date | null;
  retrievedAt: string;
  dateEvidence: string;
  contentHash: Digest;
  distribution?: SourceDistribution;
}
export interface DomainPack {
  schemaVersion: "1.0.0";
  domainId: Identifier;
  kind: "company" | "customer" | "topic" | "framework" | "repository" | "tool";
  canonicalName: string;
  asOf: Date;
  windowStart: Date;
  timezone: "UTC";
  state: "draft" | "verifying" | "ready" | "stale" | "blocked" | "superseded";
  /**
   * @maxItems 1000
   */
  sources: SourceDocument[];
  /**
   * @maxItems 10000
   */
  evidence: EvidenceSpan[];
  /**
   * @maxItems 10000
   */
  claims: Claim[];
  knownGaps: string[];
}
export interface EvidenceSpan {
  evidenceId: Identifier;
  sourceId: Identifier;
  sourceDigest: Digest;
  locator: string;
  quote: string;
  quoteDigest: Digest;
}
export interface Claim {
  claimId: Identifier;
  wording: string;
  /**
   * @minItems 1
   */
  evidenceIds: [Identifier, ...Identifier[]];
  disposition: "unreviewed" | "supported" | "contradicted" | "insufficient_evidence";
}
export interface AssetRequest {
  schemaVersion: "1.0.0";
  assetId: string;
  domainDigest: Digest;
  purpose: "evaluation";
  method: "diagram" | "diffusion" | "import";
  role: "illustration" | "diagram" | "photograph" | "official_mark";
  prompt: string;
  title?: string;
  alt: string;
  width: number;
  height: number;
  seed: number;
  /**
   * @minItems 3
   * @maxItems 3
   */
  palette: [string, string, string];
  /**
   * @maxItems 5
   */
  nodes:
    | []
    | [
        {
          symbol?: "code" | "artifact" | "environment" | "data" | "review";
          label: string;
          detail: string;
        }
      ]
    | [
        {
          symbol?: "code" | "artifact" | "environment" | "data" | "review";
          label: string;
          detail: string;
        },
        {
          symbol?: "code" | "artifact" | "environment" | "data" | "review";
          label: string;
          detail: string;
        }
      ]
    | [
        {
          symbol?: "code" | "artifact" | "environment" | "data" | "review";
          label: string;
          detail: string;
        },
        {
          symbol?: "code" | "artifact" | "environment" | "data" | "review";
          label: string;
          detail: string;
        },
        {
          symbol?: "code" | "artifact" | "environment" | "data" | "review";
          label: string;
          detail: string;
        }
      ]
    | [
        {
          symbol?: "code" | "artifact" | "environment" | "data" | "review";
          label: string;
          detail: string;
        },
        {
          symbol?: "code" | "artifact" | "environment" | "data" | "review";
          label: string;
          detail: string;
        },
        {
          symbol?: "code" | "artifact" | "environment" | "data" | "review";
          label: string;
          detail: string;
        },
        {
          symbol?: "code" | "artifact" | "environment" | "data" | "review";
          label: string;
          detail: string;
        }
      ]
    | [
        {
          symbol?: "code" | "artifact" | "environment" | "data" | "review";
          label: string;
          detail: string;
        },
        {
          symbol?: "code" | "artifact" | "environment" | "data" | "review";
          label: string;
          detail: string;
        },
        {
          symbol?: "code" | "artifact" | "environment" | "data" | "review";
          label: string;
          detail: string;
        },
        {
          symbol?: "code" | "artifact" | "environment" | "data" | "review";
          label: string;
          detail: string;
        },
        {
          symbol?: "code" | "artifact" | "environment" | "data" | "review";
          label: string;
          detail: string;
        }
      ];
}
export interface AssetRecord {
  schemaVersion: "1.0.0";
  assetId: string;
  domainDigest: Digest;
  requestDigest: Digest;
  artifact: ArtifactRef;
  width: number;
  height: number;
  alt: string;
  role: "illustration" | "diagram" | "photograph" | "official_mark";
  origin: {
    method: "diagram" | "diffusion" | "import";
    provider: string;
    version: string;
    inputDigest: Digest;
    sourceUrl: string | null;
  };
  review: "pending";
  createdAt: string;
  checks: {
    decoded: "passed";
    dimensions: "passed";
    nonblank: "passed";
  };
  quality?: {
    format: "png";
    colorSpace: "srgb";
    alpha: "opaque" | "transparent";
    nonTransparentPixelRatio: number;
    luminanceRange: number;
    channelRangeMin: number;
  };
}
export interface ApprovalManifest {
  schemaVersion: "1.0.0";
  manifestId: Identifier;
  domainDigest: Digest;
  contentDigest: Digest;
  reviewedAt: IsoInstant;
  /**
   * @maxItems 100
   */
  selectedAssets: SelectedAssetApproval[];
}
export interface SelectedAssetApproval {
  assetId: Identifier;
  assetDigest: Digest;
  basis: string;
  reviewerId: string;
  evidenceDigest: Digest;
  status: "pending" | "approved" | "rejected";
}
export interface ContentIR {
  schemaVersion: "1.0.0";
  contentId: Identifier;
  domainDigest: Digest;
  title: string;
  audience: string;
  decision: string;
  language: "en";
  summary: string;
  /**
   * @minItems 1
   * @maxItems 200
   */
  claims: [ContentClaim, ...ContentClaim[]];
  /**
   * @minItems 1
   * @maxItems 500
   */
  citations: [ContentCitation, ...ContentCitation[]];
  /**
   * @maxItems 100
   */
  assets: ContentAsset[];
  /**
   * @minItems 1
   * @maxItems 80
   */
  sections: [ContentSection, ...ContentSection[]];
  voice: VoiceSpec;
  distribution?: ContentDistribution;
}
export interface ContentClaim {
  claimId: Identifier;
  text: string;
  /**
   * @minItems 1
   */
  evidenceIds: [Identifier, ...Identifier[]];
}
export interface ContentCitation {
  evidenceId: Identifier;
  sourceTitle: string;
  canonicalUrl: string;
  retrievedAt: IsoInstant;
}
export interface ContentAsset {
  assetId: Identifier;
  digest: Digest;
  mediaType: string;
  alt: string;
  role: "illustration" | "diagram" | "photograph" | "official_mark";
}
export interface ContentSection {
  sectionId: Identifier;
  title: string;
  body: string;
  /**
   * @minItems 1
   */
  claimIds: [Identifier, ...Identifier[]];
  assetIds: Identifier[];
  speakerNotes: string;
  visual?: SectionVisual;
}
export interface SectionVisual {
  kind: "mermaid" | "excalidraw" | "marp";
  source: string;
  caption: string;
}
export interface VoiceSpec {
  style: string;
  profileId?: string;
  speed?: number;
  pronunciations?: {
    [k: string]: string;
  };
  narration: string;
  externalTransfer: false;
}
export interface RenderSpec {
  schemaVersion: "1.0.0";
  renderId: Identifier;
  contentDigest: Digest;
  /**
   * @minItems 1
   * @maxItems 8
   */
  formats:
    | ["html" | "adaptiveDeck" | "pptx" | "docx" | "pdf" | "png" | "jpeg" | "remotion"]
    | [
        "html" | "adaptiveDeck" | "pptx" | "docx" | "pdf" | "png" | "jpeg" | "remotion",
        "html" | "adaptiveDeck" | "pptx" | "docx" | "pdf" | "png" | "jpeg" | "remotion"
      ]
    | [
        "html" | "adaptiveDeck" | "pptx" | "docx" | "pdf" | "png" | "jpeg" | "remotion",
        "html" | "adaptiveDeck" | "pptx" | "docx" | "pdf" | "png" | "jpeg" | "remotion",
        "html" | "adaptiveDeck" | "pptx" | "docx" | "pdf" | "png" | "jpeg" | "remotion"
      ]
    | [
        "html" | "adaptiveDeck" | "pptx" | "docx" | "pdf" | "png" | "jpeg" | "remotion",
        "html" | "adaptiveDeck" | "pptx" | "docx" | "pdf" | "png" | "jpeg" | "remotion",
        "html" | "adaptiveDeck" | "pptx" | "docx" | "pdf" | "png" | "jpeg" | "remotion",
        "html" | "adaptiveDeck" | "pptx" | "docx" | "pdf" | "png" | "jpeg" | "remotion"
      ]
    | [
        "html" | "adaptiveDeck" | "pptx" | "docx" | "pdf" | "png" | "jpeg" | "remotion",
        "html" | "adaptiveDeck" | "pptx" | "docx" | "pdf" | "png" | "jpeg" | "remotion",
        "html" | "adaptiveDeck" | "pptx" | "docx" | "pdf" | "png" | "jpeg" | "remotion",
        "html" | "adaptiveDeck" | "pptx" | "docx" | "pdf" | "png" | "jpeg" | "remotion",
        "html" | "adaptiveDeck" | "pptx" | "docx" | "pdf" | "png" | "jpeg" | "remotion"
      ]
    | [
        "html" | "adaptiveDeck" | "pptx" | "docx" | "pdf" | "png" | "jpeg" | "remotion",
        "html" | "adaptiveDeck" | "pptx" | "docx" | "pdf" | "png" | "jpeg" | "remotion",
        "html" | "adaptiveDeck" | "pptx" | "docx" | "pdf" | "png" | "jpeg" | "remotion",
        "html" | "adaptiveDeck" | "pptx" | "docx" | "pdf" | "png" | "jpeg" | "remotion",
        "html" | "adaptiveDeck" | "pptx" | "docx" | "pdf" | "png" | "jpeg" | "remotion",
        "html" | "adaptiveDeck" | "pptx" | "docx" | "pdf" | "png" | "jpeg" | "remotion"
      ]
    | [
        "html" | "adaptiveDeck" | "pptx" | "docx" | "pdf" | "png" | "jpeg" | "remotion",
        "html" | "adaptiveDeck" | "pptx" | "docx" | "pdf" | "png" | "jpeg" | "remotion",
        "html" | "adaptiveDeck" | "pptx" | "docx" | "pdf" | "png" | "jpeg" | "remotion",
        "html" | "adaptiveDeck" | "pptx" | "docx" | "pdf" | "png" | "jpeg" | "remotion",
        "html" | "adaptiveDeck" | "pptx" | "docx" | "pdf" | "png" | "jpeg" | "remotion",
        "html" | "adaptiveDeck" | "pptx" | "docx" | "pdf" | "png" | "jpeg" | "remotion",
        "html" | "adaptiveDeck" | "pptx" | "docx" | "pdf" | "png" | "jpeg" | "remotion"
      ]
    | [
        "html" | "adaptiveDeck" | "pptx" | "docx" | "pdf" | "png" | "jpeg" | "remotion",
        "html" | "adaptiveDeck" | "pptx" | "docx" | "pdf" | "png" | "jpeg" | "remotion",
        "html" | "adaptiveDeck" | "pptx" | "docx" | "pdf" | "png" | "jpeg" | "remotion",
        "html" | "adaptiveDeck" | "pptx" | "docx" | "pdf" | "png" | "jpeg" | "remotion",
        "html" | "adaptiveDeck" | "pptx" | "docx" | "pdf" | "png" | "jpeg" | "remotion",
        "html" | "adaptiveDeck" | "pptx" | "docx" | "pdf" | "png" | "jpeg" | "remotion",
        "html" | "adaptiveDeck" | "pptx" | "docx" | "pdf" | "png" | "jpeg" | "remotion",
        "html" | "adaptiveDeck" | "pptx" | "docx" | "pdf" | "png" | "jpeg" | "remotion"
      ];
  theme: RenderTheme;
  viewport: {
    width: number;
    height: number;
  };
  video: {
    width: number;
    height: number;
    fps: number;
    durationSeconds: number;
    sampleRate: 44100 | 48000;
  };
}
/**
 * Brand design tokens shared by every output format. background/foreground are the page canvas and body ink, accent is emphasis ink on the canvas; palette carries the brand roles (header band, highlight rule, surfaces) and source records where the brand came from.
 */
export interface RenderTheme {
  name: string;
  background: HexColor;
  foreground: HexColor;
  accent: HexColor;
  fontFamily: FontStack;
  headingFont?: FontStack;
  radius?: number;
  palette?: {
    primary: HexColor;
    header: HexColor;
    deep: HexColor;
    highlight: HexColor;
    paper: HexColor;
    line: HexColor;
    muted: HexColor;
    soft: HexColor;
    danger?: HexColor;
  };
  source?: {
    kind: "kit" | "site" | "manual";
    reference: string;
    basis: string;
    retrievedAt?: IsoInstant;
  };
}
export interface AssetInventory {
  schemaVersion: "1.0.0";
  contentDigest: Digest;
  /**
   * @maxItems 200
   */
  entries: AssetInventoryEntry[];
}
export interface AssetInventoryEntry {
  assetId: Identifier;
  kind: "selected" | "generated_visual";
  role: string;
  path: RelativePath;
  digest: Digest;
  sourceDigest: Digest;
  sectionId: Identifier | null;
}
export interface FormatParityManifest {
  schemaVersion: "1.0.0";
  contentDigest: Digest;
  renderSpecDigest: Digest;
  releaseDigest: Digest;
  assetInventoryDigest: Digest;
  /**
   * @minItems 1
   * @maxItems 128
   */
  outputs: [FormatOutput, ...FormatOutput[]];
}
export interface FormatOutput {
  format: "html" | "adaptiveDeck" | "pptx" | "docx" | "pdf" | "png" | "jpeg" | "remotion";
  path: RelativePath;
  digest: Digest;
  mediaType: string;
  byteSize: number;
  contentDigest: Digest;
  adapter: string;
}
export interface ReleasePlan {
  schemaVersion: "1.0.0";
  contentDigest: Digest;
  renderSpecDigest: Digest;
  approvalDigest: Digest;
  domainDigest: Digest;
  styleDigest: Digest;
  voiceDigest: Digest;
  releaseDigest: Digest;
  /**
   * @minItems 1
   * @maxItems 8
   */
  formats:
    | ["html" | "adaptiveDeck" | "pptx" | "docx" | "pdf" | "png" | "jpeg" | "remotion"]
    | [
        "html" | "adaptiveDeck" | "pptx" | "docx" | "pdf" | "png" | "jpeg" | "remotion",
        "html" | "adaptiveDeck" | "pptx" | "docx" | "pdf" | "png" | "jpeg" | "remotion"
      ]
    | [
        "html" | "adaptiveDeck" | "pptx" | "docx" | "pdf" | "png" | "jpeg" | "remotion",
        "html" | "adaptiveDeck" | "pptx" | "docx" | "pdf" | "png" | "jpeg" | "remotion",
        "html" | "adaptiveDeck" | "pptx" | "docx" | "pdf" | "png" | "jpeg" | "remotion"
      ]
    | [
        "html" | "adaptiveDeck" | "pptx" | "docx" | "pdf" | "png" | "jpeg" | "remotion",
        "html" | "adaptiveDeck" | "pptx" | "docx" | "pdf" | "png" | "jpeg" | "remotion",
        "html" | "adaptiveDeck" | "pptx" | "docx" | "pdf" | "png" | "jpeg" | "remotion",
        "html" | "adaptiveDeck" | "pptx" | "docx" | "pdf" | "png" | "jpeg" | "remotion"
      ]
    | [
        "html" | "adaptiveDeck" | "pptx" | "docx" | "pdf" | "png" | "jpeg" | "remotion",
        "html" | "adaptiveDeck" | "pptx" | "docx" | "pdf" | "png" | "jpeg" | "remotion",
        "html" | "adaptiveDeck" | "pptx" | "docx" | "pdf" | "png" | "jpeg" | "remotion",
        "html" | "adaptiveDeck" | "pptx" | "docx" | "pdf" | "png" | "jpeg" | "remotion",
        "html" | "adaptiveDeck" | "pptx" | "docx" | "pdf" | "png" | "jpeg" | "remotion"
      ]
    | [
        "html" | "adaptiveDeck" | "pptx" | "docx" | "pdf" | "png" | "jpeg" | "remotion",
        "html" | "adaptiveDeck" | "pptx" | "docx" | "pdf" | "png" | "jpeg" | "remotion",
        "html" | "adaptiveDeck" | "pptx" | "docx" | "pdf" | "png" | "jpeg" | "remotion",
        "html" | "adaptiveDeck" | "pptx" | "docx" | "pdf" | "png" | "jpeg" | "remotion",
        "html" | "adaptiveDeck" | "pptx" | "docx" | "pdf" | "png" | "jpeg" | "remotion",
        "html" | "adaptiveDeck" | "pptx" | "docx" | "pdf" | "png" | "jpeg" | "remotion"
      ]
    | [
        "html" | "adaptiveDeck" | "pptx" | "docx" | "pdf" | "png" | "jpeg" | "remotion",
        "html" | "adaptiveDeck" | "pptx" | "docx" | "pdf" | "png" | "jpeg" | "remotion",
        "html" | "adaptiveDeck" | "pptx" | "docx" | "pdf" | "png" | "jpeg" | "remotion",
        "html" | "adaptiveDeck" | "pptx" | "docx" | "pdf" | "png" | "jpeg" | "remotion",
        "html" | "adaptiveDeck" | "pptx" | "docx" | "pdf" | "png" | "jpeg" | "remotion",
        "html" | "adaptiveDeck" | "pptx" | "docx" | "pdf" | "png" | "jpeg" | "remotion",
        "html" | "adaptiveDeck" | "pptx" | "docx" | "pdf" | "png" | "jpeg" | "remotion"
      ]
    | [
        "html" | "adaptiveDeck" | "pptx" | "docx" | "pdf" | "png" | "jpeg" | "remotion",
        "html" | "adaptiveDeck" | "pptx" | "docx" | "pdf" | "png" | "jpeg" | "remotion",
        "html" | "adaptiveDeck" | "pptx" | "docx" | "pdf" | "png" | "jpeg" | "remotion",
        "html" | "adaptiveDeck" | "pptx" | "docx" | "pdf" | "png" | "jpeg" | "remotion",
        "html" | "adaptiveDeck" | "pptx" | "docx" | "pdf" | "png" | "jpeg" | "remotion",
        "html" | "adaptiveDeck" | "pptx" | "docx" | "pdf" | "png" | "jpeg" | "remotion",
        "html" | "adaptiveDeck" | "pptx" | "docx" | "pdf" | "png" | "jpeg" | "remotion",
        "html" | "adaptiveDeck" | "pptx" | "docx" | "pdf" | "png" | "jpeg" | "remotion"
      ];
}
export interface Runbook {
  schemaVersion: "1.0.0";
  runbookId: Identifier;
  projectId: Identifier;
  updatedAt: IsoInstant;
  domainDigest: Digest | null;
  contentDigest: Digest | null;
  stage: Identifier;
  /**
   * @maxItems 20
   */
  gates:
    | []
    | [RunbookGate]
    | [RunbookGate, RunbookGate]
    | [RunbookGate, RunbookGate, RunbookGate]
    | [RunbookGate, RunbookGate, RunbookGate, RunbookGate]
    | [RunbookGate, RunbookGate, RunbookGate, RunbookGate, RunbookGate]
    | [RunbookGate, RunbookGate, RunbookGate, RunbookGate, RunbookGate, RunbookGate]
    | [RunbookGate, RunbookGate, RunbookGate, RunbookGate, RunbookGate, RunbookGate, RunbookGate]
    | [RunbookGate, RunbookGate, RunbookGate, RunbookGate, RunbookGate, RunbookGate, RunbookGate, RunbookGate]
    | [
        RunbookGate,
        RunbookGate,
        RunbookGate,
        RunbookGate,
        RunbookGate,
        RunbookGate,
        RunbookGate,
        RunbookGate,
        RunbookGate
      ]
    | [
        RunbookGate,
        RunbookGate,
        RunbookGate,
        RunbookGate,
        RunbookGate,
        RunbookGate,
        RunbookGate,
        RunbookGate,
        RunbookGate,
        RunbookGate
      ]
    | [
        RunbookGate,
        RunbookGate,
        RunbookGate,
        RunbookGate,
        RunbookGate,
        RunbookGate,
        RunbookGate,
        RunbookGate,
        RunbookGate,
        RunbookGate,
        RunbookGate
      ]
    | [
        RunbookGate,
        RunbookGate,
        RunbookGate,
        RunbookGate,
        RunbookGate,
        RunbookGate,
        RunbookGate,
        RunbookGate,
        RunbookGate,
        RunbookGate,
        RunbookGate,
        RunbookGate
      ]
    | [
        RunbookGate,
        RunbookGate,
        RunbookGate,
        RunbookGate,
        RunbookGate,
        RunbookGate,
        RunbookGate,
        RunbookGate,
        RunbookGate,
        RunbookGate,
        RunbookGate,
        RunbookGate,
        RunbookGate
      ]
    | [
        RunbookGate,
        RunbookGate,
        RunbookGate,
        RunbookGate,
        RunbookGate,
        RunbookGate,
        RunbookGate,
        RunbookGate,
        RunbookGate,
        RunbookGate,
        RunbookGate,
        RunbookGate,
        RunbookGate,
        RunbookGate
      ]
    | [
        RunbookGate,
        RunbookGate,
        RunbookGate,
        RunbookGate,
        RunbookGate,
        RunbookGate,
        RunbookGate,
        RunbookGate,
        RunbookGate,
        RunbookGate,
        RunbookGate,
        RunbookGate,
        RunbookGate,
        RunbookGate,
        RunbookGate
      ]
    | [
        RunbookGate,
        RunbookGate,
        RunbookGate,
        RunbookGate,
        RunbookGate,
        RunbookGate,
        RunbookGate,
        RunbookGate,
        RunbookGate,
        RunbookGate,
        RunbookGate,
        RunbookGate,
        RunbookGate,
        RunbookGate,
        RunbookGate,
        RunbookGate
      ]
    | [
        RunbookGate,
        RunbookGate,
        RunbookGate,
        RunbookGate,
        RunbookGate,
        RunbookGate,
        RunbookGate,
        RunbookGate,
        RunbookGate,
        RunbookGate,
        RunbookGate,
        RunbookGate,
        RunbookGate,
        RunbookGate,
        RunbookGate,
        RunbookGate,
        RunbookGate
      ]
    | [
        RunbookGate,
        RunbookGate,
        RunbookGate,
        RunbookGate,
        RunbookGate,
        RunbookGate,
        RunbookGate,
        RunbookGate,
        RunbookGate,
        RunbookGate,
        RunbookGate,
        RunbookGate,
        RunbookGate,
        RunbookGate,
        RunbookGate,
        RunbookGate,
        RunbookGate,
        RunbookGate
      ]
    | [
        RunbookGate,
        RunbookGate,
        RunbookGate,
        RunbookGate,
        RunbookGate,
        RunbookGate,
        RunbookGate,
        RunbookGate,
        RunbookGate,
        RunbookGate,
        RunbookGate,
        RunbookGate,
        RunbookGate,
        RunbookGate,
        RunbookGate,
        RunbookGate,
        RunbookGate,
        RunbookGate,
        RunbookGate
      ]
    | [
        RunbookGate,
        RunbookGate,
        RunbookGate,
        RunbookGate,
        RunbookGate,
        RunbookGate,
        RunbookGate,
        RunbookGate,
        RunbookGate,
        RunbookGate,
        RunbookGate,
        RunbookGate,
        RunbookGate,
        RunbookGate,
        RunbookGate,
        RunbookGate,
        RunbookGate,
        RunbookGate,
        RunbookGate,
        RunbookGate
      ];
  /**
   * @minItems 1
   * @maxItems 20
   */
  stages:
    | [RunbookStage]
    | [RunbookStage, RunbookStage]
    | [RunbookStage, RunbookStage, RunbookStage]
    | [RunbookStage, RunbookStage, RunbookStage, RunbookStage]
    | [RunbookStage, RunbookStage, RunbookStage, RunbookStage, RunbookStage]
    | [RunbookStage, RunbookStage, RunbookStage, RunbookStage, RunbookStage, RunbookStage]
    | [RunbookStage, RunbookStage, RunbookStage, RunbookStage, RunbookStage, RunbookStage, RunbookStage]
    | [RunbookStage, RunbookStage, RunbookStage, RunbookStage, RunbookStage, RunbookStage, RunbookStage, RunbookStage]
    | [
        RunbookStage,
        RunbookStage,
        RunbookStage,
        RunbookStage,
        RunbookStage,
        RunbookStage,
        RunbookStage,
        RunbookStage,
        RunbookStage
      ]
    | [
        RunbookStage,
        RunbookStage,
        RunbookStage,
        RunbookStage,
        RunbookStage,
        RunbookStage,
        RunbookStage,
        RunbookStage,
        RunbookStage,
        RunbookStage
      ]
    | [
        RunbookStage,
        RunbookStage,
        RunbookStage,
        RunbookStage,
        RunbookStage,
        RunbookStage,
        RunbookStage,
        RunbookStage,
        RunbookStage,
        RunbookStage,
        RunbookStage
      ]
    | [
        RunbookStage,
        RunbookStage,
        RunbookStage,
        RunbookStage,
        RunbookStage,
        RunbookStage,
        RunbookStage,
        RunbookStage,
        RunbookStage,
        RunbookStage,
        RunbookStage,
        RunbookStage
      ]
    | [
        RunbookStage,
        RunbookStage,
        RunbookStage,
        RunbookStage,
        RunbookStage,
        RunbookStage,
        RunbookStage,
        RunbookStage,
        RunbookStage,
        RunbookStage,
        RunbookStage,
        RunbookStage,
        RunbookStage
      ]
    | [
        RunbookStage,
        RunbookStage,
        RunbookStage,
        RunbookStage,
        RunbookStage,
        RunbookStage,
        RunbookStage,
        RunbookStage,
        RunbookStage,
        RunbookStage,
        RunbookStage,
        RunbookStage,
        RunbookStage,
        RunbookStage
      ]
    | [
        RunbookStage,
        RunbookStage,
        RunbookStage,
        RunbookStage,
        RunbookStage,
        RunbookStage,
        RunbookStage,
        RunbookStage,
        RunbookStage,
        RunbookStage,
        RunbookStage,
        RunbookStage,
        RunbookStage,
        RunbookStage,
        RunbookStage
      ]
    | [
        RunbookStage,
        RunbookStage,
        RunbookStage,
        RunbookStage,
        RunbookStage,
        RunbookStage,
        RunbookStage,
        RunbookStage,
        RunbookStage,
        RunbookStage,
        RunbookStage,
        RunbookStage,
        RunbookStage,
        RunbookStage,
        RunbookStage,
        RunbookStage
      ]
    | [
        RunbookStage,
        RunbookStage,
        RunbookStage,
        RunbookStage,
        RunbookStage,
        RunbookStage,
        RunbookStage,
        RunbookStage,
        RunbookStage,
        RunbookStage,
        RunbookStage,
        RunbookStage,
        RunbookStage,
        RunbookStage,
        RunbookStage,
        RunbookStage,
        RunbookStage
      ]
    | [
        RunbookStage,
        RunbookStage,
        RunbookStage,
        RunbookStage,
        RunbookStage,
        RunbookStage,
        RunbookStage,
        RunbookStage,
        RunbookStage,
        RunbookStage,
        RunbookStage,
        RunbookStage,
        RunbookStage,
        RunbookStage,
        RunbookStage,
        RunbookStage,
        RunbookStage,
        RunbookStage
      ]
    | [
        RunbookStage,
        RunbookStage,
        RunbookStage,
        RunbookStage,
        RunbookStage,
        RunbookStage,
        RunbookStage,
        RunbookStage,
        RunbookStage,
        RunbookStage,
        RunbookStage,
        RunbookStage,
        RunbookStage,
        RunbookStage,
        RunbookStage,
        RunbookStage,
        RunbookStage,
        RunbookStage,
        RunbookStage
      ]
    | [
        RunbookStage,
        RunbookStage,
        RunbookStage,
        RunbookStage,
        RunbookStage,
        RunbookStage,
        RunbookStage,
        RunbookStage,
        RunbookStage,
        RunbookStage,
        RunbookStage,
        RunbookStage,
        RunbookStage,
        RunbookStage,
        RunbookStage,
        RunbookStage,
        RunbookStage,
        RunbookStage,
        RunbookStage,
        RunbookStage
      ];
  /**
   * @maxItems 100
   */
  artifacts: RunbookArtifact[];
  /**
   * @maxItems 100
   */
  blockers: string[];
  nextAction: string;
}
export interface RunbookGate {
  name: Identifier;
  status: "pending" | "blocked" | "passed";
  evidencePath: RelativePath | null;
  evidenceDigest: Digest | null;
}
export interface RunbookStage {
  name: Identifier;
  status: "not_started" | "in_progress" | "blocked" | "complete";
  owner: string | null;
  dependencies: Identifier[];
  evidencePaths: RelativePath[];
}
export interface RunbookArtifact {
  path: RelativePath;
  digest: Digest;
  mediaType: string;
  stage: Identifier;
}
export interface GenerationRequest {
  schemaVersion: "1.0.0";
  id: string;
  name: string;
  kind: "company" | "customer" | "topic" | "framework" | "repository" | "tool";
  brief: string;
  audience?: string;
  /**
   * @maxItems 20
   */
  sources:
    | []
    | [string]
    | [string, string]
    | [string, string, string]
    | [string, string, string, string]
    | [string, string, string, string, string]
    | [string, string, string, string, string, string]
    | [string, string, string, string, string, string, string]
    | [string, string, string, string, string, string, string, string]
    | [string, string, string, string, string, string, string, string, string]
    | [string, string, string, string, string, string, string, string, string, string]
    | [string, string, string, string, string, string, string, string, string, string, string]
    | [string, string, string, string, string, string, string, string, string, string, string, string]
    | [string, string, string, string, string, string, string, string, string, string, string, string, string]
    | [string, string, string, string, string, string, string, string, string, string, string, string, string, string]
    | [
        string,
        string,
        string,
        string,
        string,
        string,
        string,
        string,
        string,
        string,
        string,
        string,
        string,
        string,
        string
      ]
    | [
        string,
        string,
        string,
        string,
        string,
        string,
        string,
        string,
        string,
        string,
        string,
        string,
        string,
        string,
        string,
        string
      ]
    | [
        string,
        string,
        string,
        string,
        string,
        string,
        string,
        string,
        string,
        string,
        string,
        string,
        string,
        string,
        string,
        string,
        string
      ]
    | [
        string,
        string,
        string,
        string,
        string,
        string,
        string,
        string,
        string,
        string,
        string,
        string,
        string,
        string,
        string,
        string,
        string,
        string
      ]
    | [
        string,
        string,
        string,
        string,
        string,
        string,
        string,
        string,
        string,
        string,
        string,
        string,
        string,
        string,
        string,
        string,
        string,
        string,
        string
      ]
    | [
        string,
        string,
        string,
        string,
        string,
        string,
        string,
        string,
        string,
        string,
        string,
        string,
        string,
        string,
        string,
        string,
        string,
        string,
        string,
        string
      ];
  /**
   * @maxItems 40
   */
  libraryPaths: string[];
  voiceProfile: string;
  speed: number;
  /**
   * @minItems 1
   * @maxItems 8
   */
  formats:
    | ["html" | "adaptiveDeck" | "pptx" | "docx" | "pdf" | "png" | "jpeg" | "remotion"]
    | [
        "html" | "adaptiveDeck" | "pptx" | "docx" | "pdf" | "png" | "jpeg" | "remotion",
        "html" | "adaptiveDeck" | "pptx" | "docx" | "pdf" | "png" | "jpeg" | "remotion"
      ]
    | [
        "html" | "adaptiveDeck" | "pptx" | "docx" | "pdf" | "png" | "jpeg" | "remotion",
        "html" | "adaptiveDeck" | "pptx" | "docx" | "pdf" | "png" | "jpeg" | "remotion",
        "html" | "adaptiveDeck" | "pptx" | "docx" | "pdf" | "png" | "jpeg" | "remotion"
      ]
    | [
        "html" | "adaptiveDeck" | "pptx" | "docx" | "pdf" | "png" | "jpeg" | "remotion",
        "html" | "adaptiveDeck" | "pptx" | "docx" | "pdf" | "png" | "jpeg" | "remotion",
        "html" | "adaptiveDeck" | "pptx" | "docx" | "pdf" | "png" | "jpeg" | "remotion",
        "html" | "adaptiveDeck" | "pptx" | "docx" | "pdf" | "png" | "jpeg" | "remotion"
      ]
    | [
        "html" | "adaptiveDeck" | "pptx" | "docx" | "pdf" | "png" | "jpeg" | "remotion",
        "html" | "adaptiveDeck" | "pptx" | "docx" | "pdf" | "png" | "jpeg" | "remotion",
        "html" | "adaptiveDeck" | "pptx" | "docx" | "pdf" | "png" | "jpeg" | "remotion",
        "html" | "adaptiveDeck" | "pptx" | "docx" | "pdf" | "png" | "jpeg" | "remotion",
        "html" | "adaptiveDeck" | "pptx" | "docx" | "pdf" | "png" | "jpeg" | "remotion"
      ]
    | [
        "html" | "adaptiveDeck" | "pptx" | "docx" | "pdf" | "png" | "jpeg" | "remotion",
        "html" | "adaptiveDeck" | "pptx" | "docx" | "pdf" | "png" | "jpeg" | "remotion",
        "html" | "adaptiveDeck" | "pptx" | "docx" | "pdf" | "png" | "jpeg" | "remotion",
        "html" | "adaptiveDeck" | "pptx" | "docx" | "pdf" | "png" | "jpeg" | "remotion",
        "html" | "adaptiveDeck" | "pptx" | "docx" | "pdf" | "png" | "jpeg" | "remotion",
        "html" | "adaptiveDeck" | "pptx" | "docx" | "pdf" | "png" | "jpeg" | "remotion"
      ]
    | [
        "html" | "adaptiveDeck" | "pptx" | "docx" | "pdf" | "png" | "jpeg" | "remotion",
        "html" | "adaptiveDeck" | "pptx" | "docx" | "pdf" | "png" | "jpeg" | "remotion",
        "html" | "adaptiveDeck" | "pptx" | "docx" | "pdf" | "png" | "jpeg" | "remotion",
        "html" | "adaptiveDeck" | "pptx" | "docx" | "pdf" | "png" | "jpeg" | "remotion",
        "html" | "adaptiveDeck" | "pptx" | "docx" | "pdf" | "png" | "jpeg" | "remotion",
        "html" | "adaptiveDeck" | "pptx" | "docx" | "pdf" | "png" | "jpeg" | "remotion",
        "html" | "adaptiveDeck" | "pptx" | "docx" | "pdf" | "png" | "jpeg" | "remotion"
      ]
    | [
        "html" | "adaptiveDeck" | "pptx" | "docx" | "pdf" | "png" | "jpeg" | "remotion",
        "html" | "adaptiveDeck" | "pptx" | "docx" | "pdf" | "png" | "jpeg" | "remotion",
        "html" | "adaptiveDeck" | "pptx" | "docx" | "pdf" | "png" | "jpeg" | "remotion",
        "html" | "adaptiveDeck" | "pptx" | "docx" | "pdf" | "png" | "jpeg" | "remotion",
        "html" | "adaptiveDeck" | "pptx" | "docx" | "pdf" | "png" | "jpeg" | "remotion",
        "html" | "adaptiveDeck" | "pptx" | "docx" | "pdf" | "png" | "jpeg" | "remotion",
        "html" | "adaptiveDeck" | "pptx" | "docx" | "pdf" | "png" | "jpeg" | "remotion",
        "html" | "adaptiveDeck" | "pptx" | "docx" | "pdf" | "png" | "jpeg" | "remotion"
      ];
  mode: "guided" | "auto";
  brandUrl?: string;
  distribution?: ContentDistribution;
}
export interface RenderRevision {
  schemaVersion: "1.0.0";
  projectId: string;
  title: string;
  year: number;
  number: number;
  createdAt: IsoInstant;
  pipeline: "legacy-template" | "core-release";
  status: "current" | "superseded" | "rejected";
  source: RelativePath;
  contentDigest?: Digest;
  /**
   * @minItems 1
   * @maxItems 40
   */
  outputs: [RevisionOutput, ...RevisionOutput[]];
  /**
   * @maxItems 40
   */
  notes: string[];
}
export interface RevisionOutput {
  path: string;
  role: "video" | "video-raw" | "captions" | "presentation" | "metadata";
  digest: Digest;
  byteSize: number;
  mediaType: string;
  durationSeconds?: number;
  width?: number;
  height?: number;
  voice?: RevisionVoice;
  captions?: string;
  releaseDigest?: Digest;
  package?: RelativePath;
  /**
   * @maxItems 80
   */
  scenes?: {
    id: Identifier;
    startSeconds: number;
    endSeconds: number;
  }[];
}
export interface RevisionVoice {
  engine: "kokoro_onnx" | "kokoro" | "edge-neural" | "windows-sapi" | "unknown";
  profileId?: string;
  voiceName?: string;
}
