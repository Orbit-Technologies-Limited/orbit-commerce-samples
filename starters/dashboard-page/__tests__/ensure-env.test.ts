import { existsSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { ensureEnv } from '../scripts/ensure-env.mjs';

const folder = () => mkdtempSync(join(tmpdir(), 'ensure-env-'));

describe('ensure-env', () => {
  it('makes .env from .env.example when there is none', () => {
    const cwd = folder();
    writeFileSync(join(cwd, '.env.example'), 'DATABASE_URL="file:./dev.db"\n');
    expect(ensureEnv({ cwd })).toBe('created');
    expect(readFileSync(join(cwd, '.env'), 'utf8')).toBe('DATABASE_URL="file:./dev.db"\n');
  });

  it('never touches a .env that exists', () => {
    const cwd = folder();
    writeFileSync(join(cwd, '.env.example'), 'DATABASE_URL="file:./dev.db"\n');
    writeFileSync(join(cwd, '.env'), 'DATABASE_URL="file:./mine.db"\n');
    expect(ensureEnv({ cwd })).toBe('exists');
    expect(readFileSync(join(cwd, '.env'), 'utf8')).toBe('DATABASE_URL="file:./mine.db"\n');
  });

  it('does nothing without .env.example', () => {
    const cwd = folder();
    expect(ensureEnv({ cwd })).toBe('no-example');
    expect(existsSync(join(cwd, '.env'))).toBe(false);
  });

  it('ships an .env.example whose defaults run the plugin on this computer', () => {
    const example = readFileSync(join(__dirname, '..', '.env.example'), 'utf8');
    expect(example).toMatch(/^DATABASE_URL="file:\.\/dev\.db"$/m);
    expect(example).toMatch(/^WEBHOOK_SECRET=$/m);
    expect(example).toMatch(/^TOKEN_ENCRYPTION_KEY=$/m);
  });
});
