<script module lang="ts">
  import { defineMeta } from '@storybook/addon-svelte-csf';
  import type { ComponentProps } from 'svelte';

  import RadialChart from './radial-chart.svelte';

  const { Story } = defineMeta({
    title: 'Components/RadialChart',
    component: RadialChart,
    parameters: { layout: 'padded' },
  });
</script>

<!-- O medidor preenche o espaço que recebe; no Storybook ele precisa de uma caixa. -->
{#snippet inBox(args: ComponentProps<typeof RadialChart>)}
  <div class="w-56">
    <RadialChart {...args} />
  </div>
{/snippet}

<Story
  name="Default"
  args={{ data: { value: 84, max: 96, label: 'Máquinas de pé', hint: 'de 96 cadastradas' } }}
  template={inBox}
/>

<!-- Porcentagem escrita à mão: o número do meio nem sempre é o mesmo do arco. -->
<Story
  name="Percent"
  args={{ data: { value: 72, label: 'Chamados resolvidos', display: '72%' } }}
  template={inBox}
/>

<!-- Vermelho quando o número é ruim: a cor vem de quem chama, como no `StatusBadge`. -->
<Story
  name="Danger"
  args={{
    data: { value: 11, max: 96, label: 'Máquinas críticas', hint: 'exigem ação hoje' },
    ui: { color: 'var(--destructive)' },
  }}
  template={inBox}
/>

<Story
  name="Loading"
  args={{ data: { value: 0, label: 'Máquinas de pé' }, state: { isLoading: true } }}
  template={inBox}
/>

<!-- Caso limite: nada preenchido — o anel de trás é o que sustenta a leitura. -->
<Story
  name="Empty"
  args={{ data: { value: 0, max: 96, label: 'Máquinas de pé', hint: 'nenhuma respondeu' } }}
  template={inBox}
/>

<!-- Caso limite: cheio, e um rótulo comprido que precisa caber no meio do anel. -->
<Story
  name="FullWithLongLabel"
  args={{
    data: { value: 96, max: 96, label: 'Máquinas com o agente instalado e respondendo' },
  }}
  template={inBox}
/>
