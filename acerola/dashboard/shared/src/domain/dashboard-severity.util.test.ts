import { describe, expect, it } from 'vitest';

import { bySeverity, isProblem, severityOf, type SeverityInput } from './dashboard-severity.util';

function machine(over: Partial<SeverityInput & { computerName: string }> = {}) {
  return {
    computerName: 'RECEPCAO-01',
    healthStatus: 'good' as const,
    activeAlerts: 0,
    maintenanceCount: 0,
    healthScore: 100,
    ...over,
  };
}

describe('severityOf', () => {
  // feliz
  /* Um alerta aberto é um problema ACONTECENDO, e precisa passar na frente de uma nota ruim
     que já está ruim há semanas. */
  it('weighs a problem happening now above a bad score standing still', () => {
    const now = machine({ healthStatus: 'attention', activeAlerts: 1 });
    const standing = machine({ healthStatus: 'critical', activeAlerts: 0 });

    expect(severityOf(now)).toBeGreaterThan(severityOf(standing));
  });

  it('adds weight to the machine that already took three services', () => {
    const frequent = machine({ healthStatus: 'attention', maintenanceCount: 3 });
    const occasional = machine({ healthStatus: 'attention', maintenanceCount: 2 });

    expect(severityOf(frequent)).toBeGreaterThan(severityOf(occasional));
  });

  // triste
  it('gives a healthy machine no weight at all', () => {
    expect(severityOf(machine())).toBe(0);
  });
});

describe('isProblem', () => {
  // feliz
  it('takes in a machine that has something to say', () => {
    expect(isProblem(machine({ healthStatus: 'attention' }))).toBe(true);
    expect(isProblem(machine({ activeAlerts: 1 }))).toBe(true);
    expect(isProblem(machine({ maintenanceCount: 4 }))).toBe(true);
  });

  // triste
  /* O mapa é dos problemas: uma máquina saudável ali só empurraria as outras para baixo. */
  it('leaves a healthy machine out of the map', () => {
    expect(isProblem(machine())).toBe(false);
  });
});

describe('bySeverity', () => {
  // feliz
  it('sorts from the worst to the least bad', () => {
    const rows = [
      machine({ computerName: 'A', healthStatus: 'attention' }),
      machine({ computerName: 'B', healthStatus: 'critical', activeAlerts: 2 }),
      machine({ computerName: 'C', healthStatus: 'critical' }),
    ];

    expect([...rows].sort(bySeverity).map((row) => row.computerName)).toEqual(['B', 'C', 'A']);
  });

  it('breaks a tie by the lower score', () => {
    const rows = [
      machine({ computerName: 'A', healthStatus: 'critical', healthScore: 60 }),
      machine({ computerName: 'B', healthStatus: 'critical', healthScore: 20 }),
    ];

    expect([...rows].sort(bySeverity).map((row) => row.computerName)).toEqual(['B', 'A']);
  });

  // triste
  /* Sem desempate estável a lista dançaria a cada consulta, e ninguém confiaria na ordem. */
  it('keeps a stable order for machines that are equally bad', () => {
    const rows = [
      machine({ computerName: 'ZEBRA-02', healthStatus: 'critical' }),
      machine({ computerName: 'ALFA-01', healthStatus: 'critical' }),
    ];

    expect([...rows].sort(bySeverity).map((row) => row.computerName)).toEqual([
      'ALFA-01',
      'ZEBRA-02',
    ]);
  });
});
