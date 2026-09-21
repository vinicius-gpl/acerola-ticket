<script lang="ts" module>
  /**
   * A pergunta antes do que não tem volta: excluir, arquivar, enviar.
   *
   * Três decisões de propósito:
   *  - O botão diz o VERBO ("Excluir tarefa"), nunca "OK" nem "Sim". Quem lê só o botão precisa
   *    saber o que vai acontecer.
   *  - A recusa do servidor aparece DENTRO do modal, e ele continua aberto. Fechar e mostrar o
   *    erro em outro lugar faria a pessoa achar que deu certo.
   *  - Enquanto confirma, fechar não fecha: a requisição já saiu, e fechar esconderia o resultado.
   */
  export type ConfirmDialogProps = {
    data: {
      title: string;
      description: string;
      confirmLabel: string;
      confirmingLabel?: string;
    };
    ui?: { tone?: 'danger' | 'primary' };
    state: { isOpen: boolean; isConfirming?: boolean; error?: string | null };
    actions: { onConfirm: () => void; onCancel: () => void };
  };
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

  let { data, ui, state, actions }: ConfirmDialogProps = $props();
</script>

<Dialog
  open={state.isOpen}
  onOpenChange={(isOpen: boolean) => (isOpen ? undefined : actions.onCancel())}
>
  <DialogContent showCloseButton={false}>
    <DialogHeader>
      <DialogTitle>{data.title}</DialogTitle>
      <DialogDescription>{data.description}</DialogDescription>
    </DialogHeader>

    {#if state.error}
      <ErrorState data={{ message: state.error }} ui={{ variant: 'inline' }} />
    {/if}

    <DialogFooter>
      <ActionButton
        data={{ label: 'Cancelar' }}
        ui={{ variant: 'secondary' }}
        state={{ isDisabled: state.isConfirming }}
        actions={{ onClick: actions.onCancel }}
      />
      <ActionButton
        data={{ label: data.confirmLabel, loadingLabel: data.confirmingLabel }}
        ui={{ variant: ui?.tone === 'primary' ? 'primary' : 'danger' }}
        state={{ isLoading: state.isConfirming }}
        actions={{ onClick: actions.onConfirm }}
      />
    </DialogFooter>
  </DialogContent>
</Dialog>
