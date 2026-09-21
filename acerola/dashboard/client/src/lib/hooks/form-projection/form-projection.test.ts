import { describe, expect, it } from 'vitest';

import { firstErrorMessage, toFieldState } from './form-projection.svelte';

describe('toFieldState', () => {
  it('projects the value the field holds', () => {
    expect(toFieldState('ana@empresa.com.br', { isTouched: true }, false).value).toBe(
      'ana@empresa.com.br',
    );
  });

  /* O TanStack Form devolve `undefined` para um campo que ainda não montou, e `undefined`
     num `<input value>` faz o React trocar campo controlado por não controlado — o valor
     digitado some na primeira letra. */
  it('never projects a value that is not a string', () => {
    expect(toFieldState(undefined, undefined, false).value).toBe('');
    expect(toFieldState(42, undefined, false).value).toBe('');
  });

  it('shows the error once the person has left the field', () => {
    const meta = { isTouched: true, errors: ['Informe a senha'] };

    expect(toFieldState('', meta, false).error).toBe('Informe a senha');
  });

  /* Acusar "e-mail inválido" na primeira letra digitada faz a pessoa parar e apagar sem
     nunca ter errado. */
  it('holds the error back while the person is still typing', () => {
    const meta = { isTouched: false, errors: ['Esse e-mail não parece válido'] };

    expect(toFieldState('le', meta, false).error).toBeNull();
  });

  /* Depois de tentar enviar, o erro precisa aparecer inclusive no campo que a pessoa nunca
     tocou — senão o botão não faz nada e nada na tela explica por quê. */
  it('shows the error on an untouched field after a submit attempt', () => {
    const meta = { isTouched: false, errors: ['Informe o nome'] };

    expect(toFieldState('', meta, true).error).toBe('Informe o nome');
  });
});

describe('firstErrorMessage', () => {
  it('reads a plain string error', () => {
    expect(firstErrorMessage(['Informe a senha'])).toBe('Informe a senha');
  });

  /* A outra forma que o validador devolve. Ler só a de cima faria a mensagem sumir em
     metade dos casos, e o campo ficaria vermelho sem dizer o porquê. */
  it('reads the message out of a Zod issue', () => {
    expect(firstErrorMessage([{ path: ['email'], message: 'Esse e-mail não parece válido' }])).toBe(
      'Esse e-mail não parece válido',
    );
  });

  it('takes the first of several', () => {
    expect(firstErrorMessage(['primeiro', 'segundo'])).toBe('primeiro');
  });

  it('returns null when there is nothing to show', () => {
    expect(firstErrorMessage(undefined)).toBeNull();
    expect(firstErrorMessage([])).toBeNull();
  });

  /* O validador põe `undefined` na lista quando um campo passou: sem isto, um campo válido
     ao lado de um inválido acusaria erro vazio. */
  it('skips entries that carry no message', () => {
    expect(firstErrorMessage([undefined, null, {}, '', 'Informe a senha'])).toBe('Informe a senha');
  });
});
