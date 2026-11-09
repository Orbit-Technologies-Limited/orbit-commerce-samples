'use client';

import { Button, Card, CardBody, CardHeader } from '@orbitcommerce/constellation';
import type { OverviewProps } from '@/components/use-orbit';

export function Overview({ orbit }: OverviewProps) {
  return (
    <section style={{ display: 'grid', gap: 16 }}>
      <Card>
        <CardHeader title="Where the card shows" titleAs="h3" />
        <CardBody>
          <p>The card appears on every product's page in your store dashboard. Use the Settings tab to turn the stock line on or off.</p>
        </CardBody>
      </Card>
      <Button onClick={() => orbit.navigate('/products')}>Open products</Button>
    </section>
  );
}
