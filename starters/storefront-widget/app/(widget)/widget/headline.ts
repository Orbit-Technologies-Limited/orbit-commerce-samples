import { orbitFor } from '@/lib/connections';
import manifest from '@/plugin.json';

const DEFAULT_HEADLINE = manifest.settingsSchema.headline.default;
const CACHE_MS = 60_000;
const MAX_CACHE = 1000;

const cache = new Map<string, { headline: string; at: number }>();

// The store id here is display data from the address, so only public settings are read with it.
// Never use it for anything private.
export async function headlineFor(
  storeId: string | undefined,
  deps: { orbitFor?: typeof orbitFor; now?: () => number } = {},
): Promise<string> {
  if (!storeId) return DEFAULT_HEADLINE;

  const now = (deps.now ?? Date.now)();
  const cached = cache.get(storeId);
  if (cached && now - cached.at < CACHE_MS) return cached.headline;

  let headline = DEFAULT_HEADLINE;
  try {
    const orbit = await (deps.orbitFor ?? orbitFor)(storeId);
    if (orbit) {
      const value = (await orbit.settings.get()).settings.headline;
      if (typeof value === 'string' && value.length > 0) headline = value;
    }
  } catch {
    // Fall back to the default headline.
  }

  if (cache.size >= MAX_CACHE) {
    const oldest = cache.keys().next().value;
    if (oldest !== undefined) cache.delete(oldest);
  }
  cache.set(storeId, { headline, at: now });
  return headline;
}
