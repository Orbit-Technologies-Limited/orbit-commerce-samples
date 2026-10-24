#!/usr/bin/env node
/**
 * Keep every starter's shared files identical to starters/_shared.
 *
 * The shared folder is the one source. A copy inside a starter is generated
 * output: edit the file in _shared instead. `--check` turns a drifted copy into
 * a failed build, so a change cannot land in only some of the starters.
 *
 * A starter's own files are left alone. A lockfile adopted from one starter is
 * renamed back to the shared name before it is copied out again.
 */
import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, relative, sep } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

export const STARTERS = ['dashboard-page', 'product-card', 'storefront-widget', 'events-only'];
export const SHARED_DIR = 'starters/_shared';
export const SKIP = ['node_modules', '.next', '.data', 'coverage'];

export function packageNameFor(starter) {
  return `orbit-starter-${starter}`;
}

/** Every shared file, as sorted POSIX paths relative to the shared folder. */
export function listSharedFiles(sharedDir) {
  const files = [];
  const walk = (dir) => {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      if (SKIP.includes(entry.name)) continue;
      const full = join(dir, entry.name);
      if (entry.isDirectory()) {
        walk(full);
      } else if (entry.isFile()) {
        if (entry.name.endsWith('.db') || entry.name.endsWith('.db-journal')) continue;
        files.push(relative(sharedDir, full).split(sep).join('/'));
      }
    }
  };
  walk(sharedDir);
  return files.sort();
}

/** The content a starter should have for a shared file. */
export function expectedContent(relPath, content, starter) {
  if (relPath !== 'package.json' && relPath !== 'package-lock.json') return content;
  const value = JSON.parse(Buffer.isBuffer(content) ? content.toString('utf8') : content);
  value.name = packageNameFor(starter);
  if (relPath === 'package-lock.json' && value.packages && value.packages['']) {
    value.packages[''].name = packageNameFor(starter);
  }
  return JSON.stringify(value, null, 2) + '\n';
}

export function syncShared({ root, check = false, adoptLockFrom }) {
  const sharedDir = join(root, SHARED_DIR);

  if (check && adoptLockFrom) {
    throw new Error('Cannot adopt a lockfile while checking for drift.');
  }

  if (adoptLockFrom) {
    if (!STARTERS.includes(adoptLockFrom)) {
      throw new Error(`Unknown starter ${adoptLockFrom}. Use one of ${STARTERS.join(', ')}.`);
    }
    const from = join(root, 'starters', adoptLockFrom, 'package-lock.json');
    if (!existsSync(from)) {
      throw new Error(`No lockfile to adopt at starters/${adoptLockFrom}/package-lock.json.`);
    }
    const lock = JSON.parse(readFileSync(from, 'utf8'));
    lock.name = 'orbit-starter';
    if (lock.packages && lock.packages['']) lock.packages[''].name = 'orbit-starter';
    writeFileSync(join(sharedDir, 'package-lock.json'), JSON.stringify(lock, null, 2) + '\n');
  }

  const written = [];
  const differing = [];
  for (const starter of STARTERS) {
    for (const relPath of listSharedFiles(sharedDir)) {
      const source = readFileSync(join(sharedDir, ...relPath.split('/')));
      const expected = expectedContent(relPath, source, starter);
      const target = join(root, 'starters', starter, ...relPath.split('/'));
      const current = existsSync(target) ? readFileSync(target) : null;
      const wanted = Buffer.isBuffer(expected) ? expected : Buffer.from(expected);
      if (current && current.equals(wanted)) continue;

      const name = `${starter}/${relPath}`;
      if (check) {
        differing.push(name);
      } else {
        mkdirSync(dirname(target), { recursive: true });
        writeFileSync(target, expected);
        written.push(name);
      }
    }
  }
  return { written, differing };
}

const cli = () => {
  const args = process.argv.slice(2);
  const check = args.includes('--check');
  const adoptIndex = args.indexOf('--adopt-lock');
  const adoptLockFrom = adoptIndex === -1 ? undefined : args[adoptIndex + 1];
  const root = fileURLToPath(new URL('..', import.meta.url));

  try {
    if (adoptIndex !== -1 && !adoptLockFrom) {
      throw new Error('--adopt-lock needs a starter name.');
    }
    const result = syncShared({ root, check, adoptLockFrom });
    if (check) {
      if (result.differing.length) {
        for (const name of result.differing) console.log(`${name} differs`);
        console.log('Run node scripts/sync-shared.mjs and commit the result.');
        process.exit(1);
      }
      console.log('Shared files match in every starter.');
    } else {
      for (const name of result.written) console.log(`wrote ${name}`);
      if (!result.written.length) console.log('Nothing to copy.');
    }
  } catch (error) {
    console.error(error.message);
    process.exit(2);
  }
};

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) cli();
