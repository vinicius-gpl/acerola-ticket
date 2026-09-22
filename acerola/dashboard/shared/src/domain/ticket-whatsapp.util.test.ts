import { describe, expect, it } from 'vitest';

import { buildWhatsAppLink, toWhatsAppNumber } from './ticket-whatsapp.util';

describe('toWhatsAppNumber', () => {
  // feliz
  it('adds the country code to a mobile number typed with area code', () => {
    expect(toWhatsAppNumber('62 99999-9999')).toBe('5562999999999');
  });

  it('accepts a landline with area code', () => {
    expect(toWhatsAppNumber('(62) 3333-3333')).toBe('556233333333');
  });

  it('keeps the country code when it was already typed', () => {
    expect(toWhatsAppNumber('+55 62 99999-9999')).toBe('5562999999999');
  });

  // triste
  it('refuses a number too short to be a phone', () => {
    expect(toWhatsAppNumber('99999')).toBeNull();
  });

  it('refuses text with no digits', () => {
    expect(toWhatsAppNumber('me liga')).toBeNull();
  });

  it('refuses an empty or missing value', () => {
    expect(toWhatsAppNumber('')).toBeNull();
    expect(toWhatsAppNumber(null)).toBeNull();
    expect(toWhatsAppNumber(undefined)).toBeNull();
  });
});

describe('buildWhatsAppLink', () => {
  // feliz
  it('builds a wa.me link with the message already escaped', () => {
    const link = buildWhatsAppLink('62 99999-9999', 'Chamado CH-0007 resolvido');

    expect(link).toBe('https://wa.me/5562999999999?text=Chamado%20CH-0007%20resolvido');
  });

  // triste
  it('gives no link when the phone cannot be used, so the button stays hidden', () => {
    expect(buildWhatsAppLink('123', 'Qualquer aviso')).toBeNull();
    expect(buildWhatsAppLink(null, 'Qualquer aviso')).toBeNull();
  });
});
