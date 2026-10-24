import { existsSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it, vi } from 'vitest';
import { diffArgs, main, migrationFolderName, planMigration } from '../scripts/db-migration.mjs';

describe('db-migration', () => {
  it('names the folder from the real UTC clock and a snake_case name', () => {
    expect(migrationFolderName('Add notes', new Date('2026-10-24T09:05:03Z'))).toBe('20261024090503_add_notes');
    expect(migrationFolderName('addNotes', new Date('2026-10-24T09:05:03Z'))).toBe('20261024090503_add_notes');
    expect(() => migrationFolderName('  ', new Date())).toThrow('name');
  });

  it('diffs from the snapshot, or from empty for the first migration', () => {
    expect(diffArgs({ snapshotExists: true })).toEqual(['migrate', 'diff', '--from-schema-datamodel', 'prisma/postgres/schema.migrated.prisma', '--to-schema-datamodel', 'prisma/postgres/schema.prisma', '--script']);
    expect(diffArgs({ snapshotExists: false }).slice(0, 3)).toEqual(['migrate', 'diff', '--from-empty']);
  });

  it('writes nothing for an empty diff', () => {
    expect(planMigration({ sql: '-- This is an empty migration.\n', name: 'x', now: new Date() })).toBeNull();
    expect(planMigration({ sql: 'CREATE TABLE "notes" ("id" TEXT);\n', name: 'notes', now: new Date('2026-10-24T09:05:03Z') })).toEqual({ folder: '20261024090503_notes', sql: 'CREATE TABLE "notes" ("id" TEXT);\n' });
  });

  it('writes the migration and moves the snapshot on, or says there is nothing to do', async () => {
    const cwd = mkdtempSync(join(tmpdir(), 'db-migration-'));
    mkdirSync(join(cwd, 'prisma', 'postgres'), { recursive: true });
    writeFileSync(join(cwd, 'prisma', 'postgres', 'schema.prisma'), 'model Note { id String @id }\n');
    const log = vi.fn();
    const run = vi.fn(() => ({ status: 0, stdout: 'CREATE TABLE "Note" ("id" TEXT);\n', stderr: '' }));
    expect(await main(['add', 'notes'], { run, now: () => new Date('2026-10-24T09:05:03Z'), cwd, log, error: vi.fn() })).toBe(0);
    expect(run).toHaveBeenCalledWith(diffArgs({ snapshotExists: false }));
    expect(readFileSync(join(cwd, 'prisma', 'postgres', 'migrations', '20261024090503_add_notes', 'migration.sql'), 'utf8')).toBe('CREATE TABLE "Note" ("id" TEXT);\n');
    expect(readFileSync(join(cwd, 'prisma', 'postgres', 'schema.migrated.prisma'), 'utf8')).toBe('model Note { id String @id }\n');

    const unchanged = vi.fn(() => ({ status: 0, stdout: '-- This is an empty migration.\n', stderr: '' }));
    expect(await main(['again'], { run: unchanged, now: () => new Date(), cwd, log, error: vi.fn() })).toBe(0);
    expect(unchanged).toHaveBeenCalledWith(diffArgs({ snapshotExists: true }));
    expect(log).toHaveBeenLastCalledWith('No change since the last migration.');
    expect(readdirSync(join(cwd, 'prisma', 'postgres', 'migrations'))).toEqual(['20261024090503_add_notes']);
  });

  it('needs a name, and stops when Prisma fails', async () => {
    const cwd = mkdtempSync(join(tmpdir(), 'db-migration-'));
    const error = vi.fn();
    expect(await main([], { run: vi.fn(), cwd, log: vi.fn(), error })).toBe(2);
    expect(error).toHaveBeenCalledWith('Give the migration a name: npm run db:migration <name>');
    expect(await main(['x'], { run: () => ({ status: 1, stdout: '', stderr: 'P1012 schema error' }), cwd, log: vi.fn(), error })).toBe(1);
    expect(error).toHaveBeenLastCalledWith('P1012 schema error');
    expect(existsSync(join(cwd, 'prisma'))).toBe(false);
  });
});
