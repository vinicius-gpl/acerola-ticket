import { goto } from '$app/navigation';
import { render, waitFor } from '@testing-library/svelte';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import Harness from './use-login-harness.test.svelte';
import { type LoginModel } from './use-login.svelte';

/**
 * Quem confere a senha é o Neon Auth, e ele não lança em credencial errada: devolve `error`
 * preenchido. É isso que o mock imita — sem essa forma, o teste não exercitaria a conversão
 * que existe justamente por causa dela.
 */
vi.mock('$lib/auth/neon-auth.client', () => ({
  neonAuth: { signIn: { email: vi.fn() } },
}));

const { neonAuth } = await import('$lib/auth/neon-auth.client');

const signIn = vi.mocked(neonAuth.signIn.email);

function mountModel(): LoginModel {
  let model!: LoginModel;
  render(Harness, { props: { onReady: (ready: LoginModel) => (model = ready) } });

  return model;
}

async function submit(model: LoginModel, email: string, password: string): Promise<void> {
  model.actions.onChange('email', email);
  model.actions.onChange('password', password);
  await waitFor(() => expect(model.data.fields.password.value).toBe(password));
  model.actions.onSubmit();
}

describe('useLoginModel', () => {
  beforeEach(() => {
    vi.mocked(goto).mockClear();
    signIn.mockReset();
    signIn.mockResolvedValue({ error: null } as never);
  });

  // feliz
  it('signs in with what was typed and opens the system', async () => {
    const model = mountModel();

    await submit(model, 'ana@exemplo.com.br', 'senha-de-teste');

    await waitFor(() => expect(goto).toHaveBeenCalledWith('/tasks'));
    expect(signIn).toHaveBeenCalledWith({
      email: 'ana@exemplo.com.br',
      password: 'senha-de-teste',
    });
  });

  /* Espaço sobrando no e-mail é o que acontece quando alguém cola de um e-mail ou de uma
     conversa. Sem o corte, o login recusa uma credencial certa. */
  it('trims the e-mail before sending it', async () => {
    const model = mountModel();

    await submit(model, '  ana@exemplo.com.br  ', 'senha-de-teste');

    await waitFor(() => expect(signIn).toHaveBeenCalled());
    expect(signIn.mock.calls[0]?.[0]?.email).toBe('ana@exemplo.com.br');
  });

  /* A senha NÃO é cortada: espaço no começo ou no fim é parte da senha de quem a escolheu
     assim, e cortá-lo recusaria a senha certa para sempre. */
  it('never trims the password', async () => {
    const model = mountModel();

    await submit(model, 'ana@exemplo.com.br', ' com espaco ');

    await waitFor(() => expect(signIn).toHaveBeenCalled());
    expect(signIn.mock.calls[0]?.[0]?.password).toBe(' com espaco ');
  });

  // triste
  /**
   * A MESMA mensagem para "e-mail não existe" e "senha errada".
   *
   * Mensagens diferentes confirmariam, para quem está adivinhando, que um e-mail específico
   * tem conta no sistema. Este teste existe para essa distinção nunca voltar.
   */
  it('says the same thing for a wrong password and for an e-mail with no account', async () => {
    signIn.mockResolvedValue({ error: { status: 401 } } as never);
    const model = mountModel();

    await submit(model, 'ana@exemplo.com.br', 'senha-errada');

    await waitFor(() => expect(model.state.error).toBe('E-mail ou senha incorretos.'));
    expect(goto).not.toHaveBeenCalled();
  });

  /* A biblioteca não lança em credencial errada: sem a conversão, senha errada passaria como
     sucesso e a tela navegaria para uma rota que a guarda devolveria para cá. */
  it('does not open the system when the sign-in was refused', async () => {
    signIn.mockResolvedValue({ error: { status: 400 } } as never);
    const model = mountModel();

    await submit(model, 'ana@exemplo.com.br', 'senha-errada');

    await waitFor(() => expect(model.state.error).not.toBeNull());
    expect(goto).not.toHaveBeenCalled();
  });

  /* Serviço fora do ar não é senha errada: mandar conferir a senha faz a pessoa digitar de
     novo três vezes antes de desconfiar da internet. */
  it('separates the service being down from a wrong password', async () => {
    signIn.mockResolvedValue({ error: { status: 500 } } as never);
    const model = mountModel();

    await submit(model, 'ana@exemplo.com.br', 'senha-de-teste');

    await waitFor(() => expect(model.state.error).toContain('Confira sua internet'));
  });

  /* Formulário vazio não chega no serviço de login: o mesmo schema do contrato recusa antes. */
  it('does not try to sign in with an empty form (edge case)', async () => {
    const model = mountModel();

    model.actions.onSubmit();

    await waitFor(() => expect(model.data.fields.email.error).not.toBeNull());
    expect(signIn).not.toHaveBeenCalled();
  });

  /**
   * O `onBlur` deste hook marca "tocado" à mão, e é isso que este teste tranca.
   *
   * O motivo está no próprio hook: `validateField` só marca "tocado" quando existe um
   * `form.Field` montado, e aqui não existe — o hook mexe no formulário direto. Sem a
   * marcação, o erro nunca apareceria ao SAIR de um campo que a pessoa deixou em branco, e o
   * formulário só reclamaria no envio.
   */
  it('shows the error of a field left blank as soon as the person leaves it', async () => {
    const model = mountModel();

    expect(model.data.fields.email.error).toBeNull();

    model.actions.onBlur('email');

    await waitFor(() => expect(model.data.fields.email.error).not.toBeNull());
  });

  /* O erro de um campo inválido não fica preso: corrigir o campo tem que bastar. */
  it('clears the error once the e-mail is corrected', async () => {
    const model = mountModel();

    model.actions.onChange('email', 'ana@');
    await waitFor(() => expect(model.data.fields.email.error).not.toBeNull());

    model.actions.onChange('email', 'ana@exemplo.com.br');

    await waitFor(() => expect(model.data.fields.email.error).toBeNull());
  });
});
