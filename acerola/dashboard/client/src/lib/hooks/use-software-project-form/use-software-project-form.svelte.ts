import { createForm } from '@tanstack/svelte-form';
import { createMutation, useQueryClient } from '@tanstack/svelte-query';
import {
  type SoftwareProject,
  type SoftwareProjectForm,
  softwareProjectFormSchema,
} from '@template/shared/schemas/software-project.schema';

import { readError } from '$lib/api/http-client';
import { softwareProjectsApi } from '$lib/api/software-projects.api';
import { toFieldState } from '$lib/hooks/use-form-projection/use-form-projection.svelte';
import { SOFTWARE_PROJECTS_QUERY_KEY } from '$lib/hooks/use-software-project-list/use-software-project-list.svelte';
import { mirrorStore } from '$lib/hooks/use-mirror-store/use-mirror-store.svelte';
import { type FormFieldState } from '$lib/types/form-field.type';

export type SoftwareProjectFormField = keyof SoftwareProjectForm;

export type SoftwareProjectFormModel = {
  data: {
    mode: 'create' | 'edit';
    fields: Record<SoftwareProjectFormField, FormFieldState>;
  };
  state: {
    isSubmitting: boolean;
    error: string | null;
  };
  actions: {
    onChange: (field: SoftwareProjectFormField, value: string) => void;
    onBlur: (field: SoftwareProjectFormField) => void;
    onSubmit: () => void;
  };
};

function resolveInitialProjectValues(project: SoftwareProject | null): SoftwareProjectForm {
  if (!project) {
    return {
      name: '',
      description: '',
      repositoryUrl: '',
      status: 'active',
      color: 'blue',
    };
  }
  return {
    name: project.name,
    description: project.description ?? '',
    repositoryUrl: project.repositoryUrl,
    status: project.status,
    color: project.color,
  };
}

function saveProject(project: SoftwareProject | null, values: SoftwareProjectForm) {
  const payload = {
    name: values.name,
    description: values.description ? values.description.trim() : null,
    repositoryUrl: values.repositoryUrl,
    status: values.status,
    color: values.color,
  };
  if (project) {
    return softwareProjectsApi.update(project.id, payload);
  }
  return softwareProjectsApi.create(payload);
}

export function useSoftwareProjectFormModel({
  project,
  onSaved,
}: {
  project: SoftwareProject | null;
  onSaved: () => void;
  }): SoftwareProjectFormModel {
  const queryClient = useQueryClient();
  const isEdit = project !== null;

  const mutation = mirrorStore(
    createMutation({
      mutationFn: (values: SoftwareProjectForm) => saveProject(project, values),
      onSuccess: () => {
        void queryClient.invalidateQueries({ queryKey: SOFTWARE_PROJECTS_QUERY_KEY });
        onSaved();
      },
    }),
  );

  const initialValues = resolveInitialProjectValues(project);

  const form = createForm(() => ({
    defaultValues: initialValues,
    validators: {
      onChange: softwareProjectFormSchema,
    },
    onSubmit: async ({ value }) => {
      mutation.current.mutate(value);
    },
  }));

  const values = form.useSelector((state) => state.values);
  const fieldMeta = form.useSelector((state) => state.fieldMeta);
  const isSubmitted = form.useSelector((state) => state.submissionAttempts > 0);

  return {
    get data() {
      return {
        mode: (isEdit ? 'edit' : 'create') as 'create' | 'edit',
        fields: {
          name: toFieldState(values.current.name, fieldMeta.current.name, isSubmitted.current),
          description: toFieldState(
            values.current.description,
            fieldMeta.current.description,
            isSubmitted.current,
          ),
          repositoryUrl: toFieldState(
            values.current.repositoryUrl,
            fieldMeta.current.repositoryUrl,
            isSubmitted.current,
          ),
          status: toFieldState(values.current.status, fieldMeta.current.status, isSubmitted.current),
          color: toFieldState(values.current.color, fieldMeta.current.color, isSubmitted.current),
        },
      };
    },
    get state() {
      return {
        isSubmitting: mutation.current.isPending,
        error: readError(mutation.current.error),
      };
    },
    actions: {
      onChange: (field, value) => {
        form.setFieldValue(field, value as never);
        form.setFieldMeta(field, (prev) => ({ ...prev, isTouched: true }));
        void form.validateField(field, 'change');
      },
      onBlur: (field) => {
        form.setFieldMeta(field, (prev) => ({ ...prev, isTouched: true }));
        void form.validateField(field, 'change');
      },
      onSubmit: () => {
        void form.handleSubmit();
      },
    },
  };
}
