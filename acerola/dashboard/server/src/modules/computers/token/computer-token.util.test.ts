import { describe, expect, it } from 'vitest';

import {
  createComputerToken,
  hashComputerToken,
  matchesComputerToken,
} from './computer-token.util';

describe('createComputerToken', () => {
  // feliz
  it('creates a token long enough not to be guessed', () => {
    /* 32 bytes em base64url dão 43 caracteres. */
    expect(createComputerToken().length).toBeGreaterThanOrEqual(43);
  });

  it('uses only characters that survive a copy and paste into a config file', () => {
    expect(createComputerToken()).toMatch(/^[A-Za-z0-9_-]+$/);
  });

  // triste
  /* Dois tokens iguais fariam duas máquinas se passarem uma pela outra. */
  it('never repeats a token', () => {
    const tokens = new Set(Array.from({ length: 200 }, () => createComputerToken()));

    expect(tokens.size).toBe(200);
  });
});

describe('hashComputerToken', () => {
  // feliz
  it('always gives the same hash for the same token', () => {
    expect(hashComputerToken('abc')).toBe(hashComputerToken('abc'));
  });

  it('gives a different hash for a different token', () => {
    expect(hashComputerToken('abc')).not.toBe(hashComputerToken('abd'));
  });

  // triste
  /* O ponto do hash: quem lê o banco não consegue voltar ao token. */
  it('does not contain the original token', () => {
    const token = createComputerToken();

    expect(hashComputerToken(token)).not.toContain(token);
  });
});

describe('matchesComputerToken', () => {
  // feliz
  it('accepts the token that produced the stored hash', () => {
    const token = createComputerToken();

    expect(matchesComputerToken(token, hashComputerToken(token))).toBe(true);
  });

  // triste
  it('refuses a different token', () => {
    const stored = hashComputerToken(createComputerToken());

    expect(matchesComputerToken(createComputerToken(), stored)).toBe(false);
  });

  it('refuses an empty token, so a missing value never passes as valid', () => {
    expect(matchesComputerToken('', hashComputerToken('abc'))).toBe(false);
  });

  it('refuses when there is no stored hash, instead of letting anything through', () => {
    expect(matchesComputerToken('abc', '')).toBe(false);
  });

  /* Hash torto no banco não pode derrubar o servidor nem, pior, passar. */
  it('refuses a stored hash of the wrong size without throwing', () => {
    expect(matchesComputerToken('abc', 'abcdef')).toBe(false);
  });
});
