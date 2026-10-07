import { createForm } from '@tanstack/svelte-form';
import { createMutation, createQuery, useQueryClient } from '@tanstack/svelte-query';
import {
  assignRoleSchema,
  type AssignRoleInput,
  type AssignableUserRole,
  type InternalRole,
} from '@template/shared/schemas/internal-role.schema';
import { type DirectoryUser } from '@template/shared/schemas/user.schema';

import { readError } from '$lib/api/http-client';
import { rolesApi } from '$lib/api/roles.api';
import { toFieldState } from '$lib/hooks/use-form-projection/use-form-projection.svelte';
import { mirrorStore } from '$lib/hooks/use-mirror-store/use-mirror-store.svelte';
import { ROLES_QUERY_KEY } from '$lib/hooks/use-roles/use-roles.svelte';
import { type FormFieldState } from '$lib/types/form-field.type';

export type RoleFormField = 'userId' | 'userEmail' | 'context' | 'role';

export type RoleFormModel = {
  data: {
    mode: 'create' | 'edit';
    users: DirectoryUser[];
    fields: Record<RoleFormField, FormFieldState>;
  };
  state: { isSubmitting: boolean; isLoadingUsers: boolean; error: string | null };
  actions: {
    onChange: (field: RoleFormField, value: string) => void;
    onBlur: (field: RoleFormField) => void;
    onSelectUser: (user: DirectoryUser) => void;
    onClearUser: () => void;
    onSubmit: () => void;
  };
};

export function useRoleFormModel({
  role,
  onSaved,
}: {
  role?: InternalRole | null;
  onSaved: () => void;
}): RoleFormModel {
  const queryClient = useQueryClient();

  const save = mirrorStore(
    createMutation({
      mutationFn: (values: AssignRoleInput) => rolesApi.assign(values),
      onSuccess: async () => {
        await queryClient.invalidateQueries({ queryKey: ROLES_QUERY_KEY });
        onSaved();
      },
    }),
  );

  const usersQuery = mirrorStore(
    createQuery({
      queryKey: [...ROLES_QUERY_KEY, 'users'],
      queryFn: () => rolesApi.listUsers(),
    }),
  );

  const form = createForm(() => ({
    defaultValues: toFormValues(role ?? null),
    validators: { onChange: assignRoleSchema },
    onSubmit: ({ value }: { value: AssignRoleInput }) => {
      save.current.mutate(value);
    },
  }));

  const values = form.useSelector((state) => state.values);
  const fieldMeta = form.useSelector((state) => state.fieldMeta);
  const isSubmitted = form.useSelector((state) => state.submissionAttempts > 0);

  return {
    get data() {
      return {
        mode: role ? ('edit' as const) : ('create' as const),
        users: usersQuery.current.data ?? [],
        fields: {
          userId: toFieldState(values.current.userId, fieldMeta.current.userId, isSubmitted.current),
          userEmail: toFieldState(
            values.current.userEmail,
            fieldMeta.current.userEmail,
            isSubmitted.current,
          ),
          context: toFieldState(values.current.context, fieldMeta.current.context, isSubmitted.current),
          role: toFieldState(values.current.role, fieldMeta.current.role, isSubmitted.current),
        },
      };
    },
    get state() {
      return {
        isSubmitting: save.current.isPending,
        isLoadingUsers: usersQuery.current.isPending,
        error: readError(save.current.error),
      };
    },
    actions: {
      onChange: (field, value) => form.setFieldValue(field, value as never),
      onBlur: (field) => {
        form.setFieldMeta(field, (prev) => ({ ...prev, isTouched: true }));
        void form.validateField(field, 'change');
      },
      onSelectUser: (user) => {
        form.setFieldValue('userId', user.id);
        form.setFieldValue('userEmail', user.email);
        form.setFieldMeta('userId', (prev) => ({ ...prev, isTouched: true }));
        void form.validateField('userId', 'change');
      },
      onClearUser: () => {
        form.setFieldValue('userId', '');
        form.setFieldValue('userEmail', '');
      },
      onSubmit: () => void form.handleSubmit(),
    },
  };
}

function toFormValues(role: InternalRole | null): AssignRoleInput {
  if (!role) {
    return {
      userId: '',
      userEmail: '',
      context: 'sistema',
      role: 'user',
    };
  }

  const roleValue: AssignableUserRole = role.role === 'superadmin' ? 'admin' : role.role;

  return {
    userId: role.userId,
    userEmail: role.userEmail || '',
    context: role.context,
    role: roleValue,
  };
}
