import { render, screen } from '@testing-library/svelte';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import ResetPasswordScreen, { type ResetPasswordScreenProps } from './reset-password-screen.svelte';

const fields = {
  password: { value: '', error: null },
  passwordConfirmation: { value: '', error: null },
};

function renderScreen(overrides: Partial<ResetPasswordScreenProps> = {}) {
  const actions = { onChange: vi.fn(), onBlur: vi.fn(), onSubmit: vi.fn() };

  render(ResetPasswordScreen, { props: { data: { fields }, actions, ...overrides } });

  return actions;
}

describe('ResetPasswordScreen', () => {
  // feliz
  it('reports what is typed in each field, naming it', async () => {
    const actions = renderScreen();

    await userEvent.type(screen.getByLabelText('Nova senha'), 'a');
    await userEvent.type(screen.getByLabelText('Repita a nova senha'), 'b');

    expect(actions.onChange).toHaveBeenCalledWith('password', 'a');
    expect(actions.onChange).toHaveBeenCalledWith('passwordConfirmation', 'b');
  });

  it('submits through the form, so Enter works too', async () => {
    const actions = renderScreen();

    await userEvent.click(screen.getByRole('button', { name: 'Salvar e entrar' }));

    expect(actions.onSubmit).toHaveBeenCalledOnce();
  });

  // triste
  /* O erro da confirmação fica NA confirmação: é o campo que a pessoa vai corrigir. */
  it('shows the mismatch error on the confirmation field', () => {
    renderScreen({
      data: {
        fields: {
          ...fields,
          passwordConfirmation: { value: 'b', error: 'As duas senhas precisam ser iguais' },
        },
      },
    });

    expect(screen.getByLabelText('Repita a nova senha')).toHaveAttribute('aria-invalid', 'true');
    expect(screen.getByText('As duas senhas precisam ser iguais')).toBeInTheDocument();
  });

  /* Link vencido ou endereço digitado na mão: a tela nem mostra os campos. Preencher dois
     campos para ser recusado no fim é o pior resultado possível. */
  it('hides the form and offers a new link when the link is not valid', () => {
    renderScreen({ state: { isLinkValid: false } });

    expect(screen.queryByLabelText('Nova senha')).not.toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Pedir um link novo' })).toHaveAttribute(
      'href',
      '/forgot-password',
    );
  });

  it('shows the service refusal inside the screen', () => {
    renderScreen({ state: { error: 'Este link não vale mais.' } });

    expect(screen.getByText('Este link não vale mais.')).toBeInTheDocument();
  });

  it('locks the submit button while saving', () => {
    renderScreen({ state: { isSubmitting: true } });

    expect(screen.getByRole('button', { name: 'Salvando…' })).toBeDisabled();
  });
});
