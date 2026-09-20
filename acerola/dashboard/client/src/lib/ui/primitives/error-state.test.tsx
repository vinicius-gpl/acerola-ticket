import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import { ErrorState } from './error-state.component';

describe('ErrorState', () => {
  // feliz
  it('announces the reason as an alert', () => {
    render(<ErrorState data={{ message: 'O banco está ocupado.' }} />);

    expect(screen.getByRole('alert')).toHaveTextContent('O banco está ocupado.');
  });

  it('retries when the button is clicked', async () => {
    const onRetry = vi.fn();
    render(<ErrorState data={{ message: 'Falhou' }} actions={{ onRetry }} />);

    await userEvent.click(screen.getByRole('button', { name: 'Tentar de novo' }));

    expect(onRetry).toHaveBeenCalledOnce();
  });

  // triste
  /* Um botão que não resolve nada ensina a pessoa a ignorá-lo. */
  it('offers no retry button when there is nothing to retry', () => {
    render(<ErrorState data={{ message: 'Seu perfil é somente leitura.' }} />);

    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });

  it('locks the retry button while retrying', () => {
    render(
      <ErrorState
        data={{ message: 'Falhou' }}
        state={{ isRetrying: true }}
        actions={{ onRetry: vi.fn() }}
      />,
    );

    expect(screen.getByRole('button', { name: 'Tentar de novo' })).toBeDisabled();
  });
});
