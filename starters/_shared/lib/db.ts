import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '@prisma/client';
import { isPostgresUrl, requireEnv } from './env';

export function createPrismaClient(url: string = requireEnv('DATABASE_URL')): PrismaClient {
  if (isPostgresUrl(url)) {
    // node-postgres reads the hosted sslmode and sslrootcert as they are.
    return new PrismaClient({ adapter: new PrismaPg({ connectionString: url }) });
  }
  return new PrismaClient({ datasourceUrl: url });
}

const globalForPrisma = globalThis as unknown as { orbitStarterDb?: PrismaClient };

let db: PrismaClient | undefined;

// Made on first use, so next build never opens a database.
export function getDb(): PrismaClient {
  if (db) return db;
  const client =
    process.env.NODE_ENV !== 'production'
      ? (globalForPrisma.orbitStarterDb ?? createPrismaClient())
      : createPrismaClient();
  db = client;
  if (process.env.NODE_ENV !== 'production') globalForPrisma.orbitStarterDb = client;
  return client;
}
