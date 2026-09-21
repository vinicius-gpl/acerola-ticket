<script module lang="ts">
  import { defineMeta } from '@storybook/addon-svelte-csf';
  import type { ComponentProps } from 'svelte';
  import Download from '@lucide/svelte/icons/download';
  import Plus from '@lucide/svelte/icons/plus';

  import ActionButton from '$lib/components/action-button/action-button.svelte';
  import PageHeader from './page-header.svelte';

  const { Story } = defineMeta({
    title: 'Components/PageHeader',
    component: PageHeader,
    parameters: { layout: 'padded' },
  });
</script>

{#snippet exportAndCreate()}
  <ActionButton data={{ label: 'Exportar' }} ui={{ variant: 'secondary', icon: Download }} />
  <ActionButton data={{ label: 'Nova tarefa' }} ui={{ icon: Plus }} />
{/snippet}

{#snippet createOnly()}
  <ActionButton data={{ label: 'Nova tarefa' }} ui={{ icon: Plus }} />
{/snippet}

<Story
  name="Default"
  args={{
    data: { title: 'Tarefas', description: 'O que a equipe precisa fazer, e em que pé está.' },
  }}
/>

<Story
  name="WithActions"
  args={{
    data: { title: 'Tarefas', description: 'O que a equipe precisa fazer, e em que pé está.' },
    children: exportAndCreate,
  }}
/>

<Story name="TitleOnly" args={{ data: { title: 'Configurações' } }} />

<!-- Caso limite: título e descrição longos numa tela estreita — as ações descem. -->
<Story
  name="LongTextOnNarrowScreen"
  args={{
    data: {
      title: 'Acompanhamento de tarefas da equipe comercial',
      description: 'Tudo o que foi combinado com clientes nas últimas reuniões, por responsável.',
    },
    children: createOnly,
  }}
>
  {#snippet template(args: ComponentProps<typeof PageHeader>)}
    <div class="w-80">
      <PageHeader {...args} />
    </div>
  {/snippet}
</Story>
