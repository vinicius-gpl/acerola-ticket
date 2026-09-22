<script lang="ts">
  import { QueryClient, setQueryClientContext } from '@tanstack/svelte-query';

  import { useForgotPasswordModel, type ForgotPasswordModel } from './use-forgot-password.svelte';

  /**
   * O hook usa `createMutation`, que só existe dentro de um componente com um `QueryClient`
   * no contexto. Este apoio monta o model e o entrega ao teste.
   */
  let { onReady }: { onReady: (model: ForgotPasswordModel) => void } = $props();

  setQueryClientContext(new QueryClient({ defaultOptions: { mutations: { retry: false } } }));

  onReady(useForgotPasswordModel());
</script>
