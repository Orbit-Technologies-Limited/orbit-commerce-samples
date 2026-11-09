import type { WebhookEnvelope } from '@orbitcommerce/sdk';

// The body can hold customer details, so log only the topic, ids and store.
function logLine(msg: string): (event: WebhookEnvelope) => Promise<void> {
  return async (event) => {
    const data = event.data as { id?: unknown };
    const resourceId = typeof data.id === 'string' ? data.id : null;
    console.log(JSON.stringify({ msg, topic: event.topic, id: event.id, storeId: event.store_id, resourceId }));
  };
}

export const HANDLERS: Partial<Record<string, (event: WebhookEnvelope) => Promise<void>>> = {
  'order.created': logLine('A new order'),
  'order.paid': logLine('An order was paid'),
  'product.updated': logLine('A product changed'),
};

export async function onEvent(event: WebhookEnvelope): Promise<void> {
  await HANDLERS[event.topic]?.(event);
}
