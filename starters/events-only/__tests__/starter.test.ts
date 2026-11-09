import { describe, expect, it, vi } from 'vitest';
import manifest from '../plugin.json';
import { HANDLERS, onEvent } from '../lib/on-event';

const event = (topic: string) => ({ id: 'evt-1', topic, created_at: '2026-10-24T10:00:00.000Z', store_id: 'store-1', data: { id: 'order-1', customer: { email: 'shopper@example.com' } } });

describe('the events-only starter', () => {
  it('has a handler for every store event it subscribes to', () => {
    const topics = manifest.oauth.webhooks.map((w) => w.topic).filter((t) => !t.startsWith('plugin.'));
    expect(Object.keys(HANDLERS).sort()).toEqual(topics.sort());
  });

  it('logs one line per event, without the customer\'s details', async () => {
    const log = vi.spyOn(console, 'log').mockImplementation(() => undefined);
    await onEvent(event('order.paid') as never);
    expect(log).toHaveBeenCalledTimes(1);
    const line = JSON.parse(String(log.mock.calls[0][0]));
    expect(line).toEqual({ msg: 'An order was paid', topic: 'order.paid', id: 'evt-1', storeId: 'store-1', resourceId: 'order-1' });
    expect(String(log.mock.calls[0][0])).not.toContain('shopper@example.com');
    log.mockRestore();
  });

  it('ignores a topic it has no handler for', async () => {
    const log = vi.spyOn(console, 'log').mockImplementation(() => undefined);
    await onEvent(event('customer.created') as never);
    expect(log).not.toHaveBeenCalled();
    log.mockRestore();
  });
});
