'use client';

import { useEffect, useRef, type JSX } from 'react';
import { createWidgetBridge } from '@orbitcommerce/sdk/widget';

export function WidgetClient({ headline, productId, pluginId }: { headline: string; productId: string | null; pluginId: string }): JSX.Element {
  const root = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const bridge = createWidgetBridge({ pluginId });
    const stop = root.current ? bridge.observeHeight(root.current) : () => undefined;
    return () => {
      stop();
      bridge.dispose();
    };
  }, [pluginId]);

  // flow-root: the box contains its children's margins, so observeHeight reports the whole widget.
  return (
    <div ref={root} style={{ display: 'flow-root' }}>
      <h2>{headline}</h2>
      <p>
        {productId
          ? `This block sits on product ${productId}. Put your own content here.`
          : 'Add this block to a product page in the page builder.'}
      </p>
    </div>
  );
}
