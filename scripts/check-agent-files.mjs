#!/usr/bin/env node
/**
 * Keep the starters' agent files true.
 *
 * AGENTS.md, CLAUDE.md and .mcp.json tell a coding agent which commands and
 * which MCP tools exist. If they name a command the tool does not have, or a
 * tool the MCP server does not offer, the agent loses its way on the first
 * step. So, for each starter:
 *
 * - the three files exist and are byte for byte the shared copies;
 * - .mcp.json parses, `orbit-partner` is an HTTP server whose default address
 *   is production's partner MCP, and `orbit-dev` runs @orbitcommerce/mcp-dev;
 * - every `npx orbit-plugin <command>` in AGENTS.md is a command the starter's
 *   own copy of the tool lists in its help (and its subcommand, for a command
 *   that has subcommands);
 * - every backticked snake_case word in AGENTS.md is a real MCP tool
 *   (scripts/partner-tool-names.json);
 * - no em dash or en dash.
 *
 * Usage: `node scripts/check-agent-files.mjs [--starter <name>]` from the
 * repository root, or `node ../../scripts/check-agent-files.mjs --starter <name>`
 * from inside a starter (as CI runs it, after `npm ci`). Prints one line per
 * problem and exits 1 when there is any.
 */
import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

export const AGENT_FILES = ['AGENTS.md', 'CLAUDE.md', '.mcp.json'];
export const STARTERS = ['dashboard-page', 'product-card', 'storefront-widget', 'events-only'];
export const PARTNER_MCP_URL = 'https://api.myorbitcommerce.net/mcp/partner';

/** The command names in a commander help text's "Commands:" section. */
export function commandsInHelp(helpText) {
  const lines = helpText.split('\n');
  const start = lines.findIndex((line) => line.trim() === 'Commands:');
  if (start === -1) return [];
  const names = [];
  for (const line of lines.slice(start + 1)) {
    if (!line.trim()) break;
    const match = /^\s+([a-z][a-z-]*)/.exec(line);
    if (match) names.push(match[1]);
  }
  return names;
}

/** Every `npx orbit-plugin <command> [<subcommand>]` an AGENTS.md names. */
export function toolCommandsIn(markdown) {
  const found = [];
  const pattern = /npx orbit-plugin ([a-z][a-z-]*)(?: ([a-z][a-z-]*))?/g;
  for (const match of markdown.matchAll(pattern)) {
    found.push({ command: match[1], sub: match[2] });
  }
  return found;
}

/** Backticked snake_case words that are not MCP tools. */
export const NOT_TOOLS = new Set(['node_modules']);

/** Backticked words that look like MCP tool names: lower case snake_case. */
export function toolNamesIn(markdown) {
  return [
    ...new Set(
      [...markdown.matchAll(/`([a-z][a-z0-9]*(?:_[a-z0-9]+)+)`/g)]
        .map((m) => m[1])
        .filter((word) => !NOT_TOOLS.has(word))
    )
  ];
}

/**
 * The problems with one starter's agent files. Pure: every input is passed in.
 *
 * files and shared map a file name to its content (or undefined when it does
 * not exist); help is the tool's `--help`; subHelp maps a command to its own
 * `--help`; toolNames is every MCP tool name AGENTS.md may use.
 */
