import { Prisma } from '@prisma/client';
import type { WebhookEnvelope } from '@orbitcommerce/sdk';
import { removeConnection } from './connections';
import { getDb } from './db';

export interface RecordedEvent {
  eventId: string;
  storeId: string;
  topic: string;
  receivedAt: Date;
}

/**
 * Record a delivery once. The event id makes a redelivery a no-op: Orbit may send the
 * same event more than once, and the unique constraint absorbs the repeats.
 */
export async function recordEvent(event: { id: string; topic: string; storeId: string }): Promise<'recorded' | 'duplicate'> {
  try {
    await getDb().webhookEvent.create({
      data: { eventId: event.id, storeId: event.storeId, topic: event.topic },
    });
    return 'recorded';
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') return 'duplicate';
    throw error;
  }
}

/** A store's deliveries, newest first. */
export async function listEvents(storeId: string, limit = 20): Promise<RecordedEvent[]> {
  const take = Math.min(Math.max(limit, 1), 50);
  return getDb().webhookEvent.findMany({
    where: { storeId },
    orderBy: { receivedAt: 'desc' },
    take,
    select: { eventId: true, storeId: true, topic: true, receivedAt: true },
  });
}

/** Anything the plugin must do before the starter's own handler sees the event. */
export async function handleLifecycle(event: WebhookEnvelope): Promise<void> {
  if (event.topic === 'plugin.uninstalled') await removeConnection(event.store_id);
}
