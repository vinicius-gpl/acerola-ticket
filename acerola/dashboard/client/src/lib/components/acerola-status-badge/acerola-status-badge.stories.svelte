<script module lang="ts">
  import { defineMeta } from '@storybook/addon-svelte-csf';
  import type { ComponentProps } from 'svelte';

  import StatusBadge, { type StatusBadgeTone } from './acerola-status-badge.svelte';

  const tones: { tone: StatusBadgeTone; label: string }[] = [
    { tone: 'neutral', label: 'Aberto' },
    { tone: 'info', label: 'Em atendimento' },
    { tone: 'success', label: 'Resolvido' },
    { tone: 'warning', label: 'Aguardando' },
    { tone: 'danger', label: 'Atrasado' },
    { tone: 'brand', label: 'Destaque' },
  ];

  const { Story } = defineMeta({
    title: 'Components/AcerolaStatusBadge',
    component: StatusBadge,
  });
</script>

<Story name="Default" args={{ data: { label: 'Em atendimento' }, ui: { tone: 'info' } }} />

<!-- Todos os tons, para conferir a paleta de uma vez. -->
<Story name="AllTones" args={{ data: { label: 'Aberto' } }}>
  {#snippet template()}
    <div class="flex max-w-xl flex-wrap gap-2">
      {#each tones as { tone, label } (tone)}
        <StatusBadge data={{ label }} ui={{ tone }} />
      {/each}
    </div>
  {/snippet}
</Story>

<Story name="Small" args={{ data: { label: 'Resolvido' }, ui: { tone: 'success', size: 'sm' } }} />

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
