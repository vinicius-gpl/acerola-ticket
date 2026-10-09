import { render, screen } from '@testing-library/svelte';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import ScheduleEventDialog from './acerola-schedule-event-dialog.svelte';
import { type SoftwareScheduleFormModel } from '$lib/hooks/use-software-schedule-form/use-software-schedule-form.svelte';

function createMockModel(
  overrides?: Partial<SoftwareScheduleFormModel>,
): SoftwareScheduleFormModel {
  return {
    data: {
      mode: 'create',
      fields: {
        title: { value: 'Deploy Portal v2', error: null },
        category: { value: 'deploy', error: null },
        color: { value: 'blue', error: null },
        date: { value: '2026-10-18', error: null },
        startTime: { value: '09:00', error: null },
        endTime: { value: '10:00', error: null },
        projectId: { value: '', error: null },
        note: { value: '', error: null },
      },
      ...overrides?.data,
    },
    state: {
      isSubmitting: false,
      error: null,
      ...overrides?.state,
    },
    actions: {
      onChange: vi.fn(),
      onBlur: vi.fn(),
      onSubmit: vi.fn(),
      ...overrides?.actions,
    },
  };
}

describe('AcerolaScheduleEventDialog', () => {
  it('shows deletion errors inside the open dialog', () => {
    render(ScheduleEventDialog, {
      props: {
        open: true,
        model: createMockModel(),
        projects: [],
        onClose: vi.fn(),
        deleteError: 'Não foi possível excluir o compromisso.',
      },
    });
    expect(screen.getByRole('alert')).toHaveTextContent('Não foi possível excluir o compromisso.');
    expect(screen.getByRole('dialog')).toBeInTheDocument();
  });

  it('renders modal when open', () => {
    const model = createMockModel();
    render(ScheduleEventDialog, {
      props: {
        open: true,
        model,
        projects: [],
        onClose: vi.fn(),
      },
    });

    expect(screen.getByText('Novo Compromisso')).toBeInTheDocument();
    expect(screen.getByRole('textbox', { name: /Título do compromisso/ })).toBeInTheDocument();
  });

  it('calls onClose when close button is clicked', async () => {
    const onClose = vi.fn();
    const model = createMockModel();
    render(ScheduleEventDialog, {
      props: {
        open: true,
        model,
        projects: [],
        onClose,
      },
    });

    const closeBtn = screen.getByRole('button', { name: /^Close$/ });
    await userEvent.click(closeBtn);
    expect(onClose).toHaveBeenCalled();
  });
});
