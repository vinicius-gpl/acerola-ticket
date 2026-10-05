import { render, screen } from '@testing-library/svelte';
import { describe, expect, it } from 'vitest';

import UsageChart, { toPoints, USAGE_SERIES, type UsagePoint } from './acerola-usage-chart.svelte';

function point(over: Partial<UsagePoint> = {}): UsagePoint {
  return {
    at: '2026-09-23T14:00:00.000Z',
    cpuPercent: 20,
    memoryPercent: 50,
    diskPercent: 80,
    ...over,
  };
}

describe('toPoints', () => {
  // feliz
  /* Trocar duas medidas de lugar aqui desenha um gráfico bonito que mente, e é por ele que
     alguém decide trocar uma peça. */
  it('keeps every measure under its own series', () => {
    const [converted] = toPoints([point()]);

    expect(converted!.at).toBe('2026-09-23T14:00:00.000Z');
    expect(converted!.values).toEqual({ cpuPercent: 20, memoryPercent: 50, diskPercent: 80 });
  });

  // triste
  it('has nothing to convert when there is no reading', () => {
    expect(toPoints([])).toEqual([]);
  });
});

describe('USAGE_SERIES', () => {
  // feliz
  /* Duas telas montando a lista por conta própria é como "Memória" fica verde numa e azul
     na outra. */
  it('names the three measures in Portuguese, each with its own colour', () => {
    expect(USAGE_SERIES.map((series) => series.label)).toEqual(['Processador', 'Memória', 'Disco']);
    expect(new Set(USAGE_SERIES.map((series) => series.color)).size).toBe(3);
  });
});

describe('AcerolaUsageChart', () => {
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

  /* Durante o carregamento não se diz "sem leituras": faria a pessoa achar que sumiram. */
  it('says nothing about emptiness while loading (edge case)', () => {
    render(UsageChart, { props: { data: { points: [] }, state: { isLoading: true } } });

    expect(screen.queryByText('Sem leituras no período.')).not.toBeInTheDocument();
  });
});
