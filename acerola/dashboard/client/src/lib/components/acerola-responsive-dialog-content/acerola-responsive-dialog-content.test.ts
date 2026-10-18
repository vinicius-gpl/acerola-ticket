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

// triste: cancelar um gesto nunca confirma o fechamento do diálogo.
it('keeps the dialog open when a long drag is cancelled', async () => {
  const onOpenChange = vi.fn();
  render(ResponsiveDialogContentHarness, { props: { onOpenChange } });
  const handle = screen.getByTestId('drag-handle');
  await fireEvent.pointerDown(handle, { clientY: 0 });
  await fireEvent.pointerMove(handle, { clientY: 200 });
  await fireEvent.pointerCancel(handle);
  expect(onOpenChange).not.toHaveBeenCalled();
  expect(screen.getByText('Excluir esta peça?')).toBeInTheDocument();
});

// feliz: o teclado só desloca a rolagem interna, preservando espaço ao redor do foco.
it('scrolls a focused field into the padded sheet viewport', async () => {
  const { container } = render(ResponsiveDialogContentHarness, {
    props: { onOpenChange: vi.fn(), withFields: true },
  });
  const input = screen.getByLabelText('Campo 8');
  const scrollArea = document.querySelector('[data-slot="dialog-scroll-area"]') as HTMLElement;
  vi.spyOn(scrollArea, 'getBoundingClientRect').mockReturnValue({ top: 100, bottom: 400 } as DOMRect);
  vi.spyOn(input, 'getBoundingClientRect').mockReturnValue({ top: 400, bottom: 440 } as DOMRect);
  const frame = vi.spyOn(window, 'requestAnimationFrame').mockImplementation((callback) => {
    callback(0);
    return 1;
  });
  input.focus();
  await fireEvent.focusIn(input);
  expect(scrollArea.scrollTop).toBeGreaterThanOrEqual(52);
  expect(container.scrollTop).toBe(0);
  frame.mockRestore();
});
