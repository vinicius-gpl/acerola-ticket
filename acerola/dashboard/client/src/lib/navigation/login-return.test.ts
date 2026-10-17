import { describe, expect, it } from 'vitest';

import { loginPathFor, safeReturnPath } from './login-return';

describe('loginPathFor', () => {
  // feliz
  /* O convite do WhatsApp atravessa o login: é o que faz o link continuar valendo. */
  it('keeps the page and its query to come back after signing in', () => {
    const url = new URL('https://acerola.exemplo.com/support?invite=abc.def');

    expect(loginPathFor(url)).toBe('/login?next=%2Fsupport%3Finvite%3Dabc.def');
  });

  // caso limite
  it('does not carry the root nor the login itself', () => {
    expect(loginPathFor(new URL('https://acerola.exemplo.com/'))).toBe('/login');
    expect(loginPathFor(new URL('https://acerola.exemplo.com/login'))).toBe('/login');
  });
});

describe('safeReturnPath', () => {
  // feliz
  it('goes back to a page of this site', () => {
    expect(safeReturnPath('/support?invite=abc')).toBe('/support?invite=abc');
    expect(safeReturnPath('/infra/tickets/7')).toBe('/infra/tickets/7');
  });

  // triste
  /* Um `next` de fora faria do login um trampolim para outro site. */
  it('never sends to another site', () => {
    expect(safeReturnPath('https://golpe.exemplo.com')).toBe('/');
    expect(safeReturnPath('//golpe.exemplo.com')).toBe('/');
    expect(safeReturnPath('/\\golpe.exemplo.com')).toBe('/');
  });

  it('falls back to the root when there is nothing, or when it would loop back to the login', () => {
    expect(safeReturnPath(null)).toBe('/');
    expect(safeReturnPath('')).toBe('/');
    expect(safeReturnPath('/login?next=%2F')).toBe('/');
  });
});
