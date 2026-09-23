<script module lang="ts">
  import { defineMeta } from '@storybook/addon-svelte-csf';
  import { type Part, type PartMovement } from '@template/shared/schemas/part.schema';

  import PartLedgerDialog from './part-ledger-dialog.svelte';

  const DAY = 24 * 60 * 60 * 1000;
  const daysAgo = (days: number) => new Date(Date.now() - days * DAY).toISOString();

  const part: Part = {
    id: 1,
    name: 'SSD 240 GB Kingston',
    category: 'ssd',
    condition: 'new',
    balance: 3,
    createdAt: daysAgo(120),
    createdBy: 'suporte@azuos.local',
    updatedAt: null,
    updatedBy: null,
  };

  function movement(over: Partial<PartMovement> = {}): PartMovement {
    return {
      id: 1,
      partId: 1,
      partName: 'SSD 240 GB Kingston',
      partCondition: 'new',
      type: 'in',
      quantity: 5,
      balanceAfter: 5,
      computerId: null,
      computerName: null,
      computerDisplayName: null,
      computerDepartment: null,
      handledBy: 'Suporte TI',
      note: 'Compra do lote de reposição.',
      createdAt: daysAgo(120),
      createdBy: 'suporte@azuos.local',
      updatedAt: null,
      updatedBy: null,
      ...over,
    };
  }

  /* Do mais recente para o mais antigo, como a tela mostra. */
  const movements: PartMovement[] = [
    movement({
      id: 3,
      type: 'out',
      quantity: 1,
      balanceAfter: 3,
      computerId: 3,
      computerName: 'CONTABIL-03',
      computerDisplayName: 'Contábil — mesa do fechamento',
      computerDepartment: 'contabil',
      handledBy: 'Carlos (assistência externa)',
      note: 'Instalado na máquina do fechamento.',
      createdAt: daysAgo(35),
    }),
    movement({
      id: 2,
      type: 'out',
      quantity: 1,
      balanceAfter: 4,
      computerId: 2,
      computerName: 'FINANCEIRO-02',
      computerDisplayName: 'Financeiro — mesa 2',
      computerDepartment: 'financeiro',
      note: 'Troca do disco rígido por SSD.',
      createdAt: daysAgo(95),
    }),
    movement(),
  ];

  const actions = {
    onAskRemove: () => {},
    onCancelRemove: () => {},
    onConfirmRemove: () => {},
    onRetry: () => {},
    onClose: () => {},
  };

  const { Story } = defineMeta({
    title: 'Components/PartLedgerDialog',
    component: PartLedgerDialog,
  });
</script>

<Story name="Default" args={{ data: { part, movements, removing: null }, actions }} />

<Story
  name="Loading"
  args={{ data: { part, movements: [], removing: null }, state: { isLoading: true }, actions }}
/>

<!-- Peça cadastrada e nunca movimentada. -->
<Story
  name="Empty"
  args={{ data: { part: { ...part, balance: 0 }, movements: [], removing: null }, actions }}
/>

<!-- A pergunta antes de excluir, dizendo que o saldo volta. -->
<Story
  name="Confirming delete"
  args={{ data: { part, movements, removing: movements[0]! }, actions }}
/>

<Story
  name="Error"
  args={{
    data: { part, movements: [], removing: null },
    state: { error: 'Não consegui falar com o servidor. Confira se ele está rodando.' },
    actions,
  }}
/>
