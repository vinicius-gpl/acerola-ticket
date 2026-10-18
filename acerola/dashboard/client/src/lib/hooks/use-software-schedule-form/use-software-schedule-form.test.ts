import { describe, expect, it } from 'vitest';

import { oneHourAfter } from './use-software-schedule-form.svelte';

describe('oneHourAfter', () => {
  // feliz
  it('ends a new appointment one hour after it starts', () => {
    expect(oneHourAfter('09:00')).toBe('10:00');
    expect(oneHourAfter('14:30')).toBe('15:30');
  });

  // triste
  /* Perto da meia-noite o fim não pode virar o dia seguinte. */
  it('stops at the end of the day', () => {
    expect(oneHourAfter('23:15')).toBe('23:59');
  });
});
