<script lang="ts" module>
  import { type Task } from '@template/shared/schemas/task.schema';

  /**
   * A ponte entre a lista e o formulário.
   *
   * Existe como componente separado, e dentro de `routes/`, por dois motivos: o view-model do
   * formulário precisa nascer junto com o diálogo (e morrer com ele), e componente de
   * `lib/components` não pode buscar o próprio dado — é a regra que o ESLint cobra ali.
   */
  export type TaskFormSlotProps = {
    task: Task | null;
    onClose: () => void;
  };
</script>

<script lang="ts">
  import TaskFormDialog from '$lib/components/task-form-dialog/task-form-dialog.svelte';
  import { useTaskFormModel } from '$lib/view-models/use-task-form.model.svelte';

  let { task, onClose }: TaskFormSlotProps = $props();

  /* O compilador avisa que isto lê `task` e `onClose` só uma vez — e é exatamente o que se
     quer. O formulário fotografa a tarefa na montagem e não acompanha mudanças dela: quem
     troca de tarefa é o `{#key}` da rota, que monta este componente de novo. Acompanhar
     apagaria o que a pessoa está digitando quando a lista recarregasse por trás. */
  // svelte-ignore state_referenced_locally
  const form = useTaskFormModel({ task, onSaved: onClose });
</script>

<TaskFormDialog
  data={form.data}
  state={{ ...form.state, isOpen: true }}
  actions={{
    ...form.actions,
    onClose: () => (form.state.isSubmitting ? undefined : onClose()),
  }}
/>
