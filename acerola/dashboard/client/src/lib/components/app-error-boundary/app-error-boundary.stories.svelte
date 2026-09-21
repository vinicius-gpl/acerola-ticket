<script module lang="ts">
  import { defineMeta } from '@storybook/addon-svelte-csf';

  import AppErrorBoundary from './app-error-boundary.svelte';

  /** Nasce quebrado de propósito, só para a boundary ter o que capturar. */
  function bomb(): never {
    throw new Error('Simulated failure for the story: the app shell does not really throw here.');
  }

  const { Story } = defineMeta({
    title: 'Composers/AppErrorBoundary',
    component: AppErrorBoundary,
    parameters: { layout: 'fullscreen' },
  });
</script>

<Story name="Default">
  <AppErrorBoundary>
    <div class="text-ink-700 p-8 text-sm">Conteúdo normal, sem erro nenhum.</div>
  </AppErrorBoundary>
</Story>

<!--
  A tela não fica em branco nem preta quando o render quebra — aparece o motivo e um
  caminho para recarregar. É o pior caso possível sem esta boundary.
-->
<Story name="CaughtError">
  <AppErrorBoundary>
    {bomb()}
  </AppErrorBoundary>
</Story>
