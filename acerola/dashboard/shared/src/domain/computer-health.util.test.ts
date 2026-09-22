import { describe, expect, it } from 'vitest';

import {
  computeHealth,
  diskFreePercent,
  HEALTH_STATUS_LABELS,
  HEALTH_STATUSES,
  healthStatusTone,
  healthWarnings,
  memoryGb,
  uptimeDays,
  type HealthInput,
} from './computer-health.util';

const GB = 1024 ** 3;
const DAY = 60 * 60 * 24;

/** Uma máquina sem nenhum problema: 16 GB de RAM, disco pela metade, ligada hoje. */
const healthy: HealthInput = {
  totalMemoryBytes: 16 * GB,
  totalDiskBytes: 500 * GB,
  freeDiskBytes: 250 * GB,
  uptimeSeconds: 2 * DAY,
};

describe('HEALTH_STATUS_LABELS', () => {
  it('has a screen label for every status', () => {
    for (const status of HEALTH_STATUSES) {
      expect(HEALTH_STATUS_LABELS[status]).toBeTruthy();
    }
  });
});

describe('healthStatusTone', () => {
  // feliz
  it('paints a healthy machine as success and a broken one as danger', () => {
    expect(healthStatusTone('good')).toBe('success');
    expect(healthStatusTone('critical')).toBe('danger');
  });

  it('gives each status its own tone, so they can be told apart at a glance', () => {
    const tones = HEALTH_STATUSES.map(healthStatusTone);

    expect(new Set(tones).size).toBe(HEALTH_STATUSES.length);
  });
});

describe('diskFreePercent', () => {
  // feliz
  it('reads the free share of the disk', () => {
    expect(diskFreePercent(healthy)).toBe(50);
  });

  // triste
  it('gives nothing when the machine never reported a disk', () => {
    expect(diskFreePercent({})).toBeNull();
  });

  /* Dividir por zero daria Infinity, e a tela mostraria "Infinity% livre". */
  it('gives nothing instead of dividing by a zero-sized disk', () => {
    expect(diskFreePercent({ totalDiskBytes: 0, freeDiskBytes: 0 })).toBeNull();
  });
});

describe('memoryGb', () => {
  // feliz
  it('converts bytes into the gigabytes people talk about', () => {
    expect(memoryGb({ totalMemoryBytes: 8 * GB })).toBe(8);
  });

  // triste
  it('gives nothing when memory was not reported', () => {
    expect(memoryGb({})).toBeNull();
  });
});

describe('uptimeDays', () => {
  // feliz
  it('converts seconds into days', () => {
    expect(uptimeDays({ uptimeSeconds: 3 * DAY })).toBe(3);
  });

  // triste
  /* Zero é um valor legítimo (acabou de ligar) e não pode virar "não informado". */
  it('treats a freshly booted machine as zero days, not as missing', () => {
    expect(uptimeDays({ uptimeSeconds: 0 })).toBe(0);
  });

  it('gives nothing when uptime was not reported', () => {
    expect(uptimeDays({})).toBeNull();
  });
});

describe('healthWarnings', () => {
  // feliz
  it('finds nothing wrong with a healthy machine', () => {
    expect(healthWarnings(healthy)).toEqual([]);
  });

  it('warns about little memory, saying how much there is', () => {
    const warnings = healthWarnings({ ...healthy, totalMemoryBytes: 4 * GB });

    expect(warnings).toHaveLength(1);
    expect(warnings[0]?.severity).toBe('attention');
    expect(warnings[0]?.message).toContain('4,0 GB');
  });

  it('warns about a nearly full disk, saying the free share', () => {
    const warnings = healthWarnings({ ...healthy, freeDiskBytes: 40 * GB });

    expect(warnings[0]?.severity).toBe('attention');
    expect(warnings[0]?.message).toContain('8,0%');
  });

  /* Menos de 5% o Windows já recusa gravação: é problema, não aviso. */
  it('treats a disk under five percent as critical, not as attention', () => {
    const warnings = healthWarnings({ ...healthy, freeDiskBytes: 10 * GB });

    expect(warnings[0]?.severity).toBe('critical');
  });

  it('warns about a machine left on for a month, with the day count', () => {
    const warnings = healthWarnings({ ...healthy, uptimeSeconds: 45 * DAY });

    expect(warnings[0]?.message).toContain('45 dias');
  });

  it('collects every problem, not just the first', () => {
    const warnings = healthWarnings({
      totalMemoryBytes: 4 * GB,
      totalDiskBytes: 100 * GB,
      freeDiskBytes: 2 * GB,
      uptimeSeconds: 60 * DAY,
    });

    expect(warnings).toHaveLength(3);
  });

  // triste
  /* Uma máquina que ainda não enviou nada não tem problema nenhum: tem ausência de dado. */
  it('invents no warning for a machine that reported nothing', () => {
    expect(healthWarnings({})).toEqual([]);
  });

  /* O agente em Go não lê SMART; avisar sobre desgaste de SSD seria inventar medição. */
  it('says nothing about disk wear, which is not measured', () => {
    const messages = healthWarnings({ ...healthy, freeDiskBytes: 1 * GB })
      .map((warning) => warning.message)
      .join(' ');

    expect(messages).not.toMatch(/SSD|desgaste|temperatura/i);
  });
});

describe('computeHealth', () => {
  // feliz
  it('gives a healthy machine the full score', () => {
    expect(computeHealth(healthy)).toEqual({ score: 100, status: 'good', warnings: [] });
  });

  it('lowers the score for each warning found', () => {
    const report = computeHealth({ ...healthy, totalMemoryBytes: 4 * GB });

    expect(report.score).toBeLessThan(100);
    expect(report.status).toBe('attention');
  });

  /* Um disco sem espaço não fica menos urgente porque o resto da máquina está bem. */
  it('drops to critical on a critical warning, even with a high score', () => {
    const report = computeHealth({ ...healthy, freeDiskBytes: 1 * GB });

    expect(report.status).toBe('critical');
    expect(report.score).toBeGreaterThan(55);
  });

  it('stacks the penalties of several problems', () => {
    const report = computeHealth({
      totalMemoryBytes: 2 * GB,
      totalDiskBytes: 100 * GB,
      freeDiskBytes: 1 * GB,
      uptimeSeconds: 90 * DAY,
    });

    expect(report.status).toBe('critical');
    expect(report.warnings).toHaveLength(3);
  });

  // triste
  /* Nota negativa não existe e assustaria quem lê. */
  it('never goes below zero, however many problems pile up', () => {
    const report = computeHealth({
      totalMemoryBytes: 1 * GB,
      totalDiskBytes: 10 * GB,
      freeDiskBytes: 0,
      uptimeSeconds: 400 * DAY,
    });

    expect(report.score).toBeGreaterThanOrEqual(0);
  });

  /* Sem medição não há avaliação: dar 100 seria afirmar que a máquina está boa sem saber. */
  it('reports a machine that sent nothing as good with no warnings, not as broken', () => {
    const report = computeHealth({});

    expect(report.warnings).toEqual([]);
    expect(report.status).toBe('good');
  });
});
