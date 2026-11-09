import type { WebhookEnvelope } from '@orbitcommerce/sdk';

// Add what the plugin does with each event here; the webhook route has already checked the signature and recorded it.
export async function onEvent(event: WebhookEnvelope): Promise<void> {
  console.log(JSON.stringify({ msg: 'event', topic: event.topic, id: event.id, storeId: event.store_id }));
}
