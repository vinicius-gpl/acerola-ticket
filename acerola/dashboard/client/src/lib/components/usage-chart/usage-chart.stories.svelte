<script module lang="ts">
  import { defineMeta } from '@storybook/addon-svelte-csf';

  import UsageChart, { type UsagePoint } from './usage-chart.svelte';

  const START = Date.parse('2026-09-23T00:00:00.000Z');
  const FIVE_MINUTES = 5 * 60 * 1000;

  /** A mesma onda determinística do seed: o catálogo mostra o gráfico que a tela desenha. */
  function series(options: { spikeAt?: number } = {}): UsagePoint[] {
    return Array.from({ length: 288 }, (_, index) => {
      const wave = Math.sin(index / 18) * 12;
      const isSpike =
        options.spikeAt !== undefined && index >= options.spikeAt && index < options.spikeAt + 8;

      return {
        at: new Date(START + index * FIVE_MINUTES).toISOString(),
        cpuPercent: isSpike ? 99 : 30 + wave,
        memoryPercent: isSpike ? 99 : 58 + wave / 2,
        diskPercent: 72,
      };
    });
  }

  const { Story } = defineMeta({
    title: 'Components/UsageChart',
    component: UsageChart,
  });
</script>

<!-- O dia normal: o uso sobe no expediente e cai à noite. -->
<Story name="Default" args={{ data: { points: series() } }} />

<!-- O que a ficha precisa deixar evidente: a máquina travou no meio da tarde. -->
<Story name="With spike" args={{ data: { points: series({ spikeAt: 210 }) } }} />

<Story name="Loading" args={{ data: { points: [] }, state: { isLoading: true } }} />

<!-- Máquina cadastrada cujo agente nunca enviou nada. -->
<Story name="Empty" args={{ data: { points: [] } }} />

<!-- CASO LIMITE: uma leitura só. A linha precisa aparecer, e não sumir num ponto. -->
<Story
  name="Single reading"
  args={{
    data: {
      points: [
        {
          at: '2026-09-23T14:00:00.000Z',
          cpuPercent: 42,
          memoryPercent: 71,
          diskPercent: 90,
        },
      ],
    },
  }}
/>
