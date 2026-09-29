import { describe, expect, it } from 'vitest';

import { dayLabel, hourLabel, toTimeRows, type TimeSeriesDef } from './time-series';

const series: TimeSeriesDef[] = [
  { key: 'opened', label: 'Abertos', color: 'var(--chart-1)' },
  { key: 'resolved', label: 'Resolvidos', color: 'var(--chart-4)' },
];

describe('toTimeRows', () => {
  // feliz
  it('flattens each reading into one row per instant', () => {
    const rows = toTimeRows(
      [{ at: '2026-09-23T14:00:00.000Z', values: { opened: 4, resolved: 2 } }],
      series,
    );

    expect(rows).toHaveLength(1);
    expect(rows[0]!.at).toBeInstanceOf(Date);
    expect(rows[0]!.opened).toBe(4);
    expect(rows[0]!.resolved).toBe(2);
  });

  /* Zero e buraco não são a mesma coisa: buraco na linha se lê como "o agente estava fora
     do ar", e o que aconteceu foi um dia sem nenhum chamado. */
  it('reads a missing series as zero, never as a hole', () => {
    const rows = toTimeRows([{ at: '2026-09-23T14:00:00.000Z', values: { opened: 4 } }], series);

    expect(rows[0]!.resolved).toBe(0);
  });

  // triste
  it('has no rows when there is no reading', () => {
    expect(toTimeRows([], series)).toEqual([]);
  });

  /* Uma data inválida no eixo do tempo quebra a escala inteira e o gráfico some da tela. */
  it('drops a reading whose instant is not a date (edge case)', () => {
    const rows = toTimeRows(
      [
        { at: 'ontem', values: { opened: 9, resolved: 9 } },
        { at: '2026-09-23T14:00:00.000Z', values: { opened: 1, resolved: 1 } },
      ],
      series,
    );

    expect(rows).toHaveLength(1);
    expect(rows[0]!.opened).toBe(1);
  });
});

describe('hourLabel', () => {
  // feliz
  it('answers the hour, not the whole date', () => {
    expect(hourLabel('2026-09-23T14:05:00.000Z')).toMatch(/^\d{2}h$/);
  });

  // triste
  it('shows a dash for something that is not a date', () => {
    expect(hourLabel('ontem')).toBe('—');
  });
});

describe('dayLabel', () => {
  // feliz
  it('answers day and month, with the leading zero', () => {
    expect(dayLabel(new Date(2026, 8, 3))).toBe('03/09');
  });

  // triste
  it('shows a dash for something that is not a date', () => {
    expect(dayLabel('ontem')).toBe('—');
  });
});
