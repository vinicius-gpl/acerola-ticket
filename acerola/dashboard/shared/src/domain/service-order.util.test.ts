import { describe, expect, it } from 'vitest';

import {
  isSameServiceOrderFile,
  normalizeServiceOrderReference,
  serviceOrderVerifyPath,
  shortServiceOrderCode,
} from './service-order.util';

const CODE = 'a1b2c3d4e5f60718293a4b5c6d7e8f90a1b2c3d4e5f60718293a4b5c6d7e8f90';

describe('shortServiceOrderCode', () => {
  // feliz
  it('shows only the first characters of the code', () => {
    expect(shortServiceOrderCode(CODE)).toBe('a1b2c3d4e5f6');
  });
});

describe('normalizeServiceOrderReference', () => {
  // feliz
  it('accepts the whole code and the short one', () => {
    expect(normalizeServiceOrderReference(CODE)).toBe(CODE);
    expect(normalizeServiceOrderReference('a1b2c3d4e5f6')).toBe('a1b2c3d4e5f6');
  });

  it('forgives capital letters and spaces around what was pasted', () => {
    expect(normalizeServiceOrderReference('  A1B2C3D4E5F6 ')).toBe('a1b2c3d4e5f6');
  });

  // triste
  /* Um prefixo curto serviria para ir adivinhando as emissões dos outros. */
  it('refuses a reference shorter than the short code', () => {
    expect(normalizeServiceOrderReference('a1b2c3')).toBeNull();
    expect(normalizeServiceOrderReference('')).toBeNull();
  });

  it('refuses what is longer than a code or is not hexadecimal', () => {
    expect(normalizeServiceOrderReference(`${CODE}0`)).toBeNull();
    expect(normalizeServiceOrderReference('a1b2c3d4e5fz')).toBeNull();
    expect(normalizeServiceOrderReference("a1b2c3d4e5f6' or 1=1")).toBeNull();
  });
});

describe('serviceOrderVerifyPath', () => {
  // feliz
  it('points to the public page that checks the issue', () => {
    expect(serviceOrderVerifyPath('a1b2c3d4e5f6')).toBe('/verify/a1b2c3d4e5f6');
  });
});

describe('isSameServiceOrderFile', () => {
  // feliz
  it('matches the same fingerprint, whatever the letter case', () => {
    expect(isSameServiceOrderFile(CODE.toUpperCase(), CODE)).toBe(true);
  });

  // triste
  it('does not match a file that changed a single character', () => {
    expect(isSameServiceOrderFile(`b${CODE.slice(1)}`, CODE)).toBe(false);
  });
});
