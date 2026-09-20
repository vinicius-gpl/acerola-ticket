import { useForm, useStore } from '@tanstack/react-form';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import {
  type Task,
  taskFormSchema,
  type TaskFormValues,
} from '@template/shared/schemas/task.schema';

import { readError } from '../api/http-client';
import { tasksApi } from '../api/tasks.api';
import { type TaskFormField } from '../ui/composers/task-form-dialog.component';
import { type FormFieldState } from '../ui/form-field.type';
import { toFieldState } from './form-projection.util';
import { TASKS_QUERY_KEY } from './use-task-list.model';

export type TaskFormModel = {
  data: {
    mode: 'create' | 'edit';
    fields: Record<TaskFormField, FormFieldState>;
  };
  state: { isSubmitting: boolean; error: string | null };
  actions: {
    onChange: (field: TaskFormField, value: string) => void;
    onBlur: (field: TaskFormField) => void;
    onSubmit: () => void;
  };
};

/**
 * O formulário de criar e editar tarefa — o mesmo para os dois, porque os campos são os mesmos.
 *
 * O formulário começa com os valores de `task` e NÃO acompanha mudanças dela depois de aberto:
 * a rota monta este model com `key` pelo id, e trocar de tarefa monta um formulário novo. É
 * mais simples e mais seguro do que sincronizar com efeito — sincronizar apagaria o que a
 * pessoa estava digitando quando a lista recarregasse por trás.
 */
export function useTaskFormModel({
  task,
  onSaved,
}: {
  task: Task | null;
  onSaved: () => void;
}): TaskFormModel {
  const queryClient = useQueryClient();

  const save = useMutation({
    mutationFn: (values: TaskFormValues) =>
      task ? tasksApi.update(task.id, values) : tasksApi.create(values),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: TASKS_QUERY_KEY });
      onSaved();
    },
  });

  const form = useForm({
    defaultValues: toFormValues(task),
    /* As MESMAS regras que o servidor usa para validar o corpo. Uma regra, duas pontas: a
       mensagem que aparece embaixo do campo é a mesma que a API devolveria.

       UM validador só, em `onChange`, e isso é correção de defeito. O TanStack Form guarda
       o erro de cada gatilho (`change`, `blur`, `submit`) num lugar separado, e digitar só
       revalida o de `change`: com o schema também em `onSubmit`, o erro de um envio vazio
       ficava PRESO no campo — a pessoa digitava o título, o aviso continuava lá e o
       formulário recusava enviar. O envio já roda o validador de `change`, e o blur abaixo
       também; quem decide se o erro APARECE é `toFieldState` (só depois de mexer no campo
       ou tentar enviar). */
    validators: { onChange: taskFormSchema },
    /* `mutate`, e não `await mutateAsync`: a recusa do servidor já chega à tela por
       `save.error`. Relançá-la daqui viraria uma rejeição sem dono no `handleSubmit` — o
       formulário mostraria o erro E o console acusaria um segundo, que não existe. */
    onSubmit: ({ value }) => {
      save.mutate(value);
    },
  });

  const values = useStore(form.store, (state) => state.values);
  const fieldMeta = useStore(form.store, (state) => state.fieldMeta);
  const isSubmitted = useStore(form.store, (state) => state.submissionAttempts > 0);

  return {
    data: {
      mode: task ? 'edit' : 'create',
      fields: {
        title: toFieldState(values.title, fieldMeta.title, isSubmitted),
        description: toFieldState(values.description, fieldMeta.description, isSubmitted),
        status: toFieldState(values.status, fieldMeta.status, isSubmitted),
      },
    },
    state: { isSubmitting: save.isPending, error: readError(save.error) },
    actions: {
      onChange: (field, value) => form.setFieldValue(field, value as never),
      onBlur: (field) => void form.validateField(field, 'change'),
      onSubmit: () => void form.handleSubmit(),
    },
  };
}

function toFormValues(task: Task | null): TaskFormValues {
  return {
    title: task?.title ?? '',
    description: task?.description ?? '',
    status: task?.status ?? 'todo',
  };
}
