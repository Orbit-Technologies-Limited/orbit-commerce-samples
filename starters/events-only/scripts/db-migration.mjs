#!/usr/bin/env node
/**
 * npm run db:migration <name>: write the next Postgres migration with no database at all.
 *
 * On your computer the plugin runs on SQLite (prisma/schema.prisma); on Orbit hosting it
 * runs on Postgres (prisma/postgres/schema.prisma, the same models). Orbit applies
 * prisma/postgres/migrations when the container starts (scripts/start.mjs).
 *
 * This compares prisma/postgres/schema.prisma with the copy taken at the last migration
 * (prisma/postgres/schema.migrated.prisma) and writes the SQL for the difference. The
 * folder is named from the real clock in UTC, so migrations always sort in the order they
 * were made. Commit the new folder and the updated snapshot together.
 */
import { spawnSync } from 'node:child_process';
import * as nodeFs from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

export const SCHEMA = 'prisma/postgres/schema.prisma';
export const SNAPSHOT = 'prisma/postgres/schema.migrated.prisma';
export const MIGRATIONS = 'prisma/postgres/migrations';

const pad = (n) => String(n).padStart(2, '0');

function snakeCase(name) {
  return String(name ?? '')
    .trim()
    .replace(/([a-z0-9])([A-Z])/g, '$1_$2')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');
}

/** `<UTC YYYYMMDDHHMMSS>_<snake_case name>`, from the time you pass (the real clock). */
export function migrationFolderName(name, now) {
  const slug = snakeCase(name);
  if (!slug) throw new Error('Give the migration a name: npm run db:migration <name>');
  const stamp = [
    now.getUTCFullYear(),
    pad(now.getUTCMonth() + 1),
    pad(now.getUTCDate()),
    pad(now.getUTCHours()),
    pad(now.getUTCMinutes()),
    pad(now.getUTCSeconds()),
  ].join('');
  return `${stamp}_${slug}`;
}

/** The `prisma migrate diff` arguments: from the snapshot, or from empty for the first migration. */
export function diffArgs({ snapshotExists }) {
  const from = snapshotExists ? ['--from-schema-datamodel', SNAPSHOT] : ['--from-empty'];
  return ['migrate', 'diff', ...from, '--to-schema-datamodel', SCHEMA, '--script'];
}

/** Null when the SQL holds nothing but blank lines and comments, else the folder and the SQL. */
export function planMigration({ sql, name, now }) {
  const statements = String(sql ?? '')
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line && !line.startsWith('--'));
  if (statements.length === 0) return null;
  return { folder: migrationFolderName(name, now), sql };
}

function runPrisma(args) {
  const cli = fileURLToPath(new URL('../node_modules/prisma/build/index.js', import.meta.url));
  const result = spawnSync(process.execPath, [cli, ...args], { encoding: 'utf8' });
  return { status: result.status ?? 1, stdout: result.stdout ?? '', stderr: result.stderr ?? String(result.error ?? '') };
}

/**
 * Returns the exit code. deps: { run(args) -> { status, stdout, stderr }, now() -> Date, fs,
 * cwd, log(line), error(line) }.
 */
export async function main(argv, deps = {}) {
  const {
    run = runPrisma,
    now = () => new Date(),
    fs = nodeFs,
    cwd = process.cwd(),
    log = (line) => console.log(line),
    error = (line) => console.error(line),
  } = deps;
  const name = argv.filter((arg) => !arg.startsWith('-')).join(' ');
  if (!snakeCase(name)) {
    error('Give the migration a name: npm run db:migration <name>');
    return 2;
  }
  const result = run(diffArgs({ snapshotExists: fs.existsSync(join(cwd, SNAPSHOT)) }));
  if (result.status !== 0) {
    error(result.stderr.trim() || 'prisma migrate diff failed.');
    return 1;
  }
  const plan = planMigration({ sql: result.stdout, name, now: now() });
  if (!plan) {
    log('No change since the last migration.');
    return 0;
  }
  const folder = join(cwd, MIGRATIONS, plan.folder);
  fs.mkdirSync(folder, { recursive: true });
  fs.writeFileSync(join(folder, 'migration.sql'), plan.sql);
  fs.copyFileSync(join(cwd, SCHEMA), join(cwd, SNAPSHOT));
  log(`Wrote ${MIGRATIONS}/${plan.folder}/migration.sql. Commit it with ${SNAPSHOT}.`);
  return 0;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main(process.argv.slice(2)).then((code) => {
    process.exitCode = code;
  });
}
