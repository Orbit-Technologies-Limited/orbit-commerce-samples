import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const root = join(__dirname, '..');
const read = (path: string) => readFileSync(join(root, path), 'utf8');
const withoutProvider = (schema: string) =>
  schema.replace(/(datasource db \{[^}]*?)provider\s*=\s*"[^"]+"/, '$1provider = "<provider>"');

describe('the two Prisma schemas', () => {
  it('differ only in the database provider', () => {
    const local = read('prisma/schema.prisma');
    const hosted = read('prisma/postgres/schema.prisma');
    expect(local).toMatch(/provider\s*=\s*"sqlite"/);
    expect(hosted).toMatch(/provider\s*=\s*"postgresql"/);
    expect(withoutProvider(hosted)).toBe(withoutProvider(local));
  });
});
