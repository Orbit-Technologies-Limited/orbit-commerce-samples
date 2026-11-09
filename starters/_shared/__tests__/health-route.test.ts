import { describe, expect, it, vi } from 'vitest';

vi.mock('../lib/db', () => ({ getDb: () => { throw new Error('the health check must not touch the database'); } }));
const { GET } = await import('../app/health/route');

describe('GET /health', () => {
  it('answers ok without touching anything else', async () => {
    const res = await GET();
    expect(res.status).toBe(200);
    expect(res.headers.get('cache-control')).toBe('no-store');
    expect(await res.json()).toEqual({ ok: true });
  });
});
