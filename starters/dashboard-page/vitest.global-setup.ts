import { execFileSync } from 'node:child_process';
import { rmSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const database = fileURLToPath(new URL('./prisma/test.db', import.meta.url));
const journal = fileURLToPath(new URL('./prisma/test.db-journal', import.meta.url));

export default function setup() {
  rmSync(database, { force: true });
  rmSync(journal, { force: true });
  // Generate as well, so tests still run after a build that wrote the Postgres client.
  execFileSync(process.platform === 'win32' ? 'npx.cmd' : 'npx', ['prisma', 'db', 'push', '--accept-data-loss'], {
    stdio: 'inherit',
    env: { ...process.env, DATABASE_URL: 'file:./test.db' },
  });

  return () => {
    rmSync(database, { force: true });
    rmSync(journal, { force: true });
  };
}
