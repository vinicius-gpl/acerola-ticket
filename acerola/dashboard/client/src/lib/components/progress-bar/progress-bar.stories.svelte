<script module lang="ts">
  import { defineMeta } from '@storybook/addon-svelte-csf';
  import type { ComponentProps } from 'svelte';

  import ProgressBar from './progress-bar.svelte';

  const { Story } = defineMeta({
    title: 'Components/ProgressBar',
    component: ProgressBar,
  });
</script>

<!-- A barra ocupa a largura que recebe; a caixa fixa mostra como ela fica numa coluna. -->
{#snippet inBox(args: ComponentProps<typeof ProgressBar>)}
  <div class="w-80">
    <ProgressBar {...args} />
  </div>
{/snippet}

<Story
  name="Default"
  args={{ data: { percentage: 62, done: 8, total: 13 }, ui: { itemLabel: 'tarefas' } }}
  template={inBox}
/>

<Story
  name="WithCount"
  args={{ data: { percentage: 62, done: 8, total: 13 }, ui: { showCount: true } }}
  template={inBox}
/>

<!-- Cada faixa tem um tom, e é por ele que a lista é lida de relance. -->
<Story name="AllTones" args={{ data: { percentage: 100, done: 13, total: 13 } }}>
  {#snippet template()}
    <div class="w-80 space-y-3">
      <ProgressBar data={{ percentage: 100, done: 13, total: 13 }} />
      <ProgressBar data={{ percentage: 78, done: 10, total: 13 }} />
      <ProgressBar data={{ percentage: 46, done: 6, total: 13 }} />
      <ProgressBar data={{ percentage: 15, done: 2, total: 13 }} />
    </div>
  {/snippet}
</Story>

<!-- Nada a cumprir NÃO é 0%: uma barra vermelha zerada acusaria atraso onde não há. -->
<Story
  name="NothingToDo"
  args={{ data: { percentage: 0, done: 0, total: 0 }, ui: { emptyLabel: 'Sem tarefas' } }}
  template={inBox}
/>

<!-- Caso limite: um item só, e ele pendente. -->
<Story
  name="SingleItemPending"
  args={{ data: { percentage: 0, done: 0, total: 1 }, ui: { showCount: true } }}
  template={inBox}
/>
