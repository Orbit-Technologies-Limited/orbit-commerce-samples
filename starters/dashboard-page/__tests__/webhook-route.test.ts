import { createHmac, randomUUID } from 'node:crypto';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const onEvent = vi.fn(async () => undefined);
vi.mock('../lib/on-event', () => ({ onEvent }));
const removeConnection = vi.fn(async () => undefined);
vi.mock('../lib/connections', () => ({ removeConnection }));
vi.mock('next/server', async (importOriginal) => ({ ...(await importOriginal<object>()), after: (fn: () => unknown) => void fn() }));
const { POST } = await import('../app/api/webhooks/orbit/route');
const { listEvents } = await import('../lib/events');

const SECRET = 'whsec-test';
function delivery(envelope: Record<string, unknown>, options: { secret?: string; t?: number; legacyOnly?: boolean } = {}) {
  const body = JSON.stringify(envelope);
  const t = options.t ?? Math.floor(Date.now() / 1000);
  const v2 = createHmac('sha256', options.secret ?? SECRET).update(`${t}.${body}`).digest('hex');
  const v1 = createHmac('sha256', options.secret ?? SECRET).update(body).digest('hex');
  const headers: Record<string, string> = { 'Content-Type': 'application/json', 'X-Orbit-Webhook-Signature': `sha256=${v1}` };
  if (!options.legacyOnly) headers['X-Orbit-Signature'] = `t=${t},v1=${v2}`;
  return new Request('https://plugin.test/api/webhooks/orbit', { method: 'POST', body, headers });
}
const envelope = (storeId: string, topic = 'order.created') => ({ id: randomUUID(), topic, created_at: '2026-10-24T10:00:00.000Z', store_id: storeId, data: { id: 'order-1' } });

beforeEach(() => { onEvent.mockClear(); removeConnection.mockClear(); });

describe('POST /api/webhooks/orbit', () => {
  it('records a signed event once, answers 204 and hands it on', async () => {
    const storeId = randomUUID();
    const event = envelope(storeId);
    expect((await POST(delivery(event))).status).toBe(204);
    expect((await POST(delivery(event))).status).toBe(204);
    await vi.waitFor(() => expect(onEvent).toHaveBeenCalledTimes(1));
    expect(onEvent).toHaveBeenCalledWith(expect.objectContaining({ id: event.id, topic: 'order.created', store_id: storeId }));
    expect((await listEvents(storeId)).map((e) => e.eventId)).toEqual([event.id]);
  });

  it('refuses a wrong signature, a stale one and one without the timestamp', async () => {
    const storeId = randomUUID();
    const wrong = await POST(delivery(envelope(storeId), { secret: 'not-ours' }));
    expect([wrong.status, await wrong.text()]).toEqual([401, 'invalid_signature']);
    const stale = await POST(delivery(envelope(storeId), { t: Math.floor(Date.now() / 1000) - 3600 }));
    expect([stale.status, await stale.text()]).toEqual([401, 'timestamp_outside_tolerance']);
    const legacy = await POST(delivery(envelope(storeId), { legacyOnly: true }));
    expect([legacy.status, await legacy.text()]).toEqual([401, 'timestamp_required']);
    expect(await listEvents(storeId)).toEqual([]);
    expect(onEvent).not.toHaveBeenCalled();
  });

  it('forgets the store\'s tokens when the plugin is uninstalled', async () => {
    const storeId = randomUUID();
    await POST(delivery(envelope(storeId, 'plugin.uninstalled')));
    expect(removeConnection).toHaveBeenCalledWith(storeId);
  });

  it('lists a store\'s events newest first, and only that store\'s', async () => {
    const mine = randomUUID();
    const first = envelope(mine, 'plugin.installed');
    const second = envelope(mine, 'order.created');
    await POST(delivery(first));
    await new Promise((r) => setTimeout(r, 5));
    await POST(delivery(second));
    await POST(delivery(envelope(randomUUID())));
    expect((await listEvents(mine)).map((e) => e.topic)).toEqual(['order.created', 'plugin.installed']);
  });
});
