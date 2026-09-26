import { render, screen } from '@testing-library/svelte';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import ReportExportActions from './report-export-actions.svelte';

describe('ReportExportActions', () => {
  // feliz
  it('shows the three formats', () => {
    render(ReportExportActions, {
      props: { state: { exportingFormat: null }, actions: { onExport: vi.fn() } },
    });

    expect(screen.getByRole('button', { name: 'Excel' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Word' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'PDF' })).toBeInTheDocument();
  });

  it('asks for the format that was clicked', async () => {
    const onExport = vi.fn();
    render(ReportExportActions, {
      props: { state: { exportingFormat: null }, actions: { onExport } },
    });

    await userEvent.click(screen.getByRole('button', { name: 'PDF' }));

    expect(onExport).toHaveBeenCalledWith('pdf');
  });

  // triste
  it('locks the other two buttons while one format is downloading', () => {
    render(ReportExportActions, {
      props: { state: { exportingFormat: 'xlsx' }, actions: { onExport: vi.fn() } },
    });

    expect(screen.getByRole('button', { name: 'Word' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'PDF' })).toBeDisabled();
  });
});
