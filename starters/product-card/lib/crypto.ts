import { createCipheriv, createDecipheriv, randomBytes } from 'node:crypto';

/**
 * Tokens at rest. A store's access and refresh tokens are a key to that merchant's store,
 * so they are never stored in the clear: AES-256-GCM with TOKEN_ENCRYPTION_KEY (32 random
 * bytes as 64 hex characters, which orbit-plugin create writes to .env.local and Orbit
 * hosting sets for you). GCM's tag means a changed row fails to decrypt instead of
 * decrypting to something else.
 */
const VERSION = 'v1';

export class TokenKeyError extends Error {
  override readonly name = 'TokenKeyError';
}

/** The key as bytes. The message names the variable and never echoes its value. */
export function keyFrom(hex: string | undefined): Buffer {
  if (!hex || !/^[0-9a-fA-F]{64}$/.test(hex)) {
    throw new TokenKeyError(
      'TOKEN_ENCRYPTION_KEY must be 64 hex characters (32 bytes). orbit-plugin create writes one to .env.local, and Orbit hosting sets it for you.'
    );
  }
  return Buffer.from(hex, 'hex');
}

/** `v1.<iv>.<tag>.<ciphertext>`, each part base64url, with a fresh 12 byte IV every time. */
export function encryptToken(plain: string, keyHex: string | undefined = process.env.TOKEN_ENCRYPTION_KEY): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', keyFrom(keyHex), iv);
  const body = Buffer.concat([cipher.update(plain, 'utf8'), cipher.final()]);
  return [VERSION, iv.toString('base64url'), cipher.getAuthTag().toString('base64url'), body.toString('base64url')].join('.');
}

/** Throws on anything this plugin did not seal with this key. */
export function decryptToken(sealed: string, keyHex: string | undefined = process.env.TOKEN_ENCRYPTION_KEY): string {
  const key = keyFrom(keyHex);
  const [version, iv, tag, body, extra] = sealed.split('.');
  if (version !== VERSION || !iv || !tag || body === undefined || extra !== undefined) {
    throw new Error('Not a token this plugin stored.');
  }
  const decipher = createDecipheriv('aes-256-gcm', key, Buffer.from(iv, 'base64url'));
  decipher.setAuthTag(Buffer.from(tag, 'base64url'));
  return Buffer.concat([decipher.update(Buffer.from(body, 'base64url')), decipher.final()]).toString('utf8');
}
