<script module lang="ts">
  import { defineMeta } from '@storybook/addon-svelte-csf';

  import StatCard from '$lib/components/stat-card/stat-card.svelte';
  import StatCardGrid from './stat-card-grid.svelte';

  const { Story } = defineMeta({
    title: 'Components/StatCardGrid',
    component: StatCardGrid,
  });
</script>

<!-- A grade só existe para arrumar os cartões; as histórias mostram como ela se comporta
     conforme o número deles muda. -->
<Story name="Default">
  {#snippet template()}
    <StatCardGrid>
      <StatCard data={{ label: 'Clientes', value: 560 }} ui={{ tone: 'brand' }} />
      <StatCard data={{ label: 'Concluídas', value: 145 }} ui={{ tone: 'success' }} />
      <StatCard data={{ label: 'Vencendo', value: 27 }} ui={{ tone: 'warning' }} />
      <StatCard data={{ label: 'Vencidos', value: 23 }} ui={{ tone: 'danger' }} />
    </StatCardGrid>
  {/snippet}
</Story>

<!-- Caso limite: um cartão só não pode esticar para a largura inteira. -->
<Story name="SingleCard (edge case)">
  {#snippet template()}
    <StatCardGrid>
      <StatCard data={{ label: 'Total geral', value: 1708 }} ui={{ tone: 'brand' }} />
    </StatCardGrid>
  {/snippet}
</Story>

<!-- Caso limite: mais de quatro cartões quebram para a linha de baixo. -->
<Story name="SecondRow (edge case)">
  {#snippet template()}
    <StatCardGrid>
      <StatCard data={{ label: 'Clientes', value: 560 }} ui={{ tone: 'brand' }} />
      <StatCard data={{ label: 'Concluídas', value: 145 }} ui={{ tone: 'success' }} />
      <StatCard data={{ label: 'Vencendo', value: 27 }} ui={{ tone: 'warning' }} />
      <StatCard data={{ label: 'Vencidos', value: 23 }} ui={{ tone: 'danger' }} />
      <StatCard data={{ label: 'Em andamento', value: 59 }} ui={{ tone: 'info' }} />
      <StatCard data={{ label: 'Não iniciado', value: 79 }} ui={{ tone: 'neutral' }} />
    </StatCardGrid>
  {/snippet}
</Story>

<!-- Caso limite: sem cartão nenhum a grade não desenha caixa vazia. -->
<Story name="Empty (edge case)">
  {#snippet template()}
    <StatCardGrid />
  {/snippet}
</Story>
