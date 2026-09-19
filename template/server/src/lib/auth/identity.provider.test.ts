import { describe, expect, it } from 'vitest';

import {
  FORWARDED_IDENTITY_HEADERS,
  hasForwardedHeaders,
  MOCK_IDENTITY,
  readForwardedIdentity,
} from './identity.provider';

const complete = {
  [FORWARDED_IDENTITY_HEADERS.id]: 'auth-forward|42',
  [FORWARDED_IDENTITY_HEADERS.email]: 'ana@empresa.com.br',
  [FORWARDED_IDENTITY_HEADERS.name]: 'Ana',
  [FORWARDED_IDENTITY_HEADERS.role]: 'editor',
};

describe('readForwardedIdentity', () => {
  // feliz
  it('reads the identity forwarded in the headers', () => {
    expect(readForwardedIdentity(complete)).toEqual({
      id: 'auth-forward|42',
      email: 'ana@empresa.com.br',
      name: 'Ana',
      role: 'editor',
    });
  });

  it('trims spaces around the value', () => {
    const padded = { ...complete, [FORWARDED_IDENTITY_HEADERS.name]: '  Ana  ' };

    expect(readForwardedIdentity(padded)?.name).toBe('Ana');
  });

  it('uses the first value of a repeated header', () => {
    const repeated = { ...complete, [FORWARDED_IDENTITY_HEADERS.role]: ['editor', 'admin'] };

    expect(readForwardedIdentity(repeated)?.role).toBe('editor');
  });

  /* Sem nenhum cabeçalho é o caso NORMAL no MVP: não há auth-forward ainda, e quem chama cai
     no mock. Isso é diferente de cabeçalho quebrado. */
  it('returns null when nothing was forwarded', () => {
    expect(readForwardedIdentity({})).toBeNull();
    expect(readForwardedIdentity({ 'content-type': 'application/json' })).toBeNull();
  });

  // triste
  /* A trava mais cara deste arquivo: completar o que falta com o mock daria acesso de
     ADMINISTRADOR a uma requisição que o provedor não soube identificar. */
  it('returns null when the identity arrives half-filled', () => {
    const noEmail = { ...complete, [FORWARDED_IDENTITY_HEADERS.email]: undefined };
    const noRole = { ...complete, [FORWARDED_IDENTITY_HEADERS.role]: undefined };

    expect(readForwardedIdentity(noEmail)).toBeNull();
    expect(readForwardedIdentity(noRole)).toBeNull();
  });

  it('returns null when the role does not exist in the system', () => {
    expect(
      readForwardedIdentity({ ...complete, [FORWARDED_IDENTITY_HEADERS.role]: 'manager' }),
    ).toBeNull();
  });

  it('returns null when the e-mail is not an e-mail', () => {
    expect(
      readForwardedIdentity({ ...complete, [FORWARDED_IDENTITY_HEADERS.email]: 'ana' }),
    ).toBeNull();
  });

  it('counts a blank value as absent, not as identity', () => {
    expect(
      readForwardedIdentity({ ...complete, [FORWARDED_IDENTITY_HEADERS.id]: '   ' }),
    ).toBeNull();
  });
});

describe('hasForwardedHeaders', () => {
  /* É o que separa "ainda não há auth-forward" de "o auth-forward mandou algo quebrado" — e
     só o segundo é um erro a mostrar. */
  it('recognizes that the provider tried to identify someone', () => {
    expect(hasForwardedHeaders(complete)).toBe(true);
    expect(hasForwardedHeaders({ [FORWARDED_IDENTITY_HEADERS.email]: 'x@y.com' })).toBe(true);
  });

  // triste
  it('does not confuse a request without provider with a broken provider', () => {
    expect(hasForwardedHeaders({})).toBe(false);
    expect(hasForwardedHeaders({ authorization: 'Bearer something' })).toBe(false);
  });
});

describe('MOCK_IDENTITY', () => {
  /* O mock não é um desvio do caminho: ele tem a mesma forma de uma identidade encaminhada,
     e passa pela mesma validação. O dia do auth-forward muda a origem, não o contrato. */
  it('has the same shape as a forwarded identity', () => {
    const asHeaders = {
      [FORWARDED_IDENTITY_HEADERS.id]: MOCK_IDENTITY.id,
      [FORWARDED_IDENTITY_HEADERS.email]: MOCK_IDENTITY.email,
      [FORWARDED_IDENTITY_HEADERS.name]: MOCK_IDENTITY.name,
      [FORWARDED_IDENTITY_HEADERS.role]: MOCK_IDENTITY.role,
    };

    expect(readForwardedIdentity(asHeaders)).toEqual(MOCK_IDENTITY);
  });
});
