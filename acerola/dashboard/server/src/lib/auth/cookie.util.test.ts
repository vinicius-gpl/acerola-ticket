import { describe, expect, it } from 'vitest';

import { parseCookies } from './cookie.util';

describe('parseCookies', () => {
  // feliz
  it('reads a single cookie', () => {
    expect(parseCookies('session=abc123')).toEqual({ session: 'abc123' });
  });

  it('reads several cookies separated by semicolon', () => {
    expect(parseCookies('a=1; session=abc123; theme=dark')).toEqual({
      a: '1',
      session: 'abc123',
      theme: 'dark',
    });
  });

  it('decodes a percent-encoded value', () => {
    expect(parseCookies('name=Jo%C3%A3o')).toEqual({ name: 'João' });
  });

  // triste
  it('returns an empty object when there is no header', () => {
    expect(parseCookies(undefined)).toEqual({});
  });

  it('ignores a malformed pair without "="', () => {
    expect(parseCookies('broken; session=abc123')).toEqual({ session: 'abc123' });
  });

  it('keeps a value that fails to decode instead of throwing', () => {
    expect(parseCookies('bad=%')).toEqual({ bad: '%' });
  });
});
