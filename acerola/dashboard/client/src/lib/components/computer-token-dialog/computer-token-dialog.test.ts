import { render, screen } from '@testing-library/svelte';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import ComputerTokenDialog from './computer-token-dialog.svelte';

const TOKEN = 'agt_3f9a6c1e8b4d47a2b0c5e7f1a9d2b6c4';

describe('ComputerTokenDialog', () => {
  // feliz
  it('shows the token in full, so it can be copied by hand', () => {
    render(ComputerTokenDialog, {
      props: {
        data: { computerName: 'RECEPCAO-01', token: TOKEN },
        actions: { onClose: vi.fn() },
      },
    });

    expect(screen.getByTestId('agent-token')).toHaveTextContent(TOKEN);
  });

  /* O texto precisa dizer que não dá para ver de novo: sem isso a pessoa fecha a janela
     achando que o código fica guardado em algum lugar. */
  it('warns that the code cannot be shown again', () => {
    render(ComputerTokenDialog, {
      props: {
        data: { computerName: 'RECEPCAO-01', token: TOKEN },
        actions: { onClose: vi.fn() },
      },
    });

    expect(screen.getByText(/não pode ser mostrado de novo/)).toBeInTheDocument();
  });

  it('closes when the person says they have kept it', async () => {
    const onClose = vi.fn();
    const user = userEvent.setup();
    render(ComputerTokenDialog, {
      props: { data: { computerName: 'RECEPCAO-01', token: TOKEN }, actions: { onClose } },
    });

    await user.click(screen.getByRole('button', { name: 'Já guardei' }));

    expect(onClose).toHaveBeenCalled();
  });

  // triste
  /* Navegador sem área de transferência não pode quebrar a tela: o token continua escrito
     na frente da pessoa, que copia à mão. */
  it('survives a browser that refuses to copy', async () => {
    const user = userEvent.setup();
    vi.spyOn(navigator.clipboard, 'writeText').mockRejectedValue(new Error('denied'));

    render(ComputerTokenDialog, {
      props: {
        data: { computerName: 'RECEPCAO-01', token: TOKEN },
        actions: { onClose: vi.fn() },
      },
    });

    await user.click(screen.getByRole('button', { name: 'Copiar código' }));

    expect(screen.getByTestId('agent-token')).toHaveTextContent(TOKEN);
    expect(screen.queryByRole('button', { name: 'Copiado' })).not.toBeInTheDocument();
  });
});
