import { lookup } from 'node:dns/promises';
import { request } from 'node:https';
import type { IncomingMessage } from 'node:http';
import { checkServerIdentity } from 'node:tls';
import { createBrotliDecompress, createGunzip, createInflate } from 'node:zlib';
import ipaddr from 'ipaddr.js';
import { assetLimits } from './assets.ts';
import { sha256 } from './canonical.ts';

export function isPublicAddress(address: string): boolean {
  try { return ipaddr.process(address).range() === 'unicast'; }
  catch { return false; }
}

export function publicRasterUrl(input: string, expectedHost?: string): URL {
  const url = new URL(input);
  if (url.protocol !== 'https:' || url.username || url.password || url.hash || (url.port && url.port !== '443')
    || (expectedHost && url.hostname !== expectedHost)) throw new Error('unsafe_public_url');
  if (url.hostname === 'localhost' || url.hostname.endsWith('.localhost') || url.hostname.endsWith('.local') || !url.hostname.includes('.')) throw new Error('unsafe_public_host');
  const literal = url.hostname.replace(/^\[|\]$/g, '');
  if (ipaddr.isValid(literal) && !isPublicAddress(literal)) throw new Error('unsafe_public_address');
  return url;
}

export async function publicAddresses(hostname: string): Promise<{ address: string; family: number }[]> {
  const addresses = await lookup(hostname, { all: true, verbatim: true });
  if (!addresses.length || addresses.length > 32 || addresses.some((entry) => !isPublicAddress(entry.address))) throw new Error('unsafe_dns_result');
  return addresses;
}

interface Download { bytes: Buffer; location?: string; mediaType: string }

export async function consumeRasterResponse(response: IncomingMessage): Promise<Download> {
  return new Promise((resolve, reject) => {
    response.on('error', reject);
    response.on('aborted', () => reject(new Error('truncated_public_raster')));
    const status = response.statusCode ?? 0;
    if ([301, 302, 303, 307, 308].includes(status)) {
      const location = response.headers.location;
      response.destroy();
      if (!location) reject(new Error('redirect_without_location'));
      else resolve({ bytes: Buffer.alloc(0), location, mediaType: '' });
      return;
    }
    const mediaType = response.headers['content-type']?.split(';')[0].trim().toLowerCase() ?? '';
    const declaredLength = response.headers['content-length'] === undefined ? null : Number(response.headers['content-length']);
    if (status !== 200 || !['image/png', 'image/jpeg', 'image/webp'].includes(mediaType)
      || ![undefined, 'identity'].includes(response.headers['content-encoding'])
      || (declaredLength !== null && (!Number.isSafeInteger(declaredLength) || declaredLength < 0 || declaredLength > assetLimits.bytes))) {
      response.destroy();
      reject(new Error('unsupported_public_raster_response'));
      return;
    }
    const chunks: Buffer[] = [];
    let length = 0;
    response.on('data', (chunk: Buffer) => {
      length += chunk.length;
      if (length > assetLimits.bytes) { response.destroy(); reject(new Error('asset_byte_limit')); }
      else chunks.push(chunk);
    });
    response.on('end', () => {
      if (declaredLength !== null && declaredLength !== length) reject(new Error('truncated_public_raster'));
      else resolve({ bytes: Buffer.concat(chunks), mediaType });
    });
  });
}

async function download(url: URL, address: { address: string; family: number }, signal: AbortSignal): Promise<Download> {
  const response = await pinnedGet(url, address, signal, { Accept: 'image/png,image/jpeg,image/webp', 'Accept-Encoding': 'identity', 'User-Agent': 'a2swe-raster/1.0' });
  return consumeRasterResponse(response);
}

