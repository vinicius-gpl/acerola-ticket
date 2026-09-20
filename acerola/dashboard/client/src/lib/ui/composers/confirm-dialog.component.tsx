import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '../../vendor/ui/dialog';
import { ActionButton } from '../primitives/action-button.component';
import { ErrorState } from '../primitives/error-state.component';

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

export function ConfirmDialog({ data, ui, state, actions }: ConfirmDialogProps) {
  return (
    <Dialog
      open={state.isOpen}
      onOpenChange={(isOpen) => (isOpen ? undefined : actions.onCancel())}
    >
      <DialogContent showCloseButton={false}>
        <DialogHeader>
          <DialogTitle>{data.title}</DialogTitle>
          <DialogDescription>{data.description}</DialogDescription>
        </DialogHeader>

        {state.error ? (
          <ErrorState data={{ message: state.error }} ui={{ variant: 'inline' }} />
        ) : null}

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
  );
}
