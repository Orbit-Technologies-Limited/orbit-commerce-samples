# Orbit Commerce samples

Starters for building plugins on [Orbit Commerce](https://orbitcommerce.net). Each one is a small, complete plugin that runs on a test store in one step, and is written to be read and changed.

## The starters

| Starter | What it makes | Where it appears | Create it |
| --- | --- | --- | --- |
| [`dashboard-page`](./starters/dashboard-page) | A page of its own, with a menu item | The merchant dashboard | `npx @orbitcommerce/plugin-cli create my-plugin --template dashboard-page` |
| [`product-card`](./starters/product-card) | A card sized to its content | Every product's page in the merchant dashboard | `npx @orbitcommerce/plugin-cli create my-plugin --template product-card` |
| [`storefront-widget`](./starters/storefront-widget) | A block shoppers see | The shop's product page | `npx @orbitcommerce/plugin-cli create my-plugin --template storefront-widget` |
| [`events-only`](./starters/events-only) | Handlers for store events, and a settings page | No screen in the shop | `npx @orbitcommerce/plugin-cli create my-plugin --template events-only` |

## Three commands

```sh
npx @orbitcommerce/plugin-cli create my-plugin --template dashboard-page
cd my-plugin && npx orbit-plugin login
npx orbit-plugin dev
```

`dev` makes you a test store if you have none, opens a secure link to your computer, makes a test version of your plugin on that link and opens Development stores in the partner dashboard, where Open store shows the test store with your plugin. Ctrl+C removes the test version again.

## What every starter has

- Next.js (App Router) and TypeScript, `@orbitcommerce/sdk` and `@orbitcommerce/plugin-ui` on Constellation, so its pages look like the store dashboard in light and dark.
- A database through Prisma: SQLite on your computer, Postgres on Orbit hosting, with migrations you can write without a Postgres of your own (`npm run db:migration <name>`).
- The connect callback that stores each store's tokens, encrypted; a webhook route that accepts only signed events; a settings page; and a valid `plugin.json`.
- A `Dockerfile` for linux/arm64 that Orbit hosting runs as it is, with a `/health` route.
- `AGENTS.md` and `CLAUDE.md` for AI agents, Vitest tests, and a README.

## The shared base

`create` copies one starter folder, so every starter is complete on its own. The files they share are written once, in [`starters/_shared`](./starters/_shared), and copied into each starter by `node scripts/sync-shared.mjs`; CI runs `node scripts/sync-shared.mjs --check` and fails when a copy differs.

To change a shared file: edit it in `starters/_shared`, run `node scripts/sync-shared.mjs`, test it in any starter, and commit both. After `npm install` in a starter, `node scripts/sync-shared.mjs --adopt-lock <starter>` takes that starter's lockfile into `_shared` and copies it to the others. A starter's own files (`plugin.json`, `README.md`, `app/(dashboard)/embed/overview.tsx`, `lib/on-event.ts` and its own pages) are never touched by the sync.

## Documentation

- [Quickstart: your first plugin in ten minutes](https://developers.orbitcommerce.net/guides/quickstart)
- [The orbit-plugin tool](https://developers.orbitcommerce.net/guides/plugin-tool)
- [Where plugins appear](https://developers.orbitcommerce.net/guides/where-plugins-appear)
- [Guides](https://developers.orbitcommerce.net/guides) and the [API reference](https://developers.orbitcommerce.net/api-reference)

## Licence

MIT: see [LICENSE](./LICENSE). Use these however you like.
