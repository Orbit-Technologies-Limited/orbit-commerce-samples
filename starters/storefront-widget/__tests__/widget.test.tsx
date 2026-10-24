// @vitest-environment jsdom
import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

const stop = vi.fn();
const bridge = { resize: vi.fn(), observeHeight: vi.fn((_element: Element) => stop), dispose: vi.fn() };
vi.mock('@orbitcommerce/sdk/widget', () => ({ createWidgetBridge: vi.fn(() => bridge) }));
const { headlineFor } = await import('../app/(widget)/widget/headline');
const { WidgetClient } = await import('../app/(widget)/widget/widget-client');

describe('the storefront widget', () => {
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

  it('shows the headline and sizes the frame through the bridge', async () => {
    const { unmount } = render(<WidgetClient headline="Pairs well with" productId="p1" pluginId="orbit-starter-storefront-widget" />);
    expect(screen.getByRole('heading', { name: 'Pairs well with' })).toBeTruthy();
    const { createWidgetBridge } = await import('@orbitcommerce/sdk/widget');
    expect(createWidgetBridge).toHaveBeenCalledWith({ pluginId: 'orbit-starter-storefront-widget' });
    expect(bridge.observeHeight).toHaveBeenCalledWith(expect.any(HTMLElement));
    unmount();
    expect(stop).toHaveBeenCalled();
    expect(bridge.dispose).toHaveBeenCalled();
  });
});
