import { SvelteDate } from 'svelte/reactivity';
import { createForm } from '@tanstack/svelte-form';
import { createMutation, useQueryClient } from '@tanstack/svelte-query';
import {
  type SoftwareScheduleEvent,
  type SoftwareScheduleForm,
  softwareScheduleFormSchema,
} from '@template/shared/schemas/software-schedule.schema';

import { readError } from '$lib/api/http-client';
import { softwareScheduleApi } from '$lib/api/software-schedule.api';
import { toFieldState } from '$lib/hooks/use-form-projection/use-form-projection.svelte';
import { SOFTWARE_SCHEDULE_QUERY_KEY } from '$lib/hooks/use-software-schedule/use-software-schedule.svelte';
import { mirrorStore } from '$lib/hooks/use-mirror-store/use-mirror-store.svelte';
import { type FormFieldState } from '$lib/types/form-field.type';

export type SoftwareScheduleFormField = keyof SoftwareScheduleForm;

export type SoftwareScheduleFormModel = {
  data: {
    mode: 'create' | 'edit';
    fields: Record<SoftwareScheduleFormField, FormFieldState>;
  };
  state: {
    isSubmitting: boolean;
    error: string | null;
  };
  actions: {
    onChange: (field: SoftwareScheduleFormField, value: string) => void;
    onBlur: (field: SoftwareScheduleFormField) => void;
    onSubmit: () => void;
  };
};

function resolveInitialScheduleValues(
  event: SoftwareScheduleEvent | null,
  defaultDate?: string,
  todayIso = new SvelteDate().toISOString().slice(0, 10),
): SoftwareScheduleForm {
  if (!event) {
    return {
      title: '',
      category: 'other',
      color: 'blue',
      date: defaultDate ?? todayIso,
      startTime: '09:00',
      endTime: '10:00',
      projectId: null,
      note: '',
    };
  }

  return {
    title: event.title,
    category: event.category,
    color: event.color,
    date: event.date,
    startTime: event.startTime,
    endTime: event.endTime,
    projectId: event.projectId,
    note: event.note ?? '',
  };
}

function saveScheduleEvent(event: SoftwareScheduleEvent | null, values: SoftwareScheduleForm) {
  const payload = {
    title: values.title,
    category: values.category,
    color: values.color,
    date: values.date,
    startTime: values.startTime,
    endTime: values.endTime,
    projectId: values.projectId ? Number(values.projectId) : null,
    note: values.note ? values.note.trim() : null,
  };

  if (event) {
    return softwareScheduleApi.update(event.id, payload);
  }

  return softwareScheduleApi.create(payload);
}

export function useSoftwareScheduleFormModel({
  event,
  defaultDate,
  onSaved,
}: {
  event: SoftwareScheduleEvent | null;
  defaultDate?: string;
  onSaved: () => void;
}): SoftwareScheduleFormModel {
  const queryClient = useQueryClient();
  const isEdit = event !== null;

  const mutation = mirrorStore(
    createMutation({
      mutationFn: (values: SoftwareScheduleForm) => saveScheduleEvent(event, values),
      onSuccess: () => {
        void queryClient.invalidateQueries({ queryKey: SOFTWARE_SCHEDULE_QUERY_KEY });
        onSaved();
      },
    }),
  );

  const initialValues = resolveInitialScheduleValues(event, defaultDate);

  const form = createForm(() => ({
    defaultValues: initialValues,
    validators: {
      onChange: softwareScheduleFormSchema,
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
          title: toFieldState(values.current.title, fieldMeta.current.title, isSubmitted.current),
          category: toFieldState(values.current.category, fieldMeta.current.category, isSubmitted.current),
          color: toFieldState(values.current.color, fieldMeta.current.color, isSubmitted.current),
          date: toFieldState(values.current.date, fieldMeta.current.date, isSubmitted.current),
          startTime: toFieldState(values.current.startTime, fieldMeta.current.startTime, isSubmitted.current),
          endTime: toFieldState(values.current.endTime, fieldMeta.current.endTime, isSubmitted.current),
          projectId: toFieldState(
            values.current.projectId ? String(values.current.projectId) : '',
            fieldMeta.current.projectId,
            isSubmitted.current,
          ),
          note: toFieldState(values.current.note, fieldMeta.current.note, isSubmitted.current),
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
