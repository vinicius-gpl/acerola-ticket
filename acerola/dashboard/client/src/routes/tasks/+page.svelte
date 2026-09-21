<script lang="ts">
  import { type Task } from '@template/shared/schemas/task.schema';

  import ConfirmDialog from '$lib/components/confirm-dialog/confirm-dialog.svelte';
  import TaskListView from '$lib/components/task-list-view/task-list-view.svelte';
  import { useTaskListModel } from '$lib/hooks/use-task-list/use-task-list.svelte';
  import TaskFormSlot from './task-form-slot.svelte';

  /**
   * A rota só compõe: chama os models e entrega para as views (CONTRIBUTING §3).
   *
   * Qual formulário está aberto é o único estado que mora aqui, porque é ele que liga a lista
   * ao formulário — e ele não é dado, é qual peça da tela está na frente.
   */
  const list = useTaskListModel();

  type FormTarget = { task: Task | null } | null;

  let formTarget = $state<FormTarget>(null);
</script>

<TaskListView
  data={list.data}
  state={list.state}
  actions={{
    ...list.actions,
    onCreate: () => (formTarget = { task: null }),
    onEdit: (task: Task) => (formTarget = { task }),
  }}
/>

<!-- `{#key}` pelo id: trocar de tarefa monta um formulário NOVO, com os valores dela. -->
{#if formTarget}
  {#key formTarget.task?.id ?? 'new'}
    <TaskFormSlot task={formTarget.task} onClose={() => (formTarget = null)} />
  {/key}
{/if}

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
