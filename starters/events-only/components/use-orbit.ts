'use client';

import { useEffect, useState } from 'react';
import { OrbitClient } from '@orbitcommerce/sdk';

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

export function useOrbit(deps: { create?: () => OrbitClient } = {}): OrbitState {
  const [state, setState] = useState<OrbitState>({ status: 'connecting' });

  useEffect(() => {
    let active = true;
    const orbit = (deps.create ?? (() => new OrbitClient()))();

    const fetchPlugin: FetchPlugin = (path, init = {}) =>
      fetch(path, {
        ...init,
        headers: {
          ...Object.fromEntries(new Headers(init.headers).entries()),
          Authorization: `Bearer ${orbit.getToken()}`,
        },
      });

    orbit
      .ready(HANDSHAKE_TIMEOUT_MS)
      .then(() => {
        if (!active) return;
        setState({ status: 'ready', orbit, storeId: orbit.getStoreId(), fetchPlugin });
      })
      .catch(() => {
        if (!active) return;
        setState({ status: 'error', message: NOT_IN_DASHBOARD });
      });

    return () => {
      active = false;
      orbit.destroy();
    };
  }, []);

  return state;
}
