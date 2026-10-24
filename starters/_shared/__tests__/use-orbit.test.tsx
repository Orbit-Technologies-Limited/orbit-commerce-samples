// @vitest-environment jsdom
import { renderHook, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { useOrbit } from '../components/use-orbit';

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
});
