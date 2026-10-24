// @vitest-environment jsdom
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

const state = { current: { status: 'connecting' } as Record<string, unknown> };
vi.mock('../components/use-orbit', async (importOriginal) => ({ ...(await importOriginal<object>()), useOrbit: () => state.current }));
vi.mock('../app/(dashboard)/embed/overview', () => ({ Overview: () => <p>Starter overview</p> }));
vi.mock('@orbitcommerce/plugin-ui', async (importOriginal) => ({ ...(await importOriginal<object>()), useEmbedTheme: () => 'light' }));
const { default: EmbedPage } = await import('../app/(dashboard)/embed/page');
const { EventsList } = await import('../components/events-list');
import manifest from '../plugin.json';

describe('the main page', () => {
  it('waits for the dashboard, then shows the header and the three tabs', async () => {
    const { rerender } = render(<EmbedPage />);
    expect(screen.getByText('Connecting to the dashboard')).toBeTruthy();
    const fetchPlugin = vi.fn(async () => new Response(JSON.stringify({ items: [] })));
    state.current = { status: 'ready', storeId: 'store-1', fetchPlugin, orbit: { settings: { get: async () => ({ settings: {}, schema: {} }) } } };
    rerender(<EmbedPage />);
    expect(screen.getByRole('heading', { name: manifest.listing.name })).toBeTruthy();
    expect(screen.getByText('Starter overview')).toBeTruthy();
    await userEvent.click(screen.getByRole('tab', { name: 'Events' }));
    expect(await screen.findByText(/No events yet/)).toBeTruthy();
  });

  it('shows the handshake error', () => {
    state.current = { status: 'error', message: "This page opens inside your store dashboard. Open it from the plugin's menu item there." };
    render(<EmbedPage />);
    expect(screen.getByText(/opens inside your store dashboard/)).toBeTruthy();
  });
});

describe('EventsList', () => {
  it('lists the newest events and says how to send one when there are none', async () => {
    const fetchPlugin = vi.fn(async () => new Response(JSON.stringify({ items: [{ id: 'evt-1', topic: 'plugin.installed', receivedAt: '2026-10-24T10:00:00.000Z' }] })));
    render(<EventsList fetchPlugin={fetchPlugin} exampleTopic="order.created" refreshMs={60_000} />);
    expect(await screen.findByText('plugin.installed')).toBeTruthy();
    expect(fetchPlugin).toHaveBeenCalledWith('/api/events');
    const empty = vi.fn(async () => new Response(JSON.stringify({ items: [] })));
    render(<EventsList fetchPlugin={empty} exampleTopic="order.created" refreshMs={60_000} />);
    await waitFor(() => expect(screen.getByText('No events yet. Install the plugin on your test store, or send one with npx orbit-plugin events send order.created.')).toBeTruthy());
  });
});
