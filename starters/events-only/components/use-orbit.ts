'use client';

import { useEffect, useState } from 'react';
import type { OrbitClient } from '@orbitcommerce/sdk';

export const HANDSHAKE_TIMEOUT_MS = 15_000;

export type FetchPlugin = (path: string, init?: RequestInit) => Promise<Response>;

export interface OverviewProps {
  orbit: OrbitClient;
  fetchPlugin: FetchPlugin;
}

export type OrbitState =
  | { status: 'connecting' }
  | { status: 'ready'; orbit: OrbitClient; storeId: string; fetchPlugin: FetchPlugin }
  | { status: 'error'; message: string };

export const NOT_IN_DASHBOARD = "This page opens inside your store dashboard. Open it from the plugin's menu item there.";

// The SDK's package root makes a client as it loads, and that client refuses
// to start outside a dashboard frame. Loading the SDK here, rather than at the
// top of the file, turns that refusal into the message above instead of a page
// that fails to load.
async function createClient(): Promise<OrbitClient> {
  const { OrbitClient } = await import('@orbitcommerce/sdk');
  return new OrbitClient();
}

export function useOrbit(deps: { create?: () => OrbitClient | Promise<OrbitClient> } = {}): OrbitState {
  const [state, setState] = useState<OrbitState>({ status: 'connecting' });

  useEffect(() => {
    let active = true;
    let orbit: OrbitClient | undefined;
    const create = deps.create ?? createClient;

    const connect = async () => {
      const client = await Promise.resolve().then(() => create());
      if (!active) {
        client.destroy();
        return;
      }
      orbit = client;

      const fetchPlugin: FetchPlugin = (path, init = {}) =>
        fetch(path, {
          ...init,
          headers: {
            ...Object.fromEntries(new Headers(init.headers).entries()),
            Authorization: `Bearer ${client.getToken()}`,
          },
        });

      await client.ready(HANDSHAKE_TIMEOUT_MS);
      if (!active) return;
      setState({ status: 'ready', orbit: client, storeId: client.getStoreId(), fetchPlugin });
    };

    connect().catch(() => {
      if (!active) return;
      setState({ status: 'error', message: NOT_IN_DASHBOARD });
    });

    return () => {
      active = false;
      orbit?.destroy();
    };
  }, []);

  return state;
}
