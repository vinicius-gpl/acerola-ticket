import { createForm } from '@tanstack/svelte-form';
import { createMutation, useQueryClient } from '@tanstack/svelte-query';
import {
  type Task,
  taskFormSchema,
  type TaskFormValues,
} from '@template/shared/schemas/task.schema';

import { readError } from '$lib/api/http-client';
import { tasksApi } from '$lib/api/tasks.api';
import { type TaskFormField } from '$lib/components/task-form-dialog/task-form-dialog.svelte';
import { type FormFieldState } from '$lib/form-field/form-field.type';
import { mirrorStore } from './mirror-store.svelte';
import { toFieldState } from './form-projection';
import { TASKS_QUERY_KEY } from './use-task-list.model.svelte';

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
 * a rota monta este model dentro de um `{#key}` pelo id, e trocar de tarefa monta um
 * formulário novo. É mais simples e mais seguro do que sincronizar com efeito — sincronizar
 * apagaria o que a pessoa estava digitando quando a lista recarregasse por trás.
 */
export function useTaskFormModel({
  task,
  onSaved,
}: {
  task: Task | null;
  onSaved: () => void;
}): TaskFormModel {
  const queryClient = useQueryClient();

  /* O @tanstack/svelte-query desta versão devolve store; `mirrorStore` traz pro mundo dos
     runes sem reassinar a cada emissão — ver o comentário lá. */
  const save = mirrorStore(
    createMutation({
      mutationFn: (values: TaskFormValues) =>
        task ? tasksApi.update(task.id, values) : tasksApi.create(values),
      onSuccess: async () => {
        await queryClient.invalidateQueries({ queryKey: TASKS_QUERY_KEY });
        onSaved();
      },
    }),
  );

  const form = createForm(() => ({
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
    onSubmit: ({ value }: { value: TaskFormValues }) => {
      save.current.mutate(value);
    },
  }));

  /* `useSelector` é o equivalente do `useStore` do react-form: devolve um `{ current }` que
     o Svelte acompanha. Três seletores em vez de um só para a tela não repintar inteira
     quando só o que foi tocado mudou. */
  const values = form.useSelector((state) => state.values);
  const fieldMeta = form.useSelector((state) => state.fieldMeta);
  const isSubmitted = form.useSelector((state) => state.submissionAttempts > 0);

  return {
    /* `get` em vez de valor: o model é montado uma vez e a tela lê dele a cada tecla. */
    get data() {
      return {
        mode: task ? ('edit' as const) : ('create' as const),
        fields: {
          title: toFieldState(values.current.title, fieldMeta.current.title, isSubmitted.current),
          description: toFieldState(
            values.current.description,
            fieldMeta.current.description,
            isSubmitted.current,
          ),
          status: toFieldState(
            values.current.status,
            fieldMeta.current.status,
            isSubmitted.current,
          ),
        },
      };
    },
    get state() {
      return { isSubmitting: save.current.isPending, error: readError(save.current.error) };
    },
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
