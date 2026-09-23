<script lang="ts">
  import { type MovementType } from '@template/shared/domain/part-catalog.util';
  import { type Part } from '@template/shared/schemas/part.schema';

  import PartListView from '$lib/components/part-list-view/part-list-view.svelte';
  import { usePartListModel } from '$lib/hooks/use-part-list/use-part-list.svelte';
  import MovementFormSlot from './movement-form-slot.svelte';
  import PartFormSlot from './part-form-slot.svelte';
  import PartLedgerSlot from './part-ledger-slot.svelte';

  /**
   * A rota só compõe: chama o model e entrega para a view (CONTRIBUTING §3).
   *
   * O que mora aqui não é dado, é QUAL PEÇA DA TELA ESTÁ NA FRENTE: o cadastro, a
   * movimentação (com o tipo que o botão escolheu) ou o extrato.
   */
  const list = usePartListModel();

  /* Uma peça de cada vez na frente da tela: os três diálogos são exclusivos. */
  let editing = $state<{ part: Part | null } | null>(null);
  let moving = $state<{ part: Part; type: MovementType } | null>(null);
  let ledgerOf = $state<Part | null>(null);
</script>

<svelte:head>
  <title>Depósito</title>
</svelte:head>

<PartListView
  data={list.data}
  state={list.state}
  actions={{
    ...list.actions,
    onRegister: () => (editing = { part: null }),
    onEdit: (part: Part) => (editing = { part }),
    onMove: (part: Part, type: MovementType) => (moving = { part, type }),
    onOpenLedger: (part: Part) => (ledgerOf = part),
  }}
/>

<!-- `{#key}` pela peça: trocar de peça monta um formulário NOVO, com os valores dela. -->
{#if editing}
  {#key editing.part?.id ?? 'new'}
    <PartFormSlot part={editing.part} onClose={() => (editing = null)} />
  {/key}
{/if}

{#if moving}
  {#key `${moving.part.id}-${moving.type}`}
    <MovementFormSlot part={moving.part} type={moving.type} onClose={() => (moving = null)} />
  {/key}
{/if}

{#if ledgerOf}
  {#key ledgerOf.id}
    <PartLedgerSlot part={ledgerOf} onClose={() => (ledgerOf = null)} />
  {/key}
{/if}
