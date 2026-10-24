#!/usr/bin/env node
/**
 * The container's start command on Orbit hosting (and npm start after npm run build).
 *
 * 1. With a Postgres DATABASE_URL, apply prisma/postgres/migrations (prisma migrate deploy).
 *    It takes a Postgres advisory lock, so two copies starting together are safe, and a
 *    migration that fails stops the container before it serves anything.
 * 2. Start the Next.js standalone server on PORT and every interface; it stops cleanly on
 *    SIGTERM.
 *
 * SQLite is for your computer only, so a file: DATABASE_URL skips step 1.
 */
import { spawnSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { fileURLToPath, pathToFileURL } from 'node:url';

const PRISMA_CLI = 'node_modules/prisma/build/index.js';
const HOSTED_SCHEMA = 'prisma/postgres/schema.prisma';
const TLS_PARAMETERS = ['sslmode', 'sslrootcert', 'sslcert', 'sslaccept'];

export function isPostgres(url) {
  return typeof url === 'string' && /^postgres(?:ql)?:\/\//i.test(url);
}

/**
 * Orbit hosting's DATABASE_URL carries sslmode=verify-full&sslrootcert=<CA file>, which
 * node-postgres (the app, through @prisma/adapter-pg) reads as it is. Prisma's own engine,
 * which migrate deploy uses, reads sslcert and sslaccept instead (the hosting image guide,
 * "Prisma without a driver adapter"). Every other parameter is kept as written.
 */
export function migrationUrl(databaseUrl, caFile) {
  if (!caFile) return databaseUrl;
  const at = databaseUrl.indexOf('?');
  const base = at === -1 ? databaseUrl : databaseUrl.slice(0, at);
  const query = at === -1 ? '' : databaseUrl.slice(at + 1);
  const kept = query
    .split('&')
    .filter((pair) => pair && !TLS_PARAMETERS.includes(decodeURIComponent(pair.split('=')[0]).toLowerCase()));
  kept.push('sslmode=verify-full', `sslcert=${caFile}`, 'sslaccept=strict');
  return `${base}?${kept.join('&')}`;
}

function runCommand(command, args, env) {
  const result = spawnSync(command, args, { env, stdio: 'inherit' });
  return result.status ?? 1;
}

async function startNext() {
  // In the image the standalone server sits beside this folder; after a local npm run build
  // it is still in .next/standalone.
  const candidates = ['../server.js', '../.next/standalone/server.js'].map((path) => fileURLToPath(new URL(path, import.meta.url)));
  const server = candidates.find((path) => existsSync(path));
  if (!server) throw new Error('No Next.js server to start. Run npm run build first.');
  await import(pathToFileURL(server).href);
}

/**
 * deps: { run(command, args, env) -> exit status, startServer(), exit(code) }. Returns after exit().
 * @param {Record<string, string | undefined>} [env]
 * @param {{ run?: (command: string, args: string[], env: Record<string, string | undefined>) => number, startServer?: () => Promise<unknown>, exit?: (code: number) => void }} [deps]
 */
export async function main(env = process.env, deps = {}) {
  const { run = runCommand, startServer = startNext, exit = (code) => process.exit(code) } = deps;
  if (isPostgres(env.DATABASE_URL)) {
    const status = run(process.execPath, [PRISMA_CLI, 'migrate', 'deploy', '--schema', HOSTED_SCHEMA], {
      ...env,
      DATABASE_URL: migrationUrl(env.DATABASE_URL, env.ORBIT_DATABASE_CA_FILE),
    });
    if (status !== 0) {
      console.error(JSON.stringify({ msg: 'database migration failed', status }));
      exit(status);
      return;
    }
  }
  // Next's server binds to HOSTNAME, which container runtimes set to the machine's name.
  // Orbit hosting needs every interface, so this is not a default: it always wins.
  env.HOSTNAME = '0.0.0.0';
  await startServer();
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((error) => {
    console.error(error instanceof Error ? error.message : String(error));
    process.exit(1);
  });
}
