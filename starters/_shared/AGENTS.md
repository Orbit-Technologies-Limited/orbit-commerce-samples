# Building this plugin with an AI agent

This folder is an Orbit Commerce plugin: a Next.js app (App Router, TypeScript) that Orbit shows inside a merchant's dashboard or storefront, described by `plugin.json`, with a database of its own. It was made from an Orbit starter by `npx @orbitcommerce/plugin-cli create`. These notes are for coding agents such as Claude Code, Cursor and Codex, and for the person working with them.

## Three tools, one job each

| Tool | What it does | How to use it |
| --- | --- | --- |
| `orbit-plugin` | Everything on this computer: sign in, run the plugin on a test store over a secure tunnel, send test events, check `plugin.json`, release, add listing pictures, deploy to Orbit hosting | `npx orbit-plugin <command> --json`, run in this folder (its `package.json` brings the tool; outside a plugin folder the package is `npx @orbitcommerce/plugin-cli`). Read the last line of output: one JSON document with `ok` and then `data` or `error`. |
| `orbit-partner` (MCP) | Everything on the Orbit account: plugins and their manifests, releases, test stores, test events and their deliveries, readiness for review, Orbit hosting | Set up in `.mcp.json`. The first call opens a sign-in in the browser for the person. |
| `orbit-dev` (MCP) | Questions about the platform, with no account: the API reference, the guides, the manifest schema, where a plugin can appear, webhook topics, scopes | Set up in `.mcp.json`. |

The knowledge tools (`get_manifest_schema`, `list_extension_targets`, `list_plugin_webhook_topics`, `list_plugin_scopes`, `list_currencies`, `search_developer_docs`, `get_developer_doc`) are on both MCP servers and give the same answers.

## Commands

| To | Run |
| --- | --- |
| Sign in once (prints a sign-in link for the person) | `npx orbit-plugin login --json` |
| Run it on your test store (it starts `npm run dev` for you) | `npx orbit-plugin dev --json --create-plugin --create-store` |
| Send a test store event | `npx orbit-plugin events send plugin.installed --json` |
| Run the tests | `npm test` |
| Check the types | `npm run type-check` |
| Check `plugin.json` against Orbit's rules | `npx orbit-plugin validate --json` |
| Add the listing icon and screenshots | `npx orbit-plugin media add --kind icon icon.png --json`, then `npx orbit-plugin media add shot-1.png shot-2.png shot-3.png --json` |
| Release a version stores can install | `npx orbit-plugin release --env prod --base-url <https address> --json` |
| Write a Postgres migration after a schema change | `npm run db:migration <name>` |

Inside this folder `npx orbit-plugin` runs the copy of the tool in `node_modules`. Every command takes `--json` and `--non-interactive`. A question the tool cannot ask fails with `NEEDS_CONFIRMATION` and names the flag that answers it. `npx orbit-plugin --help` lists the exit codes.

## The usual order of work

1. **Learn what you need.** `list_extension_targets` says where a plugin can appear (for example `dashboard.product-details.block`, a block on the product page). `list_plugin_scopes` and `list_plugin_webhook_topics` say what it may read and which events exist. `search_developer_docs` finds the guide for anything else.
2. **Sign in once.** `npx orbit-plugin login --json` prints a sign-in link first (a `login.waiting` line). Show it to the person and wait while they approve in their browser.
3. **Write the code and `plugin.json`.** Ask only for the scopes the plugin uses.
4. **Run it.** Start `npx orbit-plugin dev --json --create-plugin --create-store` in the background: it keeps running. It starts the app, opens a tunnel, creates a development release on a test store, writes `WEBHOOK_SECRET` into `.env.local`, and prints one JSON event per line on stdout (`plugin.ready`, `store.ready`, `secret.ready`, `tunnel.ready`, `release.created`). When the `release.created` line arrives, the plugin is running on the test store. The app's own output goes to stderr, each line starting `[app]`. It makes a new development release whenever `plugin.json` changes. Stop it with SIGTERM: it removes the test version from the store, then prints one last line with `"type": "result"`.
5. **Test it.** `send_test_event` (or `npx orbit-plugin events send <topic> --json`) sends a signed test event and shows the status code and the start of the app's answer. `list_test_event_deliveries` shows the real deliveries on the test store. `get_test_store_sign_in_link` gives the person a link to look at the plugin in the test store's dashboard: it works once, within a minute, and you must not open it yourself. `npm test` runs the unit tests.
6. **Make the listing.** `update_plugin_draft` sets the short description, description and category. Pictures: `npx orbit-plugin media add --kind icon icon.png --json`, then `npx orbit-plugin media add shot-1.png shot-2.png shot-3.png --json` (at least three screenshots; PNG, JPEG or WebP).
7. **Release it.** `create_plugin_release` then `make_plugin_release_live`, or `npx orbit-plugin release --env prod --base-url <https address> --json`.
8. **Orbit hosting, if the plugin uses it.** A person turns it on, with a plan, on the plugin's Hosting tab in the partner dashboard. A deploy changes what every install runs, so ask the person first; after their yes, `npx orbit-plugin deploy --json --yes` builds and deploys the code (if this version of the tool answers `NOT_AVAILABLE`, the person deploys from the Hosting tab instead). `get_hosting_overview`, `get_server_metrics`, `search_server_logs` and `list_deployments` show how it runs; `set_env_var`, `restart_server` and `rollback_deployment` change it.
9. **Check and submit.** `get_plugin_readiness` lists what is still missing. When everything is ticked, `submit_plugin_for_review`.

