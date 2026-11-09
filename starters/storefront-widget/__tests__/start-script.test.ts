import { describe, expect, it, vi } from 'vitest';
import { isPostgres, main, migrationUrl } from '../scripts/start.mjs';

const HOSTED = 'postgresql://plugin_role:p%40ss@db.eu-west-2.rds.amazonaws.com:5432/plugin_db?sslmode=verify-full&sslrootcert=/orbit/certs/rds-ca-bundle.pem';

describe('start.mjs', () => {
  it('gives Prisma its own TLS parameters for migrations', () => {
    expect(migrationUrl(HOSTED, '/orbit/certs/rds-ca-bundle.pem')).toBe(
      'postgresql://plugin_role:p%40ss@db.eu-west-2.rds.amazonaws.com:5432/plugin_db?sslmode=verify-full&sslcert=/orbit/certs/rds-ca-bundle.pem&sslaccept=strict'
    );
    expect(migrationUrl('postgres://u@localhost:5432/x?application_name=p', '/ca.pem')).toBe('postgres://u@localhost:5432/x?application_name=p&sslmode=verify-full&sslcert=/ca.pem&sslaccept=strict');
    expect(migrationUrl('postgres://u@localhost:5432/x', undefined)).toBe('postgres://u@localhost:5432/x');
  });

  it('migrates a Postgres database before starting, and stops when the migration fails', async () => {
    const run = vi.fn((_command: string, _args: string[], _env: Record<string, string | undefined>) => 0);
    const startServer = vi.fn(async () => undefined);
    await main({ DATABASE_URL: HOSTED, ORBIT_DATABASE_CA_FILE: '/orbit/certs/rds-ca-bundle.pem' }, { run, startServer, exit: vi.fn() });
    expect(run).toHaveBeenCalledWith(process.execPath, ['node_modules/prisma/build/index.js', 'migrate', 'deploy', '--schema', 'prisma/postgres/schema.prisma'], expect.objectContaining({ DATABASE_URL: expect.stringContaining('sslcert=/orbit/certs/rds-ca-bundle.pem') }));
    expect(startServer).toHaveBeenCalled();
    const exit = vi.fn();
    const neverStarts = vi.fn();
    const error = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    await main({ DATABASE_URL: HOSTED }, { run: () => 1, startServer: neverStarts, exit });
    expect(exit).toHaveBeenCalledWith(1);
    expect(neverStarts).not.toHaveBeenCalled();
    expect(String(error.mock.calls[0][0])).not.toContain('p%40ss');
    error.mockRestore();
  });

  it('starts at once on SQLite, on every interface even when the runtime set HOSTNAME to its own name', async () => {
    const run = vi.fn(() => 0);
    const startServer = vi.fn(async () => undefined);
    expect(isPostgres('file:/tmp/check.db')).toBe(false);
    const env: Record<string, string | undefined> = { DATABASE_URL: 'file:/tmp/check.db', HOSTNAME: '9c954b668a44' };
    await main(env, { run, startServer, exit: vi.fn() });
    expect(run).not.toHaveBeenCalled();
    expect(startServer).toHaveBeenCalled();
    expect(env.HOSTNAME).toBe('0.0.0.0');
  });
});
