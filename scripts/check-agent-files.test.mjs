import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { AGENT_FILES, checkStarter, commandsInHelp, toolCommandsIn, toolNamesIn } from './check-agent-files.mjs';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const shared = Object.fromEntries(AGENT_FILES.map((f) => [f, readFileSync(join(root, 'starters', '_shared', f), 'utf8')]));
const names = JSON.parse(readFileSync(join(root, 'scripts', 'partner-tool-names.json'), 'utf8'));
const toolNames = [...names.partner, ...names.orbitDev];

const HELP = `Usage: orbit-plugin [options] [command]

Commands:
  validate [options] [paths...]  Check plugin.json
  targets [options]              List the places a plugin can appear
  login [options]                Sign in
  logout                         Sign out
  whoami                         Who you are signed in as
  release [options] [dir]        Create a release
  install-link [options] [dir]   Create an install link
  events                         Send test events
  dev [options] [dir]            Run your plugin on your test store
  create [options] [dir]         Make a plugin folder
  media                          Listing pictures
  deploy [dir]                   Coming soon
  logs [dir]                     Coming soon
  help [command]                 display help for command
`;
const SUB = {
  events: 'Usage: orbit-plugin events [options] [command]\n\nCommands:\n  send [options] <topic> [dir]  Send one test event\n',
  media: 'Usage: orbit-plugin media [options] [command]\n\nCommands:\n  add [options] <files...>  Add an icon or screenshots\n',
};

const check = (over = {}) =>
  checkStarter({ starter: 'product-card', files: { ...shared, ...over }, shared, help: HELP, subHelp: SUB, toolNames });

test('the shared agent files pass every rule', () => {
  assert.deepEqual(check(), []);
});

test('a missing or drifted file is named', () => {
  assert.match(check({ 'CLAUDE.md': undefined }).join('\n'), /starters\/product-card\/CLAUDE\.md: missing/);
  assert.match(check({ 'AGENTS.md': `${shared['AGENTS.md']}\nextra\n` }).join('\n'), /AGENTS\.md: differs from starters\/_shared\/AGENTS\.md/);
});

test('the MCP config must point at the partner MCP and run mcp-dev', () => {
  const config = JSON.parse(shared['.mcp.json']);
  const wrongUrl = JSON.stringify({ ...config, mcpServers: { ...config.mcpServers, 'orbit-partner': { type: 'http', url: 'https://evil.example/mcp' } } });
  const noDev = JSON.stringify({ ...config, mcpServers: { ...config.mcpServers, 'orbit-dev': { type: 'stdio', command: 'npx', args: ['-y', 'something-else'] } } });
  const wrongUrlProblems = checkStarter({ starter: 'product-card', files: { ...shared, '.mcp.json': wrongUrl }, shared: { ...shared, '.mcp.json': wrongUrl }, help: HELP, subHelp: SUB, toolNames });
  assert.match(wrongUrlProblems.join('\n'), /orbit-partner must be an http server/);
  const noDevProblems = checkStarter({ starter: 'product-card', files: { ...shared, '.mcp.json': noDev }, shared: { ...shared, '.mcp.json': noDev }, help: HELP, subHelp: SUB, toolNames });
  assert.match(noDevProblems.join('\n'), /orbit-dev must run @orbitcommerce\/mcp-dev/);
  const broken = checkStarter({ starter: 'product-card', files: { ...shared, '.mcp.json': '{' }, shared: { ...shared, '.mcp.json': '{' }, help: HELP, subHelp: SUB, toolNames });
  assert.match(broken.join('\n'), /not valid JSON/);
});

test('a command or subcommand the tool does not have is named', () => {
  const withCommand = `${shared['AGENTS.md']}\nRun \`npx orbit-plugin publish --json\`.\n`;
  const problems = checkStarter({ starter: 'product-card', files: { ...shared, 'AGENTS.md': withCommand }, shared: { ...shared, 'AGENTS.md': withCommand }, help: HELP, subHelp: SUB, toolNames });
  assert.match(problems.join('\n'), /names "npx orbit-plugin publish"/);
  const withSub = `${shared['AGENTS.md']}\nRun \`npx orbit-plugin media remove shot.png\`.\n`;
  const subProblems = checkStarter({ starter: 'product-card', files: { ...shared, 'AGENTS.md': withSub }, shared: { ...shared, 'AGENTS.md': withSub }, help: HELP, subHelp: SUB, toolNames });
  assert.match(subProblems.join('\n'), /names "npx orbit-plugin media remove"/);
});

test('a tool name no MCP server offers is named, and a real one is not', () => {
  const text = `${shared['AGENTS.md']}\nCall \`delete_my_plugin\` and \`list_test_stores\`.\n`;
  const problems = checkStarter({ starter: 'product-card', files: { ...shared, 'AGENTS.md': text }, shared: { ...shared, 'AGENTS.md': text }, help: HELP, subHelp: SUB, toolNames });
  assert.match(problems.join('\n'), /names the tool `delete_my_plugin`/);
  assert.doesNotMatch(problems.join('\n'), /list_test_stores/);
});

test('an em dash is named with its line', () => {
  const text = `${shared['AGENTS.md']}\nOne thing — and another.\n`;
  const problems = checkStarter({ starter: 'product-card', files: { ...shared, 'AGENTS.md': text }, shared: { ...shared, 'AGENTS.md': text }, help: HELP, subHelp: SUB, toolNames });
  assert.match(problems.join('\n'), /AGENTS\.md:\d+: an em or en dash/);
});

test('the parsers read help, commands and tool names', () => {
  assert.deepEqual(commandsInHelp(SUB.media), ['add']);
  assert.deepEqual(toolCommandsIn('`npx orbit-plugin media add a.png` and `npx orbit-plugin dev --json`'), [
    { command: 'media', sub: 'add' },
    { command: 'dev', sub: undefined },
  ]);
  assert.deepEqual(toolNamesIn('`send_test_event`, `WEBHOOK_SECRET`, `plugin.json`'), ['send_test_event']);
});
