import { existsSync } from 'node:fs';
import { mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { sha256, windowStart } from './canonical.ts';
import { validate } from './contracts.ts';
import type { DomainPack } from './contracts.ts';

// Imports a LayeredCards account intake (CRM engagements, Success Hub, M365 summaries, public market and news)
// into a ready DomainPack whose every quote is a verbatim line of a hashed, locally stored source rendering.

interface Engagement { id?: string | null; title?: string | null; status?: string | null; owner?: string | null; engagementType?: string | null;
  engagementTpm?: string | null; stage?: string | null; executiveSummary?: string | null; createdOn?: string | null; modifiedOn?: string | null; url?: string | null }
interface UseCase { id?: string | null; name?: string | null; status?: string | null; health?: string | null; forecastedUsage?: string | null;
  targetGoLiveDate?: string | null; owner?: string | null; tags?: string[] | null; reason?: string | null; description?: string | null;
  createdOn?: string | null; modifiedOn?: string | null; url?: string | null }
interface Intake {
  id: string; asOf: string; observedAt: string;
  cls?: { account?: { name?: string | null; url?: string | null; parent?: string | null; primaryCapePm?: string | null; description?: string | null }; engagements?: Engagement[]; notes?: string };
  successhub?: { project?: { name?: string | null; manager?: string | null; health?: string | null; engagementLevel?: string | null; customerOrigin?: string | null;
    trueDownRisk?: boolean | null; useCaseCount?: number | null; stakeholderCount?: number | null; description?: string | null; url?: string | null } | null; useCases?: UseCase[]; notes?: string };
  m365?: { items?: { title?: string | null; date?: string | null; kind?: string | null; summary?: string | null; people?: string[] | null; link?: string | null }[]; notes?: string };
}
interface PublicFacts {
  company?: { name?: string | null; public?: boolean; ticker?: string | null; exchange?: string | null; ownership?: string | null; irUrl?: string | null };
  market?: { asOf?: string | null; last?: number | null; previousClose?: number | null; change?: number | null; changePct?: number | null; high52?: number | null;
    low52?: number | null; marketCap?: string | null; sources?: { title?: string; url?: string }[] } | null;
  news?: { sources?: { name?: string; url?: string; items?: { title?: string; date?: string; url?: string; summary?: string }[] }[] };
}
interface Theme { label?: string; colors?: Record<string, string>; palette?: Record<string, string | null> }
interface CardRow { id?: string; group?: string; date?: string | null; title?: string; values?: Record<string, unknown> }
interface CardSource { id?: string; title?: string; url?: string | null; date?: string | null; basis?: string | null }
interface CardData {
  package?: { asOf?: string; sources?: CardSource[]; evidence?: CardRow[];
    live?: { observedAt?: string; project?: NonNullable<Intake['successhub']>['project'] & { country?: string | null };
      useCases?: UseCase[]; clsAccount?: { name?: string | null; url?: string | null; parent?: string | null; primaryCapePm?: string | null; executiveSummary?: string | null };
      clsEngagement?: Engagement & { displayedStage?: string | null }; cautions?: string[] } };
}

// Tracker groups that carry account state; people rosters, read-me text, source registers and draft CRM copy stay out of the briefing evidence.
const TRACKER_GROUPS = ['Dashboard', 'Workstreams', 'RAID', 'Decisions', 'Actions', 'Milestones', 'Measures'];

/** Maps a LayeredCards card-data package (live CRM snapshot plus a dated engagement tracker) onto the account intake shape. */
function intakeFromCardData(card: CardData, customerId: string): { intake: Intake; tracker: { url: string | null; rows: CardRow[] } } {
  const live = card.package?.live;
  if (!live?.observedAt || !card.package?.asOf) throw new Error('card_data_missing_live_snapshot');
  const engagement = live.clsEngagement;
  const sources = card.package.sources ?? [];
  const signal = (source: CardSource) => ({ title: source.title ?? null, date: dateOnly(source.date) ?? source.date ?? null,
    kind: source.id?.startsWith('MAIL-') ? 'email' : 'teams message', summary: source.basis ?? null, people: null, link: source.url ?? null });
  return {
    intake: {
      id: customerId, asOf: card.package.asOf, observedAt: live.observedAt,
      cls: { account: live.clsAccount ? { ...live.clsAccount, description: live.clsAccount.executiveSummary } : undefined,
        engagements: engagement ? [{ ...engagement, stage: engagement.stage ?? engagement.displayedStage }] : [] },
      successhub: { project: live.project ?? null, useCases: live.useCases ?? [], notes: (live.cautions ?? []).join(' ') },
      m365: { items: sources.filter((source) => /^(TEAMS|MAIL)-/.test(source.id ?? '')).map(signal) }
    },
    tracker: { url: sources.find((source) => /engagement tracker/i.test(source.title ?? ''))?.url ?? null,
      rows: (card.package.evidence ?? []).filter((row) => TRACKER_GROUPS.includes(row.group ?? '')) }
  };
}

type Source = DomainPack['sources'][number];
type Evidence = DomainPack['evidence'][number];
type Claim = DomainPack['claims'][number];

const slug = (value: string) => value.toLowerCase().normalize('NFKD').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 48) || 'item';
const dateOnly = (value?: string | null) => (value && /^\d{4}-\d{2}-\d{2}/.test(value) ? value.slice(0, 10) : null);
const clean = (value: unknown) => String(value ?? '').replace(/\s+/g, ' ').trim();
const httpsUrl = (value?: string | null) => (value && /^https:\/\//.test(value) && !/[\s"]/.test(value) ? value : null);

function sentences(text: string): string[] {
  return Array.from(new Intl.Segmenter('en', { granularity: 'sentence' }).segment(text), (part) => clean(part.segment))
    .filter((part) => part.length >= 12).slice(0, 12).map((part) => part.slice(0, 3900));
}

function luminance(hex: string): number {
  const channel = (index: number) => {
    const value = parseInt(hex.slice(1 + index * 2, 3 + index * 2), 16) / 255;
    return value <= 0.03928 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * channel(0) + 0.7152 * channel(1) + 0.0722 * channel(2);
}
const contrast = (a: string, b: string) => { const [x, y] = [luminance(a), luminance(b)].sort((p, q) => q - p); return (x + 0.05) / (y + 0.05); };
const hex = (value: unknown) => (typeof value === 'string' && /^#[0-9a-fA-F]{6}$/.test(value) ? value.toUpperCase() : null);

/** Derives a dark, readable executive render theme from a brand palette; the brand accent is tinted until it reaches 4.5:1 on the background. */
export function accountTheme(theme: Theme, name: string) {
  const ordered = [theme.palette?.primary, theme.palette?.secondary, theme.palette?.accent, ...Object.values(theme.colors ?? {}), ...Object.values(theme.palette ?? {})];
  const colors = [...new Set(ordered.map(hex).filter((value): value is string => Boolean(value)))];
  const background = [...colors].sort((a, b) => luminance(a) - luminance(b)).find((value) => luminance(value) < 0.06) ?? '#0F172A';
  const tint = (color: string, amount: number) => `#${[1, 3, 5].map((offset) => Math.round(parseInt(color.slice(offset, offset + 2), 16) * (1 - amount) + 255 * amount)
    .toString(16).padStart(2, '0')).join('').toUpperCase()}`;
  let accent = '#F8FAFC';
  let best = Number.POSITIVE_INFINITY;
  // Prefer the brand hue that needs the least tint; neutral greys and near-whites only win when no brand color can be made legible.
  const saturation = (color: string) => { const channels = [1, 3, 5].map((offset) => parseInt(color.slice(offset, offset + 2), 16)); return Math.max(...channels) - Math.min(...channels); };
  for (const color of colors.filter((value) => value !== background && saturation(value) > 40)) {
    const step = [0, 0.1, 0.2, 0.3, 0.4, 0.5].find((amount) => contrast(tint(color, amount), background) >= 4.5);
    if (step !== undefined && step < best) { accent = tint(color, step); best = step; }
  }
  return { name: `${slug(name)}-executive`, background, foreground: '#FFFFFF', accent, fontFamily: 'Arial' };
}

interface Built { source: Source; text: string; evidence: Map<string, Evidence> }

/** Builds a ready DomainPack and its hashed source renderings from a LayeredCards customer folder. */
export async function importAccountIntake(kitCustomerDirectory: string, projectDirectory: string) {
  const kit = path.resolve(kitCustomerDirectory);
  const project = path.resolve(projectDirectory);
  const customer = JSON.parse(await readFile(path.join(kit, 'customer.json'), 'utf8')) as { id: string; theme?: string; brand?: { name?: string } };
  const card = existsSync(path.join(kit, 'intake.json')) ? null
    : intakeFromCardData(JSON.parse(await readFile(path.join(kit, 'card-data.json'), 'utf8')) as CardData, customer.id);
  const intake = card?.intake ?? JSON.parse(await readFile(path.join(kit, 'intake.json'), 'utf8')) as Intake;
  const facts = existsSync(path.join(kit, 'public.json')) ? JSON.parse(await readFile(path.join(kit, 'public.json'), 'utf8')) as PublicFacts : {};
  const themeFile = path.join(kit, '..', '..', 'themes', `${customer.theme ?? customer.id}.json`);
  const theme = existsSync(themeFile) ? JSON.parse(await readFile(themeFile, 'utf8')) as Theme : {};
  const domainId = slug(customer.id);
  if (domainId !== customer.id || intake.id !== customer.id) throw new Error('account_intake_identity_mismatch');
  const name = customer.brand?.name ?? intake.cls?.account?.name ?? customer.id;
  const retrievedAt = new Date(intake.observedAt).toISOString();
  const built: Built[] = [];
  const add = (sourceId: string, url: string | null, title: string, publisher: string, published: string | null, modified: string | null,
    fields: [string, unknown][], narrative: [string, string | null | undefined][] = []) => {
    if (!url) return null;
    const lines = fields.filter(([, value]) => value !== null && value !== undefined && clean(value) !== '').map(([key, value]) => `${key}: ${clean(value)}`);
    const prose = narrative.flatMap(([key, value]) => (value ? [`${key}:`, ...sentences(value)] : []));
    const text = `${[title, ...lines, ...prose].join('\n')}\n`;
    const contentHash = sha256(text);
    const evidence = new Map<string, Evidence>();
    const quote = (key: string, value: string) => {
      const evidenceId = `${sourceId}:${slug(key)}${evidence.has(`${sourceId}:${slug(key)}`) ? `-${evidence.size}` : ''}`;
      evidence.set(evidenceId, { evidenceId, sourceId, sourceDigest: contentHash, locator: key, quote: value, quoteDigest: sha256(value) });
      return evidenceId;
    };
    for (const line of lines) quote(line.slice(0, line.indexOf(':')), line);
    let section = '';
    for (const line of prose) {
      if (line.endsWith(':') && narrative.some(([key]) => `${key}:` === line)) { section = line.slice(0, -1); continue; }
      quote(section, line);
    }
    const source: Source = { schemaVersion: '1.0.0', sourceId, domainId, canonicalUrl: url, publisher, title: title.slice(0, 300),
      publicationDate: published, modifiedDate: modified, retrievedAt,
      dateEvidence: published || modified ? `Dates from the ${publisher} record fields captured in the account intake observed at ${retrievedAt}.`
        : `The ${publisher} record exposed no publication date; captured in the account intake observed at ${retrievedAt}.`, contentHash };
    built.push({ source, text, evidence });
    return { sourceId, evidence };
  };
  const account = intake.cls?.account;
  add('cls-account', httpsUrl(account?.url), `CLS account ${clean(account?.name)}`, 'CLS Engagements', null, null,
    [['Account', account?.name], ['Top parent', account?.parent], ['Primary CAPE PM', account?.primaryCapePm]], [['Account executive summary', account?.description]]);
  for (const [index, engagement] of (intake.cls?.engagements ?? []).entries()) {
    add(`cls-${String(index + 1).padStart(2, '0')}-${slug(clean(engagement.title))}`, httpsUrl(engagement.url), `CLS engagement ${clean(engagement.title)}`,
      'CLS Engagements', dateOnly(engagement.createdOn), dateOnly(engagement.modifiedOn),
      [['Engagement', engagement.title], ['Status', engagement.status], ['Type', engagement.engagementType], ['Stage', engagement.stage],
        ['Owner', engagement.owner], ['TPM', engagement.engagementTpm], ['Created', dateOnly(engagement.createdOn)], ['Modified', dateOnly(engagement.modifiedOn)]],
      [['Executive summary', engagement.executiveSummary]]);
  }
  const hubProject = intake.successhub?.project;
  if (hubProject) {
    add('successhub-project', httpsUrl(hubProject.url), `Success Hub project ${clean(hubProject.name)}`, 'Success Hub', null, null,
      [['Project', hubProject.name], ['Manager', hubProject.manager], ['Health', hubProject.health], ['Engagement level', hubProject.engagementLevel],
        ['Customer origin', hubProject.customerOrigin], ['True-down risk', hubProject.trueDownRisk === null || hubProject.trueDownRisk === undefined ? null : hubProject.trueDownRisk ? 'Yes' : 'No'],
        ['Use cases', hubProject.useCaseCount], ['Linked stakeholders', hubProject.stakeholderCount]], [['Project description', hubProject.description]]);
  }
  for (const [index, useCase] of (intake.successhub?.useCases ?? []).entries()) {
    add(`usecase-${String(index + 1).padStart(2, '0')}-${slug(clean(useCase.name))}`, httpsUrl(useCase.url), `Success Hub use case ${clean(useCase.name)}`,
      'Success Hub', dateOnly(useCase.createdOn), dateOnly(useCase.modifiedOn),
      [['Use case', useCase.name], ['Status', useCase.status], ['Health', useCase.health], ['Forecasted usage', useCase.forecastedUsage],
        ['Target go-live', useCase.targetGoLiveDate], ['Owner', useCase.owner], ['Tags', useCase.tags?.join(', ')], ['Reason', useCase.reason]],
      [['Use case description', useCase.description]]);
  }
  for (const [index, item] of (intake.m365?.items ?? []).entries()) {
    add(`m365-${String(index + 1).padStart(2, '0')}-${slug(clean(item.title))}`, httpsUrl(item.link), `${clean(item.kind) || 'item'}: ${clean(item.title)}`,
      'Microsoft 365 account intake', dateOnly(item.date), null,
      [['Signal', item.title], ['Date', item.date], ['Kind', item.kind], ['Summary (intake paraphrase)', item.summary], ['People', item.people?.length ? `${item.people.length} participants` : null]]);
  }
  const groups = new Map<string, CardRow[]>();
  for (const row of card?.tracker.rows ?? []) groups.set(row.group!, [...(groups.get(row.group!) ?? []), row]);
  for (const [group, rows] of groups) {
    // Each tracker row field becomes one verbatim line keyed by its local row ID, e.g. "R01 Finding / uncertainty: ...".
    add(`tracker-${slug(group)}`, httpsUrl(card?.tracker.url), `${name} engagement tracker: ${group}`, 'Account engagement tracker',
      dateOnly(rows[0].date), null, rows.flatMap((row) => Object.entries(row.values ?? {})
        .filter(([key]) => !/source|provenance|formula|related local/i.test(key)).map(([key, value]): [string, unknown] => [`${row.title} ${key}`, value])));
  }
  const market = facts.market;
  if (facts.company?.public && market?.last !== undefined && market?.last !== null) {
    add('public-market', httpsUrl(market.sources?.[0]?.url) ?? httpsUrl(facts.company.irUrl), `${clean(facts.company.name)} market snapshot`, 'Public market data',
      dateOnly(market.asOf), null,
      [['Ticker', facts.company.ticker ? `${facts.company.ticker} (${clean(facts.company.exchange)})` : null], ['Close', `${market.last} on ${market.asOf}`],
        ['Daily change', market.changePct === null || market.changePct === undefined ? null : `${market.change} (${market.changePct}%)`],
        ['52-week range', market.low52 && market.high52 ? `${market.low52} to ${market.high52}` : null], ['Market capitalization', market.marketCap]]);
  } else if (facts.company?.name) {
    add('public-company', httpsUrl(facts.company.irUrl), `${clean(facts.company.name)} company profile`, 'Public company data', null, null,
      [['Company', facts.company.name], ['Ownership', facts.company.ownership]]);
  }
  for (const publisher of facts.news?.sources ?? []) {
    for (const item of publisher.items ?? []) {
      add(`news-${dateOnly(item.date) ?? 'undated'}-${slug(clean(item.title)).slice(0, 32)}`, httpsUrl(item.url), clean(item.title), clean(publisher.name) || 'News',
        dateOnly(item.date), null, [['Headline', item.title], ['Date', item.date], ['Publisher', publisher.name], ['Summary (intake paraphrase)', item.summary]]);
    }
  }
  const seen = new Set<string>();
  const unique = built.filter((entry) => !seen.has(entry.source.sourceId) && seen.add(entry.source.sourceId));
  const sources = unique.map((entry) => entry.source);
  const evidence = unique.flatMap((entry) => [...entry.evidence.values()]);
  const field = (sourceId: string, key: string) => evidence.find((span) => span.sourceId === sourceId && span.locator === key);
  const claims: Claim[] = [];
  const claim = (claimId: string, wording: string, spans: (Evidence | undefined)[]) => {
    const ids = [...new Set(spans.filter((span): span is Evidence => Boolean(span)).map((span) => span.evidenceId))];
    if (ids.length) claims.push({ claimId, wording: wording.slice(0, 3900), evidenceIds: ids as Claim['evidenceIds'], disposition: 'supported' });
  };
  for (const entry of unique) {
    const id = entry.source.sourceId;
    const value = (key: string) => field(id, key)?.quote.slice(key.length + 2);
    if (id.startsWith('cls-') && id !== 'cls-account') {
      claim(`fact-${id}`, `${value('Engagement')}: ${value('Status')}${value('Stage') ? `, stage ${value('Stage')}` : ''}${value('Owner') ? `, owner ${value('Owner')}` : ''}.`,
        ['Engagement', 'Status', 'Stage', 'Owner'].map((key) => field(id, key)));
    } else if (id === 'successhub-project') {
      claim('fact-successhub-project', `${value('Project')} health is ${value('Health') ?? 'not recorded'}${value('True-down risk') ? `; true-down risk ${value('True-down risk')}` : ''}.`,
        ['Project', 'Health', 'True-down risk'].map((key) => field(id, key)));
    } else if (id.startsWith('usecase-')) {
      claim(`fact-${id}`, `${value('Use case')}: ${value('Status') ?? 'status not recorded'}${value('Health') ? `, health ${value('Health')}` : ''}${value('Target go-live') ? `, target go-live ${value('Target go-live')}` : ''}.`,
        ['Use case', 'Status', 'Health', 'Target go-live'].map((key) => field(id, key)));
    } else if (id.startsWith('m365-')) {
      claim(`fact-${id}`, `${value('Date')} ${value('Kind')}: ${value('Summary (intake paraphrase)') ?? value('Signal')}`,
        ['Signal', 'Date', 'Kind', 'Summary (intake paraphrase)'].map((key) => field(id, key)));
    } else if (id === 'public-market') {
      claim('fact-public-market', `${value('Ticker')} closed at ${value('Close')}${value('Daily change') ? `, ${value('Daily change')}` : ''}; 52-week range ${value('52-week range')}.`,
        ['Ticker', 'Close', 'Daily change', '52-week range'].map((key) => field(id, key)));
    } else if (id.startsWith('news-')) {
      claim(`fact-${id}`, `${value('Date')}: ${value('Headline')} (${value('Publisher')}).`, ['Headline', 'Date', 'Publisher'].map((key) => field(id, key)));
    }
  }
  const domain = validate('DomainPack', {
    schemaVersion: '1.0.0', domainId, kind: 'customer', canonicalName: name, asOf: intake.asOf, windowStart: windowStart(intake.asOf), timezone: 'UTC',
    state: 'ready', sources, evidence, claims,
    knownGaps: [
      `CRM, Success Hub and Microsoft 365 facts reflect the read-only account intake observed at ${retrievedAt}; later record changes are not included.`,
      'Microsoft 365 and news summaries are intake paraphrases, not verbatim message or article text.',
      ...(card ? ['Engagement tracker rows are a dated working snapshot; proposed stages, owners and dates in the tracker are not CRM records.'] : []),
      ...[intake.cls?.notes, intake.successhub?.notes, intake.m365?.notes].filter((note): note is string => Boolean(note?.trim())).map((note) => `Intake scope note: ${clean(note).slice(0, 900)}`)
    ]
  });
  const canonical = path.join(project, 'canonical');
  await rm(path.join(canonical, 'sources'), { recursive: true, force: true });
  await mkdir(path.join(canonical, 'sources'), { recursive: true });
  for (const entry of unique) await writeFile(path.join(canonical, 'sources', `${entry.source.sourceId}.txt`), entry.text);
  await writeFile(path.join(canonical, 'domain-pack.json'), `${JSON.stringify(domain, null, 2)}\n`);
  const renderTheme = accountTheme(theme, name);
  await writeFile(path.join(canonical, 'render-theme.json'), `${JSON.stringify(renderTheme, null, 2)}\n`);
  return { domainId, name, asOf: intake.asOf, sources: sources.length, evidence: evidence.length, claims: claims.length, theme: renderTheme,
    domain: path.join(canonical, 'domain-pack.json') };
}
