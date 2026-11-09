import { describe, expect, it, vi } from 'vitest';
import { headlineFor } from '../app/(widget)/widget/headline';

// The headline is read on the server, so these run in Node, as the page does.
describe('the storefront widget headline', () => {
  it('uses the merchant\'s public headline, then the default when the store has not connected', async () => {
    const connected = vi.fn(async () => ({ settings: { get: async () => ({ settings: { headline: 'Pairs well with' }, schema: {} }) } }));
    expect(await headlineFor('store-1', { orbitFor: connected as never })).toBe('Pairs well with');
    expect(await headlineFor('store-2', { orbitFor: vi.fn(async () => null) as never })).toBe('You might also like');
    expect(await headlineFor(undefined, { orbitFor: vi.fn() as never })).toBe('You might also like');
  });

  it('keeps a store\'s headline for a minute', async () => {
    let now = 1_000_000;
    const lookup = vi.fn(async () => ({ settings: { get: async () => ({ settings: { headline: 'First' }, schema: {} }) } }));
    await headlineFor('store-9', { orbitFor: lookup as never, now: () => now });
    await headlineFor('store-9', { orbitFor: lookup as never, now: () => now + 30_000 });
    expect(lookup).toHaveBeenCalledTimes(1);
    now += 61_000;
    await headlineFor('store-9', { orbitFor: lookup as never, now: () => now });
    expect(lookup).toHaveBeenCalledTimes(2);
  });
});
