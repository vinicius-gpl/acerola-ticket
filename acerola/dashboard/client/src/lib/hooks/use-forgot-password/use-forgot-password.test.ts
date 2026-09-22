import { render, waitFor } from '@testing-library/svelte';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import Harness from './use-forgot-password-harness.test.svelte';
import { type ForgotPasswordModel } from './use-forgot-password.svelte';

vi.mock('$lib/auth/neon-auth.client', () => ({
  neonAuth: { requestPasswordReset: vi.fn() },
  readAuthToken: vi.fn().mockResolvedValue(null),
}));

const { neonAuth } = await import('$lib/auth/neon-auth.client');

function mountModel(): ForgotPasswordModel {
  let model!: ForgotPasswordModel;
  render(Harness, { props: { onReady: (ready: ForgotPasswordModel) => (model = ready) } });

  return model;
}

beforeEach(() => {
  vi.mocked(neonAuth.requestPasswordReset)
    .mockReset()
    .mockResolvedValue({ data: null, error: null } as never);
});

describe('useForgotPasswordModel', () => {
  // feliz
  it('asks Neon Auth for the link, trimming the e-mail', async () => {
    const model = mountModel();

    model.actions.onChange('  ana@empresa.com.br  ');
    model.actions.onSubmit();

    await waitFor(() =>
      expect(neonAuth.requestPasswordReset).toHaveBeenCalledWith(
        expect.objectContaining({ email: 'ana@empresa.com.br' }),
      ),
    );
  });

  /* O link precisa voltar para a NOSSA tela de criar senha — e esse endereço tem que estar na
     lista de domínios confiáveis do Neon Auth, senão ele recusa sem enviar nada. */
  it('sends the address the link must come back to', async () => {
    const model = mountModel();

    model.actions.onChange('ana@empresa.com.br');
    model.actions.onSubmit();

    await waitFor(() =>
      expect(neonAuth.requestPasswordReset).toHaveBeenCalledWith(
        expect.objectContaining({ redirectTo: `${window.location.origin}/reset-password` }),
      ),
    );
  });

  it('turns the answer into "sent", without saying whether the account exists', async () => {
    const model = mountModel();

    model.actions.onChange('ana@empresa.com.br');
    model.actions.onSubmit();

    await waitFor(() => expect(model.state.isSent).toBe(true));
    expect(model.state.error).toBeNull();
  });

  // triste
  it('does not call the service when the e-mail is not an e-mail', async () => {
    const model = mountModel();

    model.actions.onChange('ana');
    model.actions.onSubmit();

    await waitFor(() => expect(model.data.field.error).toBe('Informe um e-mail válido'));
    expect(neonAuth.requestPasswordReset).not.toHaveBeenCalled();
  });

  /* Limite de tentativas tem conserto do lado da pessoa (esperar). Mandar "confira sua
     internet" faria ela procurar problema onde não há. */
  it('explains the rate limit instead of blaming the connection', async () => {
    vi.mocked(neonAuth.requestPasswordReset).mockResolvedValue({
      data: null,
      error: { status: 429 },
    } as never);
    const model = mountModel();

    model.actions.onChange('ana@empresa.com.br');
    model.actions.onSubmit();

    await waitFor(() => expect(model.state.error).toMatch(/Muitas tentativas/));
    expect(model.state.isSent).toBe(false);
  });

  it('does not report "sent" when the service refused', async () => {
    vi.mocked(neonAuth.requestPasswordReset).mockResolvedValue({
      data: null,
      error: { status: 500 },
    } as never);
    const model = mountModel();

    model.actions.onChange('ana@empresa.com.br');
    model.actions.onSubmit();

    await waitFor(() => expect(model.state.error).toMatch(/serviço de login/));
    expect(model.state.isSent).toBe(false);
  });
});
