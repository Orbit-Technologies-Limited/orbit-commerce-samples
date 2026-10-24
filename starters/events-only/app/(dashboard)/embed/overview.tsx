'use client';

import { Card, CardBody, CardHeader } from '@orbitcommerce/constellation';
import type { OverviewProps } from '@/components/use-orbit';
import manifest from '@/plugin.json';

const TOPICS = manifest.oauth.webhooks.map((webhook) => webhook.topic);

export function Overview(_props: OverviewProps) {
  return (
    <section style={{ display: 'grid', gap: 16 }}>
      <Card>
        <CardHeader title="Store events this plugin hears" description="This plugin has no screen in the shop. It is told when these things happen in the store." titleAs="h3" />
        <CardBody>
          <ul>
            {TOPICS.map((topic) => (
              <li key={topic}>
                <code>{topic}</code>
              </li>
            ))}
          </ul>
        </CardBody>
      </Card>
      <p>The Events tab shows each one as it arrives. Send one now with npx orbit-plugin events send order.created.</p>
    </section>
  );
}
