// @vitest-environment jsdom
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { SettingsForm } from '../components/settings-form';

const schema = {
  greeting: { type: 'string', title: 'Greeting', description: 'Shown at the top of your plugin page.', default: 'Hello' },
  show_stock: { type: 'boolean', title: 'Show stock', default: true }
};

describe('SettingsForm', () => {
  it('shows each setting from the schema, and saves only those keys', async () => {
    const update = vi.fn(async (values: Record<string, unknown>) => ({ settings: values, schema }));
    const orbit = { settings: { get: vi.fn(async () => ({ settings: { greeting: 'Hi there', stray: 'x' }, schema })), update } };
    render(<SettingsForm orbit={orbit as never} />);
    const greeting = await screen.findByLabelText('Greeting');
    expect(greeting).toHaveProperty('value', 'Hi there');
    expect(screen.getByText('Shown at the top of your plugin page.')).toBeTruthy();
    expect(screen.getByRole('switch', { name: 'Show stock' }).getAttribute('aria-checked')).toBe('true');
    await userEvent.clear(greeting);
    await userEvent.type(greeting, 'Welcome');
    await userEvent.click(screen.getByRole('button', { name: 'Save' }));
    await waitFor(() => expect(update).toHaveBeenCalledWith({ greeting: 'Welcome', show_stock: true }));
  });

  it('says how to add settings when there are none', async () => {
    const orbit = { settings: { get: vi.fn(async () => ({ settings: {}, schema: {} })), update: vi.fn() } };
    render(<SettingsForm orbit={orbit as never} />);
    expect(await screen.findByText('This plugin has no settings yet. Add them to settingsSchema in plugin.json.')).toBeTruthy();
  });

  it('keeps the values and shows why a save failed', async () => {
    const orbit = { settings: { get: vi.fn(async () => ({ settings: {}, schema })), update: vi.fn(async () => { throw new Error('greeting must be shorter than 100 characters'); }) } };
    render(<SettingsForm orbit={orbit as never} />);
    await userEvent.type(await screen.findByLabelText('Greeting'), '!');
    await userEvent.click(screen.getByRole('button', { name: 'Save' }));
    expect(await screen.findByText('greeting must be shorter than 100 characters')).toBeTruthy();
    expect(screen.getByLabelText('Greeting')).toHaveProperty('value', 'Hello!');
  });
});
