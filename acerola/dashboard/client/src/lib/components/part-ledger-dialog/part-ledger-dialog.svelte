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
      <div class="max-h-[50vh] overflow-auto">
        <table class="w-full min-w-[620px] text-left text-sm">
          <thead class="bg-card text-ink-500 sticky top-0 border-b text-xs uppercase">
            <tr>
              <th scope="col" class="py-2 pr-3">Quando</th>
              <th scope="col" class="py-2 pr-3">Movimento</th>
              <th scope="col" class="py-2 pr-3">Máquina</th>
              <th scope="col" class="py-2 pr-3">Quem</th>
              <th scope="col" class="py-2 pr-3">Saldo</th>
              <th scope="col" class="py-2"><span class="sr-only">Ações</span></th>
            </tr>
          </thead>
          <tbody>
            {#each data.movements as movement (movement.id)}
              <tr class="border-b align-top last:border-0">
                <td class="text-ink-500 py-2 pr-3 whitespace-nowrap">
                  {formatDateTime(movement.createdAt)}
                </td>
                <td class="py-2 pr-3">
                  <StatusBadge
                    data={{ label: `${movementTypeLabel(movement.type)} ${signedQuantity(movement)}` }}
                    ui={{ tone: movementTypeTone(movement.type), size: 'sm' }}
                  />
                  {#if movement.note}
                    <span class="text-ink-500 block text-xs break-words">{movement.note}</span>
                  {/if}
                </td>
                <td class="text-ink-700 max-w-[200px] py-2 pr-3 break-words">
                  {destinationOf(movement)}
                </td>
                <td class="text-ink-500 py-2 pr-3 break-words">{movement.handledBy ?? '—'}</td>
                <td class="text-ink-900 py-2 pr-3 font-semibold tabular-nums">
                  {movement.balanceAfter}
                </td>
                <td class="py-2 text-right">
                  <ActionButton
                    data={{ label: 'Excluir movimentação' }}
                    ui={{ variant: 'ghost', size: 'sm', icon: Trash2, isIconOnly: true }}
                    actions={{ onClick: () => actions.onAskRemove(movement) }}
                  />
                </td>
              </tr>
            {/each}
          </tbody>
        </table>
      </div>
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
