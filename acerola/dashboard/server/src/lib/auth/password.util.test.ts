import { describe, expect, it } from 'vitest';

import { hashPassword, verifyPassword } from './password.util';

describe('hashPassword / verifyPassword', () => {
  // feliz
  it('verifies the exact password that was hashed', async () => {
    const stored = await hashPassword('correct-horse-battery');

    expect(await verifyPassword('correct-horse-battery', stored)).toBe(true);
  });

  it('never stores the password in plain text', async () => {
    const stored = await hashPassword('correct-horse-battery');

    expect(stored).not.toContain('correct-horse-battery');
  });

  it('salts two equal passwords differently', async () => {
    const first = await hashPassword('same-password');
    const second = await hashPassword('same-password');

    expect(first).not.toBe(second);
  });

  // triste
  it('refuses a wrong password', async () => {
    const stored = await hashPassword('correct-horse-battery');

    expect(await verifyPassword('wrong-password', stored)).toBe(false);
  });

  it('refuses a malformed stored hash instead of throwing', async () => {
    expect(await verifyPassword('anything', 'not-a-valid-hash')).toBe(false);
    expect(await verifyPassword('anything', '')).toBe(false);
  });
});
