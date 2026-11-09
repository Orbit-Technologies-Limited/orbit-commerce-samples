// @vitest-environment jsdom
import { renderHook, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { NOT_IN_DASHBOARD, useOrbit } from '../components/use-orbit';

function fakeClient(ready: Promise<void>, token = 'session-1') {
  let current = token;
  return {
    ready: vi.fn(() => ready), getToken: vi.fn(() => current), getStoreId: vi.fn(() => 'store-1'), destroy: vi.fn(),
    rotate: (next: string) => { current = next; }
  };
}

describe('useOrbit', () => {
  it('is ready once the dashboard answers, and calls the plugin with the current token', async () => {
    const client = fakeClient(Promise.resolve());
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response('{}'));
    const { result, unmount } = renderHook(() => useOrbit({ create: () => client as never }));
    expect(result.current.status).toBe('connecting');
    await waitFor(() => expect(result.current.status).toBe('ready'));
    if (result.current.status !== 'ready') throw new Error('not ready');
    expect(result.current.storeId).toBe('store-1');
    client.rotate('session-2');
    await result.current.fetchPlugin('/api/events');
    expect(fetchMock).toHaveBeenCalledWith('/api/events', expect.objectContaining({ headers: expect.objectContaining({ Authorization: 'Bearer session-2' }) }));
    unmount();
    expect(client.destroy).toHaveBeenCalled();
    fetchMock.mockRestore();
  });

  it('says where to open the page when there is no dashboard around it', async () => {
    const client = fakeClient(Promise.reject(new Error('Timed out waiting for token')));
    const { result } = renderHook(() => useOrbit({ create: () => client as never }));
    await waitFor(() => expect(result.current.status).toBe('error'));
    expect(result.current).toEqual({ status: 'error', message: "This page opens inside your store dashboard. Open it from the plugin's menu item there." });
  });

  it('shows the dashboard message when the client cannot start', async () => {
    const { result } = renderHook(() => useOrbit({
      create: () => { throw new Error('Orbit SDK cannot receive dashboard authentication outside an iframe'); }
    }));
    await waitFor(() => expect(result.current.status).toBe('error'));
    expect(result.current).toEqual({ status: 'error', message: NOT_IN_DASHBOARD });
  });

  // This file runs as a top-level page on localhost, where the SDK's package
  // root throws while it loads. The page must still say where to open it.
  it('shows the dashboard message when the SDK refuses to load outside a dashboard', async () => {
    const { result } = renderHook(() => useOrbit());
    await waitFor(() => expect(result.current.status).toBe('error'), { timeout: 5000 });
    expect(result.current).toEqual({ status: 'error', message: NOT_IN_DASHBOARD });
  });

  it('destroys a client that arrives after the page has gone', async () => {
    const client = fakeClient(Promise.resolve());
    let arrive: (value: never) => void = () => {};
    const create = vi.fn(() => new Promise<never>((resolve) => { arrive = resolve; }));
    const { unmount } = renderHook(() => useOrbit({ create }));
    await waitFor(() => expect(create).toHaveBeenCalled());
    unmount();
    arrive(client as never);
    await waitFor(() => expect(client.destroy).toHaveBeenCalledTimes(1));
    expect(client.ready).not.toHaveBeenCalled();
  });
});
