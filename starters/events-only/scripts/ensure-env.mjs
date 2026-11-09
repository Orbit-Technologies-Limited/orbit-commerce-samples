#!/usr/bin/env node
/**
 * Make .env from .env.example when there is none (npm runs this before dev, test and build).
 *
 * .env is never committed: it is where your own values end up, so git ignores it. Prisma
 * reads its DATABASE_URL only from .env, so a fresh clone or a plugin made with
 * orbit-plugin create gets one from the defaults in .env.example the first time it runs.
 * An existing .env is never touched. Secrets belong in .env.local, which orbit-plugin
 * create and dev write.
 */
import * as nodeFs from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

/** Returns 'created', 'exists' or 'no-example'. */
export function ensureEnv({ cwd = process.cwd(), fs = nodeFs } = {}) {
  const target = join(cwd, '.env');
  if (fs.existsSync(target)) return 'exists';
  const example = join(cwd, '.env.example');
  if (!fs.existsSync(example)) return 'no-example';
  fs.copyFileSync(example, target, fs.constants.COPYFILE_EXCL);
  return 'created';
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const cwd = fileURLToPath(new URL('..', import.meta.url));
  if (ensureEnv({ cwd }) === 'created') console.log('Wrote .env from .env.example. Keep secrets in .env.local.');
}
