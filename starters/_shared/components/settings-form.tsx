'use client';

import { useEffect, useState, type FormEvent, type JSX } from 'react';
import type { OrbitClient, SettingsSchema, SettingsSchemaField } from '@orbitcommerce/sdk';
import { Button, EmptyState, Field, Input, Select, Switch, toast } from '@orbitcommerce/constellation';

export function SettingsForm({ orbit }: { orbit: Pick<OrbitClient, 'settings'> }): JSX.Element {
  const [schema, setSchema] = useState<SettingsSchema>({});
  const [values, setValues] = useState<Record<string, unknown>>({});
  const [snapshot, setSnapshot] = useState('');
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setLoadError(null);
    orbit.settings
      .get()
      .then((response) => {
        if (cancelled) return;
        const initial = initialValues(response.schema, response.settings);
        setSchema(response.schema);
        setValues(initial);
        setSnapshot(JSON.stringify(initial));
        setLoading(false);
      })
      .catch((error: unknown) => {
        if (cancelled) return;
        setLoadError(error instanceof Error ? error.message : String(error));
        setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [orbit]);

  if (loading) return <p>Loading settings</p>;
  if (loadError !== null) {
    return <EmptyState tone="error" title="Could not load the settings" technicalDetails={loadError} />;
  }
  if (Object.keys(schema).length === 0) {
    return <EmptyState title="Nothing to set up yet" description="This plugin has no settings yet. Add them to settingsSchema in plugin.json." />;
  }

  const dirty = JSON.stringify(values) !== snapshot;

  function setValue(key: string, value: unknown) {
    setValues((current) => ({ ...current, [key]: value }));
    setSaveError(null);
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (saving || !dirty) return;
    const payload = payloadFrom(schema, values);
    setSaving(true);
    setSaveError(null);
    try {
      await orbit.settings.update(payload);
      setSnapshot(JSON.stringify(values));
      toast.success('Settings saved');
    } catch (error) {
      setSaveError(error instanceof Error ? error.message : String(error));
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={submit} style={{ display: 'grid', gap: 16 }}>
      {Object.entries(schema).map(([key, field]) => renderField(key, field, values[key], setValue))}
      <div style={{ display: 'grid', gap: 8 }}>
        <Button type="submit" variant="primary" loading={saving} disabled={saving || !dirty}>
          Save
        </Button>
        {saveError ? <p role="alert">{saveError}</p> : null}
      </div>
    </form>
  );
}

function renderField(key: string, field: SettingsSchemaField, value: unknown, onChange: (key: string, value: unknown) => void): JSX.Element {
  if (field.type === 'boolean') {
    return (
      <Switch
        key={key}
        type="button"
        checked={Boolean(value)}
        onCheckedChange={(checked) => onChange(key, checked)}
        label={field.title}
        description={field.description}
      />
    );
  }

  if (field.type === 'select') {
    const options = field.options ?? [];
    return (
      <Field key={key} label={field.title} description={field.description}>
        <Select
          value={value === undefined || value === null ? '' : String(value)}
          onValueChange={(next) => {
            const chosen = options.find((option) => String(option.value) === next);
            onChange(key, chosen ? chosen.value : next);
          }}
          options={options.map((option) => ({ value: String(option.value), label: option.label }))}
          aria-label={field.title}
        />
      </Field>
    );
  }

  if (field.type === 'number') {
    return (
      <Field key={key} label={field.title} description={field.description}>
        <Input
          type="number"
          min={field.min}
          max={field.max}
          value={value === undefined || value === null ? '' : String(value)}
          onChange={(event) => onChange(key, event.target.value)}
        />
      </Field>
    );
  }

  return (
    <Field key={key} label={field.title} description={field.description}>
      <Input
        type="text"
        minLength={field.minLength}
        maxLength={field.maxLength}
        value={value === undefined || value === null ? '' : String(value)}
        onChange={(event) => onChange(key, event.target.value)}
      />
    </Field>
  );
}

function initialValues(schema: SettingsSchema, settings: Record<string, unknown>): Record<string, unknown> {
  const values: Record<string, unknown> = {};
  for (const [key, field] of Object.entries(schema)) {
    values[key] = settings[key] ?? field.default ?? emptyValue(field);
  }
  return values;
}

function emptyValue(field: SettingsSchemaField): string | boolean {
  return field.type === 'boolean' ? false : '';
}

function payloadFrom(schema: SettingsSchema, values: Record<string, unknown>): Record<string, unknown> {
  const payload: Record<string, unknown> = {};
  for (const [key, field] of Object.entries(schema)) {
    const value = values[key];
    payload[key] = field.type === 'number' && value !== '' && value !== undefined && value !== null ? Number(value) : value;
  }
  return payload;
}
