# Product card starter

This starter adds a card to every product's page in the merchant dashboard, sized to its content, showing the product's stock when the merchant wants it.

## Start

```sh
npx @orbitcommerce/plugin-cli create my-plugin --template product-card
cd my-plugin && npx orbit-plugin login
npx orbit-plugin dev
```

`dev` makes a test store, gives you a secure link to your computer, creates a test version of the plugin and opens Development stores in the partner dashboard: choose Open store to see it.

## Change it

Edit `app/(dashboard)/product-card/page.tsx` for the card and `app/(dashboard)/embed/overview.tsx` for the plugin's own page. Edit `plugin.json` for where the blocks show, its scopes, the store events it receives and its settings. `dev` makes a new test version when `plugin.json` changes. The block's height follows the card through `observeEmbedHeight` from `@orbitcommerce/sdk/embed`.

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
