<script module lang="ts">
  import { defineMeta } from '@storybook/addon-svelte-csf';

  import { type FormFieldState } from '$lib/types/form-field.type';
  import ComputerFormDialog, { type ComputerFormField } from './computer-form-dialog.svelte';

  function field(value = '', error: string | null = null): FormFieldState {
    return { value, error };
  }

  function fields(
    over: Partial<Record<ComputerFormField, FormFieldState>> = {},
  ): Record<ComputerFormField, FormFieldState> {
    return {
      name: field(),
      displayName: field(),
      responsibleName: field(),
      department: field(),
      ...over,
    };
  }

  const actions = {
    onChange: () => {},
    onBlur: () => {},
    onSubmit: () => {},
    onClose: () => {},
  };

  const { Story } = defineMeta({
    title: 'Components/ComputerFormDialog',
    component: ComputerFormDialog,
  });
</script>

<!-- Cadastro: o nome é digitado, e ao salvar nasce o token do agente. -->
<Story
  name="Default"
  args={{ data: { mode: 'create', fields: fields() }, state: { isOpen: true }, actions }}
/>

<!-- Edição: o nome vira contexto, porque quem o informa é a máquina. -->
<Story
  name="Edit"
  args={{
    data: {
      mode: 'edit',
      fields: fields({
        name: field('RECEPCAO-01'),
        displayName: field('Recepção — balcão'),
        responsibleName: field('Bia Costa'),
        department: field('recepcao'),
      }),
    },
    state: { isOpen: true },
    actions,
  }}
/>

<Story
  name="Field error"
  args={{
    data: { mode: 'create', fields: fields({ name: field('', 'Informe o nome da máquina') }) },
    state: { isOpen: true },
    actions,
  }}
/>

<!-- Recusa do servidor: o modal continua aberto, com o que foi digitado. -->
<Story
  name="Server error"
  args={{
    data: { mode: 'create', fields: fields({ name: field('RECEPCAO-01') }) },
    state: { isOpen: true, error: 'Já existe uma máquina com esse nome.' },
    actions,
  }}
/>

<Story
  name="Submitting"
  args={{
    data: { mode: 'create', fields: fields({ name: field('RECEPCAO-01') }) },
    state: { isOpen: true, isSubmitting: true },
    actions,
  }}
/>

<!-- CASO LIMITE: nome comprido nos três campos de texto. -->
<Story
  name="Long values"
  args={{
    data: {
      mode: 'edit',
      fields: fields({
        name: field('PARALEGAL-08-ESTACAO-COMPARTILHADA'),
        displayName: field('Paralegal — estação compartilhada do corredor (mais de uma pessoa)'),
        responsibleName: field('Isabela Marques de Oliveira e Souza Rodrigues'),
        department: field('paralegal'),
      }),
    },
    state: { isOpen: true },
    actions,
  }}
/>
