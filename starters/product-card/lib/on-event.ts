import type { WebhookEnvelope } from '@orbitcommerce/sdk';

// Only product changes matter to this starter; the webhook route has already checked and recorded the event.
export async function onEvent(event: WebhookEnvelope): Promise<void> {
  if (event.topic !== 'product.updated') return;
  const data = event.data as { id?: unknown };
  const productId = typeof data.id === 'string' ? data.id : null;
  console.log(JSON.stringify({ msg: 'A product changed', topic: event.topic, id: event.id, storeId: event.store_id, productId }));
}
