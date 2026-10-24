# Instructions for AI agents

This is an Orbit Commerce plugin: a Next.js app (App Router, TypeScript) that the store dashboard shows in a frame, with a database of its own. It was made from an Orbit starter by `npx @orbitcommerce/plugin-cli create`.

## Commands

| To | Run |
| --- | --- |
| Run it on your test store (it starts `npm run dev` for you) | `npx orbit-plugin dev` |
| Run the tests | `npm test` |
| Check the types | `npm run type-check` |
| Check `plugin.json` against Orbit's rules | `npx orbit-plugin validate` |
| Release a version stores can install | `npx orbit-plugin release --env prod --base-url <https address>` |
| Write a Postgres migration after a schema change | `npm run db:migration <name>` |

Inside this folder `npx orbit-plugin` runs the copy of the tool in `node_modules`. Sign in once with `npx orbit-plugin login` before `dev`, `events send` or `release`.

## Working as an agent

- `npx orbit-plugin dev --json --create-store --create-plugin` creates what is missing without asking, then prints one JSON object per line on stdout. Wait for the line whose `event` is `release.created`: the plugin is then running on the test store.
- The app's own output goes to stderr, each line starting `[app]`. Read it there.
- `npx orbit-plugin events send <topic> --json` sends a test store event (try `plugin.installed`) and says whether the plugin answered with a 2xx.
- Stop `dev` with SIGTERM. It removes the test version from the store and then prints one last line with `"type": "result"`. Read that last line.
- Every command takes `--json` and `--non-interactive`. A question the tool cannot ask fails with `NEEDS_CONFIRMATION` and names the flag that answers it. `npx orbit-plugin --help` lists the exit codes.

## Where things are

This starter's own files:

- `plugin.json`: the manifest. Where the plugin shows (`extensionPoints`), its scopes and store events (`oauth`), its menu item (`ui.menu`), its settings (`settingsSchema`) and its connect address (`lifecycle.connectUrl`).
- `app/(dashboard)/embed/overview.tsx`: the Overview tab of the plugin's page.
- `lib/on-event.ts`: what the plugin does with each store event.
- `README.md`.
- `__tests__/starter.test.ts` or `starter.test.tsx`: this starter's own tests. The shared tests sit beside it.
- The product-card starter also has `app/(dashboard)/product-card/page.tsx` (the card on the product page). The storefront-widget starter also has `app/(widget)/` (the block shoppers see) and `middleware.ts` (who may frame it).

Shared by every starter, the same in all four:

- `app/(dashboard)/layout.tsx` and `app/(dashboard)/embed/page.tsx`: the dashboard layout, and the page with its Overview, Settings and Events tabs.
- `components/use-orbit.ts` (the handshake with the dashboard), `components/settings-form.tsx`, `components/events-list.tsx`.
- `app/api/connect/route.ts`: Orbit calls it when a store's install becomes active, and it stores that store's tokens, encrypted.
- `app/api/webhooks/orbit/route.ts`: store events, signature checked and recorded once, then handed to `lib/on-event.ts`.
- `app/api/events/route.ts`: the Events tab's data. `app/health/route.ts`: the health check Orbit hosting calls.
- `lib/`: `env.ts` (environment variables), `db.ts` (the database client), `crypto.ts` (tokens at rest), `connections.ts` (a store's tokens and an SDK client for it), `events.ts`, `session.ts` (who is asking).
- `prisma/schema.prisma` (SQLite, on your computer) and `prisma/postgres/schema.prisma` (the same models on Postgres, on Orbit hosting), with `prisma/postgres/migrations/`.
- `Dockerfile` and `scripts/start.mjs`: the image Orbit hosting runs.
- `__tests__/`: the Vitest tests.

## Rules

- The store id comes only from a verified token (`lib/session.ts`) or a verified Orbit call (the connect and webhook routes), never from a request's body, query string or headers.
- Never log or print access tokens, refresh tokens, `WEBHOOK_SECRET` or `TOKEN_ENCRYPTION_KEY`.
- Never read `.env.local` into the conversation: `orbit-plugin dev` keeps `WEBHOOK_SECRET` there, and `create` put `TOKEN_ENCRYPTION_KEY` there. `.env` holds only defaults that are safe to commit.
- To change where the plugin shows, its scopes, events or settings, edit `plugin.json` and let `dev` make the new test version.
- Settings live in Orbit, not in this plugin's database. Add a field to `settingsSchema` in `plugin.json` (`type` is `string`, `number`, `boolean` or `select`, with a `title` and an optional `description` and `default`; a `select` has `options`). The Settings tab shows it at once, and code reads it with `orbit.settings.get()`.
- A new database model goes into both Prisma schemas (a test checks they match), then `npm run db:migration <name>`.
- Colour only from Constellation's `--o-*` tokens, such as `var(--o-fg-1)` for text and `var(--o-fg-2)` for quieter text; no colour values of your own. https://developers.orbitcommerce.net/constellation documents them.
- Words in the UI: plain English, UK spelling, sentence case, no em dashes, no emojis.

## Docs

- Quickstart: https://developers.orbitcommerce.net/guides/quickstart
- The orbit-plugin tool: https://developers.orbitcommerce.net/guides/plugin-tool
