import { render, screen } from '@testing-library/svelte';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import LoginScreen, { type LoginScreenProps } from './login-screen.svelte';

const fields = {
  email: { value: '', error: null },
  password: { value: '', error: null },
};

function renderScreen(overrides: Partial<LoginScreenProps> = {}) {
  const actions = { onChange: vi.fn(), onBlur: vi.fn(), onSubmit: vi.fn() };

  render(LoginScreen, {
    props: { data: { fields }, actions, ...overrides },
  });

  return actions;
}

describe('LoginScreen', () => {
  // feliz
  it('reports what is typed in each field, naming it', async () => {
    const actions = renderScreen();

    await userEvent.type(screen.getByLabelText('E-mail'), 'a');
    await userEvent.type(screen.getByLabelText('Senha'), 'b');

    expect(actions.onChange).toHaveBeenCalledWith('email', 'a');
    expect(actions.onChange).toHaveBeenCalledWith('password', 'b');
  });

  it('submits through the form, so Enter works too', async () => {
    const actions = renderScreen();

    await userEvent.click(screen.getByRole('button', { name: 'Entrar' }));

    expect(actions.onSubmit).toHaveBeenCalledOnce();
  });

  // triste
  it('shows the field error next to the field', () => {
    renderScreen({
      data: { fields: { ...fields, email: { value: 'ana', error: 'Informe um e-mail válido' } } },
    });

    expect(screen.getByLabelText('E-mail')).toHaveAttribute('aria-invalid', 'true');
    expect(screen.getByText('Informe um e-mail válido')).toBeInTheDocument();
  });

  it('shows the server refusal without blaming a specific field', () => {
    renderScreen({ state: { error: 'E-mail ou senha incorretos.' } });

    expect(screen.getByText('E-mail ou senha incorretos.')).toBeInTheDocument();
  });

  /* Dois cliques em "Entrar" não deveriam mandar duas tentativas de login. */
  it('locks the submit button while logging in', () => {
    renderScreen({ state: { isSubmitting: true } });

    expect(screen.getByRole('button', { name: 'Entrando…' })).toBeDisabled();
  });
});
