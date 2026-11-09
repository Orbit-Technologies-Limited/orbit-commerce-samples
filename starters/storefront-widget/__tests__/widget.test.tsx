// @vitest-environment jsdom
import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

const stop = vi.fn();
const bridge = { resize: vi.fn(), observeHeight: vi.fn((_element: Element) => stop), dispose: vi.fn() };
vi.mock('@orbitcommerce/sdk/widget', () => ({ createWidgetBridge: vi.fn(() => bridge) }));
const { WidgetClient } = await import('../app/(widget)/widget/widget-client');

describe('the storefront widget', () => {
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

  // jsdom has no layout, so this pins the style that makes the measured box include the h2/p margins (QA round 2: 66 px reported, 102 px of content).
  it('observes a root that contains its children\'s margins, so the frame gets the full height', () => {
    const { unmount } = render(<WidgetClient headline="Pairs well with" productId="p1" pluginId="orbit-starter-storefront-widget" />);
    const observed = bridge.observeHeight.mock.calls.at(-1)?.[0] as HTMLElement;
    expect(observed.style.display).toBe('flow-root');
    expect(observed.contains(screen.getByRole('heading', { name: 'Pairs well with' }))).toBe(true);
    unmount();
  });
});
