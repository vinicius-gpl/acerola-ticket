import { describe, expect, it } from 'vitest';

import {
  ALERT_METRIC_LABELS,
  ALERT_METRICS,
  ALERT_THRESHOLDS,
  RECOVERY_THRESHOLDS,
  alertDurationSeconds,
  decideAlerts,
  describeAlert,
  hasRecovered,
  isAboveThreshold,
} from './computer-alert.util';

const calm = { cpu: 20, memory: 30, disk: 40 };

describe('ALERT_METRIC_LABELS', () => {
  it('has a screen label for every metric', () => {
    for (const metric of ALERT_METRICS) {
      expect(ALERT_METRIC_LABELS[metric]).toBeTruthy();
    }
  });
});

/* A folga entre abrir e fechar é o que impede o liga-desliga: sem ela, uma máquina oscilando
   em volta do limite geraria dezenas de episódios para um único problema. */
describe('thresholds', () => {
  it('always closes below the value that opens, leaving a gap', () => {
    for (const metric of ALERT_METRICS) {
      expect(RECOVERY_THRESHOLDS[metric]).toBeLessThan(ALERT_THRESHOLDS[metric]);
    }
  });
});

describe('isAboveThreshold', () => {
  // feliz
  it('opens the alert exactly at the threshold, not only past it', () => {
    expect(isAboveThreshold('cpu', 98)).toBe(true);
  });

  // triste
  it('does not open just below it', () => {
    expect(isAboveThreshold('cpu', 97.9)).toBe(false);
  });
});

describe('hasRecovered', () => {
  // feliz
  it('recovers below the recovery value', () => {
    expect(hasRecovered('cpu', 89)).toBe(true);
  });

  // triste
  /* Dentro da zona morta não é recuperação: o episódio continua. */
  it('does not recover inside the gap between the two thresholds', () => {
    expect(hasRecovered('cpu', 94)).toBe(false);
  });
});

describe('decideAlerts', () => {
  // feliz
  it('does nothing on a calm machine', () => {
    expect(decideAlerts(calm, [])).toEqual({ toOpen: [], toClose: [], toRefresh: [] });
  });

  it('opens the alert of the metric that crossed the line', () => {
    const decision = decideAlerts({ ...calm, cpu: 99 }, []);

    expect(decision.toOpen).toEqual(['cpu']);
    expect(decision.toClose).toEqual([]);
  });

  it('keeps an open alert open while the metric stays high, to update the peak', () => {
    const decision = decideAlerts({ ...calm, cpu: 100 }, ['cpu']);

    expect(decision.toRefresh).toEqual(['cpu']);
    expect(decision.toOpen).toEqual([]);
  });

  it('closes the alert once the metric came back down', () => {
    const decision = decideAlerts(calm, ['cpu']);

    expect(decision.toClose).toEqual(['cpu']);
  });

  it('handles several metrics in the same reading', () => {
    const decision = decideAlerts({ cpu: 99, memory: 20, disk: 95 }, ['memory']);

    expect(decision.toOpen.sort()).toEqual(['cpu', 'disk']);
    expect(decision.toClose).toEqual(['memory']);
  });

  // triste
  /* Esta é a razão de existirem dois limites. */
  it('leaves everything as it is when the metric sits in the gap', () => {
    const decision = decideAlerts({ ...calm, cpu: 94 }, ['cpu']);

    /* 94 não passa de 98 (não abre nem renova) e não está abaixo de 90 (não fecha): o
       episódio segue aberto sem nenhuma escrita no banco. */
    expect(decision).toEqual({ toOpen: [], toClose: [], toRefresh: [] });
  });

  it('does not close an alert that was never open', () => {
    expect(decideAlerts(calm, []).toClose).toEqual([]);
  });

  it('does not open a second alert for a metric that already has one', () => {
    expect(decideAlerts({ ...calm, cpu: 99 }, ['cpu']).toOpen).toEqual([]);
  });
});

describe('describeAlert', () => {
  // feliz
  it('says the number, not just that it was high', () => {
    expect(describeAlert('cpu', 99.4)).toBe('Processador em 99%');
    expect(describeAlert('memory', 98)).toBe('Memória em 98%');
  });

  it('describes the disk by how full it is', () => {
    expect(describeAlert('disk', 93.2)).toBe('Disco com 93% de uso');
  });
});

describe('alertDurationSeconds', () => {
  // feliz
  it('measures how long the episode lasted', () => {
    expect(
      alertDurationSeconds('2026-09-22T12:00:00.000Z', '2026-09-22T12:20:00.000Z'),
    ).toBe(1200);
  });

  // triste
  /* Nulo é o que separa "está travada agora" de "travou ontem". */
  it('gives nothing while the episode has not ended', () => {
    expect(alertDurationSeconds('2026-09-22T12:00:00.000Z', null)).toBeNull();
  });

  it('refuses a recovery dated before the start', () => {
    expect(
      alertDurationSeconds('2026-09-22T12:00:00.000Z', '2026-09-22T11:00:00.000Z'),
    ).toBeNull();
  });

  it('refuses an unreadable date instead of returning NaN', () => {
    expect(alertDurationSeconds('ontem', 'hoje')).toBeNull();
  });
});
