<script lang="ts" module>
  import {
    DISPOSAL_TYPES,
    DISPOSAL_TYPE_LABELS,
    disposalTypeHint,
    type DisposalType,
  } from '@template/shared/domain/disposal.util';
  import { DISPOSAL_REASON_MAX_LENGTH } from '@template/shared/schemas/computer.schema';

  /**
   * DESCARTAR UMA MÁQUINA — a pergunta, com o tipo e o motivo.
   *
   * Tem diálogo próprio, e não um `ConfirmDialog`, por causa dos dois campos. O motivo é
   * OBRIGATÓRIO: uma saída sem explicação vira, meses depois, uma máquina na lista de
   * descarte que ninguém sabe por que saiu — e alguém a devolve "para testar".
   *
   * Função pura de props: o que foi escolhido sai no `onConfirm`. O componente não grava nada.
   */
  export type ComputerDisposalDialogProps = {
    data: { computerName: string };
    state?: { isOpen?: boolean; isConfirming?: boolean; error?: string | null };
    actions: {
      onConfirm: (input: { type: DisposalType; reason: string }) => void;
      onCancel: () => void;
    };
  };

  const TYPE_OPTIONS = DISPOSAL_TYPES.map((type) => ({
    value: type,
    label: `${DISPOSAL_TYPE_LABELS[type]} — ${disposalTypeHint(type)}`,
  }));
</script>

<script lang="ts">
  import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
  } from '$lib/components/ui/dialog';
  import ActionButton from '$lib/components/action-button/action-button.svelte';
  import ErrorState from '$lib/components/error-state/error-state.svelte';
  import SelectField from '$lib/components/select-field/select-field.svelte';
  import TextAreaField from '$lib/components/text-area-field/text-area-field.svelte';

  let { data, state: dialogState, actions }: ComputerDisposalDialogProps = $props();

  /* Estado puramente visual: o que está escolhido enquanto o diálogo está aberto. */
  let type = $state<DisposalType>('defect');
  let reason = $state('');

  /* O erro do motivo é conferido aqui porque o campo é o único obrigatório, e a recusa
     precisa aparecer colada nele — não depois de uma ida ao servidor. */
  let hasTried = $state(false);

  const reasonError = $derived(
    hasTried && reason.trim() === '' ? 'Diga por que a máquina saiu de uso' : null,
  );

  function confirm(): void {
    hasTried = true;
    if (reason.trim() === '') return;

    actions.onConfirm({ type, reason: reason.trim() });
  }
</script>

<Dialog
  open={dialogState?.isOpen ?? false}
  onOpenChange={(isOpen: boolean) => (isOpen ? undefined : actions.onCancel())}
>
  <DialogContent showCloseButton={false}>
    <DialogHeader>
      <DialogTitle>Descartar esta máquina?</DialogTitle>
      <DialogDescription>
        {data.computerName} sai das listas do dia a dia e vai para o Descarte. Nada é apagado: o
        histórico, as manutenções e as peças dela continuam salvos, e ela pode voltar depois.
      </DialogDescription>
    </DialogHeader>

    <div class="flex flex-col gap-1.5">
      <span class="text-ink-700 text-sm font-medium">Tipo de descarte</span>
      <SelectField
        data={{ value: type, options: TYPE_OPTIONS }}
        ui={{ ariaLabel: 'Tipo de descarte' }}
        state={{ isDisabled: dialogState?.isConfirming }}
        actions={{ onChange: (value: string) => (type = value as DisposalType) }}
      />
    </div>

    <TextAreaField
      data={{
        label: 'Motivo',
        name: 'disposalReason',
        value: reason,
        placeholder: 'Ex: placa-mãe queimada, sem conserto',
        maxLength: DISPOSAL_REASON_MAX_LENGTH,
      }}
      state={{ error: reasonError, isDisabled: dialogState?.isConfirming }}
      actions={{ onChange: (value: string) => (reason = value) }}
    />

    {#if dialogState?.error}
      <ErrorState data={{ message: dialogState.error }} ui={{ variant: 'inline' }} />
    {/if}

    <DialogFooter>
      <ActionButton
        data={{ label: 'Cancelar' }}
        ui={{ variant: 'secondary' }}
        state={{ isDisabled: dialogState?.isConfirming }}
        actions={{ onClick: actions.onCancel }}
      />
      <ActionButton
        data={{ label: 'Descartar máquina', loadingLabel: 'Descartando…' }}
        ui={{ variant: 'danger', className: 'sm:w-auto' }}
        state={{ isLoading: dialogState?.isConfirming }}
        actions={{ onClick: confirm }}
      />
    </DialogFooter>
  </DialogContent>
</Dialog>
