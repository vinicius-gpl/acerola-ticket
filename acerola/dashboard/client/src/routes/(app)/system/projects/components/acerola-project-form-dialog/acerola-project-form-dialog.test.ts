import { render, screen } from '@testing-library/svelte';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import ProjectFormDialog from './acerola-project-form-dialog.svelte';
import { type SoftwareProjectFormModel } from '$lib/hooks/use-software-project-form/use-software-project-form.svelte';

function createMockModel(overrides?: Partial<SoftwareProjectFormModel>): SoftwareProjectFormModel {
  return {
    data: {
      mode: 'create',
      fields: {
        name: { value: '', error: null },
        description: { value: '', error: null },
        repositoryUrl: { value: '', error: null },
        status: { value: 'active', error: null },
        color: { value: 'blue', error: null },
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

describe('AcerolaProjectFormDialog', () => {
  it('renders modal with title and fields when open', () => {
    const model = createMockModel();
    render(ProjectFormDialog, {
      props: {
        open: true,
        model,
        onClose: vi.fn(),
      },
    });

    expect(screen.getByText('Novo Sistema')).toBeInTheDocument();
    expect(screen.getByText('Nome do sistema')).toBeInTheDocument();
    expect(screen.getByText('Repositório no GitHub')).toBeInTheDocument();
  });

  it('renders error message when model has state error', () => {
    const model = createMockModel({
      state: { isSubmitting: false, error: 'Falha ao salvar o sistema' },
    });
    render(ProjectFormDialog, {
      props: {
        open: true,
        model,
        onClose: vi.fn(),
      },
    });

    expect(screen.getByText('Falha ao salvar o sistema')).toBeInTheDocument();
  });

  it('calls onClose when close button is clicked', async () => {
    const onClose = vi.fn();
    const model = createMockModel();
    render(ProjectFormDialog, {
      props: {
        open: true,
        model,
        onClose,
      },
    });

    const closeBtn = screen.getByText('✕');
    await userEvent.click(closeBtn);
    expect(onClose).toHaveBeenCalled();
  });
});
