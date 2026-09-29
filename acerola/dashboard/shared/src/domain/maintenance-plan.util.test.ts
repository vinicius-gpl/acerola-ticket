import { describe, expect, it } from 'vitest';

import { buildMaintenancePlan, nextBusinessDay, plannedForToday } from './maintenance-plan.util';

/** Uma quarta-feira, para as contas de dia útil não dependerem de quando o teste roda. */
const WEDNESDAY = new Date('2026-09-30T09:00:00');
const FRIDAY = new Date('2026-10-02T09:00:00');
const SATURDAY = new Date('2026-10-03T09:00:00');

const machine = (over: Record<string, unknown> = {}) => ({
  computerId: 1,
  computerName: 'RECEPCAO-01',
  department: null,
  lastDoneAt: null,
  ...over,
});

/** Uma data bem antiga: qualquer máquina com ela está vencida. */
const OLD = '2025-01-01T10:00:00.000Z';

describe('nextBusinessDay', () => {
  // feliz
  it('keeps a business day as it is', () => {
    expect(nextBusinessDay(WEDNESDAY).getDate()).toBe(30);
  });

  // triste
  /* Máquina se abre com gente na empresa: o plano nunca cai num sábado. */
  it('jumps the weekend', () => {
    expect(nextBusinessDay(SATURDAY).getDay()).toBe(1);
  });
});

describe('buildMaintenancePlan', () => {
  // feliz
  it('puts one machine per business day, starting today', () => {
    const plan = buildMaintenancePlan(
      [machine({ computerId: 1 }), machine({ computerId: 2 }), machine({ computerId: 3 })],
      WEDNESDAY,
    );

    expect(plan.map((entry) => entry.plannedFor.getDate())).toEqual([30, 1, 2]);
  });

  /* Sexta cai para segunda: o plano pula o fim de semana no meio da fila também. */
  it('skips the weekend in the middle of the queue', () => {
    const plan = buildMaintenancePlan([machine({ computerId: 1 }), machine({ computerId: 2 })], FRIDAY);

    expect(plan[0]?.plannedFor.getDate()).toBe(2);
    expect(plan[1]?.plannedFor.getDay()).toBe(1);
  });

  /* Quem nunca foi aberta vem antes de todas: não se sabe o que tem lá dentro. */
  it('sends the never-opened machines first', () => {
    const plan = buildMaintenancePlan(
      [
        machine({ computerId: 1, computerName: 'ANTIGA', lastDoneAt: OLD }),
        machine({ computerId: 2, computerName: 'NUNCA', lastDoneAt: null }),
      ],
      WEDNESDAY,
    );

    expect(plan[0]?.computerName).toBe('NUNCA');
  });

  it('then takes the oldest first', () => {
    const plan = buildMaintenancePlan(
      [
        machine({ computerId: 1, computerName: 'RECENTE', lastDoneAt: '2026-02-01T10:00:00.000Z' }),
        machine({ computerId: 2, computerName: 'ANTIGA', lastDoneAt: OLD }),
      ],
      WEDNESDAY,
    );

    expect(plan[0]?.computerName).toBe('ANTIGA');
  });

  // triste
  /* Máquina em dia não entra no plano: o plano é a fila do que está vencido. */
  it('leaves out the machines that are up to date', () => {
    const recent = new Date(WEDNESDAY.getTime() - 10 * 24 * 3600 * 1000).toISOString();

    expect(buildMaintenancePlan([machine({ lastDoneAt: recent })], WEDNESDAY)).toEqual([]);
  });

  /* A tela mostra os próximos dias, não o ano inteiro. */
  it('stops at the limit instead of planning the whole year', () => {
    const many = Array.from({ length: 30 }, (_, index) => machine({ computerId: index + 1 }));

    expect(buildMaintenancePlan(many, WEDNESDAY, 5)).toHaveLength(5);
  });
});

describe('plannedForToday', () => {
  // feliz
  it('picks what the plan asks for today', () => {
    const plan = buildMaintenancePlan([machine({ computerId: 1 }), machine({ computerId: 2 })], WEDNESDAY);

    expect(plannedForToday(plan, WEDNESDAY)).toHaveLength(1);
  });

  // triste
  it('asks for nothing on a weekend', () => {
    const plan = buildMaintenancePlan([machine()], SATURDAY);

    expect(plannedForToday(plan, SATURDAY)).toEqual([]);
  });
});
