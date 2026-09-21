<script module lang="ts">
  import { defineMeta } from '@storybook/addon-svelte-csf';
  import type { ComponentProps } from 'svelte';
  import { fn } from 'storybook/test';

  import TextAreaField from './text-area-field.svelte';

  const { Story } = defineMeta({
    title: 'Components/TextAreaField',
    component: TextAreaField,
    args: { actions: { onChange: fn(), onBlur: fn() } },
  });
</script>

<!-- O campo ocupa a largura que recebe; a caixa mostra como ele fica num formulário. -->
{#snippet inBox(args: ComponentProps<typeof TextAreaField>)}
  <div class="w-96">
    <TextAreaField {...args} />
  </div>
{/snippet}

<Story
  name="Default"
  args={{
    data: {
      label: 'Descrição',
      name: 'description',
      value: '',
      placeholder: 'Detalhes, se houver',
    },
  }}
  template={inBox}
/>

<Story
  name="Filled"
  args={{
    data: { label: 'Descrição', name: 'description', value: 'Confirmar o horário da visita.' },
  }}
  template={inBox}
/>

<!-- Perto do limite, o contador aparece. -->
<Story
  name="NearLimit"
  args={{
    data: { label: 'Descrição', name: 'description', value: 'a'.repeat(90), maxLength: 100 },
  }}
  template={inBox}
/>

<Story
  name="WithError"
  args={{
    data: { label: 'Descrição', name: 'description', value: 'a'.repeat(120), maxLength: 100 },
    state: { error: 'A descrição pode ter até 100 caracteres' },
  }}
  template={inBox}
/>

<Story
  name="Disabled"
  args={{
    data: { label: 'Descrição', name: 'description', value: 'Não editável agora' },
    state: { isDisabled: true },
  }}
  template={inBox}
/>

<!-- Caso limite: erro longo numa coluna estreita. -->
<Story
  name="LongErrorInNarrowColumn"
  args={{
    data: { label: 'Descrição', name: 'description', value: '' },
    state: { error: 'Explique o que precisa ser feito para que outra pessoa consiga continuar' },
  }}
>
  {#snippet template(args: ComponentProps<typeof TextAreaField>)}
    <div class="border-ink-300 w-56 border border-dashed p-2">
      <TextAreaField {...args} />
    </div>
  {/snippet}
</Story>
