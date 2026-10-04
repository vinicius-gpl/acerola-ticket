<script module lang="ts">
  import { defineMeta } from '@storybook/addon-svelte-csf';
  import { fn } from 'storybook/test';
  import type { ComponentProps } from 'svelte';

  import RadarChart from './acerola-radar-chart.svelte';

  /** O perfil de um escritório de contabilidade: impressora e lentidão puxam a teia. */
  const slices = [
    { label: 'Impressora', value: 29 },
    { label: 'Computador lento', value: 30 },
    { label: 'Internet / Rede', value: 15 },
    { label: 'E-mail', value: 12 },
    { label: 'Sistema interno', value: 9 },
    { label: 'Certificado digital', value: 13 },
    { label: 'Instalação de programa', value: 8 },
    { label: 'AnyDesk / Acesso remoto', value: 10 },
    { label: 'Outro', value: 9 },
  ];

  const { Story } = defineMeta({
    title: 'Components/AcerolaRadarChart',
    component: RadarChart,
    parameters: { layout: 'padded' },
  });
</script>

{#snippet inBox(args: ComponentProps<typeof RadarChart>)}
  <div class="w-full max-w-lg">
    <RadarChart {...args} />
  </div>
{/snippet}

<Story name="Default" args={{ data: { slices, seriesLabel: 'Chamados' } }} template={inBox} />

<!-- Com clique: a ponta é o caminho para a lista filtrada, não um enfeite. -->
<Story
  name="Clickable"
  args={{ data: { slices, seriesLabel: 'Chamados' }, actions: { onSelect: fn() } }}
  template={inBox}
/>

<!-- A cor da teia vem de quem chama, como no `StatusBadge`. -->
<Story
  name="OutraCor"
  args={{ data: { slices, seriesLabel: 'Chamados' }, ui: { color: 'var(--chart-5)' } }}
  template={inBox}
/>

<Story
  name="Loading"
  args={{ data: { slices: [], seriesLabel: 'Chamados' }, state: { isLoading: true } }}
  template={inBox}
/>

<Story
  name="Empty"
  args={{
    data: { slices: [], seriesLabel: 'Chamados' },
    ui: { emptyLabel: 'Ainda não há chamados para comparar.' },
  }}
  template={inBox}
/>

<!-- CASO LIMITE, e é o que mostra ONDE O RADAR NÃO SERVE: com três eixos ele vira um
     triângulo que não diz nada, e a barra deitada responderia melhor. -->
<Story
  name="PoucasCategorias"
  args={{ data: { slices: slices.slice(0, 3), seriesLabel: 'Chamados' } }}
  template={inBox}
/>

<!-- Caso limite: uma categoria dominando tudo — a teia vira uma agulha, e é isso mesmo que
     os dados dizem. -->
<Story
  name="UmaDominando"
  args={{
    data: {
      slices: [
        { label: 'Impressora', value: 80 },
        ...slices.slice(1).map((slice) => ({ ...slice, value: 2 })),
      ],
      seriesLabel: 'Chamados',
    },
  }}
  template={inBox}
/>

<!-- Caso limite: todos iguais — o polígono vira um círculo, e o "não há líder" se lê de
     relance, que é justamente o que o radar faz bem. -->
<Story
  name="TodosIguais"
  args={{
    data: { slices: slices.map((slice) => ({ ...slice, value: 12 })), seriesLabel: 'Chamados' },
  }}
  template={inBox}
/>

<!-- Caso limite: na largura de um celular, com nomes compridos em volta. -->
<Story name="OnPhone">
  <div class="w-[360px]">
    <RadarChart data={{ slices, seriesLabel: 'Chamados' }} />
  </div>
</Story>
