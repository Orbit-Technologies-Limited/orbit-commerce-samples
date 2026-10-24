import { createHmac } from 'node:crypto';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import manifest from '../plugin.json';

const saveConnection = vi.fn(async (_connection: unknown) => undefined);
vi.mock('../lib/connections', () => ({ saveConnection }));
const exchangeToken = vi.fn(async (_token: string, _options: unknown) => ({ accessToken: 'at-1', refreshToken: 'rt-1' }));
let me = { storeId: 'store-1', pluginId: manifest.pluginId, installId: 'inst-1' };
vi.mock('@orbitcommerce/sdk', async (importOriginal) => {
  const real = await importOriginal<typeof import('@orbitcommerce/sdk')>();
  class OrbitClient {
    static exchangeToken = exchangeToken;
    plugins = { me: async () => me };
    constructor(readonly options: unknown) {}
  }
  return { ...real, OrbitClient };
});
const { POST } = await import('../app/api/connect/route');

const SECRET = 'whsec-test';
function callback(overrides: { body?: Record<string, unknown>; secret?: string; token?: string } = {}) {
  const body = JSON.stringify({ event: 'plugin.connect', storeId: 'store-1', pluginId: manifest.pluginId, installId: 'inst-1', reason: 'activated', ...overrides.body });
  const token = overrides.token ?? 'session-token-1';
  const ts = String(Math.floor(Date.now() / 1000));
  const signature = `sha256=${createHmac('sha256', overrides.secret ?? SECRET).update(`${ts}.${token}.${body}`).digest('hex')}`;
  return new Request('https://plugin.test/api/connect', {
    method: 'POST',
    body,
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}`, 'X-Orbit-Timestamp': ts, 'X-Orbit-Signature': signature, 'X-Orbit-Connect-Attempt': '1' },
  });
}

beforeEach(() => {
  saveConnection.mockClear();
  exchangeToken.mockClear();
  me = { storeId: 'store-1', pluginId: manifest.pluginId, installId: 'inst-1' };
});

describe('POST /api/connect', () => {
  it('verifies, exchanges with the secret, checks whose credential it is, and stores it', async () => {
    const res = await POST(callback());
    expect(res.status).toBe(204);
    expect(exchangeToken).toHaveBeenCalledWith('session-token-1', { secret: SECRET, apiUrl: 'https://api.test.invalid' });
    expect(saveConnection).toHaveBeenCalledWith({ storeId: 'store-1', installId: 'inst-1', accessToken: 'at-1', refreshToken: 'rt-1' });
  });

  it('refuses a call signed with another secret, and stores nothing', async () => {
    const res = await POST(callback({ secret: 'someone-else' }));
    expect(res.status).toBe(401);
    expect(await res.text()).toBe('invalid_signature');
    expect(exchangeToken).not.toHaveBeenCalled();
  });

  it('refuses a call for another plugin', async () => {
    const res = await POST(callback({ body: { pluginId: 'another-plugin' } }));
    expect(res.status).toBe(400);
    expect(await res.text()).toBe('wrong_plugin');
  });

  it('stores nothing when the credential belongs to another install', async () => {
    me = { ...me, installId: 'inst-2' };
    const res = await POST(callback());
    expect(res.status).toBe(409);
    expect(saveConnection).not.toHaveBeenCalled();
  });

  it('answers 500 missing_secret when the secret is not set, so Orbit retries', async () => {
    const saved = process.env.WEBHOOK_SECRET;
    delete process.env.WEBHOOK_SECRET;
    try {
      const res = await POST(callback());
      expect(res.status).toBe(500);
      expect(await res.text()).toBe('missing_secret');
    } finally {
      process.env.WEBHOOK_SECRET = saved;
    }
  });

  it('answers 502 when the exchange fails, logging no token, so Orbit retries', async () => {
    exchangeToken.mockRejectedValueOnce(new Error('Token exchange failed: 401'));
    const error = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const res = await POST(callback({ token: 'session-token-secret' }));
    expect([res.status, await res.text()]).toEqual([502, 'exchange_failed']);
    expect(String(error.mock.calls[0][0])).toContain('Token exchange failed: 401');
    expect(String(error.mock.calls[0][0])).not.toContain('session-token-secret');
    expect(saveConnection).not.toHaveBeenCalled();
    error.mockRestore();
  });
});
