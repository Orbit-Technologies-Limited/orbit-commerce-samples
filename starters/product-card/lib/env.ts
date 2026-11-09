import manifest from '../plugin.json';

export type RequiredVariable = 'WEBHOOK_SECRET' | 'TOKEN_ENCRYPTION_KEY' | 'DATABASE_URL';

/** process.env, or any map like it (Next types process.env with a required NODE_ENV). */
export type Env = Record<string, string | undefined>;

const DEFAULT_API_URL = 'https://api.myorbitcommerce.net';

export const WHERE_FROM: Record<RequiredVariable, string> = {
  WEBHOOK_SECRET: 'orbit-plugin dev writes it to .env.local, and Orbit hosting sets it for you',
  TOKEN_ENCRYPTION_KEY: 'orbit-plugin create writes one to .env.local, and Orbit hosting sets it for you',
  DATABASE_URL: '.env points it at a local SQLite file, and Orbit hosting sets its Postgres database',
};

export function requireEnv(name: RequiredVariable, env: Env = process.env): string {
  const value = env[name];
  if (!value) throw new Error(`${name} is not set. ${WHERE_FROM[name]}.`);
  return value;
}

export function orbitApiUrl(env: Env = process.env): string {
  const url = (env.ORBIT_API_URL ?? '')
    .trim()
    .replace(/\/+$/, '')
    .replace(/\/graphql$/, '')
    .replace(/\/+$/, '');
  return url || DEFAULT_API_URL;
}

export function isPostgresUrl(url: string | undefined): boolean {
  return typeof url === 'string' && /^postgres(?:ql)?:\/\//i.test(url);
}

export const PLUGIN_ID: string = manifest.pluginId;
