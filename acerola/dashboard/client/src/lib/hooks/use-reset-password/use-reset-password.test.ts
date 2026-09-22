import { render, waitFor } from '@testing-library/svelte';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import Harness from './use-reset-password-harness.test.svelte';
import { type ResetPasswordModel } from './use-reset-password.svelte';

vi.mock('$lib/auth/neon-auth.client', () => ({
  neonAuth: { resetPassword: vi.fn() },
  readAuthToken: vi.fn().mockResolvedValue(null),
}));

/* O token vem do endereço, nunca de um campo — é ele que prova que a pessoa abriu o e-mail
   dela. O `page` do SvelteKit é falso aqui, e cada teste diz qual endereço está aberto. */
const pageState = { url: new URL('http://localhost/reset-password?token=token-do-email') };

vi.mock('$app/state', () => ({
  get page() {
    return pageState;
  },
}));

const { neonAuth } = await import('$lib/auth/neon-auth.client');
const { goto } = await import('$app/navigation');

function mountModel(): ResetPasswordModel {
  let model!: ResetPasswordModel;
  render(Harness, { props: { onReady: (ready: ResetPasswordModel) => (model = ready) } });

  return model;
}

function fill(model: ResetPasswordModel, password: string, confirmation = password): void {
  model.actions.onChange('password', password);
  model.actions.onChange('passwordConfirmation', confirmation);
  model.actions.onSubmit();
}

beforeEach(() => {
  pageState.url = new URL('http://localhost/reset-password?token=token-do-email');
  vi.mocked(neonAuth.resetPassword)
    .mockReset()
    .mockResolvedValue({ data: null, error: null } as never);
  vi.mocked(goto).mockClear();
});

describe('useResetPasswordModel', () => {
  // feliz
  it('saves the new password with the token from the link', async () => {
    const model = mountModel();

    fill(model, 'senha-longa-123');

    await waitFor(() =>
      expect(neonAuth.resetPassword).toHaveBeenCalledWith({
        newPassword: 'senha-longa-123',
        token: 'token-do-email',
      }),
    );
  });

  /* Manda para o login em vez de entrar direto: digitar a senha nova uma vez confirma, ali na
     hora, que ela funciona. */
  it('sends the person to the login screen after saving', async () => {
    const model = mountModel();

    fill(model, 'senha-longa-123');

    await waitFor(() => expect(goto).toHaveBeenCalledWith('/login'));
  });

  it('knows the link is valid when the address carries a token', () => {
    expect(mountModel().state.isLinkValid).toBe(true);
  });

  // triste
  it('treats an address without a token as an invalid link', () => {
    pageState.url = new URL('http://localhost/reset-password');

    expect(mountModel().state.isLinkValid).toBe(false);
  });

  it('refuses two different passwords, blaming the confirmation', async () => {
    const model = mountModel();

    fill(model, 'senha-longa-123', 'senha-longa-124');

    await waitFor(() =>
      expect(model.data.fields.passwordConfirmation.error).toBe(
        'As duas senhas precisam ser iguais',
      ),
    );
    expect(neonAuth.resetPassword).not.toHaveBeenCalled();
  });

  it('refuses a password shorter than the minimum, without calling the service', async () => {
    const model = mountModel();

    fill(model, 'curta');

    await waitFor(() => expect(model.data.fields.password.error).toMatch(/8 caracteres/));
    expect(neonAuth.resetPassword).not.toHaveBeenCalled();
  });

  /* Link vencido é o caso comum, e a mensagem precisa dizer o que resolve: pedir outro. */
  it('explains an expired link instead of showing a generic failure', async () => {
    vi.mocked(neonAuth.resetPassword).mockResolvedValue({
      data: null,
      error: { status: 400 },
    } as never);
    const model = mountModel();

    fill(model, 'senha-longa-123');

    await waitFor(() => expect(model.state.error).toMatch(/não vale mais/));
    expect(goto).not.toHaveBeenCalled();
  });
});
