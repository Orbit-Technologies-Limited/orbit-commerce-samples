import type { ReactNode } from 'react';

// The shop's own page supplies the look, and color-scheme follows the theme the widget page receives.
export default function WidgetLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body style={{ margin: 0, background: 'transparent', fontFamily: 'system-ui, -apple-system, "Segoe UI", Roboto, sans-serif' }}>{children}</body>
    </html>
  );
}
