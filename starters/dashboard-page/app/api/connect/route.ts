import { ConnectCallbackVerificationError, OrbitClient, verifyConnectCallback } from '@orbitcommerce/sdk';
import { saveConnection } from '@/lib/connections';
import { PLUGIN_ID, orbitApiUrl } from '@/lib/env';

export const dynamic = 'force-dynamic';

/**
 * Orbit calls this (lifecycle.connectUrl) when a store's install becomes active.
 * Verify the call, exchange its token, prove whose credential it is, then store it.
 * Any answer but a 2xx is a failed attempt, and Orbit tries again.
 */
export async function POST(request: Request): Promise<Response> {
  const secret = process.env.WEBHOOK_SECRET ?? '';
  let callback;
  try {
    callback = await verifyConnectCallback(new Uint8Array(await request.arrayBuffer()), request.headers, secret, { pluginId: PLUGIN_ID });
  } catch (error) {
    if (error instanceof ConnectCallbackVerificationError) return new Response(error.reason, { status: error.status });
    throw error;
  }

  const apiUrl = orbitApiUrl();
  let pair;
  let me;
  try {
    // Signed with the webhook secret, so a stolen session token alone cannot be exchanged.
    pair = await OrbitClient.exchangeToken(callback.token, { secret, apiUrl });
    me = await new OrbitClient({ token: pair.accessToken, storeId: callback.storeId, apiUrl }).plugins.me();
  } catch (error) {
    console.error(JSON.stringify({ msg: 'connect failed', storeId: callback.storeId, error: error instanceof Error ? error.message : String(error) }));
    return new Response('exchange_failed', { status: 502 });
  }

  if (me.storeId !== callback.storeId || me.pluginId !== callback.pluginId || me.installId !== callback.installId) {
    return new Response('credential mismatch', { status: 409 });
  }
  await saveConnection({ storeId: callback.storeId, installId: callback.installId, accessToken: pair.accessToken, refreshToken: pair.refreshToken });
  return new Response(null, { status: 204 });
}
