<script module lang="ts">
  import { defineMeta } from '@storybook/addon-svelte-csf';
  import { fn } from 'storybook/test';

  import ButtonGroup from './acerola-button-group.svelte';

  const periods = [
    { value: 'day', label: 'Dia' },
    { value: 'week', label: 'Semana' },
    { value: 'month', label: 'Mês' },
  ];

  const { Story } = defineMeta({
    title: 'Components/AcerolaButtonGroup',
    component: ButtonGroup,
    args: {
      data: { options: periods, value: 'week' },
      ui: { ariaLabel: 'Recorte do período' },
      actions: { onChange: fn() },
    },
  });
</script>

<Story name="Default" />

<Story name="Vertical" args={{ ui: { ariaLabel: 'Recorte do período', orientation: 'vertical' } }} />

<Story name="Disabled" args={{ state: { isDisabled: true } }} />

<!-- Caso limite: uma opção só — o grupo continua com as duas pontas arredondadas. -->
<Story
  name="SingleOption"
  args={{ data: { options: [{ value: 'month', label: 'Mês' }], value: 'month' } }}
/>

<!-- Caso limite: nenhum valor casa com as opções — nada fica marcado. -->
<Story name="NothingSelected" args={{ data: { options: periods, value: '' } }} />
