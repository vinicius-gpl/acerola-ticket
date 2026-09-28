import { render, screen } from '@testing-library/svelte';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import AttachmentList, { fileSizeOf } from './attachment-list.svelte';

const attachment = (over: Record<string, unknown> = {}) => ({
  id: 1,
  ticketId: 7,
  kind: 'pdf' as const,
  fileName: 'nota-fiscal.pdf',
  contentType: 'application/pdf',
  sizeBytes: 2 * 1024 * 1024,
  viewUrl: 'https://r2.example/abrir',
  downloadUrl: 'https://r2.example/baixar',
  createdAt: '2026-09-28T12:00:00.000Z',
  createdBy: null,
  ...over,
});

describe('AttachmentList', () => {
  // feliz
  /* Dois caminhos para o mesmo arquivo: olhar sem baixar, e baixar com o nome certo. */
  it('offers both ways of getting to the file', () => {
    render(AttachmentList, { props: { data: { attachments: [attachment()] } } });

    expect(screen.getByRole('link', { name: 'Abrir' })).toHaveAttribute(
      'href',
      'https://r2.example/abrir',
    );

    const download = screen.getByRole('link', { name: 'Baixar' });
    expect(download).toHaveAttribute('href', 'https://r2.example/baixar');
    expect(download).toHaveAttribute('download', 'nota-fiscal.pdf');
  });

  it('says the format and the size of each file', () => {
    render(AttachmentList, { props: { data: { attachments: [attachment()] } } });

    expect(screen.getByText('PDF · 2,0 MB')).toBeInTheDocument();
  });

  it('asks to remove the file that was clicked', async () => {
    const onRemove = vi.fn();
    render(AttachmentList, {
      props: { data: { attachments: [attachment()] }, actions: { onRemove } },
    });

    await userEvent.click(screen.getByRole('button', { name: 'Excluir' }));

    expect(onRemove).toHaveBeenCalledWith(expect.objectContaining({ id: 1 }));
  });

  // triste
  /* Na consulta pública ninguém exclui: sem o callback, o botão não existe — e não é só
     escondido, porque esconder botão não é permissão. */
  it('does not offer to remove when the screen cannot remove', () => {
    render(AttachmentList, { props: { data: { attachments: [attachment()] } } });

    expect(screen.queryByRole('button', { name: 'Excluir' })).not.toBeInTheDocument();
  });

  it('says there is nothing instead of showing an empty list', () => {
    render(AttachmentList, {
      props: { data: { attachments: [] }, ui: { emptyLabel: 'Nenhum arquivo neste chamado.' } },
    });

    expect(screen.getByText('Nenhum arquivo neste chamado.')).toBeInTheDocument();
  });

  /* Falha de gravação fica na tela, em vermelho, com o motivo (CONTRIBUTING §15). */
  it('keeps the failure to delete on screen', () => {
    render(AttachmentList, {
      props: {
        data: { attachments: [attachment()] },
        state: { error: 'Seu perfil não permite atender chamados.' },
      },
    });

    expect(screen.getByText('Seu perfil não permite atender chamados.')).toBeInTheDocument();
  });
});

describe('fileSizeOf', () => {
  // feliz
  it('speaks in megabytes, which is how people talk about files', () => {
    expect(fileSizeOf(5 * 1024 * 1024)).toBe('5,0 MB');
  });

  // triste
  /* Arquivo pequeno em MB viraria "0,0 MB", que não diz nada. */
  it('falls back to kilobytes for a small file', () => {
    expect(fileSizeOf(12 * 1024)).toBe('12 KB');
    expect(fileSizeOf(10)).toBe('1 KB');
  });
});
