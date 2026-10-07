import { QueryClient } from '@tanstack/svelte-query';
import { render, screen } from '@testing-library/svelte';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import ProjectTimelineDialog from './acerola-project-timeline-dialog.svelte';
import { type SoftwareProject } from '@template/shared/schemas/software-project.schema';

const mockProject: SoftwareProject = {
  id: 1,
  name: 'Acerola Ticket',
  description: 'Sistema de suporte e chamados',
  repositoryUrl: 'vinicius-gpl/acerola-ticket',
  githubRepoOwner: 'vinicius-gpl',
  githubRepoName: 'acerola-ticket',
  status: 'active',
  color: 'blue',
  openTicketsCount: 2,
  pullRequestsCount: 10,
  createdAt: '2026-01-01T00:00:00Z',
  updatedAt: null,
};

describe('AcerolaProjectTimelineDialog', () => {
  it('renders dialog header with project name', () => {
    const queryClient = new QueryClient();
    render(ProjectTimelineDialog, {
      props: {
        open: true,
        project: mockProject,
        onClose: vi.fn(),
      },
      context: new Map([['$$_queryClient', queryClient]]),
    });

    expect(screen.getByText('Timeline — Acerola Ticket')).toBeInTheDocument();
  });

  it('calls onClose when close button is clicked', async () => {
    const onClose = vi.fn();
    const queryClient = new QueryClient();
    render(ProjectTimelineDialog, {
      props: {
        open: true,
        project: mockProject,
        onClose,
      },
      context: new Map([['$$_queryClient', queryClient]]),
    });

    const closeBtn = screen.getByText('✕');
    await userEvent.click(closeBtn);
    expect(onClose).toHaveBeenCalled();
  });
});
