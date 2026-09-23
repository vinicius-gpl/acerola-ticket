import { describe, expect, it } from 'vitest';

import { formatBytes, formatDuration, formatPercent, formatTimeAgo } from './format-machine';

const GB = 1024 ** 3;

describe('formatBytes', () => {
  // feliz
  it('reads memory in the unit a person would say', () => {
    expect(formatBytes(16 * GB)).toBe('16,0 GB');
  });

  it('keeps small sizes in whole megabytes', () => {
    expect(formatBytes(240 * 1024 * 1024)).toBe('240 MB');
  });

  // triste
  /* Nulo é "o agente ainda não mediu". Virar "0 B" anunciaria uma máquina sem memória. */
  it('shows a dash when nothing was measured yet', () => {
    expect(formatBytes(null)).toBe('—');
    expect(formatBytes(undefined)).toBe('—');
  });

  it('keeps a measured zero as zero', () => {
    expect(formatBytes(0)).toBe('0 B');
  });
});

describe('formatPercent', () => {
  // feliz
  it('rounds the measure to a whole number', () => {
    expect(formatPercent(97.4)).toBe('97%');
  });

  // triste
  it('shows a dash when there is no measure', () => {
    expect(formatPercent(null)).toBe('—');
  });
});

describe('formatDuration', () => {
  // feliz
  it('answers in days when the machine has been up for weeks', () => {
    expect(formatDuration(47 * 24 * 60 * 60)).toBe('47 dias');
  });

  it('says one day without pluralising it', () => {
    expect(formatDuration(24 * 60 * 60)).toBe('1 dia');
  });

  it('answers in hours within the same day', () => {
    expect(formatDuration(6 * 60 * 60)).toBe('6 h');
  });

  // triste
  it('shows a dash when the machine never reported', () => {
    expect(formatDuration(null)).toBe('—');
  });
});

describe('formatTimeAgo', () => {
  const NOW = Date.parse('2026-09-23T12:00:00.000Z');

  // feliz
  it('answers the distance, not the date', () => {
    expect(formatTimeAgo('2026-09-23T11:56:00.000Z', NOW)).toBe('há 4 minutos');
    expect(formatTimeAgo('2026-09-16T12:00:00.000Z', NOW)).toBe('há 7 dias');
  });

  it('says just now for a reading that arrived seconds ago', () => {
    expect(formatTimeAgo('2026-09-23T11:59:40.000Z', NOW)).toBe('agora mesmo');
  });

  // triste
  /* Máquina cadastrada e agente nunca instalado: "nunca" é a resposta, e ela é informação —
     é o que diz que falta instalar o agente naquela máquina. */
  it('says never when the agent has never connected', () => {
    expect(formatTimeAgo(null, NOW)).toBe('nunca');
  });

  it('shows a dash for something that is not a date', () => {
    expect(formatTimeAgo('ontem', NOW)).toBe('—');
  });

  /* Relógio da máquina adiantado não pode virar "daqui a pouco" no passado. */
  it('does not travel to the future when the clock is slightly ahead', () => {
    expect(formatTimeAgo('2026-09-23T12:00:30.000Z', NOW)).toBe('agora mesmo');
  });
});
