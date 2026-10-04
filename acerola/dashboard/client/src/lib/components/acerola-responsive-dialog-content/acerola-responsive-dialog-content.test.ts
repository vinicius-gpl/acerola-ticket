import { fireEvent, render, screen } from '@testing-library/svelte';
import { describe, expect, it, vi } from 'vitest';

import ResponsiveDialogContentHarness from './acerola-responsive-dialog-content-harness.test.svelte';

describe('AcerolaResponsiveDialogContent', () => {
  // feliz
  it('shows the content, with the mobile handle and the close button', () => {
    render(ResponsiveDialogContentHarness, { props: { onOpenChange: vi.fn() } });

    expect(screen.getByText('Excluir esta peça?')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /fechar/i })).toBeInTheDocument();
  });

  it('closes when the handle is dragged down past the threshold', async () => {
    const onOpenChange = vi.fn();
    render(ResponsiveDialogContentHarness, { props: { onOpenChange } });

    const handle = screen.getByTestId('drag-handle');
    await fireEvent.pointerDown(handle, { clientY: 0 });
    await fireEvent.pointerMove(handle, { clientY: 200 });
    await fireEvent.pointerUp(handle);

    expect(onOpenChange).toHaveBeenCalledWith(false);
  });

  // triste
  it('stays open when the drag does not pass the threshold', async () => {
    const onOpenChange = vi.fn();
    render(ResponsiveDialogContentHarness, { props: { onOpenChange } });

    const handle = screen.getByTestId('drag-handle');
    await fireEvent.pointerDown(handle, { clientY: 0 });
    await fireEvent.pointerMove(handle, { clientY: 20 });
    await fireEvent.pointerUp(handle);

    expect(onOpenChange).not.toHaveBeenCalled();
    expect(screen.getByText('Excluir esta peça?')).toBeInTheDocument();
  });

  it('hides the close button but keeps it reachable for the drag-to-dismiss gesture', () => {
    render(ResponsiveDialogContentHarness, { props: { onOpenChange: vi.fn(), showCloseButton: false } });

    expect(screen.queryByRole('button', { name: /fechar/i })).not.toBeInTheDocument();
    expect(screen.getByText('Excluir esta peça?', { exact: true })).toBeInTheDocument();
  });
});
