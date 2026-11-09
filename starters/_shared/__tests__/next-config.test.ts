import { describe, expect, it } from 'vitest';
import { PLATFORM_FRAME_ANCESTORS, frameAncestorsHeader } from '@orbitcommerce/sdk/csp';
import nextConfig from '../next.config';

describe('next.config', () => {
  it('builds a standalone server with no image cache to write', () => {
    expect(nextConfig.output).toBe('standalone');
    expect(nextConfig.images).toEqual({ unoptimized: true });
  });

  it('lets the store dashboard, the partner dashboard and localhost frame every page but the widget', async () => {
    const rules = await nextConfig.headers!();
    expect(rules).toEqual([{ source: '/((?!widget).*)', headers: [{ key: 'Content-Security-Policy', value: frameAncestorsHeader(PLATFORM_FRAME_ANCESTORS) }] }]);
    const value = rules[0].headers[0].value;
    for (const origin of ['http://localhost:*', 'https://*.myorbitcommerce.net', 'https://*.orbitcommerce.net']) expect(value).toContain(origin);
  });
});
