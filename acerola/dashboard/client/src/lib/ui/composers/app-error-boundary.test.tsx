import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { AppErrorBoundary } from './app-error-boundary.component';

function Bomb(): never {
  throw new Error('Falha simulada no teste');
}

describe('AppErrorBoundary', () => {
  // feliz
  it('desenha o conteúdo normalmente quando nada quebra', () => {
    render(
      <AppErrorBoundary>
        <div>Conteúdo normal</div>
      </AppErrorBoundary>,
    );

    expect(screen.getByText('Conteúdo normal')).toBeInTheDocument();
  });

  /* Sem a boundary, um erro de render esvazia o `#root` e a tela fica em branco — sem
     mensagem, sem o que relatar. É o pior resultado possível, e é o que este teste prova
     que não acontece mais. */
  it('captura o erro de render e mostra o motivo, em vez de esvaziar a tela', () => {
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});

    render(
      <AppErrorBoundary>
        <Bomb />
      </AppErrorBoundary>,
    );

    expect(screen.getByRole('alert')).toHaveTextContent('A tela não carregou');
    expect(screen.getByText('Falha simulada no teste')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Recarregar' })).toBeInTheDocument();

    consoleError.mockRestore();
  });
});
