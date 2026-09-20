import { createFileRoute } from '@tanstack/react-router';
import { type Task } from '@template/shared/schemas/task.schema';
import { useState } from 'react';

import { ConfirmDialog } from '../../lib/ui/composers/confirm-dialog.component';
import { TaskFormDialog } from '../../lib/ui/composers/task-form-dialog.component';
import { TaskListView } from '../../lib/ui/composers/task-list-view.component';
import { useTaskFormModel } from '../../lib/view-models/use-task-form.model';
import { useTaskListModel } from '../../lib/view-models/use-task-list.model';

/**
 * A rota só compõe: chama os models e entrega para as views (CONTRIBUTING §3).
 *
 * Qual formulário está aberto é o único estado que mora aqui, porque é ele que liga a lista
 * ao formulário — e ele não é dado, é qual peça da tela está na frente.
 */
export const Route = createFileRoute('/tasks/')({
  component: TaskListRoute,
});

type FormTarget = { task: Task | null } | null;

function TaskListRoute() {
  const list = useTaskListModel();
  const [formTarget, setFormTarget] = useState<FormTarget>(null);

  return (
    <>
      <TaskListView
        data={list.data}
        state={list.state}
        actions={{
          ...list.actions,
          onCreate: () => setFormTarget({ task: null }),
          onEdit: (task) => setFormTarget({ task }),
        }}
      />

      {/* `key` pelo id: trocar de tarefa monta um formulário NOVO, com os valores dela. */}
      {formTarget ? (
        <TaskFormSlot
          key={formTarget.task?.id ?? 'new'}
          task={formTarget.task}
          onClose={() => setFormTarget(null)}
        />
      ) : null}

      <ConfirmDialog
        data={{
          title: 'Excluir esta tarefa?',
          description: `"${list.data.pendingDelete?.title ?? ''}" será excluída. Não dá para desfazer.`,
          confirmLabel: 'Excluir tarefa',
          confirmingLabel: 'Excluindo…',
        }}
        state={{
          isOpen: list.data.pendingDelete !== null,
          isConfirming: list.state.isDeleting,
          error: list.state.deleteError,
        }}
        actions={{ onConfirm: list.actions.onConfirmDelete, onCancel: list.actions.onCancelDelete }}
      />
    </>
  );
}

function TaskFormSlot({ task, onClose }: { task: Task | null; onClose: () => void }) {
  const form = useTaskFormModel({ task, onSaved: onClose });

  return (
    <TaskFormDialog
      data={form.data}
      state={{ ...form.state, isOpen: true }}
      actions={{
        ...form.actions,
        onClose: () => (form.state.isSubmitting ? undefined : onClose()),
      }}
    />
  );
}
