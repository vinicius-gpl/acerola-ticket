<script module lang="ts">
  import { defineMeta } from '@storybook/addon-svelte-csf';
  import Building2 from '@lucide/svelte/icons/building-2';
  import ClipboardList from '@lucide/svelte/icons/clipboard-list';
  import ShieldCheck from '@lucide/svelte/icons/shield-check';
  import Users from '@lucide/svelte/icons/users';

  import StatCardGrid from '$lib/components/stat-card-grid/stat-card-grid.svelte';
  import StatCard from './stat-card.svelte';

  const { Story } = defineMeta({
    title: 'Components/StatCard',
    component: StatCard,
  });
</script>

<Story name="Default" args={{ data: { label: 'Clientes', value: 560 } }} />

<!-- Um número que EXCLUI algo precisa dizer o que excluiu, ou dois painéis discordam. -->
<Story
  name="WithHint"
  args={{
    data: { label: 'Ativos', value: 641, hint: 'Exclui 1.067 arquivados' },
    ui: { tone: 'info' },
  }}
/>

<Story name="AllTones" args={{ data: { label: 'Total', value: 0 } }}>
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

<!-- Com ícone: o quadrado sólido substitui a barra — as duas juntas seriam redundantes. -->
<Story
  name="WithIcon"
  args={{ data: { label: 'Clientes', value: 7 }, ui: { tone: 'brand', icon: Building2 } }}
/>

<Story name="AllTonesWithIcon" args={{ data: { label: 'Total', value: 0 } }}>
  {#snippet template()}
    <StatCardGrid>
      <StatCard data={{ label: 'Clientes', value: 7 }} ui={{ tone: 'brand', icon: Building2 }} />
      <StatCard
        data={{ label: 'Total Geral', value: 25 }}
        ui={{ tone: 'neutral', icon: ClipboardList }}
      />
      <StatCard
        data={{ label: 'Ativos', value: 24, hint: 'Exclui 1 arquivado' }}
        ui={{ tone: 'info', icon: ShieldCheck }}
      />
      <StatCard data={{ label: 'Equipe', value: 4 }} ui={{ tone: 'neutral', icon: Users }} />
    </StatCardGrid>
  {/snippet}
</Story>

<Story
  name="Large"
  args={{ data: { label: 'Total geral', value: 1708 }, ui: { tone: 'brand', size: 'lg' } }}
/>

<Story
  name="Loading"
  args={{ data: { label: 'Clientes', value: 0 }, state: { isLoading: true } }}
/>

<!-- Caso limite: zero é um número legítimo e não pode virar traço nem sumir. -->
<Story name="Zero" args={{ data: { label: 'Inativas', value: 0 }, ui: { tone: 'neutral' } }} />

<!-- Caso limite: rótulo comprido não pode empurrar o número para fora do cartão. -->
<Story
  name="LongLabel"
  args={{
    data: {
      label: 'Tarefas sem prazo definido nem responsável',
      value: 1425,
      hint: 'Inclui vencidos antigos e sem prazo definido',
    },
    ui: { tone: 'danger', className: 'max-w-[220px]' },
  }}
/>
