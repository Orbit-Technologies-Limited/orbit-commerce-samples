import { listEvents } from '@/lib/events';
import { Unauthorized, sessionFrom } from '@/lib/session';

export const dynamic = 'force-dynamic';

/** The store's own deliveries, read with the store only from its verified session. */
export async function GET(request: Request): Promise<Response> {
  try {
    const session = await sessionFrom(request);
    const items = (await listEvents(session.storeId, 20)).map((event) => ({
      id: event.eventId,
      topic: event.topic,
      receivedAt: event.receivedAt.toISOString(),
    }));
    return Response.json({ items }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) {
    if (error instanceof Unauthorized) {
      return Response.json({ error: 'Unauthorized' }, { status: 401, headers: { 'Cache-Control': 'no-store' } });
    }
    throw error;
  }
}
