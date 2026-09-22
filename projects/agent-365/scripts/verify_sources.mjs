import {createHash} from 'node:crypto';
import {readFile, writeFile} from 'node:fs/promises';

const evidenceBytes = await readFile(new URL('../research/sources.json', import.meta.url));
const evidence = JSON.parse(evidenceBytes.toString('utf8'));
const digest = (value) => createHash('sha256').update(value).digest('hex');
const text = (value) => value.replace(/<[^>]+>/g, '').replace(/&amp;/g, '&')
  .replace(/&#39;|&apos;/g, "'").replace(/&quot;/g, '"').replace(/&nbsp;/g, ' ').replace(/\s+/g, ' ').trim();
const receipts = [];
for (const source of evidence.sources) {
  const url = new URL(source.url);
  if (url.protocol !== 'https:' || url.hostname !== 'learn.microsoft.com'
    || !/^\/en-us\/(?:microsoft-agent-365\/|office365\/servicedescriptions\/microsoft-agent-365\/)/.test(url.pathname)) {
    throw new Error(`Unexpected public source URL: ${source.id}`);
  }
  const response = await fetch(url, {redirect: 'error', signal: AbortSignal.timeout(30000)});
  if (!response.ok) throw new Error(`${source.id}: HTTP ${response.status}`);
  const bytes = Buffer.from(await response.arrayBuffer());
  if (bytes.length > 2_000_000) throw new Error(`${source.id}: unexpected source size`);
  const html = bytes.toString('utf8');
  const meta = (name) => new RegExp(`<meta name="${name.replaceAll('.', '\\.')}" content="([^"]+)"`).exec(html)?.[1];
  for (const [field, actual] of [
    ['revision', meta('git_commit_id')],
    ['documentDate', meta('ms.date')?.slice(0, 10)],
    ['modifiedDate', meta('updated_at')?.slice(0, 10)],
  ]) {
    if (source[field] !== actual) throw new Error(`${source.id}: ${field} changed; inspect and revalidate the claims before accepting ${actual}`);
  }
  const headings = Array.from(html.matchAll(/<h[1-6](?:\s[^>]*)?>([\s\S]*?)<\/h[1-6]>/g), (match) => ({
    title: text(match[1]), fragment: /\bid="([^"]+)"/.exec(match[0])?.[1] ?? null,
  })).filter((heading) => heading.fragment);
  receipts.push({sourceId: source.id, url: source.url, retrievedAt: new Date().toISOString(),
    revision: source.revision, documentDate: source.documentDate, modifiedDate: source.modifiedDate,
    responseSha256: digest(bytes), responseBytes: bytes.length, headings});
  console.log(`${source.id}: ${headings.map((heading) => heading.title).join(' | ')}`);
}
for (const claim of evidence.claims) {
  for (const sourceId of claim.sources) {
    const headings = receipts.find((receipt) => receipt.sourceId === sourceId).headings;
    const titles = claim.sources.length === 1 ? claim.locator.split(' / ') : claim.sourceLocators?.[sourceId];
    if (!titles?.length) throw new Error(`${claim.id}: missing source-specific locator for ${sourceId}`);
    for (const title of titles) {
      if (!headings.some((heading) => heading.title === title)) throw new Error(`${claim.id}: heading not found at ${sourceId}: ${title}`);
    }
  }
}
await writeFile(new URL('../qc/source-receipts.json', import.meta.url),
  `${JSON.stringify({evidenceSha256: digest(evidenceBytes), hashBasis: 'Exact sources.json file bytes',
    method: 'Public Microsoft Learn HTML; exact revision, date, and per-source heading matching; no article redistribution', receipts}, null, 2)}\n`);
