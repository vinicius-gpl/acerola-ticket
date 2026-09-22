<script lang="ts">
  import OpenTicketForm from '$lib/components/open-ticket-form/open-ticket-form.svelte';
  import TicketLookupCard from '$lib/components/ticket-lookup-card/ticket-lookup-card.svelte';
  import { useOpenTicketModel } from '$lib/hooks/use-open-ticket/use-open-ticket.svelte';
  import { useTicketLookupModel } from '$lib/hooks/use-ticket-lookup/use-ticket-lookup.svelte';

  /**
   * A tela PÚBLICA: abrir e acompanhar chamado, sem login.
   *
   * Ela mora FORA do grupo `(app)` de propósito — aquele grupo tem a guarda de sessão e o
   * menu lateral, e os dois estão errados aqui: quem está sem impressora não tem conta no
   * painel, e exigir login para pedir socorro significaria não receber o pedido.
   *
   * A rota só compõe: chama os dois models e entrega para as views (CONTRIBUTING §3).
   */
  const open = useOpenTicketModel();
  const lookup = useTicketLookupModel();
</script>

<svelte:head>
  <title>Central de Chamados TI</title>
</svelte:head>

<div class="bg-background min-h-screen">
  <header class="border-b">
    <div class="mx-auto w-full max-w-3xl px-4 py-6 sm:px-6">
      <h1 class="text-ink-900 text-2xl font-bold">Central de Chamados TI</h1>
      <p class="text-ink-500 mt-1 text-sm">
        Abra e acompanhe solicitações de suporte técnico. Não precisa de senha.
      </p>
    </div>
  </header>

  <main class="mx-auto flex w-full max-w-3xl flex-col gap-5 px-4 py-6 sm:px-6">
    <OpenTicketForm data={open.data} state={open.state} actions={open.actions} />
    <TicketLookupCard data={lookup.data} state={lookup.state} actions={lookup.actions} />

    <p class="text-ink-500 text-center text-xs">
      É do time de TI? <a class="text-primary underline" href="/tickets">Abrir o painel</a>
    </p>
  </main>
</div>
