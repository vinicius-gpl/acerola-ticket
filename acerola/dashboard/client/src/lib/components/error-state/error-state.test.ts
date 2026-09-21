import { render, screen } from '@testing-library/svelte';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import ErrorState from './error-state.svelte';

describe('ErrorState', () => {
  // feliz
  it('announces the reason as an alert', () => {
    render(ErrorState, {
      props: {
        data: { message: 'O banco está ocupado.' },
      },
    });

    expect(screen.getByRole('alert')).toHaveTextContent('O banco está ocupado.');
  });

  it('retries when the button is clicked', async () => {
    const user = userEvent.setup();
    const onRetry = vi.fn();
    render(ErrorState, {
      props: {
        data: { message: 'Falhou' },
        actions: { onRetry },
      },
    });

    await user.click(screen.getByRole('button', { name: 'Tentar de novo' }));

    expect(onRetry).toHaveBeenCalledOnce();
  });

  // triste
  /* Um botão que não resolve nada ensina a pessoa a ignorá-lo. */
  it('offers no retry button when there is nothing to retry', () => {
    render(ErrorState, {
      props: {
        data: { message: 'Seu perfil é somente leitura.' },
      },
    });

    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });

  it('locks the retry button while retrying', () => {
    render(ErrorState, {
      props: {
        data: { message: 'Falhou' },
        state: { isRetrying: true },
        actions: { onRetry: vi.fn() },
      },
    });

    expect(screen.getByRole('button', { name: 'Tentar de novo' })).toBeDisabled();
  });
});
