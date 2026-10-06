<script lang="ts">
  import ActionButton from '$lib/components/acerola-action-button/acerola-action-button.svelte';
  import OpenTicketForm from './components/acerola-open-ticket-form/acerola-open-ticket-form.svelte';
  import TicketLookupDrawer from './components/acerola-ticket-lookup-drawer/acerola-ticket-lookup-drawer.svelte';
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

  /* Se o drawer de consulta está aberto é qual peça da tela está na frente, não dado do
     chamado — por isso mora aqui, igual ao `answering` da tela interna de Chamados. */
  let isLookupOpen = $state(false);
</script>

<svelte:head>
  <title>Central de Chamados TI</title>
</svelte:head>

<div class="bg-background flex min-h-screen flex-col">
  <header class="border-b">
    <div class="mx-auto flex w-full max-w-3xl items-start justify-between gap-4 px-4 py-6 sm:px-6">
      <div>
        <h1 class="text-ink-900 text-2xl font-bold">Central de Chamados TI</h1>
        <p class="text-ink-500 mt-1 text-sm">
          Abra e acompanhe solicitações de suporte técnico. Não precisa de senha.
        </p>
      </div>

      <ActionButton
        data={{ label: 'Consultar chamado' }}
        ui={{ variant: 'secondary', className: 'shrink-0' }}
        actions={{ onClick: () => (isLookupOpen = true) }}
      />
    </div>
  </header>

  <!-- `flex-1` + `justify-center`: a etapa do formulário é curta, e sem isso ela nascia
       colada no topo com uma sobra vazia enorme embaixo — o resto da tela sem função
       nenhuma. Centralizado no espaço que sobra do cabeçalho, a tela para de parecer
       cortada pela metade em telas altas. -->
  <main class="mx-auto flex w-full max-w-3xl flex-1 flex-col justify-center gap-5 px-4 py-10 sm:px-6">
    <OpenTicketForm data={open.data} state={open.state} actions={open.actions} />

    <p class="text-ink-500 text-center text-xs">
      É do time de TI? <a class="text-primary underline" href="/">Abrir o painel</a>
    </p>
  </main>
</div>

<TicketLookupDrawer
  data={lookup.data}
  state={{ ...lookup.state, isOpen: isLookupOpen }}
  actions={{ ...lookup.actions, onClose: () => (isLookupOpen = false) }}
/>
