import { randomUUID } from 'node:crypto';
import { describe, expect, it, vi } from 'vitest';
import manifest from '../plugin.json';

const verifyToken = vi.fn();
vi.mock('@orbitcommerce/sdk', async (importOriginal) => {
  const real = await importOriginal<typeof import('@orbitcommerce/sdk')>();
  return { ...real, OrbitClient: { verifyToken } };
});
const { GET } = await import('../app/api/events/route');
const { recordEvent } = await import('../lib/events');

const asking = (token?: string) => new Request('https://plugin.test/api/events', { headers: token ? { Authorization: `Bearer ${token}` } : {} });

describe('GET /api/events', () => {
  it('answers the verified store\'s events only', async () => {
    const storeId = randomUUID();
    await recordEvent({ id: randomUUID(), topic: 'plugin.installed', storeId });
    await recordEvent({ id: randomUUID(), topic: 'order.created', storeId: randomUUID() });
    verifyToken.mockResolvedValueOnce({ storeId, pluginId: manifest.pluginId, scopes: [], type: 'session', userId: 'user-1' });
    const res = await GET(asking('session-1'));
    expect(res.status).toBe(200);
    expect(res.headers.get('cache-control')).toBe('no-store');
    expect((await res.json()).items).toEqual([{ id: expect.any(String), topic: 'plugin.installed', receivedAt: expect.any(String) }]);
    expect(verifyToken).toHaveBeenCalledWith('session-1', 'https://api.test.invalid');
  });

  it('says only Unauthorized without a token, with a refused one, or with another plugin\'s', async () => {
    expect((await GET(asking())).status).toBe(401);
    verifyToken.mockRejectedValueOnce(new Error('Token expired'));
    const refused = await GET(asking('old'));
    expect([refused.status, await refused.json()]).toEqual([401, { error: 'Unauthorized' }]);
    verifyToken.mockResolvedValueOnce({ storeId: 's', pluginId: 'another-plugin', scopes: [], type: 'session' });
    expect((await GET(asking('theirs'))).status).toBe(401);
  });
});
