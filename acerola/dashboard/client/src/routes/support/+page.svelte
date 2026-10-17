<script lang="ts">
  import { page } from '$app/state';
  import { TICKET_ACCESS_PARAM } from '@template/shared/domain/ticket-invite.util';
  import ActionButton from '$lib/components/acerola-action-button/acerola-action-button.svelte';
  import OpenTicketForm from './components/acerola-open-ticket-form/acerola-open-ticket-form.svelte';
  import TicketLookupDrawer from './components/acerola-ticket-lookup-drawer/acerola-ticket-lookup-drawer.svelte';
  import { useOpenTicketModel } from '$lib/hooks/use-open-ticket/use-open-ticket.svelte';
  import { useTicketLookupModel } from '$lib/hooks/use-ticket-lookup/use-ticket-lookup.svelte';

  /**
   * A Central de Chamados: abrir e acompanhar os próprios chamados, logado (a guarda é o
   * `+page.ts`). Qualquer pessoa com conta usa — inclusive quem não atende área nenhuma.
   *
   * Ela mora FORA do grupo `(app)` de propósito: aquele grupo tem o menu lateral dos módulos
   * (Infra, Sistema, Manutenção), e quem só pede socorro não tem módulo nenhum.
   *
   * A rota só compõe: chama os dois models e entrega para as views (CONTRIBUTING §3).
   */
  const open = useOpenTicketModel();
  const hasPanel = (page.data.areas ?? []).length > 0;
  const lookup = useTicketLookupModel();

  /* Se o drawer de consulta está aberto é qual peça da tela está na frente, não dado do
     chamado — por isso mora aqui, igual ao `answering` da tela interna de Chamados. */
  /* Quem chega pelo link de consulta (`?ticket=…`, o das mensagens de WhatsApp) já cai com o
     chamado aberto na consulta, sem digitar protocolo. Lido uma vez, na chegada. */
  const accessToken = page.url.searchParams.get(TICKET_ACCESS_PARAM);
  let isLookupOpen = $state(accessToken !== null);
  if (accessToken) lookup.actions.onOpenLink(accessToken);
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
          Abra e acompanhe as suas solicitações de suporte técnico.
        </p>
      </div>

      <ActionButton
        data={{ label: 'Meus chamados' }}
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

    <!-- Só para quem atende alguma área: para os outros a raiz manda de volta para cá, e o
         link seria um laço. -->
    {#if hasPanel}
      <p class="text-ink-500 text-center text-xs">
        É do time de TI? <a class="text-primary underline" href="/">Abrir o painel</a>
      </p>
    {/if}
  </main>
</div>

<TicketLookupDrawer
  data={lookup.data}
  state={{ ...lookup.state, isOpen: isLookupOpen }}
  actions={{ ...lookup.actions, onClose: () => (isLookupOpen = false) }}
/>
