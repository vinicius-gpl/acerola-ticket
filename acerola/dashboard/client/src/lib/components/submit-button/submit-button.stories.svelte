<script module lang="ts">
  import { defineMeta } from '@storybook/addon-svelte-csf';
  import type { ComponentProps } from 'svelte';

  import SubmitButton from './submit-button.svelte';

  const { Story } = defineMeta({
    title: 'Components/SubmitButton',
    component: SubmitButton,
  });
</script>

<Story name="Default" args={{ data: { label: 'Entrar' } }} />

<!-- Enquanto envia, o rótulo muda e o botão trava — dois cliques seriam dois registros. -->
<Story
  name="Loading"
  args={{ data: { label: 'Entrar', loadingLabel: 'Entrando…' }, state: { isLoading: true } }}
/>

<Story name="Disabled" args={{ data: { label: 'Entrar' }, state: { isDisabled: true } }} />

<!-- Caso limite: rótulo longo numa coluna estreita. -->
<Story name="LongLabelInNarrowColumn" args={{ data: { label: 'Criar minha conta no sistema' } }}>
  {#snippet template(args: ComponentProps<typeof SubmitButton>)}
    <div class="border-ink-300 w-48 border border-dashed p-2">
      <SubmitButton {...args} />
    </div>
  {/snippet}
</Story>
