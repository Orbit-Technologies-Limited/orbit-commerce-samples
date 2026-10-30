import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import manifest from '../plugin.json';

const root = join(__dirname, '..');

/** Every .ts and .tsx file of the plugin's own code. */
function sourceFiles(dir: string): string[] {
  let entries;
  try {
    entries = readdirSync(dir, { withFileTypes: true });
  } catch {
    return [];
  }
  return entries.flatMap((entry) => {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) return entry.name === 'node_modules' ? [] : sourceFiles(full);
    return /\.tsx?$/.test(entry.name) ? [full] : [];
  });
}

const code = ['app', 'components', 'lib']
  .flatMap((dir) => sourceFiles(join(root, dir)))
  .map((file) => readFileSync(file, 'utf8'))
  .join('\n');

// The scope Orbit checks for each call the starter's code makes: GET and PUT /v1/settings.
// Without it the Settings tab says "Could not load the settings" and the product card
// "Missing required scopes: settings:read:store".
const CALLS = [
  { name: 'orbit.settings.get()', call: /\bsettings\s*\.\s*get\s*\(/, scope: 'settings:read:store' },
  { name: 'orbit.settings.update()', call: /\bsettings\s*\.\s*update\s*\(/, scope: 'settings:update:store' },
];

describe('plugin.json scopes', () => {
  it.each(CALLS)('grants the scope $name needs', ({ call, scope }) => {
    expect(call.test(code)).toBe(true);
    expect(manifest.oauth.scopes).toContain(scope);
  });
});
