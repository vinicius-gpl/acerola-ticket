<script lang="ts" module>
  import { departmentLabel } from '@template/shared/domain/department.util';
  import {
    movementTypeLabel,
    movementTypeTone,
    partConditionLabel,
  } from '@template/shared/domain/part-catalog.util';
  import { type Part, type PartMovement } from '@template/shared/schemas/part.schema';

  /**
   * O EXTRATO de uma peça: cada entrada, cada saída e o saldo depois de cada uma.
   *
   * É esta tela que responde "como chegamos em 3?". Sem ela, o saldo é uma afirmação sem
   * prova, e a primeira divergência com a prateleira vira discussão sem registro para
   * consultar.
   *
   * Função pura de props: não busca nada e não apaga nada — avisa quem pediu.
   */
  export type PartLedgerDialogProps = {
    data: {
      part: Part;
      movements: PartMovement[];
      removing: PartMovement | null;
    };
    state?: {
      isOpen?: boolean;
      isLoading?: boolean;
      isEmpty?: boolean;
      isRemoving?: boolean;
      error?: string | null;
      actionError?: string | null;
    };
    actions: {
      onAskRemove: (movement: PartMovement) => void;
      onCancelRemove: () => void;
      onConfirmRemove: () => void;
      onRetry: () => void;
      onClose: () => void;
    };
  };

  /** Para onde a peça foi, em uma linha. */
  export function destinationOf(movement: PartMovement): string {
    if (!movement.computerId) return '—';

    const name = movement.computerDisplayName?.trim() || movement.computerName || 'Máquina';
    if (!movement.computerDepartment) return name;

    return `${name} · ${departmentLabel(movement.computerDepartment)}`;
  }

  /** O sinal na frente da quantidade: é o que se lê de relance na coluna. */
  export function signedQuantity(movement: PartMovement): string {
    return movement.type === 'in' ? `+${movement.quantity}` : `−${movement.quantity}`;
  }

  /**
   * O saldo que o cabeçalho mostra.
   *
   * Sai da PRIMEIRA linha do extrato (a mais recente), e não do cadastro da peça: o diálogo
   * fotografa a peça ao abrir, e excluir uma movimentação aqui dentro deixaria o cabeçalho
   * anunciando um saldo que o extrato logo abaixo já desmente.
   *
   * Sem extrato nenhum, o cadastro é a única fonte que existe.
   */
  export function currentBalanceOf(data: { part: Part; movements: PartMovement[] }): number {
    return data.movements[0]?.balanceAfter ?? data.part.balance;
  }
</script>

<script lang="ts">
  import Trash2 from '@lucide/svelte/icons/trash-2';

  import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
  } from '$lib/components/ui/dialog';
  import ActionButton from '$lib/components/action-button/action-button.svelte';
  import ConfirmDialog from '$lib/components/confirm-dialog/confirm-dialog.svelte';
  import ErrorState from '$lib/components/error-state/error-state.svelte';
  import StatusBadge from '$lib/components/status-badge/status-badge.svelte';
  import {
    Table,
    TableActions,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
  } from '$lib/components/ui/table';
  import { formatDateTime } from '$lib/utils/format-date';

  let { data, state: dialogState, actions }: PartLedgerDialogProps = $props();

  const balance = $derived(currentBalanceOf(data));
</script>

<Dialog
  open={dialogState?.isOpen ?? true}
  onOpenChange={(isOpen: boolean) => (isOpen ? undefined : actions.onClose())}
