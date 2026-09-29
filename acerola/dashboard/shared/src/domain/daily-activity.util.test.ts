import { describe, expect, it } from 'vitest';

import { buildDailyActivity, dayKeyOf } from './daily-activity.util';

describe('dayKeyOf', () => {
  // feliz
  it('writes the day the way the database groups it', () => {
    expect(dayKeyOf(new Date(2026, 8, 3))).toBe('2026-09-03');
  });
});

describe('buildDailyActivity', () => {
  // feliz
  it('puts every count on its own day', () => {
    const days = buildDailyActivity(
      new Date(2026, 8, 1),
      new Date(2026, 8, 3),
      [{ day: '2026-09-01', total: 4 }],
      [{ day: '2026-09-03', total: 2 }],
      [{ day: '2026-09-02', total: 1 }],
    );

    expect(days).toEqual([
      { day: '2026-09-01', opened: 4, resolved: 0, maintenances: 0 },
      { day: '2026-09-02', opened: 0, resolved: 0, maintenances: 1 },
      { day: '2026-09-03', opened: 0, resolved: 2, maintenances: 0 },
    ]);
  });

  /* O banco só devolve os dias com movimento. Sem a régua, segunda e sexta viram vizinhas e
     o gráfico diz "o movimento foi constante a semana toda". */
  it('fills a day with nothing as zero, never as a hole', () => {
    const days = buildDailyActivity(
      new Date(2026, 8, 1),
      new Date(2026, 8, 5),
      [{ day: '2026-09-01', total: 4 }, { day: '2026-09-05', total: 4 }],
      [],
      [],
    );

    expect(days).toHaveLength(5);
    expect(days.map((day) => day.opened)).toEqual([4, 0, 0, 0, 4]);
  });

  /* "Os últimos 7 dias" precisa mostrar hoje: os dois extremos entram na régua. */
  it('includes both ends of the period', () => {
    const days = buildDailyActivity(new Date(2026, 8, 1), new Date(2026, 8, 1), [], [], []);

    expect(days).toEqual([{ day: '2026-09-01', opened: 0, resolved: 0, maintenances: 0 }]);
  });

  /* A régua anda pelo número do dia, e não somando 24 horas: no dia em que o horário de
     verão muda, o dia tem 23 ou 25 horas e somar 24 pularia uma data. */
  it('crosses the turn of the month without skipping a day', () => {
    const days = buildDailyActivity(new Date(2026, 8, 29), new Date(2026, 9, 2), [], [], []);

    expect(days.map((day) => day.day)).toEqual([
      '2026-09-29',
      '2026-09-30',
      '2026-10-01',
      '2026-10-02',
    ]);
  });

  // triste
  it('has no days when there is nothing and nowhere to go', () => {
    const days = buildDailyActivity(new Date(2026, 8, 5), new Date(2026, 8, 1), [], [], []);

    expect(days).toEqual([]);
  });

  /* Contagem de um dia fora do período é dado velho do banco: não inventa uma coluna na
     ponta do gráfico. */
  it('ignores a count outside the period (edge case)', () => {
    const days = buildDailyActivity(
      new Date(2026, 8, 1),
      new Date(2026, 8, 2),
      [{ day: '2026-08-15', total: 9 }],
      [],
      [],
    );

    expect(days).toHaveLength(2);
    expect(days.every((day) => day.opened === 0)).toBe(true);
  });
});
