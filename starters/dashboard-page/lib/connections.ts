import { OrbitClient } from '@orbitcommerce/sdk';
import { TokenKeyError, decryptToken, encryptToken } from './crypto';
import { getDb } from './db';
import { orbitApiUrl } from './env';

/**
 * A store's connection: the access and refresh pair this plugin holds for one install.
 *
 * The pair arrives through the connect callback (app/api/connect/route.ts) and is stored
 * encrypted, one row per store. One plugin serves every store that installs it, so
 * everything here is per store. Nothing here logs a token.
 */
export interface StoredConnection {
  storeId: string;
  installId: string;
  accessToken: string;
  refreshToken: string;
}

/** Store the pair, encrypted. A second save for the same store replaces the first. */
export async function saveConnection(input: StoredConnection): Promise<void> {
  const data = {
    installId: input.installId,
    accessToken: encryptToken(input.accessToken),
    refreshToken: encryptToken(input.refreshToken),
  };
  await getDb().connection.upsert({
    where: { storeId: input.storeId },
    create: { storeId: input.storeId, ...data },
    update: data,
  });
}

/**
 * The store's pair, or null when the store never connected or its row no longer decrypts
 * (TOKEN_ENCRYPTION_KEY changed): the store connects again at its next connect callback.
 * A missing or malformed key is a configuration error, so that one is thrown.
 */
export async function getConnection(storeId: string): Promise<StoredConnection | null> {
  const row = await getDb().connection.findUnique({ where: { storeId } });
  if (!row) return null;
  try {
    return {
      storeId: row.storeId,
      installId: row.installId,
      accessToken: decryptToken(row.accessToken),
      refreshToken: decryptToken(row.refreshToken),
    };
  } catch (error) {
    if (error instanceof TokenKeyError) throw error;
    return null;
  }
}

/** Forget a store, for example when it uninstalls the plugin. Safe to call twice. */
export async function removeConnection(storeId: string): Promise<void> {
  await getDb().connection.deleteMany({ where: { storeId } });
}

/**
 * An SDK client acting for the store, or null when the store has not connected.
 *
 * The client refreshes its own access token. Each refresh rotates the refresh token and
 * makes the old one useless, so the new pair is saved straight away. The SDK does not wait
 * for that save, so a failed save is caught and logged here (without the tokens) rather
 * than crashing the process; the store then connects again at its next connect callback.
 */
export async function orbitFor(
  storeId: string,
  deps: { create?: typeof OrbitClient.fromRefreshToken } = {},
): Promise<OrbitClient | null> {
  const connection = await getConnection(storeId);
  if (!connection) return null;
  const create = deps.create ?? ((options) => OrbitClient.fromRefreshToken(options));
  return create({
    token: connection.accessToken,
    refreshToken: connection.refreshToken,
    storeId,
    apiUrl: orbitApiUrl(),
    onTokenRefreshed: async (tokens) => {
      try {
        await saveConnection({ storeId, installId: connection.installId, accessToken: tokens.accessToken, refreshToken: tokens.refreshToken });
      } catch (error) {
        console.error(
          JSON.stringify({
            msg: 'could not save the refreshed tokens',
            storeId,
            error: error instanceof Error ? error.message : String(error),
          }),
        );
      }
    },
  });
}
