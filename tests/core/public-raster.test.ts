import assert from 'node:assert/strict';
import test from 'node:test';
import { PassThrough } from 'node:stream';
import type { IncomingMessage } from 'node:http';
import { consumeRasterResponse, isPublicAddress, publicRasterUrl } from '../../packages/core/src/public-raster.ts';

test('public raster acquisition denies private, mapped, reserved and metadata addresses', () => {
  for (const address of ['127.0.0.1', '10.1.2.3', '172.16.1.2', '192.168.1.1', '169.254.169.254', '0.0.0.0',
    '100.64.0.1', '192.0.2.1', '198.51.100.1', '203.0.113.1', '224.0.0.1', '255.255.255.255',
    '::1', '::', 'fe80::1', 'fc00::1', '2001:db8::1', '::ffff:127.0.0.1', 'not-an-address']) {
    assert.equal(isPublicAddress(address), false, address);
  }
  assert.equal(isPublicAddress('1.1.1.1'), true);
  assert.equal(isPublicAddress('2606:4700:4700::1111'), true);
});

test('public raster URL policy rejects credentials, schemes, ports and cross-host redirects', () => {
  for (const url of ['http://example.com/a.png', 'https://user:secret@example.com/a.png', 'https://example.com:8443/a.png',
    'file:///a.png', 'https://127.1/a.png', 'https://0x7f000001/a.png', 'https://2130706433/a.png',
    'https://[::1]/a.png', 'https://localhost/a.png', 'https://machine.local/a.png', 'https://example.com/a.png#fragment']) {
    assert.throws(() => publicRasterUrl(url), /unsafe/);
  }
  assert.throws(() => publicRasterUrl('https://other.example/a.png', 'example.com'), /unsafe_public_url/);
  assert.equal(publicRasterUrl('https://example.com/a.png', 'example.com').hostname, 'example.com');
});

test('synthetic raster response streams enforce byte, encoding, type and truncation boundaries', async () => {
  function response(headers: Record<string, string> = {}, status = 200) {
    return Object.assign(new PassThrough(), { statusCode: status, headers: { 'content-type': 'image/png', ...headers } }) as unknown as IncomingMessage;
  }
  const valid = response({ 'content-length': '3' });
  const accepted = consumeRasterResponse(valid);
  (valid as unknown as PassThrough).end(Buffer.from('png'));
  assert.equal((await accepted).bytes.toString(), 'png');
  await assert.rejects(consumeRasterResponse(response({ 'content-encoding': 'gzip' })), /unsupported/);
  await assert.rejects(consumeRasterResponse(response({ 'content-type': 'image/svg+xml' })), /unsupported/);
  await assert.rejects(consumeRasterResponse(response({ 'content-length': '999999999' })), /unsupported/);
  await assert.rejects(consumeRasterResponse(response({ 'content-length': 'invalid' })), /unsupported/);
  const chunked = response();
  const oversized = consumeRasterResponse(chunked);
  (chunked as unknown as PassThrough).end(Buffer.alloc(16 * 1024 * 1024 + 1));
  await assert.rejects(oversized, /asset_byte_limit/);
  const truncated = response({ 'content-length': '10' });
  const incomplete = consumeRasterResponse(truncated);
  (truncated as unknown as PassThrough).end(Buffer.from('short'));
  await assert.rejects(incomplete, /truncated/);
  assert.equal((await consumeRasterResponse(response({ location: '/next.png' }, 302))).location, '/next.png');
  await assert.rejects(consumeRasterResponse(response({}, 302)), /redirect_without_location/);
});
