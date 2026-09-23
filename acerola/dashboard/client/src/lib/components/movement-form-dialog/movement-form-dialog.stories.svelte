<script module lang="ts">
  import { defineMeta } from '@storybook/addon-svelte-csf';
  import { type Part } from '@template/shared/schemas/part.schema';

  import { type FormFieldState } from '$lib/types/form-field.type';
  import MovementFormDialog, { type MovementFormField } from './movement-form-dialog.svelte';

  function part(over: Partial<Part> = {}): Part {
    return {
      id: 1,
      name: 'SSD 240 GB Kingston',
      category: 'ssd',
      condition: 'new',
      balance: 3,
      createdAt: '2026-09-01T12:00:00.000Z',
      createdBy: 'suporte@azuos.local',
      updatedAt: null,
      updatedBy: null,
      ...over,
    };
  }

  function field(value = '', error: string | null = null): FormFieldState {
    return { value, error };
  }

  function fields(
    over: Partial<Record<MovementFormField, FormFieldState>> = {},
  ): Record<MovementFormField, FormFieldState> {
    return {
      quantity: field('1'),
      computerId: field(''),
      handledBy: field(),
      note: field(),
      ...over,
    };
  }

  const machines = [
    { value: '1', label: 'Recepção — balcão (RECEPCAO-01)' },
    { value: '3', label: 'Contábil — mesa do fechamento (CONTABIL-03)' },
  ];

  const actions = {
    onChange: () => {},
    onBlur: () => {},
    onSubmit: () => {},
    onClose: () => {},
  };

  const { Story } = defineMeta({
    title: 'Components/MovementFormDialog',
    component: MovementFormDialog,
  });
</script>

<!-- Saída: a peça vai para uma máquina. -->
<Story
  name="Default"
  args={{
    data: { part: part(), type: 'out', fields: fields({ computerId: field('3') }), machines },
    state: { isOpen: true },
    actions,
  }}
/>

<!-- Entrada: a peça volta para a prateleira. -->
<Story
  name="Entry"
  args={{
    data: { part: part(), type: 'in', fields: fields({ quantity: field('5') }), machines },
    state: { isOpen: true },
    actions,
  }}
/>

<Story
  name="Field error"
  args={{
    data: {
      part: part(),
      type: 'out',
      fields: fields({ quantity: field('0', 'A quantidade precisa ser pelo menos 1') }),
      machines,
    },
    state: { isOpen: true },
    actions,
  }}
/>

<!-- Recusa por falta de estoque: o modal continua aberto, com o número que explica. -->
<Story
  name="Not enough stock"
  args={{
    data: { part: part(), type: 'out', fields: fields({ quantity: field('5') }), machines },
    state: {
      isOpen: true,
      error: 'Só há 3 de SSD 240 GB Kingston no depósito, e a saída é de 5. Confira a prateleira.',
    },
    actions,
  }}
/>

<Story
  name="Submitting"
  args={{
    data: { part: part(), type: 'out', fields: fields(), machines },
    state: { isOpen: true, isSubmitting: true },
    actions,
  }}
/>

<!-- CASO LIMITE: peça de nome comprido no cabeçalho do modal. -->
<Story
  name="Long part name"
  args={{
    data: {
      part: part({
        name: 'Adaptador DisplayPort para VGA com cabo de 1,8 m (para os monitores antigos da recepção)',
        balance: 2,
      }),
      type: 'out',
      fields: fields(),
      machines,
    },
    state: { isOpen: true },
    actions,
  }}
/>
