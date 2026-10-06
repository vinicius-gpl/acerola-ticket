import { describe, expect, it } from 'vitest';

import { formatDate, formatDateTime, formatDay, todayAsDay } from './format-date';

describe('todayAsDay', () => {
  // feliz
  it('writes the day of whoever is using the system, without the time', () => {
    expect(todayAsDay(new Date(2026, 9, 5, 22, 30))).toBe('2026-10-05');
  });

  // triste
  /* Mês e dia de um dígito ganham o zero: sem ele a data não passa no contrato. */
  it('pads the month and the day', () => {
    expect(todayAsDay(new Date(2026, 0, 3, 8, 0))).toBe('2026-01-03');
  });
});

describe('formatDay', () => {
  // feliz
  /* O dia escrito no documento é o dia que aparece — em qualquer fuso de quem lê. */
  it('writes a day without time in the Brazilian order, without shifting it', () => {
    expect(formatDay('2026-09-28')).toBe('28/09/2026');
    expect(formatDay('2026-01-01')).toBe('01/01/2026');
  });

  // triste
  it('shows a dash for an empty value or for text that is not a day', () => {
    expect(formatDay(null)).toBe('—');
    expect(formatDay('')).toBe('—');
    expect(formatDay('28/09/2026')).toBe('—');
  });
});

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
