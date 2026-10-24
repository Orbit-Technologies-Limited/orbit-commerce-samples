import '@orbitcommerce/constellation/fonts.css';
import '@orbitcommerce/constellation/styles.css';
import '@orbitcommerce/plugin-ui/embed.css';
import { THEME_INIT_SCRIPT } from '@orbitcommerce/plugin-ui/theme';
import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import manifest from '@/plugin.json';

export const metadata: Metadata = { title: manifest.listing.name };

// The script paints light or dark before the first frame, so there is no flash.
// This is the root layout for the dashboard pages only; a storefront widget has its own.
export default function DashboardLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_INIT_SCRIPT }} />
      </head>
      <body className="o-root orbit-embed">{children}</body>
    </html>
  );
}
