import { existsSync } from 'node:fs';
import { mkdir, readFile, rename, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { digest, round } from './canonical.ts';
import { sourceDistribution, validate, validateContentAgainstDomain } from './contracts.ts';
import type { ContentIR, DomainPack } from './contracts.ts';
import { bindCanonicalInputs, indexProjectQc, projectIdOf } from './release.ts';
import { cosine, embedTexts, semanticModel } from './semantic.ts';
import { clean, sentences } from './text.ts';

// Semantic alignment ranking for internal and external audiences. Every claim, section, narration sentence, diagram label and
// evidence quote is embedded with the pinned local sentence model; claims and sections are ranked per audience profile by
// relevance to that audience's priorities, grounding in their own cited evidence and support for the decision. External
// readiness also requires that nothing cites, paraphrases or names material that exists only in internal sources.

const REPOSITORY_ROOT = fileURLToPath(new URL('../../../', import.meta.url));
const PROFILES = path.join(REPOSITORY_ROOT, 'library', 'assets', 'alignment', 'audience-profiles.json');

export type Audience = 'internal' | 'external';
type Distribution = 'public' | 'customer' | 'internal';
interface Profile { label: string; description: string; allowedDistributions: Distribution[]; intents: { id: string; text: string }[]; internalMarkers: string[] }

export const ALIGNMENT_THRESHOLDS = {
  weakGrounding: 0.45,
  leakSimilarity: 0.6,
  leakMargin: 0.08,
  visualAligned: 0.45,
  visualWeak: 0.3,
  lowRelevance: 0.18
} as const;

const clamp01 = (value: number) => Math.min(1, Math.max(0, value));
// MiniLM cosine for related executive sentences sits roughly between 0.1 (unrelated) and 0.6 (same point); scores map that span to 0-1.
const scale = (value: number) => clamp01((value - 0.1) / 0.5);
const statements = (text: string) => sentences(text).filter((part) => part.length >= 3);

/** On-screen text of a section visual: Excalidraw labels, Mermaid node and edge labels, or Marp text without markup. */
export function visualText(visual: { kind: string; source: string; caption?: string }): string {
  if (visual.kind === 'excalidraw') {
    try {
      const parsed = JSON.parse(visual.source) as unknown;
      const elements = (Array.isArray(parsed) ? parsed : (parsed as { elements?: unknown[] }).elements ?? []) as { text?: unknown; label?: { text?: unknown } }[];
      return elements.flatMap((element) => [element?.label?.text, element?.text]).filter((item): item is string => typeof item === 'string')
        .map((item) => clean(item.replace(/\n/g, ' '))).join('. ');
    } catch { return ''; }
  }
  if (visual.kind === 'mermaid') {
    return visual.source.split('\n').slice(1).filter((line) => !/^\s*(%%|classDef|class |style |linkStyle|click )/.test(line)).map((line) => {
      const labels = [...line.matchAll(/\["?([^\]"]+)"?\]|\("?([^)"]+)"?\)|\{"?([^}"]+)"?\}|"([^"]+)"|\|([^|]+)\|/g)].flatMap((match) => match.slice(1).filter(Boolean));
      const text = labels.length ? labels.join(' ') : line.replace(/\b(subgraph|end|section|title|direction|flowchart|graph|timeline|TD|TB|LR|RL|BT)\b/g, ' ').replace(/[-=.~>:;]+/g, ' ');
      return clean(text.replace(/<br\s*\/?>/gi, ' '));
    }).filter(Boolean).join('. ');
  }
  return clean(visual.source.replace(/<[^>]+>/g, ' ').replace(/^#+\s*/gm, '').replace(/^\s*[-*]\s+/gm, '').replace(/[|*_`>]+/g, ' ').replace(/-{3,}/g, ' '));
}

async function json<T>(file: string): Promise<T> {
  return JSON.parse(await readFile(file, 'utf8')) as T;
}

async function profiles(): Promise<Record<Audience, Profile>> {
  const parsed = await json<{ profiles: Record<Audience, Profile> }>(PROFILES);
  for (const audience of ['internal', 'external'] as const) if (!parsed.profiles[audience]?.intents?.length) throw new Error(`alignment_profile_missing: ${audience}`);
  return parsed.profiles;
}

const markerPattern = (marker: string) => new RegExp(`(^|[^a-z0-9])${marker.toLowerCase().replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}($|[^a-z0-9])`);
const COMMON = new Set(('the a an and or of to in on for with from by at as is are was were be been this that these those it its our your their we you they he she '
  + 'october november december january february march april may june july august september monday tuesday wednesday thursday friday '
  + 'proposed proposal status active green red yellow blocked not started progress health project use case decision approve next actions '
  + 'week signals risks risk account overview weekly update owner owners date dates target targets confirm also').split(' '));

export interface AlignmentOptions { canonical?: boolean }
type Timeline = { scenes: { id: string; kind: string; title: string; narration: string; decision: string; claims: string[]; visual: { kind: string; source: string; caption: string } | null }[] };

/** Ranks the release content (or canonical content before rendering) for both audiences and writes qc/alignment evidence. */
export async function rankAlignment(projectDirectory: string, options: AlignmentOptions = {}) {
  const project = path.resolve(projectDirectory);
  const useRelease = !options.canonical && existsSync(path.join(project, 'release', 'content-ir.json'));
  const base = path.join(project, useRelease ? 'release' : 'canonical');
  const domain = validate('DomainPack', await json(path.join(base, 'domain-pack.json')));
  const content = validate('ContentIR', await json(path.join(base, 'content-ir.json')));
  const timelineFile = path.join(project, 'release', 'outputs', 'remotion', 'timeline.json');
  const timeline = useRelease && existsSync(timelineFile) ? await json<Timeline>(timelineFile) : null;
  const report = await analyzeAlignment(project, domain, content, timeline, useRelease ? 'release' : 'canonical');
  await writeAlignment(project, report, 'alignment');
  return summarize(report, 'qc/alignment/report.md');
}

function summarize(report: Awaited<ReturnType<typeof analyzeAlignment>>, reportPath: string) {
  const brief = (audience: Audience) => ({ ready: report.audiences[audience].ready, readiness: report.audiences[audience].readiness,
    blockers: report.audiences[audience].blockers.length, warnings: report.audiences[audience].warnings.length });
  return { projectId: report.projectId, source: report.source, effectiveDistribution: report.effectiveDistribution,
    internal: brief('internal'), external: brief('external'), audiovisual: report.audiovisual.meanSimilarity, report: reportPath };
}

async function writeAlignment(project: string, report: Awaited<ReturnType<typeof analyzeAlignment>>, stem: string): Promise<void> {
  const out = path.join(project, 'qc', 'alignment');
  await mkdir(out, { recursive: true });
  await writeFile(path.join(out, `${stem}.json.tmp`), `${JSON.stringify(report, null, 2)}\n`);
  await rename(path.join(out, `${stem}.json.tmp`), path.join(out, `${stem}.json`));
  await writeFile(path.join(out, stem === 'alignment' ? 'report.md' : `${stem}.md`), alignmentMarkdown(report));
  await indexProjectQc(project);
}

async function analyzeAlignment(project: string, domain: DomainPack, content: ContentIR, timeline: Timeline | null, source: 'release' | 'canonical' | 'candidate') {
  const audienceProfiles = await profiles();
  const model = await semanticModel();

  const sources = new Map(domain.sources.map((source) => [source.sourceId, source]));
  const distributionOf = new Map(domain.sources.map((source) => [source.sourceId, sourceDistribution(source)]));
  const evidence = new Map(domain.evidence.map((span) => [span.evidenceId, span]));
  const evidenceDistribution = (evidenceId: string) => distributionOf.get(evidence.get(evidenceId)?.sourceId ?? '') ?? 'internal';
  const claimsById = new Map(content.claims.map((claim) => [claim.claimId, claim]));

  // One embedding pass over every distinct text keeps the run deterministic and fast.
  const texts: string[] = [];
  const indexOf = new Map<string, number>();
  const add = (text: string) => { const value = clean(text); if (!indexOf.has(value)) { indexOf.set(value, texts.length); texts.push(value); } return value; };
  for (const profile of Object.values(audienceProfiles)) for (const intent of profile.intents) add(intent.text);
  add(content.decision);
  for (const span of domain.evidence) add(span.quote);
  for (const claim of content.claims) add(claim.text);
  const sectionText = (section: ContentIR['sections'][number]) => `${section.title}. ${section.body}`;
  const surfaces: { kind: string; location: string; text: string }[] = [];
  const surface = (kind: string, location: string, value: string) => { for (const sentence of statements(value)) surfaces.push({ kind, location, text: add(sentence) }); };
  surface('title', 'title', content.title);
  surface('summary', 'summary', content.summary);
  surface('decision', 'decision', content.decision);
  for (const section of content.sections) {
    add(sectionText(section));
    surface('section-title', section.sectionId, section.title);
    surface('narration', section.sectionId, section.body);
    surface('speaker-notes', section.sectionId, section.speakerNotes);
    if (section.visual) {
      surface('visual', section.sectionId, section.visual.caption);
      for (const label of visualText(section.visual).split(/\.\s+/)) if (label.trim().length >= 3) surfaces.push({ kind: 'visual', location: section.sectionId, text: add(label) });
    }
  }
  const scenes = (timeline?.scenes ?? []).map((scene) => {
    // The title scene shows the headline and the decision callout; other scenes show their visual, or their evidence cards.
    const shown = scene.visual ? clean(`${scene.visual.caption}. ${visualText(scene.visual)}`)
      : scene.kind === 'title' ? clean(`${scene.title}. ${scene.decision}`) : clean([scene.title, ...scene.claims].join('. '));
    return { id: scene.id, kind: scene.kind, spoken: add(scene.narration || scene.title), shown: add(shown), visual: scene.visual?.kind ?? null };
  });
  const vectors = await embedTexts(texts);
  const vector = (text: string) => vectors[indexOf.get(clean(text))!];
  const sim = (a: string, b: string) => cosine(vector(a), vector(b));

  const eligibleQuotes = (audience: Audience) => domain.evidence.filter((span) => audienceProfiles[audience].allowedDistributions.includes(evidenceDistribution(span.evidenceId)));
  const internalQuotes = domain.evidence.filter((span) => evidenceDistribution(span.evidenceId) === 'internal');
  const relevance = (text: string, profile: Profile) => {
    let best = { id: profile.intents[0].id, value: -1 };
    for (const intent of profile.intents) { const value = sim(text, intent.text); if (value > best.value) best = { id: intent.id, value }; }
    return best;
  };
  const nearest = (text: string, spans: DomainPack['evidence']) => {
    let best: { span: DomainPack['evidence'][number] | null; value: number } = { span: null, value: -1 };
    for (const span of spans) { const value = sim(text, span.quote); if (value > best.value) best = { span, value }; }
    return best;
  };

  const audiences = {} as Record<Audience, ReturnType<typeof evaluate>>;
  function evaluate(audience: Audience) {
    const profile = audienceProfiles[audience];
    const allowed = new Set(profile.allowedDistributions);
    const eligibleSpans = eligibleQuotes(audience);
    const eligibleText = eligibleSpans.map((span) => span.quote.toLowerCase()).join('\n');
    const internalText = internalQuotes.map((span) => span.quote).join('\n');
    const blockers: string[] = [];
    const warnings: string[] = [];
    const claims = content.claims.map((claim) => {
      const ineligible = claim.evidenceIds.filter((id) => !allowed.has(evidenceDistribution(id)));
      const best = relevance(claim.text, profile);
      const support = claim.evidenceIds.reduce((sum, id) => sum + sim(claim.text, evidence.get(id)!.quote), 0) / Math.max(1, claim.evidenceIds.length);
      const decision = sim(claim.text, content.decision);
      const eligible = ineligible.length === 0;
      if (!eligible) blockers.push(`Claim ${claim.claimId} cites ${ineligible.length} internal-only evidence span(s): ${[...new Set(ineligible.map((id) => sources.get(evidence.get(id)!.sourceId)!.title))].join('; ')}.`);
      return { claimId: claim.claimId, text: claim.text, eligible, relevance: round(best.value), intent: best.id, support: round(support), decision: round(decision),
        score: eligible ? round(0.5 * scale(best.value) + 0.3 * scale(support) + 0.2 * scale(decision)) : 0, rank: 0 };
    }).sort((a, b) => b.score - a.score || a.claimId.localeCompare(b.claimId)).map((item, index) => ({ ...item, rank: index + 1 }));
    const claimScore = new Map(claims.map((claim) => [claim.claimId, claim]));

    const leakage: { location: string; kind: string; text: string; reason: string; similarity?: number; source?: string }[] = [];
    if (audience === 'external') {
      const markers = profile.internalMarkers.filter((marker) => !markerPattern(marker).test(eligibleText));
      for (const item of surfaces) {
        const lower = item.text.toLowerCase();
        const marker = markers.find((term) => markerPattern(term).test(lower));
        const internal = nearest(item.text, internalQuotes);
        const shareable = nearest(item.text, eligibleSpans);
        if (marker) leakage.push({ ...item, reason: `uses the internal term "${marker}"` });
        else if (internal.span && internal.value >= ALIGNMENT_THRESHOLDS.leakSimilarity && internal.value - shareable.value >= ALIGNMENT_THRESHOLDS.leakMargin) {
          leakage.push({ ...item, reason: 'restates internal-only evidence', similarity: round(internal.value), source: sources.get(internal.span.sourceId)!.title });
        }
      }
      for (const item of leakage) blockers.push(`${item.location} ${item.kind} ${item.reason}${item.source ? ` (${item.source}, similarity ${item.similarity})` : ''}: "${item.text.slice(0, 160)}"`);
      // Acronyms and multi-word names (people, products, programs) that only internal sources contain are review items; a public
      // mention of the same term clears them. Single capitalized words are too often ordinary vocabulary to flag.
      const terms = new Set<string>();
      for (const item of surfaces) {
        for (const match of item.text.matchAll(/\b[A-Z]{2,}[0-9]*\b|\b[A-Z][a-z]+(?:\s+[A-Z][a-z]+)+\b/g)) {
          const term = match[0];
          if (terms.has(term) || term.split(/\s+/).some((word) => COMMON.has(word.toLowerCase()))) continue;
          if (internalText.includes(term) && !eligibleText.includes(term.toLowerCase())) terms.add(term);
        }
      }
      if (terms.size) warnings.push(`Terms found only in internal sources: ${[...terms].sort().join(', ')}.`);
    }

    const sections = content.sections.map((section) => {
      const text = sectionText(section);
      const best = relevance(text, profile);
      const cited = section.claimIds.flatMap((id) => [claimsById.get(id)!.text, ...claimsById.get(id)!.evidenceIds.map((evidenceId) => evidence.get(evidenceId)!.quote)]);
      const bodySentences = statements(section.body);
      const grounding = bodySentences.map((sentence) => ({ sentence, value: cited.length ? Math.max(...cited.map((quote) => sim(sentence, quote))) : 0 }));
      const groundingMean = grounding.reduce((sum, item) => sum + item.value, 0) / Math.max(1, grounding.length);
      const decision = sim(text, content.decision);
      const eligibleClaims = section.claimIds.filter((id) => claimScore.get(id)?.eligible);
      const eligibleShare = section.claimIds.length ? eligibleClaims.length / section.claimIds.length : 1;
      const weak = grounding.filter((item) => item.value < ALIGNMENT_THRESHOLDS.weakGrounding);
      for (const item of weak) warnings.push(`${section.sectionId}: weakly grounded sentence (${round(item.value)}): "${item.sentence.slice(0, 160)}"`);
      if (best.value < ALIGNMENT_THRESHOLDS.lowRelevance) warnings.push(`${section.sectionId}: low relevance to ${audience} priorities (${round(best.value)}).`);
      return { sectionId: section.sectionId, title: section.title, relevance: round(best.value), intent: best.id, grounding: round(groundingMean), decision: round(decision),
        eligibleClaims: eligibleClaims.length, claims: section.claimIds.length, leakage: leakage.filter((item) => item.location === section.sectionId).length,
        score: round(eligibleShare * (0.4 * scale(best.value) + 0.35 * scale(groundingMean) + 0.25 * scale(decision))), rank: 0,
        weakSentences: weak.map((item) => ({ text: item.sentence, grounding: round(item.value) })) };
    }).sort((a, b) => b.score - a.score || a.sectionId.localeCompare(b.sectionId)).map((item, index) => ({ ...item, rank: index + 1 }));

    const narrationWords = content.sections.reduce((sum, section) => sum + section.body.split(/\s+/).filter(Boolean).length, 0);
    const leakedWords = leakage.filter((item) => item.kind === 'narration').reduce((sum, item) => sum + item.text.split(/\s+/).length, 0);
    const ineligibleWords = content.sections.filter((section) => section.claimIds.some((id) => !claimScore.get(id)?.eligible))
      .reduce((sum, section) => sum + section.body.split(/\s+/).filter(Boolean).length, 0);
    const readiness = narrationWords ? clamp01(1 - Math.max(leakedWords, ineligibleWords) / narrationWords) : 1;
    return {
      audience, label: profile.label, ready: blockers.length === 0, readiness: round(readiness), blockers, warnings,
      eligibleEvidence: eligibleSpans.length, totalEvidence: domain.evidence.length,
      leadClaim: claims.find((claim) => claim.eligible)?.claimId ?? null, recommendedOrder: sections.map((section) => section.sectionId),
      sections, claims, leakage
    };
  }
  audiences.internal = evaluate('internal');
  audiences.external = evaluate('external');

  const audiovisual = scenes.map((scene) => {
    const value = sim(scene.spoken, scene.shown);
    return { sceneId: scene.id, kind: scene.kind, visual: scene.visual, similarity: round(value),
      status: value >= ALIGNMENT_THRESHOLDS.visualAligned ? 'aligned' : value >= ALIGNMENT_THRESHOLDS.visualWeak ? 'weak' : 'misaligned' };
  });
  for (const scene of audiovisual.filter((item) => item.status === 'misaligned')) {
    for (const audience of ['internal', 'external'] as const) audiences[audience].warnings.push(`Scene ${scene.sceneId}: what is shown does not match what is said (${scene.similarity}).`);
  }
  const cited = content.citations.map((citation) => evidenceDistribution(citation.evidenceId));
  const derived: Audience = cited.every((value) => value !== 'internal') ? 'external' : 'internal';
  const report = {
    schemaVersion: '1.0.0', projectId: projectIdOf(project), generatedAt: new Date().toISOString(), source,
    contentDigest: digest(content), domainDigest: digest(domain), declaredDistribution: content.distribution ?? null, derivedDistribution: derived,
    effectiveDistribution: content.distribution ?? derived,
    model: { id: model.id, repository: model.repository, revision: model.revision, dimensions: model.dimensions },
    profiles: { path: 'library/assets/alignment/audience-profiles.json', digest: digest(audienceProfiles) }, thresholds: ALIGNMENT_THRESHOLDS,
    sources: domain.sources.map((source) => ({ sourceId: source.sourceId, title: source.title, host: new URL(source.canonicalUrl).hostname,
      distribution: sourceDistribution(source), basis: source.distribution ? 'explicit' : 'inferred-from-host' })),
    audiences,
    audiovisual: { status: timeline ? 'measured' : 'not-rendered', meanSimilarity: audiovisual.length ? round(audiovisual.reduce((sum, item) => sum + item.similarity, 0) / audiovisual.length) : null, scenes: audiovisual }
  };
  return report;
}

type AlignmentReport = { projectId: string; source: string; generatedAt: string; declaredDistribution: string | null; derivedDistribution: string; effectiveDistribution: string;
  model: { repository: string; revision: string };
  sources: { title: string; host: string; distribution: string; basis: string }[];
  audiences: Record<Audience, { label: string; ready: boolean; readiness: number; blockers: string[]; warnings: string[]; eligibleEvidence: number; totalEvidence: number; leadClaim: string | null;
    sections: { rank: number; sectionId: string; title: string; score: number; relevance: number; intent: string; grounding: number; decision: number; eligibleClaims: number; claims: number; leakage: number }[];
    claims: { rank: number; claimId: string; text: string; eligible: boolean; score: number; relevance: number; intent: string; support: number }[] }>;
  audiovisual: { status: string; meanSimilarity: number | null; scenes: { sceneId: string; visual: string | null; similarity: number; status: string }[] } };

const cell = (value: string) => value.replace(/\|/g, '\\|').replace(/\s+/g, ' ');

function alignmentMarkdown(report: AlignmentReport): string {
  const lines = ['---', `title: ${report.projectId} audience alignment`, 'description: Semantic alignment ranking of claims, sections and video scenes for internal and external audiences.', '---', '',
    `Analyzed the ${report.source} content on ${report.generatedAt.slice(0, 10)} with ${report.model.repository} at ${report.model.revision.slice(0, 8)}, run locally.`, '',
    `* Declared distribution: ${report.declaredDistribution ?? 'none'}`, `* Derived from cited sources: ${report.derivedDistribution}`, `* Evaluated as: **${report.effectiveDistribution}**`, '',
    '| Audience | Ready | Readiness | Blockers | Warnings | Shareable evidence |', '| --- | --- | --- | --- | --- | --- |',
    ...(['internal', 'external'] as const).map((audience) => { const item = report.audiences[audience];
      return `| ${item.label} | ${item.ready ? 'yes' : 'no'} | ${(item.readiness * 100).toFixed(0)}% | ${item.blockers.length} | ${item.warnings.length} | ${item.eligibleEvidence} of ${item.totalEvidence} |`; }),
    '', '## Sources', '', '| Source | Host | Distribution | Basis |', '| --- | --- | --- | --- |',
    ...report.sources.map((source) => `| ${cell(source.title)} | ${source.host} | ${source.distribution} | ${source.basis} |`), ''];
  for (const audience of ['internal', 'external'] as const) {
    const item = report.audiences[audience];
    lines.push(`## ${item.label}`, '', '### Section ranking', '', '| Rank | Section | Score | Relevance | Best-matching priority | Grounding | Decision | Eligible claims | Leakage |',
      '| --- | --- | --- | --- | --- | --- | --- | --- | --- |',
      ...item.sections.map((section) => `| ${section.rank} | ${cell(section.title)} | ${section.score.toFixed(2)} | ${section.relevance.toFixed(2)} | ${section.intent} | ${section.grounding.toFixed(2)} | ${section.decision.toFixed(2)} | ${section.eligibleClaims} of ${section.claims} | ${section.leakage} |`),
      '', '### Claim ranking', '', '| Rank | Claim | Score | Relevance | Priority | Evidence support | Eligible |', '| --- | --- | --- | --- | --- | --- | --- |',
      ...item.claims.map((claim) => `| ${claim.rank} | ${cell(claim.text.slice(0, 140))} | ${claim.score.toFixed(2)} | ${claim.relevance.toFixed(2)} | ${claim.intent} | ${claim.support.toFixed(2)} | ${claim.eligible ? 'yes' : 'no'} |`),
      '', '### Blockers', '', ...(item.blockers.length ? item.blockers.map((blocker) => `* ${blocker}`) : ['* None.']), '',
      '### Warnings', '', ...(item.warnings.length ? item.warnings.map((warning) => `* ${warning}`) : ['* None.']), '');
  }
  lines.push('## Video scenes: what is said versus what is shown', '');
  if (report.audiovisual.status !== 'measured') lines.push('The release has not been rendered, so scenes were not measured.', '');
  else lines.push('| Scene | Visual | Similarity | Status |', '| --- | --- | --- | --- |',
    ...report.audiovisual.scenes.map((scene) => `| ${scene.sceneId} | ${scene.visual ?? 'cards'} | ${scene.similarity.toFixed(2)} | ${scene.status} |`), '');
  lines.push('Scores are cosine similarities of local sentence embeddings, scaled to 0-1 for ranking. They measure semantic closeness, not truth; the ContentIR contract still binds every claim to verbatim evidence.', '');
  return `${lines.join('\n')}\n`;
}

/**
 * Aligns the canonical content for an audience. Internal sets the distribution so every output carries the Internal marking.
 * External keeps only claims whose evidence is shareable, drops sections left without claims, and refuses to write while any
 * remaining narration, title, note or visual label cites, restates or names internal-only material.
 */
export async function applyAlignment(projectDirectory: string, audience: Audience) {
  const project = path.resolve(projectDirectory);
  const canonical = path.join(project, 'canonical');
  const domain = validate('DomainPack', await json(path.join(canonical, 'domain-pack.json')));
  const content = validate('ContentIR', await json(path.join(canonical, 'content-ir.json')));
  let next: ContentIR = { ...content, distribution: audience };
  const removed: { claims: string[]; sections: string[] } = { claims: [], sections: [] };
  if (audience === 'external') {
    const allowed = new Set((await profiles()).external.allowedDistributions);
    const sources = new Map(domain.sources.map((source) => [source.sourceId, sourceDistribution(source)]));
    const spans = new Map(domain.evidence.map((span) => [span.evidenceId, span]));
    const shareable = (id: string) => allowed.has(sources.get(spans.get(id)?.sourceId ?? '') ?? 'internal');
    const claims = content.claims.filter((claim) => claim.evidenceIds.every(shareable));
    removed.claims = content.claims.filter((claim) => !claims.includes(claim)).map((claim) => claim.claimId);
    const kept = new Set(claims.map((claim) => claim.claimId));
    const sections = content.sections.map((section) => ({ ...section, claimIds: section.claimIds.filter((id) => kept.has(id)) })).filter((section) => section.claimIds.length);
    removed.sections = content.sections.filter((section) => !sections.some((item) => item.sectionId === section.sectionId)).map((section) => section.sectionId);
    if (!claims.length || !sections.length) throw new Error('alignment_external_no_shareable_content: no claims cite only public or customer evidence; author a separate external briefing from shareable sources');
    const evidenceIds = new Set(claims.flatMap((claim) => claim.evidenceIds));
    next = { ...next, claims: claims as ContentIR['claims'], sections: sections as ContentIR['sections'], citations: content.citations.filter((citation) => evidenceIds.has(citation.evidenceId)) as ContentIR['citations'] };
  }
  validateContentAgainstDomain({ ...next, domainDigest: digest(domain) }, domain);
  if (audience === 'external') {
    const candidate = await analyzeAlignment(project, domain, next, null, 'candidate');
    if (!candidate.audiences.external.ready) {
      await writeAlignment(project, candidate, 'external-candidate');
      throw new Error(`alignment_external_blocked: ${candidate.audiences.external.blockers.length} blocker(s) remain after removing internal-only claims; rewrite the sentences listed in qc/alignment/external-candidate.md or author a separate external briefing`);
    }
  }
  const staging = path.join(canonical, 'content-ir.json.alignment');
  await writeFile(staging, `${JSON.stringify(next, null, 2)}\n`);
  await rename(staging, path.join(canonical, 'content-ir.json'));
  const bound = await bindCanonicalInputs(project);
  const ranked = await rankAlignment(project, { canonical: true });
  return { audience, removedClaims: removed.claims, removedSections: removed.sections, releaseDigest: bound.releaseDigest, alignment: ranked };
}
