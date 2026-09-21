export type CoreContract =
  | LibraryEntry
  | WorkItem
  | TaskResult
  | SourceDocument
  | DomainPack
  | AssetRequest
  | AssetRecord
  | RightsManifest
  | ContentIR
  | RenderSpec
  | ApprovalBundle
  | FormatParityManifest
  | ReleasePlan;
export type Identifier = string;
export type RelativePath = string;
export type Digest = string;
export type Date = string;
export type IsoInstant = string;

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
  rights: "unknown" | "reference_only" | "permitted";
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
  rights: "pending";
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
export interface RightsManifest {
  schemaVersion: "1.0.0";
  manifestId: Identifier;
  domainDigest: Digest;
  contentDigest: Digest;
  reviewedAt: IsoInstant;
  /**
   * @maxItems 100
   */
  selectedAssets: SelectedAssetRights[];
}
export interface SelectedAssetRights {
  assetId: Identifier;
  assetDigest: Digest;
  grantBasis: string;
  useScope: string;
  redistribution: "not_permitted" | "internal_only" | "permitted_with_attribution" | "permitted_without_attribution";
  expiresAt: Date | null;
  attribution: string;
  reviewerId: string;
  evidenceDigest: Digest;
  status: "pending" | "approved" | "rejected" | "expired";
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
}
export interface VoiceSpec {
  style: string;
  narration: string;
  externalTransfer: false;
}
export interface RenderSpec {
  schemaVersion: "1.0.0";
  renderId: Identifier;
  contentDigest: Digest;
  /**
   * @minItems 1
   * @maxItems 6
   */
  formats:
    | ["html" | "adaptiveDeck" | "pptx" | "docx" | "pdf" | "remotion"]
    | [
        "html" | "adaptiveDeck" | "pptx" | "docx" | "pdf" | "remotion",
        "html" | "adaptiveDeck" | "pptx" | "docx" | "pdf" | "remotion"
      ]
    | [
        "html" | "adaptiveDeck" | "pptx" | "docx" | "pdf" | "remotion",
        "html" | "adaptiveDeck" | "pptx" | "docx" | "pdf" | "remotion",
        "html" | "adaptiveDeck" | "pptx" | "docx" | "pdf" | "remotion"
      ]
    | [
        "html" | "adaptiveDeck" | "pptx" | "docx" | "pdf" | "remotion",
        "html" | "adaptiveDeck" | "pptx" | "docx" | "pdf" | "remotion",
        "html" | "adaptiveDeck" | "pptx" | "docx" | "pdf" | "remotion",
        "html" | "adaptiveDeck" | "pptx" | "docx" | "pdf" | "remotion"
      ]
    | [
        "html" | "adaptiveDeck" | "pptx" | "docx" | "pdf" | "remotion",
        "html" | "adaptiveDeck" | "pptx" | "docx" | "pdf" | "remotion",
        "html" | "adaptiveDeck" | "pptx" | "docx" | "pdf" | "remotion",
        "html" | "adaptiveDeck" | "pptx" | "docx" | "pdf" | "remotion",
        "html" | "adaptiveDeck" | "pptx" | "docx" | "pdf" | "remotion"
      ]
    | [
        "html" | "adaptiveDeck" | "pptx" | "docx" | "pdf" | "remotion",
        "html" | "adaptiveDeck" | "pptx" | "docx" | "pdf" | "remotion",
        "html" | "adaptiveDeck" | "pptx" | "docx" | "pdf" | "remotion",
        "html" | "adaptiveDeck" | "pptx" | "docx" | "pdf" | "remotion",
        "html" | "adaptiveDeck" | "pptx" | "docx" | "pdf" | "remotion",
        "html" | "adaptiveDeck" | "pptx" | "docx" | "pdf" | "remotion"
      ];
  theme: {
    name: string;
    background: string;
    foreground: string;
    accent: string;
    fontFamily: string;
  };
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
export interface ApprovalBundle {
  schemaVersion: "1.0.0";
  bundleId: Identifier;
  producerId: string;
  domainDigest: Digest;
  contentDigest: Digest;
  styleDigest: Digest;
  voiceDigest: Digest;
  releaseDigest: Digest;
  evidenceDigest: Digest;
  /**
   * @minItems 4
   * @maxItems 8
   */
  approvals:
    | [SignedApproval, SignedApproval, SignedApproval, SignedApproval]
    | [SignedApproval, SignedApproval, SignedApproval, SignedApproval, SignedApproval]
    | [SignedApproval, SignedApproval, SignedApproval, SignedApproval, SignedApproval, SignedApproval]
    | [SignedApproval, SignedApproval, SignedApproval, SignedApproval, SignedApproval, SignedApproval, SignedApproval]
    | [
        SignedApproval,
        SignedApproval,
        SignedApproval,
        SignedApproval,
        SignedApproval,
        SignedApproval,
        SignedApproval,
        SignedApproval
      ];
}
export interface SignedApproval {
  signature: string;
  statement: {
    schemaVersion: "1.0.0";
    reviewerId: string;
    scope: "domain_qa" | "domain" | "asset_rights" | "asset_visual" | "content" | "voice" | "style" | "release";
    subjectDigest: Digest;
    evidenceDigest: Digest;
    decision: "approve" | "reject";
    issuedAt: IsoInstant;
    expiresAt: IsoInstant;
  };
}
export interface FormatParityManifest {
  schemaVersion: "1.0.0";
  contentDigest: Digest;
  renderSpecDigest: Digest;
  releaseDigest: Digest;
  /**
   * @minItems 1
   * @maxItems 20
   */
  outputs:
    | [FormatOutput]
    | [FormatOutput, FormatOutput]
    | [FormatOutput, FormatOutput, FormatOutput]
    | [FormatOutput, FormatOutput, FormatOutput, FormatOutput]
    | [FormatOutput, FormatOutput, FormatOutput, FormatOutput, FormatOutput]
    | [FormatOutput, FormatOutput, FormatOutput, FormatOutput, FormatOutput, FormatOutput]
    | [FormatOutput, FormatOutput, FormatOutput, FormatOutput, FormatOutput, FormatOutput, FormatOutput]
    | [FormatOutput, FormatOutput, FormatOutput, FormatOutput, FormatOutput, FormatOutput, FormatOutput, FormatOutput]
    | [
        FormatOutput,
        FormatOutput,
        FormatOutput,
        FormatOutput,
        FormatOutput,
        FormatOutput,
        FormatOutput,
        FormatOutput,
        FormatOutput
      ]
    | [
        FormatOutput,
        FormatOutput,
        FormatOutput,
        FormatOutput,
        FormatOutput,
        FormatOutput,
        FormatOutput,
        FormatOutput,
        FormatOutput,
        FormatOutput
      ]
    | [
        FormatOutput,
        FormatOutput,
        FormatOutput,
        FormatOutput,
        FormatOutput,
        FormatOutput,
        FormatOutput,
        FormatOutput,
        FormatOutput,
        FormatOutput,
        FormatOutput
      ]
    | [
        FormatOutput,
        FormatOutput,
        FormatOutput,
        FormatOutput,
        FormatOutput,
        FormatOutput,
        FormatOutput,
        FormatOutput,
        FormatOutput,
        FormatOutput,
        FormatOutput,
        FormatOutput
      ]
    | [
        FormatOutput,
        FormatOutput,
        FormatOutput,
        FormatOutput,
        FormatOutput,
        FormatOutput,
        FormatOutput,
        FormatOutput,
        FormatOutput,
        FormatOutput,
        FormatOutput,
        FormatOutput,
        FormatOutput
      ]
    | [
        FormatOutput,
        FormatOutput,
        FormatOutput,
        FormatOutput,
        FormatOutput,
        FormatOutput,
        FormatOutput,
        FormatOutput,
        FormatOutput,
        FormatOutput,
        FormatOutput,
        FormatOutput,
        FormatOutput,
        FormatOutput
      ]
    | [
        FormatOutput,
        FormatOutput,
        FormatOutput,
        FormatOutput,
        FormatOutput,
        FormatOutput,
        FormatOutput,
        FormatOutput,
        FormatOutput,
        FormatOutput,
        FormatOutput,
        FormatOutput,
        FormatOutput,
        FormatOutput,
        FormatOutput
      ]
    | [
        FormatOutput,
        FormatOutput,
        FormatOutput,
        FormatOutput,
        FormatOutput,
        FormatOutput,
        FormatOutput,
        FormatOutput,
        FormatOutput,
        FormatOutput,
        FormatOutput,
        FormatOutput,
        FormatOutput,
        FormatOutput,
        FormatOutput,
        FormatOutput
      ]
    | [
        FormatOutput,
        FormatOutput,
        FormatOutput,
        FormatOutput,
        FormatOutput,
        FormatOutput,
        FormatOutput,
        FormatOutput,
        FormatOutput,
        FormatOutput,
        FormatOutput,
        FormatOutput,
        FormatOutput,
        FormatOutput,
        FormatOutput,
        FormatOutput,
        FormatOutput
      ]
    | [
        FormatOutput,
        FormatOutput,
        FormatOutput,
        FormatOutput,
        FormatOutput,
        FormatOutput,
        FormatOutput,
        FormatOutput,
        FormatOutput,
        FormatOutput,
        FormatOutput,
        FormatOutput,
        FormatOutput,
        FormatOutput,
        FormatOutput,
        FormatOutput,
        FormatOutput,
        FormatOutput
      ]
    | [
        FormatOutput,
        FormatOutput,
        FormatOutput,
        FormatOutput,
        FormatOutput,
        FormatOutput,
        FormatOutput,
        FormatOutput,
        FormatOutput,
        FormatOutput,
        FormatOutput,
        FormatOutput,
        FormatOutput,
        FormatOutput,
        FormatOutput,
        FormatOutput,
        FormatOutput,
        FormatOutput,
        FormatOutput
      ]
    | [
        FormatOutput,
        FormatOutput,
        FormatOutput,
        FormatOutput,
        FormatOutput,
        FormatOutput,
        FormatOutput,
        FormatOutput,
        FormatOutput,
        FormatOutput,
        FormatOutput,
        FormatOutput,
        FormatOutput,
        FormatOutput,
        FormatOutput,
        FormatOutput,
        FormatOutput,
        FormatOutput,
        FormatOutput,
        FormatOutput
      ];
}
export interface FormatOutput {
  format: "html" | "adaptiveDeck" | "pptx" | "docx" | "pdf" | "remotion";
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
  rightsDigest: Digest;
  domainDigest: Digest;
  styleDigest: Digest;
  voiceDigest: Digest;
  releaseDigest: Digest;
  /**
   * @minItems 1
   * @maxItems 6
   */
  formats:
    | ["html" | "adaptiveDeck" | "pptx" | "docx" | "pdf" | "remotion"]
    | [
        "html" | "adaptiveDeck" | "pptx" | "docx" | "pdf" | "remotion",
        "html" | "adaptiveDeck" | "pptx" | "docx" | "pdf" | "remotion"
      ]
    | [
        "html" | "adaptiveDeck" | "pptx" | "docx" | "pdf" | "remotion",
        "html" | "adaptiveDeck" | "pptx" | "docx" | "pdf" | "remotion",
        "html" | "adaptiveDeck" | "pptx" | "docx" | "pdf" | "remotion"
      ]
    | [
        "html" | "adaptiveDeck" | "pptx" | "docx" | "pdf" | "remotion",
        "html" | "adaptiveDeck" | "pptx" | "docx" | "pdf" | "remotion",
        "html" | "adaptiveDeck" | "pptx" | "docx" | "pdf" | "remotion",
        "html" | "adaptiveDeck" | "pptx" | "docx" | "pdf" | "remotion"
      ]
    | [
        "html" | "adaptiveDeck" | "pptx" | "docx" | "pdf" | "remotion",
        "html" | "adaptiveDeck" | "pptx" | "docx" | "pdf" | "remotion",
        "html" | "adaptiveDeck" | "pptx" | "docx" | "pdf" | "remotion",
        "html" | "adaptiveDeck" | "pptx" | "docx" | "pdf" | "remotion",
        "html" | "adaptiveDeck" | "pptx" | "docx" | "pdf" | "remotion"
      ]
    | [
        "html" | "adaptiveDeck" | "pptx" | "docx" | "pdf" | "remotion",
        "html" | "adaptiveDeck" | "pptx" | "docx" | "pdf" | "remotion",
        "html" | "adaptiveDeck" | "pptx" | "docx" | "pdf" | "remotion",
        "html" | "adaptiveDeck" | "pptx" | "docx" | "pdf" | "remotion",
        "html" | "adaptiveDeck" | "pptx" | "docx" | "pdf" | "remotion",
        "html" | "adaptiveDeck" | "pptx" | "docx" | "pdf" | "remotion"
      ];
}
