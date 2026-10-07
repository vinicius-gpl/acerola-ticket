<script lang="ts">
  import { type MaintenanceQuote } from '@template/shared/schemas/maintenance-quote.schema';

  import QuoteListView from './components/acerola-quote-list-view/acerola-quote-list-view.svelte';
  import { useMaintenanceQuoteListModel } from '$lib/hooks/use-maintenance-quote-list/use-maintenance-quote-list.svelte';
  import QuoteFormSlot from './quote-form-slot.svelte';

  /**
   * A rota só compõe: chama o model e entrega para a view (CONTRIBUTING §3).
   *
   * O que mora aqui não é dado, é QUAL PEÇA DA TELA ESTÁ NA FRENTE: o formulário de guardar ou
   * o de corrigir. A exclusão não entra nessa conta — ela nasce na lista, e por isso o
   * orçamento que espera confirmação vive no model dela.
   */
  const list = useMaintenanceQuoteListModel();

  let editing = $state<{ quote: MaintenanceQuote | null } | null>(null);
</script>

<svelte:head>
  <title>Orçamentos</title>
</svelte:head>

<QuoteListView
  data={list.data}
  state={list.state}
  actions={{
    ...list.actions,
    onRegister: () => (editing = { quote: null }),
    onEdit: (quote: MaintenanceQuote) => (editing = { quote }),
  }}
/>

<!-- `{#key}` pelo orçamento: trocar de orçamento monta um formulário NOVO, com os valores dele. -->
{#if editing}
  {#key editing.quote?.id ?? 'new'}
    <QuoteFormSlot quote={editing.quote} onClose={() => (editing = null)} />
  {/key}
{/if}
