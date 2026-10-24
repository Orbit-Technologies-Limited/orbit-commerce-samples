import { describe, expect, it } from 'vitest';
import { TokenKeyError, decryptToken, encryptToken, keyFrom } from '../lib/crypto';

const KEY = 'ab'.repeat(32);
const OTHER = 'cd'.repeat(32);
const TOKEN = 'eyJhbGciOiJIUzI1NiJ9.access-token-for-store-1';

describe('token encryption', () => {
  it('round trips, with a fresh IV every time and no plaintext in the output', () => {
    const a = encryptToken(TOKEN, KEY);
    const b = encryptToken(TOKEN, KEY);
    expect(a).not.toBe(b);
    expect(a.startsWith('v1.')).toBe(true);
    expect(a).not.toContain('access-token');
    expect(decryptToken(a, KEY)).toBe(TOKEN);
  });
  it('refuses a changed ciphertext, a changed tag and the wrong key', () => {
    const sealed = encryptToken(TOKEN, KEY);
    const [v, iv, tag, body] = sealed.split('.');
    const flip = (s: string) => (s[0] === 'A' ? 'B' : 'A') + s.slice(1);
    expect(() => decryptToken([v, iv, tag, flip(body)].join('.'), KEY)).toThrow();
    expect(() => decryptToken([v, iv, flip(tag), body].join('.'), KEY)).toThrow();
    expect(() => decryptToken(sealed, OTHER)).toThrow();
    expect(() => decryptToken('plain-text-token', KEY)).toThrow('Not a token this plugin stored');
  });
  it('names the variable for a bad key, without echoing it', () => {
    let error: unknown;
    try { keyFrom('not-a-key'); } catch (e) { error = e; }
    expect(error).toBeInstanceOf(TokenKeyError);
    expect((error as Error).message).toContain('TOKEN_ENCRYPTION_KEY');
    expect((error as Error).message).not.toContain('not-a-key');
    expect(keyFrom(KEY)).toHaveLength(32);
  });
  it('uses TOKEN_ENCRYPTION_KEY from the environment by default', () => {
    expect(decryptToken(encryptToken(TOKEN))).toBe(TOKEN);
  });
});
