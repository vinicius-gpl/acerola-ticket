<script module lang="ts">
  import { defineMeta } from '@storybook/addon-svelte-csf';

  import { type FormFieldState } from '$lib/types/form-field.type';
  import MaintenanceFormDialog, {
    type MaintenanceFormField,
  } from './maintenance-form-dialog.svelte';

  function field(value = '', error: string | null = null): FormFieldState {
    return { value, error };
  }

  function fields(
    over: Partial<Record<MaintenanceFormField, FormFieldState>> = {},
  ): Record<MaintenanceFormField, FormFieldState> {
    return {
      computerId: field('3'),
      otherMachine: field(),
      type: field('preventive'),
      description: field(),
      performedBy: field(),
      performedAt: field('2026-09-20'),
      ...over,
    };
  }

  const machines = [
    { value: '1', label: 'Recepção — balcão (RECEPCAO-01)' },
    { value: '2', label: 'Financeiro — mesa 2 (FINANCEIRO-02)' },
    { value: '3', label: 'Contábil — mesa do fechamento (CONTABIL-03)' },
  ];

  const actions = {
    onChange: () => {},
    onBlur: () => {},
    onSubmit: () => {},
    onClose: () => {},
  };

  const { Story } = defineMeta({
    title: 'Components/MaintenanceFormDialog',
    component: MaintenanceFormDialog,
  });
</script>

<Story
  name="Default"
  args={{
    data: { mode: 'create', fields: fields(), machines },
    state: { isOpen: true },
    actions,
  }}
/>

<!-- Equipamento de fora do inventário: o campo de texto aparece no lugar da máquina. -->
<Story
  name="Equipment outside the inventory"
  args={{
    data: {
      mode: 'create',
      fields: fields({
        computerId: field(''),
        otherMachine: field('Impressora da recepção'),
        type: field('corrective'),
      }),
      machines,
    },
    state: { isOpen: true },
    actions,
  }}
/>

<Story
  name="Edit"
  args={{
    data: {
      mode: 'edit',
      fields: fields({
        description: field('Limpeza interna, troca da pasta térmica e verificação dos cabos.'),
        performedBy: field('Suporte TI'),
      }),
      machines,
    },
    state: { isOpen: true },
    actions,
  }}
/>

<Story
  name="Field error"
  args={{
    data: {
      mode: 'create',
      fields: fields({
        computerId: field(''),
        otherMachine: field('', 'Escolha a máquina na lista ou escreva o nome do equipamento'),
      }),
      machines,
    },
    state: { isOpen: true },
    actions,
  }}
/>

<!-- Recusa do servidor: o modal continua aberto, com o que foi digitado. -->
<Story
  name="Server error"
  args={{
    data: { mode: 'create', fields: fields({ description: field('Troca de SSD') }), machines },
    state: { isOpen: true, error: 'A máquina escolhida não existe mais.' },
    actions,
  }}
/>

<Story
  name="Submitting"
  args={{
    data: { mode: 'create', fields: fields(), machines },
    state: { isOpen: true, isSubmitting: true },
    actions,
  }}
/>

<!-- O inventário ainda carregando: o texto diz isso, em vez de uma lista vazia. -->
<Story
  name="Machines loading"
  args={{
    data: { mode: 'create', fields: fields({ computerId: field('') }), machines: [] },
    state: { isOpen: true, isMachinesLoading: true },
    actions,
  }}
/>
