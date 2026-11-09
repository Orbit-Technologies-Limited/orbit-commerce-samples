import { randomUUID } from 'node:crypto';
import { describe, expect, it, vi } from 'vitest';
import { getConnection, orbitFor, removeConnection, saveConnection } from '../lib/connections';
import { getDb } from '../lib/db';

const pair = (storeId: string) => ({ storeId, installId: `inst-${storeId}`, accessToken: `at-${storeId}`, refreshToken: `rt-${storeId}` });

type CreateOptions = {
  token: string;
  refreshToken: string;
  storeId: string;
  apiUrl: string;
  onTokenRefreshed: (t: { accessToken: string; refreshToken: string }) => Promise<void>;
};

describe('connections', () => {
  it('stores the pair encrypted and reads it back', async () => {
    const storeId = randomUUID();
    await saveConnection(pair(storeId));
    const row = await getDb().connection.findUnique({ where: { storeId } });
    expect(row?.accessToken).not.toContain('at-');
    expect(row?.refreshToken).not.toContain('rt-');
    expect(await getConnection(storeId)).toEqual(pair(storeId));
  });

  it('replaces the pair on a second save, and forgets a store that uninstalled', async () => {
    const storeId = randomUUID();
    await saveConnection(pair(storeId));
    await saveConnection({ ...pair(storeId), accessToken: 'at-new' });
    expect((await getConnection(storeId))?.accessToken).toBe('at-new');
    await removeConnection(storeId);
    await removeConnection(storeId);
    expect(await getConnection(storeId)).toBeNull();
  });

  it('reads a row it can no longer decrypt as no connection', async () => {
    const storeId = randomUUID();
    await getDb().connection.create({ data: { storeId, installId: 'i', accessToken: 'v1.garbage.garbage.garbage', refreshToken: 'x' } });
    expect(await getConnection(storeId)).toBeNull();
  });

  it('hands out a client that saves the rotated pair', async () => {
    const storeId = randomUUID();
    await saveConnection(pair(storeId));
    const create = vi.fn((options: CreateOptions) => options as never);
    await orbitFor(storeId, { create: create as never });
    const options = create.mock.calls[0][0];
    expect(options).toMatchObject({ token: `at-${storeId}`, refreshToken: `rt-${storeId}`, storeId, apiUrl: 'https://api.test.invalid' });
    await options.onTokenRefreshed({ accessToken: 'at-2', refreshToken: 'rt-2' });
    expect(await getConnection(storeId)).toMatchObject({ accessToken: 'at-2', refreshToken: 'rt-2' });
    expect(await orbitFor(randomUUID(), { create: create as never })).toBeNull();
  });

  it('logs a rotated pair it could not save, without the tokens, instead of crashing', async () => {
    const storeId = randomUUID();
    await saveConnection(pair(storeId));
    const create = vi.fn((options: CreateOptions) => options as never);
    await orbitFor(storeId, { create: create as never });
    const error = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const upsert = vi.spyOn(getDb().connection, 'upsert').mockRejectedValueOnce(new Error('database is locked'));
    await expect(create.mock.calls[0][0].onTokenRefreshed({ accessToken: 'at-secret', refreshToken: 'rt-secret' })).resolves.toBeUndefined();
    expect(error).toHaveBeenCalledTimes(1);
    expect(String(error.mock.calls[0][0])).toContain('database is locked');
    expect(String(error.mock.calls[0][0])).not.toContain('secret');
    upsert.mockRestore();
    error.mockRestore();
  });
});
