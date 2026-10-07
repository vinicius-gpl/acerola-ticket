<script module lang="ts">
  import { defineMeta } from '@storybook/addon-svelte-csf';
  import { fn } from 'storybook/test';

  import AcerolaDatePicker from './acerola-date-picker.svelte';

  /**
   * O campo de data de todo formulário: um botão na altura dos outros campos (40px) que abre
   * o calendário. Guarda e devolve a data como `AAAA-MM-DD`, o formato que a API recebe.
   */
  const { Story } = defineMeta({
    title: 'Components/AcerolaDatePicker',
    component: AcerolaDatePicker,
    args: { ariaLabel: 'Data da manutenção', onValueChange: fn() },
  });
</script>

<Story name="Default" args={{ value: '2026-09-14' }} />

<Story name="Empty" args={{ value: null }} />

<Story name="Custom Placeholder" args={{ value: null, placeholder: 'Quando foi feita?' }} />

<Story name="Disabled" args={{ value: '2026-09-14', disabled: true }} />

<!-- Caso limite: a API devolve data com hora; o campo mostra só o dia. -->
<Story name="Value With Time" args={{ value: '2026-09-14T10:30:00.000Z' }} />

<!-- Caso limite: coluna estreita — o texto corta com reticências, o campo não estoura. -->
<Story name="Narrow Column" args={{ value: '2026-09-14', class: 'max-w-[140px]' }} />
