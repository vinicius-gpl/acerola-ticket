<script module lang="ts">
  import { defineMeta } from '@storybook/addon-svelte-csf';
  import type { ComponentProps } from 'svelte';
  import Plus from '@lucide/svelte/icons/plus';
  import Trash2 from '@lucide/svelte/icons/trash-2';
  import { fn } from 'storybook/test';

  import ActionButton from './action-button.svelte';

  const { Story } = defineMeta({
    title: 'Components/ActionButton',
    component: ActionButton,
    args: { actions: { onClick: fn() } },
  });
</script>

<Story name="Default" args={{ data: { label: 'Nova tarefa' }, ui: { icon: Plus } }} />

<Story name="AllVariants" args={{ data: { label: 'Salvar' } }}>
  {#snippet template()}
    <div class="flex flex-wrap gap-2">
      <ActionButton data={{ label: 'Primário' }} ui={{ variant: 'primary' }} />
      <ActionButton data={{ label: 'Secundário' }} ui={{ variant: 'secondary' }} />
      <ActionButton data={{ label: 'Discreto' }} ui={{ variant: 'ghost' }} />
      <ActionButton data={{ label: 'Excluir' }} ui={{ variant: 'danger', icon: Trash2 }} />
    </div>
  {/snippet}
</Story>

<Story name="Small" args={{ data: { label: 'Editar' }, ui: { size: 'sm', variant: 'secondary' } }} />

<!-- Só ícone: o rótulo vira `aria-label` — o leitor de tela continua sabendo o que é. -->
<Story
  name="IconOnly"
  args={{
    data: { label: 'Excluir tarefa' },
    ui: { icon: Trash2, isIconOnly: true, variant: 'ghost' },
  }}
/>

<!-- Carregando: trava e gira. Dois cliques seriam duas requisições. -->
<Story
  name="Loading"
  args={{
    data: { label: 'Excluir', loadingLabel: 'Excluindo…' },
    ui: { variant: 'danger', icon: Trash2 },
    state: { isLoading: true },
  }}
/>

<Story
  name="Disabled"
  args={{ data: { label: 'Nova tarefa' }, ui: { icon: Plus }, state: { isDisabled: true } }}
/>

<!-- Caso limite: rótulo longo numa coluna estreita. -->
<Story
  name="LongLabelInNarrowColumn"
  args={{ data: { label: 'Exportar todas as tarefas concluídas do mês' } }}
>
  {#snippet template(args: ComponentProps<typeof ActionButton>)}
    <div class="border-ink-300 w-48 border border-dashed p-2">
      <ActionButton {...args} />
    </div>
  {/snippet}
</Story>
