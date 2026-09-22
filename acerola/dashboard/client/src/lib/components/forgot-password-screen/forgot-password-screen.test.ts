import { render, screen } from '@testing-library/svelte';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import ForgotPasswordScreen, {
  type ForgotPasswordScreenProps,
} from './forgot-password-screen.svelte';

const field = { value: '', error: null };

function renderScreen(overrides: Partial<ForgotPasswordScreenProps> = {}) {
  const actions = { onChange: vi.fn(), onBlur: vi.fn(), onSubmit: vi.fn() };

  render(ForgotPasswordScreen, { props: { data: { field }, actions, ...overrides } });

  return actions;
}

describe('ForgotPasswordScreen', () => {
  // feliz
  it('reports what is typed in the e-mail field', async () => {
    const actions = renderScreen();

    await userEvent.type(screen.getByLabelText('E-mail'), 'a');

    expect(actions.onChange).toHaveBeenCalledWith('a');
  });

  it('submits through the form, so Enter works too', async () => {
    const actions = renderScreen();

    await userEvent.click(screen.getByRole('button', { name: 'Enviar o link' }));

    expect(actions.onSubmit).toHaveBeenCalledOnce();
  });

  /* Depois de enviar, o formulário sai de cena: repetir o envio sem necessidade só gera
     limite de tentativas. */
  it('replaces the form with the confirmation once it is sent', () => {
    renderScreen({ state: { isSent: true } });

    expect(screen.getByRole('heading', { name: 'Confira seu e-mail' })).toBeInTheDocument();
    expect(screen.queryByLabelText('E-mail')).not.toBeInTheDocument();
  });

  /* A confirmação NÃO pode dizer se a conta existe — isso entregaria quais e-mails têm conta. */
  it('confirms without revealing whether the account exists', () => {
    renderScreen({ state: { isSent: true } });

    expect(screen.getByText(/Se este e-mail estiver cadastrado/)).toBeInTheDocument();
  });

  // triste
  it('shows the field error next to the field', () => {
    renderScreen({ data: { field: { value: 'ana', error: 'Informe um e-mail válido' } } });

    expect(screen.getByLabelText('E-mail')).toHaveAttribute('aria-invalid', 'true');
    expect(screen.getByText('Informe um e-mail válido')).toBeInTheDocument();
  });

  it('shows the service refusal inside the screen', () => {
    renderScreen({ state: { error: 'Muitas tentativas seguidas. Espere alguns minutos.' } });

    expect(screen.getByText(/Muitas tentativas seguidas/)).toBeInTheDocument();
  });

  it('locks the submit button while sending', () => {
    renderScreen({ state: { isSubmitting: true } });

    expect(screen.getByRole('button', { name: 'Enviando…' })).toBeDisabled();
  });

  it('always offers the way back to the login screen', () => {
    renderScreen();

    expect(screen.getByRole('link', { name: 'Voltar para a tela de entrada' })).toHaveAttribute(
      'href',
      '/login',
    );
  });
});
