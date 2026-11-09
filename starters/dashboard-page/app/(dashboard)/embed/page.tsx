'use client';

import { TabsContent } from '@orbitcommerce/constellation';
import { EmbedError, EmbedLoading, EmbedShell, PageHeader, PageTabs, useEmbedTheme } from '@orbitcommerce/plugin-ui';
import manifest from '@/plugin.json';
import { EventsList } from '@/components/events-list';
import { SettingsForm } from '@/components/settings-form';
import { useOrbit } from '@/components/use-orbit';
import { Overview } from './overview';

const EXAMPLE_TOPIC = manifest.oauth.webhooks.find((webhook) => !webhook.topic.startsWith('plugin.'))?.topic ?? 'plugin.installed';

export default function EmbedPage() {
  useEmbedTheme();
  const state = useOrbit();

  if (state.status === 'connecting') return <EmbedLoading />;
  if (state.status === 'error') return <EmbedError message={state.message} />;

  return (
    <EmbedShell>
      <PageHeader title={manifest.listing.name} description={manifest.listing.shortDescription} />
      <PageTabs
        label="Plugin sections"
        tabs={[
          { value: 'overview', label: 'Overview' },
          { value: 'settings', label: 'Settings' },
          { value: 'events', label: 'Events' },
        ]}
        defaultValue="overview"
      >
        <TabsContent value="overview">
          <Overview orbit={state.orbit} fetchPlugin={state.fetchPlugin} />
        </TabsContent>
        <TabsContent value="settings">
          <SettingsForm orbit={state.orbit} />
        </TabsContent>
        <TabsContent value="events">
          <EventsList fetchPlugin={state.fetchPlugin} exampleTopic={EXAMPLE_TOPIC} />
        </TabsContent>
      </PageTabs>
    </EmbedShell>
  );
}
