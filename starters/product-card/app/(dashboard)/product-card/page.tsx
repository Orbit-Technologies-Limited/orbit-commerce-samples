'use client';

import { useEffect, useRef, useState } from 'react';
import { Card, CardBody } from '@orbitcommerce/constellation';
import { EmbedError, EmbedLoading, useEmbedTheme } from '@orbitcommerce/plugin-ui';
import { observeEmbedHeight } from '@orbitcommerce/sdk/embed';
import type { Product } from '@orbitcommerce/sdk';
import { useOrbit } from '@/components/use-orbit';

const DEFAULT_SHOW_STOCK = true;

export default function ProductCardPage() {
  useEmbedTheme();
  const state = useOrbit();
  const root = useRef<HTMLDivElement>(null);
  const [resourceId, setResourceId] = useState<string | null>(null);
  const [product, setProduct] = useState<Product | null>(null);
  const [showStock, setShowStock] = useState(DEFAULT_SHOW_STOCK);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setResourceId(new URLSearchParams(window.location.search).get('resourceId'));
  }, []);

  useEffect(() => {
    if (!root.current) return;
    return observeEmbedHeight(root.current);
  }, []);

  useEffect(() => {
    if (state.status !== 'ready' || !resourceId) return;
    let active = true;
    setProduct(null);
    setError(null);

    Promise.all([state.orbit.products.get(resourceId), state.orbit.settings.get()])
      .then(([loaded, settingsResponse]) => {
        if (!active) return;
        setProduct(loaded);
        const value = settingsResponse.settings.show_stock;
        const schemaDefault = settingsResponse.schema.show_stock?.default;
        setShowStock(typeof value === 'boolean' ? value : typeof schemaDefault === 'boolean' ? schemaDefault : DEFAULT_SHOW_STOCK);
      })
      .catch((error: unknown) => {
        if (!active) return;
        setError(error instanceof Error ? error.message : String(error));
      });

    return () => {
      active = false;
    };
  }, [state, resourceId]);

  return (
    <div ref={root}>
      {state.status === 'connecting' ? (
        <EmbedLoading />
      ) : state.status === 'error' ? (
        <EmbedError message={state.message} />
      ) : resourceId === null ? (
        <p>Open a product to see its card.</p>
      ) : error !== null ? (
        <p role="alert">{error}</p>
      ) : product === null ? (
        <p>Loading the product</p>
      ) : (
        <Card padding="sm">
          <CardBody>
            <div style={{ display: 'grid', gap: 4 }}>
              <strong>{product.name}</strong>
              {product.sku ? <span>{product.sku}</span> : null}
              {showStock ? <span>{product.quantity} in stock</span> : null}
            </div>
          </CardBody>
        </Card>
      )}
    </div>
  );
}
