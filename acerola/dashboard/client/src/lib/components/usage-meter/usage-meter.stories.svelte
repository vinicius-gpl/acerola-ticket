<script module lang="ts">
  import { defineMeta } from '@storybook/addon-svelte-csf';
  import type { ComponentProps } from 'svelte';

  import UsageMeter from './usage-meter.svelte';

  const { Story } = defineMeta({
    title: 'Components/UsageMeter',
    component: UsageMeter,
    parameters: { layout: 'padded' },
  });
</script>

{#snippet inBox(args: ComponentProps<typeof UsageMeter>)}
  <div class="w-72">
    <UsageMeter {...args} />
  </div>
{/snippet}

<Story
  name="Default"
  args={{ data: { label: 'Em uso', percentage: 62, detail: '12,4 GB de 16 GB' } }}
  template={inBox}
/>

<!-- Aqui CHEIO É RUIM, ao contrário da barra de progresso de tarefa: 62% é tranquilo… -->
<Story name="Calm" args={{ data: { label: 'Núcleo 1', percentage: 31 } }} template={inBox} />

<!-- …78% já pede atenção… -->
<Story name="Attention" args={{ data: { label: 'C:\\', percentage: 78 } }} template={inBox} />

<!-- …e 95% é uma máquina que vai parar. -->
<Story
  name="Critical"
  args={{ data: { label: 'C:\\', percentage: 95, detail: '11 GB livres de 240 GB' } }}
  template={inBox}
/>

<!-- Caso limite: medida torta vinda de um agente com defeito, contida dentro da barra. -->
<Story
  name="OutOfRange"
  args={{ data: { label: 'Disco', percentage: 140, detail: 'leitura fora da escala' } }}
  template={inBox}
/>

<!-- Caso limite: rótulo e leitura compridos, que precisam ser cortados em vez de estourar. -->
<Story
  name="LongLabel"
  args={{
    data: {
      label: 'Volume de rede montado no servidor de arquivos da contabilidade',
      percentage: 44,
      detail: '1,2 TB livres de 2,0 TB no volume compartilhado da contabilidade',
    },
  }}
  template={inBox}
/>

<!-- Caso limite: máquina parada, sem nada em uso. -->
<Story name="Empty" args={{ data: { label: 'Em uso', percentage: 0 } }} template={inBox} />
