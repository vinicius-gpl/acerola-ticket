<script module lang="ts">
  import { defineMeta } from '@storybook/addon-svelte-csf';
  import type { ComponentProps } from 'svelte';

  import StatusBadge, { type StatusBadgeTone } from './status-badge.svelte';

  const tones: { tone: StatusBadgeTone; label: string }[] = [
    { tone: 'neutral', label: 'A fazer' },
    { tone: 'info', label: 'Em andamento' },
    { tone: 'success', label: 'Concluída' },
    { tone: 'warning', label: 'Aguardando' },
    { tone: 'danger', label: 'Atrasada' },
    { tone: 'brand', label: 'Destaque' },
  ];

  const { Story } = defineMeta({
    title: 'Components/StatusBadge',
    component: StatusBadge,
  });
</script>

<Story name="Default" args={{ data: { label: 'Em andamento' }, ui: { tone: 'info' } }} />

<!-- Todos os tons, para conferir a paleta de uma vez. -->
<Story name="AllTones" args={{ data: { label: 'A fazer' } }}>
  {#snippet template()}
    <div class="flex max-w-xl flex-wrap gap-2">
      {#each tones as { tone, label } (tone)}
        <StatusBadge data={{ label }} ui={{ tone }} />
      {/each}
    </div>
  {/snippet}
</Story>

<Story name="Small" args={{ data: { label: 'Concluída' }, ui: { tone: 'success', size: 'sm' } }} />

<!-- Situação vazia não vira selo cinza: faria parecer que alguém respondeu algo. -->
<Story name="NotFilled" args={{ data: { label: null } }} />

<!-- Caso limite: rótulo longo dentro de uma coluna estreita. -->
<Story
  name="LongLabelInNarrowColumn"
  args={{ data: { label: 'Aguardando retorno do cliente' }, ui: { tone: 'warning' } }}
>
  {#snippet template(args: ComponentProps<typeof StatusBadge>)}
    <div class="border-ink-300 w-40 border border-dashed p-2">
      <StatusBadge {...args} />
    </div>
  {/snippet}
</Story>
