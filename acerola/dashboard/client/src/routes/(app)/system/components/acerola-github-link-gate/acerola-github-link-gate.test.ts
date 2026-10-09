import { render, screen } from '@testing-library/svelte';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import Gate from './acerola-github-link-gate.svelte';

function renderGate(overrides = {}) {
  const actions = { onConnect: vi.fn(), onRetry: vi.fn(), onLeave: vi.fn() };
  render(Gate, {
    props: {
      state: {
        isLoading: false,
        isConfigured: true,
        isConnecting: false,
        error: null,
        ...overrides,
      },
      actions,
    },
  });
  return actions;
}
describe('GitHub link gate', () => {
  it('requires linking and exposes a connect action', async () => {
    const actions = renderGate();
    expect(screen.getByRole('heading')).toHaveTextContent('Vincule seu GitHub');
    await userEvent.click(screen.getByRole('button', { name: 'Vincular GitHub' }));
    expect(actions.onConnect).toHaveBeenCalledOnce();
  });
  it('does not offer authorization before configuration is ready', () => {
    renderGate({ isConfigured: false });
    expect(screen.getByRole('button', { name: 'Vincular GitHub' })).toBeDisabled();
    expect(screen.getByRole('status')).toHaveTextContent('administrador');
  });
  it('allows retry after a cancelled or failed authorization', async () => {
    const actions = renderGate({ error: 'A autorização foi cancelada.' });
    expect(screen.getByRole('alert')).toHaveTextContent('cancelada');
    await userEvent.click(screen.getByRole('button', { name: 'Verificar novamente' }));
    expect(actions.onRetry).toHaveBeenCalledOnce();
  });
  it('does not show a connect action while checking the existing connection', () => {
    renderGate({ isLoading: true });
    expect(screen.queryByRole('button', { name: 'Vincular GitHub' })).not.toBeInTheDocument();
    expect(screen.getByRole('status')).toHaveTextContent('Verificando');
  });
});
