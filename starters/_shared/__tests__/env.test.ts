import { describe, expect, it } from 'vitest';
import { PLUGIN_ID, isPostgresUrl, orbitApiUrl, requireEnv } from '../lib/env';
import manifest from '../plugin.json';

describe('env', () => {
  it('says where a missing variable comes from', () => {
    expect(() => requireEnv('WEBHOOK_SECRET', {})).toThrow('WEBHOOK_SECRET is not set. orbit-plugin dev writes it to .env.local, and Orbit hosting sets it for you.');
    expect(requireEnv('WEBHOOK_SECRET', { WEBHOOK_SECRET: 'x' })).toBe('x');
  });
  it('normalises the API address', () => {
    expect(orbitApiUrl({ ORBIT_API_URL: 'http://localhost:13010/graphql/' })).toBe('http://localhost:13010');
    expect(orbitApiUrl({})).toBe('https://api.myorbitcommerce.net');
  });
  it('knows a Postgres address', () => {
    expect(isPostgresUrl('postgresql://u:p@db:5432/x?sslmode=verify-full&sslrootcert=/orbit/certs/rds-ca-bundle.pem')).toBe(true);
    expect(isPostgresUrl('postgres://u@db/x')).toBe(true);
    expect(isPostgresUrl('file:./dev.db')).toBe(false);
    expect(isPostgresUrl(undefined)).toBe(false);
  });
  it('reads the plugin id from plugin.json', () => {
    expect(PLUGIN_ID).toBe(manifest.pluginId);
  });
});
