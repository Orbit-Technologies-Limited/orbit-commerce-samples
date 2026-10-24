# Notes for Claude Code

Read AGENTS.md first.

@AGENTS.md

## Claude Code specifics

- `.mcp.json` adds two servers, `orbit-partner` and `orbit-dev`. Claude Code asks the person to approve them the first time it starts in this folder; `/mcp` shows their state and signs in to `orbit-partner`.
- Start `npx orbit-plugin dev --json --create-plugin --create-store` as a background command and read its output as it arrives. Do not wait for it to finish: it runs until stopped.
- To work against a test Orbit instead of the live one, start Claude Code with `ORBIT_MCP_URL`, `ORBIT_API_URL`, `ORBIT_OPENAPI_URL` and `ORBIT_DOCS_URL` set; `.mcp.json` reads them.