// Connects to the already-vetted public address while presenting and verifying the original hostname, so DNS cannot be rebound mid-request.
function pinnedGet(url: URL, address: { address: string; family: number }, signal: AbortSignal, headers: Record<string, string>): Promise<IncomingMessage> {
  return new Promise((resolve, reject) => {
    const connection = request({ hostname: address.address, family: address.family, servername: url.hostname,
      checkServerIdentity: (_hostname, certificate) => checkServerIdentity(url.hostname, certificate),
      port: 443, path: `${url.pathname}${url.search}`, method: 'GET', agent: false, signal,
      headers: { Host: url.host, ...headers }
    }, resolve);
    connection.on('error', reject);
    connection.end();
  });
}

function abortable<T>(work: Promise<T>, signal: AbortSignal): Promise<T> {
  return Promise.race([work, new Promise<never>((_resolve, reject) => signal.addEventListener('abort', () => reject(new Error('public_fetch_timeout')), { once: true }))]);
}

/** Fetches one bounded public HTTPS text document (HTML or CSS) through the same address pinning and redirect checks as rasters. */
export async function fetchPublicText(input: string, options: { mediaTypes: readonly string[]; accept: string; maxBytes: number; signal: AbortSignal }):
  Promise<{ text: string; finalUrl: string; mediaType: string; digest: string; retrievedAt: string }> {
  let url = publicRasterUrl(input);
  for (let redirects = 0; redirects <= 5; redirects++) {
    options.signal.throwIfAborted();
    const addresses = await abortable(publicAddresses(url.hostname), options.signal);
    const response = await pinnedGet(url, addresses[0], options.signal, { Accept: options.accept, 'Accept-Encoding': 'gzip, deflate, br', 'User-Agent': 'a2swe-brand/1.0' });
    const status = response.statusCode ?? 0;
    if ([301, 302, 303, 307, 308].includes(status)) {
      const location = response.headers.location;
      response.destroy();
      if (!location) throw new Error('redirect_without_location');
      url = publicRasterUrl(new URL(location, url).href);
      continue;
    }
    const mediaType = response.headers['content-type']?.split(';')[0].trim().toLowerCase() ?? '';
    if (status !== 200 || !options.mediaTypes.includes(mediaType)) { response.destroy(); throw new Error(`unsupported_public_text_response: ${status} ${mediaType || 'no-content-type'}`); }
    const encoding = String(response.headers['content-encoding'] ?? 'identity').toLowerCase();
    const decoder = encoding === 'gzip' ? createGunzip() : encoding === 'deflate' ? createInflate() : encoding === 'br' ? createBrotliDecompress() : encoding === 'identity' ? null : undefined;
    if (decoder === undefined) { response.destroy(); throw new Error(`unsupported_content_encoding: ${encoding}`); }
    const stream = decoder ? response.pipe(decoder) : response;
    const chunks: Buffer[] = [];
    let length = 0;
    for await (const chunk of stream as AsyncIterable<Buffer>) {
      length += chunk.length;
      if (length > options.maxBytes) { response.destroy(); throw new Error('public_text_byte_limit'); }
      chunks.push(chunk);
    }
    const bytes = Buffer.concat(chunks);
    return { text: bytes.toString('utf8'), finalUrl: url.href, mediaType, digest: sha256(bytes), retrievedAt: new Date().toISOString() };
  }
  throw new Error('redirect_limit');
}

export async function fetchPublicRaster(input: string): Promise<{ bytes: Buffer; finalUrl: string; originalUrl: string; retrievedAt: string; inputDigest: string }> {
  const original = publicRasterUrl(input);
  let url = original;
  const signal = AbortSignal.timeout(30000);
  for (let redirects = 0; redirects <= 3; redirects++) {
    signal.throwIfAborted();
    const addresses = await abortable(publicAddresses(url.hostname), signal);
    signal.throwIfAborted();
    const response = await download(url, addresses[0], signal);
    if (response.location) { url = publicRasterUrl(new URL(response.location, url).href, original.hostname); continue; }
    return { bytes: response.bytes, originalUrl: original.href, finalUrl: url.href, retrievedAt: new Date().toISOString(), inputDigest: sha256(response.bytes) };
  }
  throw new Error('redirect_limit');
}