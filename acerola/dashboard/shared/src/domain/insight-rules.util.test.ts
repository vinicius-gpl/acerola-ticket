import { describe, expect, it } from 'vitest';

import {
  isOverloaded,
  isTroublesome,
  overloadScore,
  troubleScore,
  upgradeReasonLabel,
  upgradeReasonOf,
} from './insight-rules.util';

function usage(over: Partial<Parameters<typeof isOverloaded>[0]> = {}) {
  return { averageCpuPercent: 20, averageMemoryPercent: 50, sampleCount: 288, ...over };
}

describe('isOverloaded', () => {
  // feliz
  it('points out the machine living near the ceiling', () => {
    expect(isOverloaded(usage({ averageCpuPercent: 75 }))).toBe(true);
    expect(isOverloaded(usage({ averageMemoryPercent: 90 }))).toBe(true);
  });

  // triste
  /* Um pico não é sobrecarga: todo computador chega a 100% ao abrir um programa, e a média
     é justamente o que separa o susto do problema. */
  it('leaves a machine that is merely working out of the list', () => {
    expect(isOverloaded(usage({ averageCpuPercent: 40, averageMemoryPercent: 60 }))).toBe(false);
  });

  /* Poucas leituras não viram média: a máquina que acabou de ligar apareceria sobrecarregada
     por causa da inicialização do Windows. */
  it('refuses to judge a machine that barely reported', () => {
    expect(isOverloaded(usage({ averageCpuPercent: 99, sampleCount: 3 }))).toBe(false);
  });
});

describe('overloadScore', () => {
  // feliz
  it('ranks the machine closest to its own ceiling first', () => {
    const cpuBound = usage({ averageCpuPercent: 90, averageMemoryPercent: 50 });
    const memoryBound = usage({ averageCpuPercent: 30, averageMemoryPercent: 88 });

    expect(overloadScore(cpuBound)).toBeGreaterThan(overloadScore(memoryBound));
  });
});

describe('upgradeReasonOf', () => {
  // feliz
  it('asks for memory when the machine has less than eight gigabytes', () => {
    expect(upgradeReasonOf({ memoryGb: 4, diskFreePercent: 60 })).toBe('memory');
  });

  it('asks for disk when the space is running out', () => {
    expect(upgradeReasonOf({ memoryGb: 16, diskFreePercent: 8 })).toBe('disk');
  });

  /* Memória vem antes: o pente é mais barato e resolve a queixa mais comum. */
  it('puts memory before disk when both are tight', () => {
    expect(upgradeReasonOf({ memoryGb: 4, diskFreePercent: 5 })).toBe('memory');
  });

  // triste
  it('recommends nothing for a machine that is fine', () => {
    expect(upgradeReasonOf({ memoryGb: 16, diskFreePercent: 50 })).toBeNull();
  });

  /* Máquina sem medição não recebe recomendação: sugerir memória para uma máquina cujo
     agente nunca conectou seria inventar. */
  it('recommends nothing when nothing was measured', () => {
    expect(upgradeReasonOf({ memoryGb: null, diskFreePercent: null })).toBeNull();
  });
});

describe('upgradeReasonLabel', () => {
  // feliz
  it('reads the recommendation in words of a purchase order', () => {
    expect(upgradeReasonLabel('memory')).toBe('Mais memória');
  });
});

describe('isTroublesome', () => {
  // feliz
  it('flags the machine at the third maintenance', () => {
    expect(isTroublesome({ maintenanceCount: 3, alertCount: 0 })).toBe(true);
  });

  // triste
  /* Alerta sozinho não faz uma máquina virar assunto de troca: ela pode ter ficado com o
     disco cheio uma semana e nunca ter exigido mão de obra. */
  it('does not flag a machine that only had alerts', () => {
    expect(isTroublesome({ maintenanceCount: 1, alertCount: 20 })).toBe(false);
  });
});

describe('troubleScore', () => {
  // feliz
  it('weighs maintenance above alerts, because it costs hands', () => {
    expect(troubleScore({ maintenanceCount: 3, alertCount: 0 })).toBeGreaterThan(
      troubleScore({ maintenanceCount: 2, alertCount: 5 }),
    );
  });
});
