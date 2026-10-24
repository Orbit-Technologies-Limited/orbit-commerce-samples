'use client';

import { Card, CardBody, CardHeader } from '@orbitcommerce/constellation';
import type { OverviewProps } from '@/components/use-orbit';

export function Overview(_props: OverviewProps) {
  return (
    <Card>
      <CardHeader title="Where the widget shows" titleAs="h3" />
      <CardBody>
        <p>The widget is a block shoppers see on your shop's product pages. Add it to the product page in your store's page builder, where it is listed under the plugin's name. The Settings tab changes its headline, which shoppers see within a minute.</p>
      </CardBody>
    </Card>
  );
}
