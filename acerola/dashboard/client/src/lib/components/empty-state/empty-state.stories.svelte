<script module lang="ts">
  import { defineMeta } from '@storybook/addon-svelte-csf';
  import type { ComponentProps } from 'svelte';
  import Plus from '@lucide/svelte/icons/plus';
  import SearchX from '@lucide/svelte/icons/search-x';

  import ActionButton from '$lib/components/action-button/action-button.svelte';
  import EmptyState from './empty-state.svelte';

  const { Story } = defineMeta({
    title: 'Components/EmptyState',
    component: EmptyState,
  });
</script>

{#snippet newTaskButton()}
  <ActionButton data={{ label: 'Nova tarefa' }} ui={{ icon: Plus }} />
{/snippet}

{#snippet clearFiltersButton()}
  <ActionButton data={{ label: 'Limpar filtros' }} ui={{ variant: 'secondary' }} />
{/snippet}

<Story name="Default" args={{ data: { title: 'Nenhuma tarefa ainda' } }} />

<!-- Com o próximo passo e a ação. É o formato preferido. -->
<Story
  name="WithAction"
  args={{
    data: {
      title: 'Nenhuma tarefa ainda',
      description: 'Cadastre a primeira para começar a acompanhar o trabalho.',
    },
    children: newTaskButton,
  }}
/>

<!-- O filtro escondeu tudo: a saída é limpar o filtro, não cadastrar. -->
<Story
  name="FilteredOut"
  args={{
    data: {
      title: 'Nenhuma tarefa encontrada',
      description: 'Nada combina com a busca. Tente outro termo ou limpe os filtros.',
    },
    ui: { icon: SearchX },
    children: clearFiltersButton,
  }}
/>

<!-- Caso limite: descrição longa numa coluna estreita. -->
<Story
  name="LongDescriptionInNarrowColumn"
  args={{
    data: {
      title: 'Nenhum registro',
      description:
        'Quando alguém cadastrar o primeiro registro, ele aparece aqui com a situação, o responsável e a data em que foi criado.',
    },
  }}
>
  {#snippet template(args: ComponentProps<typeof EmptyState>)}
    <div class="w-64">
      <EmptyState {...args} />
    </div>
  {/snippet}
</Story>
