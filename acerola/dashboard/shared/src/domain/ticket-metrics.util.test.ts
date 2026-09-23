import { describe, expect, it } from 'vitest';

import {
  averageResolutionHours,
  countByField,
  countPendingTickets,
  resolutionHours,
  summarizeTickets,
  type TicketMetricsInput,
} from './ticket-metrics.util';

const opened = (over: Partial<TicketMetricsInput> = {}): TicketMetricsInput => ({
  status: 'open',
  createdAt: '2026-03-01T08:00:00.000Z',
  resolvedAt: null,
  ...over,
});

const resolvedAfterTwoHours = opened({
  status: 'resolved',
  resolvedAt: '2026-03-01T10:00:00.000Z',
});

describe('resolutionHours', () => {
  // feliz
  it('measures the hours between opening and resolving', () => {
    expect(resolutionHours(resolvedAfterTwoHours)).toBe(2);
  });

  // triste
  it('gives nothing for a ticket still open, instead of counting time until now', () => {
    expect(resolutionHours(opened())).toBeNull();
  });

  it('refuses a resolution dated before the opening, which would drag the average down', () => {
    const backwards = opened({ status: 'resolved', resolvedAt: '2026-02-28T08:00:00.000Z' });

    expect(resolutionHours(backwards)).toBeNull();
  });

  it('refuses an unreadable date instead of returning NaN', () => {
    expect(resolutionHours(opened({ status: 'resolved', resolvedAt: 'ontem' }))).toBeNull();
  });
});

describe('averageResolutionHours', () => {
  // feliz
  it('averages only the tickets that were actually resolved', () => {
    const tickets = [
      resolvedAfterTwoHours,
      opened({ status: 'resolved', resolvedAt: '2026-03-01T12:00:00.000Z' }),
      opened(),
    ];

    expect(averageResolutionHours(tickets)).toBe(3);
  });

  // triste
  it('gives nothing when nothing was resolved yet, because zero would mean instant support', () => {
    expect(averageResolutionHours([opened(), opened()])).toBeNull();
  });

  it('gives nothing for an empty list', () => {
    expect(averageResolutionHours([])).toBeNull();
  });
});

describe('summarizeTickets', () => {
  // feliz
  it('counts each status and the average together', () => {
    const summary = summarizeTickets([
      opened(),
      opened({ status: 'in_progress' }),
      resolvedAfterTwoHours,
      opened({ status: 'cancelled' }),
    ]);

    expect(summary).toEqual({
      total: 4,
      open: 1,
      inProgress: 1,
      resolved: 1,
      cancelled: 1,
      averageResolutionHours: 2,
    });
  });

  // triste
  it('reports an empty board without inventing an average', () => {
    expect(summarizeTickets([])).toEqual({
      total: 0,
      open: 0,
      inProgress: 0,
      resolved: 0,
      cancelled: 0,
      averageResolutionHours: null,
    });
  });
});

describe('countPendingTickets', () => {
  // feliz
  it('counts what still needs work from the IT team', () => {
    const tickets = [opened(), opened({ status: 'in_progress' }), resolvedAfterTwoHours];

    expect(countPendingTickets(tickets)).toBe(2);
  });

  // triste
  it('does not count a cancelled ticket as pending work', () => {
    expect(countPendingTickets([opened({ status: 'cancelled' })])).toBe(0);
  });
});

describe('countByField', () => {
  // feliz
  it('counts by the chosen field, from most to least frequent', () => {
    const rows = [{ type: 'printer' }, { type: 'network' }, { type: 'printer' }];

    expect(countByField(rows, (row) => row.type)).toEqual([
      { key: 'printer', count: 2 },
      { key: 'network', count: 1 },
    ]);
  });

  // triste
  it('gives an empty list when there is nothing to count', () => {
    expect(countByField([], (row: { type: string }) => row.type)).toEqual([]);
  });
});
