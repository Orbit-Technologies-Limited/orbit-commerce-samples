'use client';

import { useEffect, useState, type JSX } from 'react';
import { Card, CardBody, CardHeader, EmptyState } from '@orbitcommerce/constellation';
import type { FetchPlugin } from './use-orbit';

interface EventItem {
  id: string;
  topic: string;
  receivedAt: string;
}

export function EventsList({ fetchPlugin, exampleTopic, refreshMs = 5000 }: { fetchPlugin: FetchPlugin; exampleTopic: string; refreshMs?: number }): JSX.Element {
  const [events, setEvents] = useState<EventItem[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    const load = async () => {
      try {
        const response = await fetchPlugin('/api/events');
        if (!response.ok) throw new Error(`The events request failed (${response.status}).`);
        const data = (await response.json()) as { items?: EventItem[] };
        if (!active) return;
        setEvents(data.items ?? []);
        setError(null);
      } catch (error) {
        if (!active) return;
        setError(error instanceof Error ? error.message : String(error));
      }
    };

    void load();
    const timer = setInterval(() => {
      if (document.visibilityState !== 'hidden') void load();
    }, refreshMs);

    return () => {
      active = false;
      clearInterval(timer);
    };
  }, [fetchPlugin, refreshMs]);

  return (
    <Card>
      <CardHeader title="Recent events" description="The newest events Orbit sent this store, newest first." titleAs="h3" />
      <CardBody>
        {error !== null ? (
          <EmptyState tone="error" title="Could not load the events" description={error} />
        ) : events === null ? (
          <p>Loading events</p>
        ) : events.length === 0 ? (
          <p>{`No events yet. Install the plugin on your test store, or send one with npx orbit-plugin events send ${exampleTopic}.`}</p>
        ) : (
          <ul>
            {events.map((event) => (
              <li key={event.id}>
                <code>{event.topic}</code>{' '}
                {new Date(event.receivedAt).toLocaleString('en-GB', { dateStyle: 'medium', timeStyle: 'medium' })}{' '}
                <span style={{ color: 'var(--o-fg-2)' }}>{event.id}</span>
              </li>
            ))}
          </ul>
        )}
      </CardBody>
    </Card>
  );
}
