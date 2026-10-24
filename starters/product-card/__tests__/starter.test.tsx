// @vitest-environment jsdom
import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import manifest from '../plugin.json';

const observeEmbedHeight = vi.fn(() => () => undefined);
vi.mock('@orbitcommerce/sdk/embed', () => ({ observeEmbedHeight, onEmbedTheme: () => () => undefined, readEmbedThemeFromUrl: () => null }));
const state: { current: Record<string, unknown> } = { current: {} };
vi.mock('../components/use-orbit', async (importOriginal) => ({ ...(await importOriginal<object>()), useOrbit: () => state.current }));
const { default: ProductCardPage } = await import('../app/(dashboard)/product-card/page');

function orbitWith(showStock: boolean) {
  return {
    products: { get: vi.fn(async () => ({ id: 'p1', name: 'Oak desk', sku: 'OAK-1', quantity: 12 })) },
    settings: { get: vi.fn(async () => ({ settings: { show_stock: showStock }, schema: manifest.settingsSchema })) }
  };
}

beforeEach(() => {
  window.history.replaceState(null, '', '/product-card?storeId=store-1&resourceType=product&resourceId=p1');
  observeEmbedHeight.mockClear();
});

describe('the product-card starter', () => {
  it('declares the product page block as well as its settings page', () => {
    expect(manifest.extensionPoints.map((e) => e.target)).toEqual(['dashboard.main.embed', 'dashboard.product-details.block']);
    expect(manifest.oauth.webhooks.map((w) => w.topic)).toContain('product.updated');
  });

  it('shows the product named by resourceId, with its stock, and sizes the block to the card', async () => {
    const orbit = orbitWith(true);
    state.current = { status: 'ready', storeId: 'store-1', orbit, fetchPlugin: vi.fn() };
    render(<ProductCardPage />);
    expect(await screen.findByText('Oak desk')).toBeTruthy();
    expect(screen.getByText('OAK-1')).toBeTruthy();
    expect(screen.getByText(/12/)).toBeTruthy();
    expect(orbit.products.get).toHaveBeenCalledWith('p1');
    expect(observeEmbedHeight).toHaveBeenCalledWith(expect.any(HTMLElement));
  });

  it('hides the stock when the merchant turned it off', async () => {
    state.current = { status: 'ready', storeId: 'store-1', orbit: orbitWith(false), fetchPlugin: vi.fn() };
    render(<ProductCardPage />);
    expect(await screen.findByText('Oak desk')).toBeTruthy();
    expect(screen.queryByText(/12/)).toBeNull();
  });

  it('asks for a product when there is none in the address', async () => {
    window.history.replaceState(null, '', '/product-card?storeId=store-1');
    state.current = { status: 'ready', storeId: 'store-1', orbit: orbitWith(true), fetchPlugin: vi.fn() };
    render(<ProductCardPage />);
    expect(await screen.findByText('Open a product to see its card.')).toBeTruthy();
  });
});
