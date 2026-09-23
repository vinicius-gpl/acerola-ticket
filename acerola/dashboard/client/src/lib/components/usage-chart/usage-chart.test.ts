import { render, screen } from '@testing-library/svelte';
import { describe, expect, it } from 'vitest';

import UsageChart, { buildLine, hourLabel, type UsagePoint } from './usage-chart.svelte';

function point(over: Partial<UsagePoint> = {}): UsagePoint {
  return {
    at: '2026-09-23T14:00:00.000Z',
    cpuPercent: 20,
    memoryPercent: 50,
    diskPercent: 80,
    ...over,
  };
}

describe('buildLine', () => {
  // feliz
  it('draws the first reading on the left and the last one on the right', () => {
    const line = buildLine([point({ cpuPercent: 0 }), point({ cpuPercent: 100 })], 'cpuPercent');

    /* 0% no rodapé (y = 180) e 100% no topo (y = 0): o SVG conta o Y ao contrário. */
    expect(line).toBe('M0.0,180.0 L600.0,0.0');
  });

  it('keeps a single reading visible as a flat line', () => {
    expect(buildLine([point({ cpuPercent: 50 })], 'cpuPercent')).toBe('M0,90.0 L600,90.0');
  });

  // triste
  it('draws nothing when there is no reading', () => {
    expect(buildLine([], 'cpuPercent')).toBe('');
  });

  /* Medida fora da escala é defeito do agente, não motivo para a linha sair do quadro e
     invadir o resto da tela. */
  it('keeps a measure above one hundred inside the chart', () => {
    expect(buildLine([point({ cpuPercent: 140 })], 'cpuPercent')).toBe('M0,0.0 L600,0.0');
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

describe('UsageChart', () => {
  // feliz
  it('always names the three series in writing, never by colour alone', () => {
    render(UsageChart, { props: { data: { points: [point(), point()] } } });

    expect(screen.getByText('Processador')).toBeInTheDocument();
    expect(screen.getByText('Memória')).toBeInTheDocument();
    expect(screen.getByText('Disco')).toBeInTheDocument();
  });

  // triste
  /* Sem leitura o gráfico diz que não há leitura. Um quadro vazio faria parecer que a
     máquina está parada, que é outra coisa. */
  it('says there is no reading instead of drawing an empty chart', () => {
    render(UsageChart, { props: { data: { points: [] } } });

    expect(screen.getByText('Sem leituras no período.')).toBeInTheDocument();
  });
});
