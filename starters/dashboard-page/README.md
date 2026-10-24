# Dashboard page starter

This starter makes a page of your own in the merchant dashboard, with a menu item, that greets the merchant with a setting and lists the store's newest products.

## Start

```sh
npx @orbitcommerce/plugin-cli create my-plugin --template dashboard-page
cd my-plugin && npx orbit-plugin login
npx orbit-plugin dev
```

`dev` makes a test store, gives you a secure link to your computer, creates a test version of the plugin and opens the store at your plugin.

## Change it

Edit `app/(dashboard)/embed/overview.tsx` for the page itself. Edit `plugin.json` for where the page shows, its scopes, the store events it receives and its settings. `dev` makes a new test version when `plugin.json` changes.

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
