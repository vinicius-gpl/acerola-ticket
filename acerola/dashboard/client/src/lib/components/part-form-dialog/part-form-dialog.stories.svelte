<script module lang="ts">
  import { defineMeta } from '@storybook/addon-svelte-csf';

  import { type FormFieldState } from '$lib/types/form-field.type';
  import PartFormDialog, { type PartFormField } from './part-form-dialog.svelte';

  function field(value = '', error: string | null = null): FormFieldState {
    return { value, error };
  }

  function fields(
    over: Partial<Record<PartFormField, FormFieldState>> = {},
  ): Record<PartFormField, FormFieldState> {
    return {
      name: field(),
      category: field('ssd'),
      condition: field('new'),
      initialQuantity: field(),
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
    title: 'Components/PartFormDialog',
    component: PartFormDialog,
  });
</script>

<Story
  name="Default"
  args={{ data: { mode: 'create', fields: fields() }, state: { isOpen: true }, actions }}
/>

<!-- Edição: sem campo de quantidade, porque o saldo só muda por entrada e saída. -->
<Story
  name="Edit"
  args={{
    data: {
      mode: 'edit',
      fields: fields({ name: field('SSD 240 GB Kingston'), condition: field('used') }),
    },
    state: { isOpen: true },
    actions,
  }}
/>

<Story
  name="Field error"
  args={{
    data: { mode: 'create', fields: fields({ name: field('', 'Informe o que é a peça') }) },
    state: { isOpen: true },
    actions,
  }}
/>

<!-- Peça repetida: nova e usada são linhas diferentes, mas duas iguais não podem existir. -->
<Story
  name="Server error"
  args={{
    data: { mode: 'create', fields: fields({ name: field('SSD 240 GB Kingston') }) },
    state: {
      isOpen: true,
      error: 'Já existe uma peça com essa descrição e essa condição. Registre uma entrada nela.',
    },
    actions,
  }}
/>

<Story
  name="Submitting"
  args={{
    data: { mode: 'create', fields: fields({ name: field('Mouse óptico USB') }) },
    state: { isOpen: true, isSubmitting: true },
    actions,
  }}
/>