export function checkStarter({ starter, files, shared, help, subHelp = {}, toolNames }) {
  const problems = [];
  const where = (file) => `starters/${starter}/${file}`;

  for (const file of AGENT_FILES) {
    if (files[file] === undefined) problems.push(`${where(file)}: missing`);
    else if (files[file] !== shared[file]) {
      problems.push(`${where(file)}: differs from starters/_shared/${file} (edit the shared copy, then node scripts/sync-shared.mjs)`);
    }
  }

  if (files['.mcp.json'] !== undefined) {
    let config;
    try {
      config = JSON.parse(files['.mcp.json']);
    } catch (error) {
      problems.push(`${where('.mcp.json')}: not valid JSON (${error.message})`);
    }
    const servers = config?.mcpServers ?? {};
    const partner = servers['orbit-partner'];
    if (config && (!partner || partner.type !== 'http' || !String(partner.url ?? '').includes(PARTNER_MCP_URL))) {
      problems.push(`${where('.mcp.json')}: orbit-partner must be an http server whose default address is ${PARTNER_MCP_URL}`);
    }
    const dev = servers['orbit-dev'];
    if (config && !(dev?.args ?? []).some((arg) => String(arg).startsWith('@orbitcommerce/mcp-dev'))) {
      problems.push(`${where('.mcp.json')}: orbit-dev must run @orbitcommerce/mcp-dev`);
    }
  }

  for (const file of ['AGENTS.md', 'CLAUDE.md']) {
    const text = files[file] ?? '';
    text.split('\n').forEach((line, i) => {
      if (/[–—]/.test(line)) problems.push(`${where(file)}:${i + 1}: an em or en dash; reword it`);
    });
  }

  const agents = files['AGENTS.md'] ?? '';
  if (help !== undefined) {
    const commands = commandsInHelp(help);
    for (const { command, sub } of toolCommandsIn(agents)) {
      if (!commands.includes(command)) {
        problems.push(`${where('AGENTS.md')}: names "npx orbit-plugin ${command}", which this starter's orbit-plugin does not have`);
        continue;
      }
      const subs = subHelp[command] === undefined ? [] : commandsInHelp(subHelp[command]);
      if (sub && subs.length > 0 && !subs.includes(sub)) {
        problems.push(`${where('AGENTS.md')}: names "npx orbit-plugin ${command} ${sub}", which this starter's orbit-plugin does not have`);
      }
    }
  }

  const known = new Set(toolNames);
  for (const name of toolNamesIn(agents)) {
    if (!known.has(name)) {
      problems.push(`${where('AGENTS.md')}: names the tool \`${name}\`, which no Orbit MCP server offers (scripts/partner-tool-names.json)`);
    }
  }

  return problems;
}

function read(path) {
  return existsSync(path) ? readFileSync(path, 'utf8') : undefined;
}

function helpOf(starterDir, args) {
  const bin = join(starterDir, 'node_modules', '.bin', 'orbit-plugin');
  if (!existsSync(bin)) return undefined;
  return execFileSync(bin, [...args, '--help'], { cwd: starterDir, encoding: 'utf8' });
}

function main() {
  const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
  const args = process.argv.slice(2);
  const at = args.indexOf('--starter');
  const starters = at === -1 ? STARTERS : [args[at + 1]];
  const names = JSON.parse(readFileSync(join(root, 'scripts', 'partner-tool-names.json'), 'utf8'));
  const toolNames = [...names.partner, ...names.orbitDev];
  const shared = Object.fromEntries(AGENT_FILES.map((f) => [f, read(join(root, 'starters', '_shared', f))]));

  const problems = [];
  for (const starter of starters) {
    const dir = join(root, 'starters', starter);
    const files = Object.fromEntries(AGENT_FILES.map((f) => [f, read(join(dir, f))]));
    const help = helpOf(dir, []);
    if (help === undefined) {
      problems.push(`starters/${starter}: no node_modules/.bin/orbit-plugin, so its commands cannot be checked (run npm ci there first)`);
    }
    const subHelp = {};
    if (help !== undefined) {
      for (const { command, sub } of toolCommandsIn(files['AGENTS.md'] ?? '')) {
        if (sub && subHelp[command] === undefined && commandsInHelp(help).includes(command)) {
          subHelp[command] = helpOf(dir, [command]);
        }
      }
    }
    problems.push(...checkStarter({ starter, files, shared, help, subHelp, toolNames }));
  }

  for (const problem of problems) console.log(problem);
  if (problems.length > 0) process.exit(1);
  console.log(`Agent files are true in ${starters.join(', ')}.`);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) main();
