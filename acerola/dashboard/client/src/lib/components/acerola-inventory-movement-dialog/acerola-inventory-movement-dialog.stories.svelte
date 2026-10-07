<script module lang="ts">
  import { defineMeta } from '@storybook/addon-svelte-csf';
  import { fn } from 'storybook/test';

  import InventoryMovementDialog, {
    type InventoryMovementFormField,
  } from './acerola-inventory-movement-dialog.svelte';
  import { type FormFieldState } from '$lib/types/form-field.type';

  function field(value = '', error: string | null = null): FormFieldState {
    return { value, error };
  }

  const fields: Record<InventoryMovementFormField, FormFieldState> = {
    itemId: field('4'),
    quantity: field('3'),
    reason: field(''),
    note: field(''),
  };

  const product = { name: 'Café torrado e moído 500 g', balance: 7, unitLabel: 'Pacote' };

  const productOptions = [
    { value: '4', label: 'Café torrado e moído 500 g' },
    { value: '9', label: 'Lâmpada LED 9 W bivolt' },
    { value: '1', label: 'Cadeira giratória com apoio de braço' },
  ];

  const actions = { onChange: fn(), onBlur: fn(), onSubmit: fn(), onClose: fn() };

  const { Story } = defineMeta({
    title: 'Components/AcerolaInventoryMovementDialog',
    component: InventoryMovementDialog,
  });
</script>

<!-- O uso mais comum: entrada de um produto que já veio escolhido. -->
<Story
  name="Default"
  args={{
    data: { type: 'in', product, productOptions: [], fields },
    state: { isOpen: true },
    actions,
  }}
/>

<!-- Saída: outro título, outra cor, o mesmo saldo à vista. -->
<Story
  name="Exit"
  args={{
    data: { type: 'out', product, productOptions: [], fields },
    state: { isOpen: true },
    actions,
  }}
/>

<!-- Descarte: a pessoa escolhe o produto e diz o motivo. -->
<Story
  name="Disposal"
  args={{
    data: {
      type: 'disposal',
      product,
      productOptions,
      fields: { ...fields, quantity: field('1'), reason: field('expired') },
    },
    state: { isOpen: true },
    actions,
  }}
/>

<!-- Descarte ainda sem produto: o saldo só aparece depois da escolha. -->
<Story
  name="DisposalWithoutProduct"
  args={{
    data: {
      type: 'disposal',
      product: null,
      productOptions,
      fields: { itemId: field(''), quantity: field(''), reason: field(''), note: field('') },
    },
    state: { isOpen: true },
    actions,
  }}
/>

<!-- Os produtos ainda estão chegando. -->
<Story
  name="LoadingProducts"
  args={{
    data: {
      type: 'disposal',
      product: null,
      productOptions: [],
      fields: { itemId: field(''), quantity: field(''), reason: field(''), note: field('') },
    },
    state: { isOpen: true, isProductsLoading: true },
    actions,
  }}
/>

<!-- Erro de campo: cada um ao lado do seu. -->
<Story
  name="WithFieldErrors"
  args={{
    data: {
      type: 'disposal',
      product: null,
      productOptions,
      fields: {
        itemId: field('', 'Escolha o produto'),
        quantity: field('', 'Informe a quantidade'),
        reason: field('', 'Escolha o motivo do descarte'),
        note: field(''),
      },
    },
    state: { isOpen: true },
    actions,
  }}
/>

<!-- A recusa do servidor: o diálogo continua aberto, com o que foi digitado. -->
<Story
  name="Refused"
  args={{
    data: { type: 'out', product, productOptions: [], fields: { ...fields, quantity: field('9') } },
    state: {
      isOpen: true,
      error:
        'Só há 7 de Café torrado e moído 500 g no depósito, e o movimento é de 9. Confira a prateleira e registre a entrada que faltou.',
    },
    actions,
  }}
/>

<!-- Gravando: nada pode ser mexido. -->
<Story
  name="Submitting"
  args={{
    data: { type: 'in', product, productOptions: [], fields },
    state: { isOpen: true, isSubmitting: true },
    actions,
  }}
/>

<!-- Caso limite: nome de produto comprido e observação no limite. -->
<Story
  name="LongText (edge case)"
  args={{
    data: {
      type: 'in',
      product: {
        name: 'Suporte articulado de parede para monitor de até 32 polegadas com inclinação',
        balance: 1250,
        unitLabel: 'Unidade',
      },
      productOptions: [],
      fields: { ...fields, note: field('Compra grande para a reforma. '.repeat(10).trim()) },
    },
    state: { isOpen: true },
    actions,
  }}
/>
