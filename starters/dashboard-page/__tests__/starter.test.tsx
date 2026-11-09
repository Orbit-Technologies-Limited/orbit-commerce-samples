// @vitest-environment jsdom
import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { Overview } from '../app/(dashboard)/embed/overview';
import manifest from '../plugin.json';

describe('the dashboard-page starter', () => {
  it('declares a dashboard page with a menu item, the connect callback and the webhook route', () => {
    expect(manifest.extensionPoints).toEqual([{ target: 'dashboard.main.embed', url: '/embed', label: 'My plugin' }]);
    // orbit-plugin create names the menu item after your plugin, so any non-empty label is right.
    expect(manifest.ui.menu.label.trim()).not.toBe('');
    expect(manifest.lifecycle.connectUrl).toBe('/api/connect');
    expect(manifest.oauth.webhooks.map((w) => w.topic)).toEqual(['plugin.installed', 'plugin.uninstalled']);
    expect(new Set(manifest.oauth.webhooks.map((w) => w.path))).toEqual(new Set(['/api/webhooks/orbit']));
  });

  it('greets with the setting and lists the newest products', async () => {
    const orbit = {
      settings: { get: vi.fn(async () => ({ settings: { greeting: 'Welcome back' }, schema: manifest.settingsSchema })) },
      products: { list: vi.fn(async () => ({ items: [{ id: 'p1', name: 'Oak desk', status: 'active' }, { id: 'p2', name: 'Ash chair', status: 'draft' }] })) }
    };
    render(<Overview orbit={orbit as never} fetchPlugin={vi.fn()} />);
    expect(await screen.findByRole('heading', { name: 'Welcome back' })).toBeTruthy();
    expect(await screen.findByText('Oak desk')).toBeTruthy();
    expect(screen.getByText('Ash chair')).toBeTruthy();
    expect(orbit.products.list).toHaveBeenCalledWith({ limit: 5 });
  });

  it('says so when the store has no products', async () => {
    const orbit = { settings: { get: async () => ({ settings: {}, schema: manifest.settingsSchema }) }, products: { list: async () => ({ items: [] }) } };
    render(<Overview orbit={orbit as never} fetchPlugin={vi.fn()} />);
    expect(await screen.findByRole('heading', { name: 'Hello' })).toBeTruthy();
    expect(await screen.findByText('Your store has no products yet.')).toBeTruthy();
  });
});
