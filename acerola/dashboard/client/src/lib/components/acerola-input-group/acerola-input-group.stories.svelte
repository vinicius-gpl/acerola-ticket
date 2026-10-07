<script module lang="ts">
  import Search from '@lucide/svelte/icons/search';
  import { defineMeta } from '@storybook/addon-svelte-csf';
  import { fn } from 'storybook/test';

  import InputGroup from './acerola-input-group.svelte';

  const { Story } = defineMeta({
    title: 'Components/AcerolaInputGroup',
    component: InputGroup,
    parameters: { layout: 'padded' },
  });

  const actions = { onChange: fn(), onBlur: fn() };
</script>

<Story name="Default">
  <InputGroup data={{ label: 'Valor da peça', name: 'price', value: '120,00' }} {actions}>
    {#snippet prefix()}R${/snippet}
  </InputGroup>
</Story>

<Story name="WithSuffix">
  <InputGroup data={{ label: 'Peso', name: 'weight', value: '2,5' }} {actions}>
    {#snippet suffix()}kg{/snippet}
  </InputGroup>
</Story>

<Story name="WithIcon">
  <InputGroup
    data={{ label: 'Buscar', name: 'search', value: '', placeholder: 'Nome ou patrimônio' }}
    {actions}
  >
    {#snippet prefix()}<Search aria-hidden="true" />{/snippet}
  </InputGroup>
</Story>

<Story name="WithError">
  <InputGroup
    data={{ label: 'Valor da peça', name: 'price', value: '' }}
    state={{ error: 'Informe o valor' }}
    {actions}
  >
    {#snippet prefix()}R${/snippet}
  </InputGroup>
</Story>

<Story name="Disabled">
  <InputGroup
    data={{ label: 'Valor da peça', name: 'price', value: '120,00' }}
    state={{ isDisabled: true }}
    {actions}
  >
    {#snippet prefix()}R${/snippet}
  </InputGroup>
</Story>

<!-- Caso limite: coluna estreita com valor comprido — o texto rola dentro do campo. -->
<Story name="NarrowColumn">
  <InputGroup
    data={{ label: 'Endereço do painel', name: 'url', value: 'painel.exemplo.local/um/caminho/bem/longo' }}
    ui={{ className: 'max-w-[220px]' }}
    {actions}
  >
    {#snippet prefix()}https://{/snippet}
  </InputGroup>
</Story>