>
  <DialogContent class="sm:max-w-3xl">
    <DialogHeader>
      <DialogTitle>{data.part.name}</DialogTitle>
      <DialogDescription>
        {partConditionLabel(data.part.condition)} · saldo atual
        <strong>{balance}</strong>
      </DialogDescription>
    </DialogHeader>

    {#if dialogState?.actionError}
      <ErrorState data={{ message: dialogState.actionError }} ui={{ variant: 'inline' }} />
    {/if}

    <!-- Estados na frente, conteúdo por último e sem aninhamento (CONTRIBUTING §2). -->
    {#if dialogState?.error}
      <ErrorState
        data={{ title: 'Não consegui carregar o histórico', message: dialogState.error }}
        actions={{ onRetry: actions.onRetry }}
      />
    {:else if dialogState?.isLoading}
      <p class="text-ink-500 py-8 text-center text-sm">Carregando o histórico…</p>
    {:else if data.movements.length === 0}
      <p class="text-ink-500 py-6 text-sm">
        Esta peça ainda não teve entrada nem saída registrada.
      </p>
    {:else}
      <Table class="min-w-[620px]">
        <TableHeader>
          <TableRow>
            <TableHead>Quando</TableHead>
            <TableHead>Movimento</TableHead>
            <TableHead>Máquina</TableHead>
            <TableHead>Quem</TableHead>
            <TableHead>Saldo</TableHead>
            <TableHead class="text-right"><span class="sr-only">Ações</span></TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {#each data.movements as movement (movement.id)}
            <TableRow class="align-top">
              <TableCell class="text-neutral-400 whitespace-nowrap text-xs">
                {formatDateTime(movement.createdAt)}
              </TableCell>
              <TableCell>
                <StatusBadge
                  data={{ label: `${movementTypeLabel(movement.type)} ${signedQuantity(movement)}` }}
                  ui={{ tone: movementTypeTone(movement.type), size: 'sm' }}
                />
                {#if movement.note}
                  <span class="text-neutral-400 block text-xs break-words">{movement.note}</span>
                {/if}
              </TableCell>
              <TableCell class="text-neutral-700 dark:text-neutral-200 max-w-[200px] break-words">
                {destinationOf(movement)}
              </TableCell>
              <TableCell class="text-neutral-500 break-words text-xs">{movement.handledBy ?? '—'}</TableCell>
              <TableCell class="text-neutral-900 dark:text-neutral-100 font-semibold tabular-nums">
                {movement.balanceAfter}
              </TableCell>
              <TableCell class="text-right whitespace-nowrap">
                <TableActions>
                  <ActionButton
                    data={{ label: 'Excluir movimentação' }}
                    ui={{
                      variant: 'ghost',
                      size: 'sm',
                      icon: Trash2,
                      isIconOnly: true,
                      className: 'text-neutral-400 hover:text-red-600 hover:bg-red-500/10 dark:text-neutral-500 dark:hover:text-red-400',
                    }}
                    actions={{ onClick: () => actions.onAskRemove(movement) }}
                  />
                </TableActions>
              </TableCell>
            </TableRow>
          {/each}
        </TableBody>
        {#snippet footer()}
          <span>Extrato de movimentações de estoque</span>
          <span>{data.movements.length} registro(s)</span>
        {/snippet}
      </Table>
    {/if}

    <DialogFooter>
      <ActionButton
        data={{ label: 'Fechar' }}
        ui={{ variant: 'secondary' }}
        actions={{ onClick: actions.onClose }}
      />
    </DialogFooter>
  </DialogContent>
</Dialog>

<ConfirmDialog
  data={{
    title: 'Excluir esta movimentação?',
    description: data.removing
      ? `A peça volta para o saldo como se esta linha nunca tivesse existido: ${movementTypeLabel(data.removing.type)} de ${data.removing.quantity}. Não dá para desfazer.`
      : '',
    confirmLabel: 'Excluir e devolver o saldo',
    confirmingLabel: 'Excluindo…',
  }}
  ui={{ tone: 'danger' }}
  state={{
    isOpen: data.removing !== null,
    isConfirming: dialogState?.isRemoving,
    error: dialogState?.actionError,
  }}
  actions={{ onConfirm: actions.onConfirmRemove, onCancel: actions.onCancelRemove }}
/>
