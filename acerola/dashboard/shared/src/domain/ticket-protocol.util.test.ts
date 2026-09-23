import { describe, expect, it } from 'vitest';

import {
  formatTicketProtocol,
  isValidTicketProtocol,
  parseTicketProtocol,
} from './ticket-protocol.util';

describe('formatTicketProtocol', () => {
  // feliz
  it('pads the ticket number to four digits', () => {
    expect(formatTicketProtocol(7)).toBe('CH-0007');
  });

  it('keeps growing past four digits instead of cutting the number', () => {
    expect(formatTicketProtocol(12345)).toBe('CH-12345');
  });
});

describe('parseTicketProtocol', () => {
  // feliz
  it('reads the protocol exactly as the screen printed it', () => {
    expect(parseTicketProtocol('CH-0007')).toBe(7);
  });

  it('accepts what someone types from memory, without the dash or the zeros', () => {
    expect(parseTicketProtocol('ch 7')).toBe(7);
    expect(parseTicketProtocol('0007')).toBe(7);
    expect(parseTicketProtocol('7')).toBe(7);
  });

  // triste
  it('refuses text with no digits at all', () => {
    expect(parseTicketProtocol('meu chamado')).toBeNull();
  });

  it('refuses an empty or missing value', () => {
    expect(parseTicketProtocol('')).toBeNull();
    expect(parseTicketProtocol(null)).toBeNull();
    expect(parseTicketProtocol(undefined)).toBeNull();
  });

  it('refuses zero, because CH-0000 is not a ticket', () => {
    expect(parseTicketProtocol('CH-0000')).toBeNull();
  });
});

describe('isValidTicketProtocol', () => {
  // feliz
  it('accepts what it can read', () => {
    expect(isValidTicketProtocol('CH-0012')).toBe(true);
  });

  // triste
  it('refuses what it cannot read', () => {
    expect(isValidTicketProtocol('abc')).toBe(false);
  });
});
