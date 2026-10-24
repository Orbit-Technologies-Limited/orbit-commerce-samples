import { WebhookVerificationError, verifyWebhook, type WebhookEnvelope } from '@orbitcommerce/sdk';
import { after } from 'next/server';
import { handleLifecycle, recordEvent } from '@/lib/events';
import { onEvent } from '@/lib/on-event';

export const dynamic = 'force-dynamic';

/**
 * Orbit calls this for every subscribed webhook. Verify the signature, record the
 * delivery once, answer immediately, then do the work.
 */
export async function POST(request: Request): Promise<Response> {
  const secret = process.env.WEBHOOK_SECRET ?? '';
  let event: WebhookEnvelope;
  try {
    event = await verifyWebhook(await request.text(), request.headers, secret, { requireTimestamp: true });
  } catch (error) {
    if (error instanceof WebhookVerificationError) return new Response(error.reason, { status: error.status });
    throw error;
  }

  if ((await recordEvent({ id: event.id, topic: event.topic, storeId: event.store_id })) === 'duplicate') {
    return new Response(null, { status: 204 });
  }

  // Orbit retries a delivery that waits, so answer first and handle the event after.
  after(async () => {
    try {
      await handleLifecycle(event);
      await onEvent(event);
    } catch (error) {
      console.error(JSON.stringify({ msg: 'event handler failed', topic: event.topic, id: event.id, error: error instanceof Error ? error.message : String(error) }));
    }
  });
  return new Response(null, { status: 204 });
}
