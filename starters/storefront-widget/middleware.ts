import { NextResponse, type NextRequest } from 'next/server';
import { frameAncestorsHeader, widgetFrameAncestors } from '@orbitcommerce/sdk/csp';
import { orbitApiUrl } from '@/lib/env';

export const config = { matcher: ['/widget', '/widget/:path*'], runtime: 'nodejs' };

// The shared header in next.config.ts leaves /widget out, because a shop on its own domain can frame
// the widget only when Orbit confirms the domain is that store's, so the header is worked out per request.
export async function middleware(request: NextRequest): Promise<NextResponse> {
  const sources = await widgetFrameAncestors(request.headers.get('referer'), {
    storeId: request.nextUrl.searchParams.get('storeId'),
    apiUrl: orbitApiUrl(),
  });
  const response = NextResponse.next();
  response.headers.set('Content-Security-Policy', frameAncestorsHeader(sources));
  return response;
}
