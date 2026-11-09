import type { NextConfig } from 'next';
import { PLATFORM_FRAME_ANCESTORS, frameAncestorsHeader } from '@orbitcommerce/sdk/csp';

const nextConfig: NextConfig = {
  output: 'standalone',
  images: { unoptimized: true },
  poweredByHeader: false,

  // The store dashboard frames every page. /widget is left out because the
  // storefront-widget starter sets its own header per request, adding the
  // shop's own domain.
  async headers() {
    return [
      {
        source: '/((?!widget).*)',
        headers: [
          {
            key: 'Content-Security-Policy',
            value: frameAncestorsHeader(PLATFORM_FRAME_ANCESTORS),
          },
        ],
      },
    ];
  },
};

export default nextConfig;
