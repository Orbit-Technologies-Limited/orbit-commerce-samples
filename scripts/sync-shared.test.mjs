import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdirSync, mkdtempSync, readFileSync, writeFileSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { STARTERS, expectedContent, listSharedFiles, packageNameFor, syncShared } from './sync-shared.mjs';

function repo() {
  const root = mkdtempSync(join(tmpdir(), 'samples-'));
  const shared = join(root, 'starters', '_shared');
  mkdirSync(join(shared, 'lib'), { recursive: true });
  mkdirSync(join(shared, 'node_modules', 'x'), { recursive: true });
  writeFileSync(join(shared, 'package.json'), JSON.stringify({ name: 'orbit-starter', version: '1.0.0', private: true }, null, 2) + '\n');
  writeFileSync(join(shared, 'package-lock.json'), JSON.stringify({ name: 'orbit-starter', version: '1.0.0', lockfileVersion: 3, packages: { '': { name: 'orbit-starter', version: '1.0.0' } } }, null, 2) + '\n');
  writeFileSync(join(shared, 'lib', 'env.ts'), 'export const A = 1;\n');
  writeFileSync(join(shared, 'node_modules', 'x', 'index.js'), '');
  writeFileSync(join(shared, 'prisma.db'), '');
  for (const s of STARTERS) {
    mkdirSync(join(root, 'starters', s), { recursive: true });
    writeFileSync(join(root, 'starters', s, 'plugin.json'), '{}\n');
  }
  return root;
}

test('lists the shared files, without node_modules or databases', () => {
  const root = repo();
  assert.deepEqual(listSharedFiles(join(root, 'starters', '_shared')), ['lib/env.ts', 'package-lock.json', 'package.json']);
});

test('names each copy of package.json and the lockfile for its starter', () => {
  const pkg = JSON.parse(expectedContent('package.json', '{"name":"orbit-starter","version":"1.0.0"}', 'product-card'));
  assert.equal(pkg.name, 'orbit-starter-product-card');
  const lock = JSON.parse(expectedContent('package-lock.json', '{"name":"orbit-starter","packages":{"":{"name":"orbit-starter"}}}', 'events-only'));
  assert.equal(lock.name, packageNameFor('events-only'));
  assert.equal(lock.packages[''].name, 'orbit-starter-events-only');
  assert.equal(expectedContent('lib/env.ts', 'x', 'events-only'), 'x');
});

test('copies into every starter, then reports nothing to do', () => {
  const root = repo();
  const first = syncShared({ root, check: false });
  assert.equal(first.written.length, STARTERS.length * 3);
  assert.equal(readFileSync(join(root, 'starters', 'dashboard-page', 'lib', 'env.ts'), 'utf8'), 'export const A = 1;\n');
  assert.equal(JSON.parse(readFileSync(join(root, 'starters', 'storefront-widget', 'package.json'), 'utf8')).name, 'orbit-starter-storefront-widget');
  assert.equal(existsSync(join(root, 'starters', 'dashboard-page', 'node_modules')), false);
  assert.equal(readFileSync(join(root, 'starters', 'dashboard-page', 'plugin.json'), 'utf8'), '{}\n');
  assert.deepEqual(syncShared({ root, check: true }).differing, []);
});

test('--check names every copy that drifted, and writes nothing', () => {
  const root = repo();
  syncShared({ root, check: false });
  writeFileSync(join(root, 'starters', 'product-card', 'lib', 'env.ts'), 'export const A = 2;\n');
  const result = syncShared({ root, check: true });
  assert.deepEqual(result.differing, ['product-card/lib/env.ts']);
  assert.equal(readFileSync(join(root, 'starters', 'product-card', 'lib', 'env.ts'), 'utf8'), 'export const A = 2;\n');
});

test('adopts a starter lockfile into _shared under the shared name', () => {
  const root = repo();
  syncShared({ root, check: false });
  writeFileSync(join(root, 'starters', 'dashboard-page', 'package-lock.json'), JSON.stringify({ name: 'orbit-starter-dashboard-page', lockfileVersion: 3, packages: { '': { name: 'orbit-starter-dashboard-page', version: '1.0.0' }, 'node_modules/next': { version: '15.5.28' } } }));
  syncShared({ root, check: false, adoptLockFrom: 'dashboard-page' });
  const shared = JSON.parse(readFileSync(join(root, 'starters', '_shared', 'package-lock.json'), 'utf8'));
  assert.equal(shared.name, 'orbit-starter');
  assert.equal(shared.packages['node_modules/next'].version, '15.5.28');
  assert.equal(JSON.parse(readFileSync(join(root, 'starters', 'events-only', 'package-lock.json'), 'utf8')).packages['node_modules/next'].version, '15.5.28');
});

test('never copies a local .env or .env.local out of _shared', () => {
  const root = repo();
  writeFileSync(join(root, 'starters', '_shared', '.env'), 'DATABASE_URL="file:./mine.db"\n');
  writeFileSync(join(root, 'starters', '_shared', '.env.local'), 'WEBHOOK_SECRET=x\n');
  writeFileSync(join(root, 'starters', '_shared', '.env.example'), 'DATABASE_URL=\n');
  assert.deepEqual(listSharedFiles(join(root, 'starters', '_shared')), ['.env.example', 'lib/env.ts', 'package-lock.json', 'package.json']);
});
