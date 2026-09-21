import { describe, expect, it } from 'vitest';

import { formatDate, formatDateTime } from './format-date';

describe('formatDate', () => {
  // feliz
  it('writes the date in the Brazilian order', () => {
    /* Meio-dia UTC: continua o mesmo dia em qualquer fuso do Brasil. */
    expect(formatDate('2026-09-14T12:00:00.000Z')).toBe('14/09/2026');
  });

  // triste
  it('shows a dash for an empty value', () => {
    expect(formatDate(null)).toBe('—');
    expect(formatDate('')).toBe('—');
  });

  /* "Invalid Date" na tela é pior que nada: parece defeito do sistema, e é. */
  it('shows a dash for text that is not a date, never "Invalid Date"', () => {
    expect(formatDate('NÃO POSSUI')).toBe('—');
  });
});

describe('formatDateTime', () => {
  it('includes the time', () => {
    expect(formatDateTime('2026-09-14T12:00:00.000Z')).toMatch(/^14\/09\/2026,? \d{2}:\d{2}$/);
  });

  // triste
  it('shows a dash for text that is not a date', () => {
    expect(formatDateTime('amanhã')).toBe('—');
  });
});
