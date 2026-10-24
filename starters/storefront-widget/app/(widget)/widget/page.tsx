import type { JSX } from 'react';
import manifest from '@/plugin.json';
import { headlineFor } from './headline';
import { WidgetClient } from './widget-client';

export const dynamic = 'force-dynamic';

export default async function WidgetPage({
  searchParams,
}: {
  searchParams: Promise<{ storeId?: string; productId?: string; theme?: string }>;
}): Promise<JSX.Element> {
  const { storeId, productId, theme } = await searchParams;
  const headline = await headlineFor(storeId);

  return (
    <div style={{ colorScheme: theme === 'dark' ? 'dark' : 'light' }}>
      <WidgetClient headline={headline} productId={productId ?? null} pluginId={manifest.pluginId} />
    </div>
  );
}
