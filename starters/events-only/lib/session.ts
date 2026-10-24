import { OrbitClient } from '@orbitcommerce/sdk';
import { PLUGIN_ID, orbitApiUrl } from './env';

export class Unauthorized extends Error {
  override readonly name = 'Unauthorized';

  constructor() {
    super('Unauthorized');
  }
}

export interface DashboardSession {
  storeId: string;
  pluginId: string;
  userId: string | null;
}

type VerifyToken = typeof OrbitClient.verifyToken;

// The store comes only from the verified token, never from the request, so one
// merchant can never read another's data.
export async function sessionFrom(request: Request, deps: { verify?: VerifyToken } = {}): Promise<DashboardSession> {
  const match = request.headers.get('Authorization')?.match(/^Bearer +(\S+)$/i);
  if (!match) throw new Unauthorized();

  const verify = deps.verify ?? ((token: string, apiUrl?: string) => OrbitClient.verifyToken(token, apiUrl));
  const payload = await verify(match[1], orbitApiUrl()).catch(() => {
    throw new Unauthorized();
  });
  if (!payload?.storeId || payload.pluginId !== PLUGIN_ID) throw new Unauthorized();

  return { storeId: payload.storeId, pluginId: payload.pluginId, userId: payload.userId ?? null };
}
