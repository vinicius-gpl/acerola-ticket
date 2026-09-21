<script module lang="ts">
  import { defineMeta } from '@storybook/addon-svelte-csf';
  import type { ComponentProps } from 'svelte';
  import { fn } from 'storybook/test';

  import ErrorState from './error-state.svelte';

  const { Story } = defineMeta({
    title: 'Components/ErrorState',
    component: ErrorState,
  });

  const longTechnicalMessage = `Falha ao listar tarefas: ${'SQLITE_IOERR_SHORT_READ'.repeat(6)}`;
</script>

<Story
  name="Default"
  args={{
    data: {
      message: 'Não consegui falar com o servidor. Confira se ele está rodando e tente de novo.',
    },
  }}
/>

<!-- Com o botão: só quando tentar de novo pode resolver. -->
<Story
  name="WithRetry"
  args={{
    data: { title: 'A lista não carregou', message: 'O banco está ocupado com outra gravação.' },
    actions: { onRetry: fn() },
  }}
/>

<Story
  name="Retrying"
  args={{
    data: { title: 'A lista não carregou', message: 'O banco está ocupado com outra gravação.' },
    state: { isRetrying: true },
    actions: { onRetry: fn() },
  }}
/>

<!-- Dentro de formulário ou modal: uma linha, sem título. -->
<Story
  name="Inline"
  args={{
    data: { message: 'Seu perfil é somente leitura e não permite alterar as tarefas.' },
    ui: { variant: 'inline' },
  }}
/>

<!-- Caso limite: mensagem técnica longa, sem espaço, não pode estourar a caixa. -->
<Story name="LongUnbrokenMessage" args={{ data: { message: longTechnicalMessage } }}>
  {#snippet template(args: ComponentProps<typeof ErrorState>)}
    <div class="w-72">
      <ErrorState {...args} />
    </div>
  {/snippet}
</Story>
