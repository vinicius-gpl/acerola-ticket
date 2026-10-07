<script lang="ts">
  import { page } from '$app/state';

  import { useServiceOrderVerifyModel } from '$lib/hooks/use-service-order-verify/use-service-order-verify.svelte';
  import ServiceOrderVerifyView from '../components/acerola-service-order-verify-view/acerola-service-order-verify-view.svelte';

  /**
   * A CONFERÊNCIA de uma ordem de serviço — PÚBLICA, sem login.
   *
   * Mora FORA do grupo `(app)`, como a tela de abrir chamado: quem recebe o documento (um
   * fornecedor, uma auditoria, quem pediu o atendimento) não tem conta no painel. É para cá que
   * o link e o QR code do rodapé do PDF apontam.
   *
   * A rota só compõe: chama o model e entrega para a view (CONTRIBUTING §3).
   */
  const verify = useServiceOrderVerifyModel(page.params.code ?? '');
</script>

<svelte:head>
  <title>Conferir ordem de serviço</title>
</svelte:head>

<div class="bg-background flex min-h-screen flex-col">
  <header class="border-b">
    <div class="mx-auto w-full max-w-3xl px-4 py-6 sm:px-6">
      <h1 class="text-ink-900 text-2xl font-bold">Conferir ordem de serviço</h1>
      <p class="text-ink-500 mt-1 text-sm">
        Veja se o documento que você recebeu é o que o sistema emitiu. Não precisa de senha.
      </p>
    </div>
  </header>

  <!-- `flex-1` + `justify-center`: o conteúdo é curto, e sem isso ele nascia colado no topo com
       a tela inteira vazia embaixo — o mesmo cuidado da tela de abrir chamado. -->
  <main class="mx-auto flex w-full max-w-3xl flex-1 flex-col justify-center px-4 py-8 sm:px-6">
    <ServiceOrderVerifyView data={verify.data} state={verify.state} actions={verify.actions} />
  </main>
</div>
