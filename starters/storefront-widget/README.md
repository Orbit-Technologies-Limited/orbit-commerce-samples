# Storefront widget starter

This starter makes a block shoppers see on the shop's product page, rendered by your plugin's server with the merchant's public headline and sized through the widget bridge.

## Start

```sh
npx @orbitcommerce/plugin-cli create my-plugin --template storefront-widget
cd my-plugin && npx orbit-plugin login
npx orbit-plugin dev
```

`dev` makes a test store, gives you a secure link to your computer, creates a test version of the plugin and opens Development stores in the partner dashboard: choose Open store to see it.

## Change it

Edit `app/(widget)/widget/` for the block shoppers see, `app/(dashboard)/embed/overview.tsx` for the plugin's own page, and `plugin.json` for where the widget shows, its scopes, the store events it receives and its settings. `dev` makes a new test version when `plugin.json` changes.

Add the widget to the product page in your test store's page builder, then open a product in the shop.

## Shop domains

A shop on its own domain may frame the widget only when Orbit confirms that domain is the store's, so `middleware.ts` works out the `frame-ancestors` header per request with `widgetFrameAncestors` from `@orbitcommerce/sdk/csp` (one lookup, cached a few minutes). Every other page uses the fixed list in `next.config.ts`.

## Release it

```sh
npx orbit-plugin release --env prod --base-url https://your-plugin.example.com
```

## Host it on Orbit

```sh
docker buildx build --platform linux/arm64 .
```

This builds the image Orbit hosting runs. See the [Orbit hosting guide](https://developers.orbitcommerce.net/guides/orbit-hosting).

## Learn more

- [Quickstart](https://developers.orbitcommerce.net/guides/quickstart)
- [Plugin tool](https://developers.orbitcommerce.net/guides/plugin-tool)
- [Looking like Orbit](https://developers.orbitcommerce.net/guides/looking-like-orbit)
- [Orbit hosting](https://developers.orbitcommerce.net/guides/orbit-hosting)
