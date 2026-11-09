'use client';

import { useEffect, useState } from 'react';
import { Card, CardBody, CardHeader, EmptyState } from '@orbitcommerce/constellation';
import type { Product } from '@orbitcommerce/sdk';
import type { OverviewProps } from '@/components/use-orbit';
import manifest from '@/plugin.json';

const DEFAULT_GREETING = manifest.settingsSchema.greeting.default;

export function Overview({ orbit }: OverviewProps) {
  const [greeting, setGreeting] = useState(DEFAULT_GREETING);
  const [products, setProducts] = useState<Product[] | null>(null);
  const [productsError, setProductsError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    orbit.settings
      .get()
      .then(({ settings, schema }) => {
        if (!active) return;
        if (typeof settings.greeting === 'string' && settings.greeting.length > 0) {
          setGreeting(settings.greeting);
        } else if (typeof schema.greeting?.default === 'string') {
          setGreeting(schema.greeting.default);
        }
      })
      .catch(() => {
        // Keep the default greeting.
      });

    orbit.products
      .list({ limit: 5 })
      .then((response) => {
        if (!active) return;
        setProducts(response.items);
      })
      .catch((error: unknown) => {
        if (!active) return;
        setProductsError(error instanceof Error ? error.message : String(error));
      });

    return () => {
      active = false;
    };
  }, [orbit]);

  return (
    <section style={{ display: 'grid', gap: 16 }}>
      <h2>{greeting}</h2>
      <Card>
        <CardHeader title="Newest products" description="The five newest products in your store." titleAs="h3" />
        <CardBody>
          {productsError !== null ? (
            <EmptyState size="sm" tone="error" title="Could not load your products" description={productsError} />
          ) : products === null ? (
            <p>Loading products</p>
          ) : products.length === 0 ? (
            <EmptyState size="sm" title="Your store has no products yet." />
          ) : (
            <ul>
              {products.map((product) => (
                <li key={product.id}>
                  {product.name} <span style={{ color: 'var(--o-fg-2)' }}>{product.status}</span>
                </li>
              ))}
            </ul>
          )}
        </CardBody>
      </Card>
    </section>
  );
}