## Where things are

This starter's own files:

- `plugin.json`: the manifest. Where the plugin shows (`extensionPoints`), its scopes and store events (`oauth`), its menu item (`ui.menu`), its settings (`settingsSchema`) and its connect address (`lifecycle.connectUrl`). Check it with `npx orbit-plugin validate --json` or `validate_plugin_manifest`.
- `app/(dashboard)/embed/overview.tsx`: the Overview tab of the plugin's page.
- `lib/on-event.ts`: what the plugin does with each store event.
- `README.md`.
- `__tests__/starter.test.ts` or `starter.test.tsx`: this starter's own tests. The shared tests sit beside it.
- The product-card starter also has `app/(dashboard)/product-card/page.tsx` (the card on the product page). The storefront-widget starter also has `app/(widget)/` (the block shoppers see) and `middleware.ts` (who may frame it).

Shared by every starter, the same in all four:

- `app/(dashboard)/layout.tsx` and `app/(dashboard)/embed/page.tsx`: the dashboard layout, and the page with its Overview, Settings and Events tabs.
- `components/use-orbit.ts` (the handshake with the dashboard), `components/settings-form.tsx`, `components/events-list.tsx`.
- `app/api/connect/route.ts`: Orbit calls it when a store's install becomes active, and it stores that store's tokens, encrypted.
- `app/api/webhooks/orbit/route.ts`: store events, signature checked with `WEBHOOK_SECRET` and recorded once, then handed to `lib/on-event.ts`.
- `app/api/events/route.ts`: the Events tab's data. `app/health/route.ts`: the health check Orbit hosting calls.
- `lib/`: `env.ts` (environment variables), `db.ts` (the database client), `crypto.ts` (tokens at rest), `connections.ts` (a store's tokens and an SDK client for it), `events.ts`, `session.ts` (who is asking).
- `prisma/schema.prisma` (SQLite, on your computer) and `prisma/postgres/schema.prisma` (the same models on Postgres, on Orbit hosting), with `prisma/postgres/migrations/`.
- `Dockerfile` and `scripts/start.mjs`: the image Orbit hosting builds and runs.
- `.mcp.json`: the two MCP servers above. `.env.local`: written by `orbit-plugin dev` and `create`, it stays on this computer.
- `__tests__/`: the Vitest tests.

## What stays with the person

- Signing in, and approving what the MCP connection may do.
- Saying yes to every live change. A tool that changes a release, hosting or the listing first answers "Not changed yet: this needs your confirmation" with a question. Show the person that question word for word and wait. Only their yes, in their own next message, lets you call the tool again with the `confirmationToken` it gave. Never answer for them and never reuse a token.
- Turning Orbit hosting on, choosing or changing a plan, and anything to do with a card or money: those are in the partner dashboard only.
- Secrets. Never ask the person to paste a secret into the chat. `set_env_var` never shows a value again, but the value you send passes through this conversation; for a secret the person wants to keep out of it, they set it on the Hosting tab themselves.

## Rules

- The store id comes only from a verified token (`lib/session.ts`) or a verified Orbit call (the connect and webhook routes), never from a request's body, query string or headers. Every database query filters by the store the request is for.
- Never log, print or return access tokens, refresh tokens, `WEBHOOK_SECRET` or `TOKEN_ENCRYPTION_KEY`.
- Never read `.env.local` into the conversation: `orbit-plugin dev` keeps `WEBHOOK_SECRET` there, and `create` put `TOKEN_ENCRYPTION_KEY` there. `.env` is made from `.env.example` the first time you run `npm run dev`, `npm test` or `npm run build`; git ignores it, and no `.env` file is ever committed. Never commit `.env.local` or the local database.
- Keep the signature check on the webhook route, and answer a webhook quickly.
- To change where the plugin shows, its scopes, events or settings, edit `plugin.json` and let `dev` make the new test version.
- Settings live in Orbit, not in this plugin's database. Add a field to `settingsSchema` in `plugin.json` (`type` is `string`, `number`, `boolean` or `select`, with a `title` and an optional `description` and `default`; a `select` has `options`). The Settings tab shows it at once, and code reads it with `orbit.settings.get()`.
- A new database model goes into both Prisma schemas (a test checks they match), then `npm run db:migration <name>`.
- Colour only from Constellation's `--o-*` tokens, such as `var(--o-fg-1)` for text and `var(--o-fg-2)` for quieter text; no colour values of your own. https://developers.orbitcommerce.net/constellation documents them.
- Words in the UI: plain English, UK spelling, sentence case, no em dashes, no emojis.
- Before saying the work is done: `npm test`, `npm run build` and `npx orbit-plugin validate --json` all pass.

## Docs

- Build plugins with AI agents: https://developers.orbitcommerce.net/guides/ai-agents
- Quickstart: https://developers.orbitcommerce.net/guides/quickstart
- The orbit-plugin tool: https://developers.orbitcommerce.net/guides/plugin-tool
