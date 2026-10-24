# Store events starter

This starter is told when orders and products change, with no screen of its own in the shop. It is the shape of a sync or notification plugin.

## Start

```sh
npx @orbitcommerce/plugin-cli create my-plugin --template events-only
cd my-plugin && npx orbit-plugin login
npx orbit-plugin dev
```

`dev` makes a test store, gives you a secure link to your computer, creates a test version of the plugin and opens the store at your plugin.

## Change it

Edit `lib/on-event.ts` for what the plugin does with each store event. Edit `plugin.json` for where the settings page shows, its scopes, the store events it receives and its settings. `dev` makes a new test version when `plugin.json` changes.

## Add a handler

Add a line to `HANDLERS` in `lib/on-event.ts`, add the topic to `oauth.webhooks` in `plugin.json` with the path `/api/webhooks/orbit`, and add the scope it needs to `oauth.scopes`. `npx orbit-plugin validate` names the scope a topic needs. Then run `npx orbit-plugin events send <topic>` to try it.

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
