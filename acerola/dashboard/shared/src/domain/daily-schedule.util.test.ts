import { describe, expect, it } from 'vitest';

import { brasiliaMonthRange, msUntilBrasiliaTime, nextBrasiliaTime } from './daily-schedule.util';

describe('daily-schedule.util', () => {
  // feliz
  it('schedules midnight in Brasília as 03:00 UTC of the next day', () => {
    // 15:00 em Brasília (18:00 UTC)
    const now = new Date('2026-10-17T18:00:00Z');

    expect(nextBrasiliaTime(now, 0).toISOString()).toBe('2026-10-18T03:00:00.000Z');
  });

  // feliz
  it('keeps the same Brasília night when UTC already turned the day', () => {
    // 22:30 em Brasília do dia 17 = 01:30 UTC do dia 18
    const now = new Date('2026-10-18T01:30:00Z');

    expect(nextBrasiliaTime(now, 0).toISOString()).toBe('2026-10-18T03:00:00.000Z');
    expect(nextBrasiliaTime(now, 3).toISOString()).toBe('2026-10-18T06:00:00.000Z');
  });

  // feliz
  it('pushes to the next day when it is exactly the scheduled time', () => {
    const now = new Date('2026-10-18T03:00:00Z');

    expect(nextBrasiliaTime(now, 0).toISOString()).toBe('2026-10-19T03:00:00.000Z');
    expect(msUntilBrasiliaTime(now, 0)).toBe(24 * 60 * 60 * 1000);
  });

  // triste
  it('rejects an hour outside the day', () => {
    const now = new Date('2026-10-18T03:00:00Z');

    expect(() => nextBrasiliaTime(now, 24)).toThrow(RangeError);
    expect(() => nextBrasiliaTime(now, -1)).toThrow(RangeError);
    expect(() => nextBrasiliaTime(now, 1.5)).toThrow(RangeError);
  });
});

describe('brasiliaMonthRange', () => {
  // feliz
  it('starts and ends the month at midnight in Brasília', () => {
    const range = brasiliaMonthRange(new Date('2026-10-17T15:00:00Z'));

    expect(range).toMatchObject({ year: 2026, month: 9 });
    expect(range.start.toISOString()).toBe('2026-10-01T03:00:00.000Z');
    expect(range.end.toISOString()).toBe('2026-11-01T03:00:00.000Z');
  });

  // triste
  /* 31/10 às 22h em Brasília já é 1º/11 em UTC — mas ainda é outubro para quem usa o sistema. */
  it('keeps the last evening of the month in that month', () => {
    const range = brasiliaMonthRange(new Date('2026-11-01T01:00:00Z'));

    expect(range).toMatchObject({ year: 2026, month: 9 });
  });

  // triste
  it('turns the year in December', () => {
    const range = brasiliaMonthRange(new Date('2026-12-20T12:00:00Z'));

    expect(range.end.toISOString()).toBe('2027-01-01T03:00:00.000Z');
  });
});
