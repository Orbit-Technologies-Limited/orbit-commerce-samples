import { NextRequest } from 'next/server';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { clearFrameAncestorsCache } from '@orbitcommerce/sdk/csp';
import { config, middleware } from '../middleware';

afterEach(() => { clearFrameAncestorsCache(); vi.restoreAllMocks(); });
const request = (referer: string) => new NextRequest('https://plugin.test/widget?storeId=store-1&productId=p1', { headers: { referer } });

describe('the widget middleware', () => {
  it('runs on the widget only', () => {
    expect(config).toEqual({ matcher: ['/widget', '/widget/:path*'], runtime: 'nodejs' });
  });

  it('lets the platform storefronts frame it without a lookup', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch');
    const res = await middleware(request('https://acme.myorbitcommerce.net/products/oak-desk'));
    expect(res.headers.get('content-security-policy')).toContain('https://*.myorbitcommerce.net');
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('adds the shop\'s own domain when Orbit says it is that store\'s', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response(JSON.stringify({ data: { found: true, storeId: 'store-1' } })));
    const res = await middleware(request('https://shop.acme.example/products/oak-desk'));
    expect(res.headers.get('content-security-policy')).toContain('https://shop.acme.example');
  });

  it('leaves out a domain that belongs to another store', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response(JSON.stringify({ data: { found: true, storeId: 'store-2' } })));
    const res = await middleware(request('https://other.example/products/x'));
    expect(res.headers.get('content-security-policy')).not.toContain('other.example');
  });
});
