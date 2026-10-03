import { render } from '@testing-library/svelte';
import { readable, writable, type Readable } from 'svelte/store';
import { describe, expect, it, vi } from 'vitest';

import Harness from './use-mirror-store-harness.test.svelte';

function mount(store: Readable<unknown>) {
  let mirror!: { readonly current: unknown };
  const view = render(Harness, {
    props: { store, onReady: (ready: { readonly current: unknown }) => (mirror = ready) },
  });

  return { mirror, view };
}

describe('mirrorStore', () => {
  // feliz
  /* `subscribe` chama de volta na hora: o valor já sai preenchido, e a tela nunca pinta um
     quadro com `undefined` antes da primeira emissão. */
  it('already carries the value the store had when it was mirrored', () => {
    const { mirror } = mount(readable('pendente'));

    expect(mirror.current).toBe('pendente');
  });

  it('follows every new value the store emits', () => {
    const store = writable('pendente');
    const { mirror } = mount(store);

    store.set('pronto');

    expect(mirror.current).toBe('pronto');
  });

  /**
   * A RAZÃO DE ESTE ARQUIVO EXISTIR.
   *
   * O `fromStore` do Svelte assina dentro de um efeito, e reassinar uma store do svelte-query
   * cria um observador novo, que dispara outra busca — com resposta de erro, o laço não para
   * nunca e a tela fica carregando para sempre. Aqui a assinatura acontece UMA vez.
   */
  it('subscribes exactly once, no matter how many values arrive', () => {
    const subscribe = vi.fn((run: (value: unknown) => void) => {
      run('primeiro');
      run('segundo');
      run('terceiro');

      return () => {};
    });

    const { mirror } = mount({ subscribe } as unknown as Readable<unknown>);

    expect(subscribe).toHaveBeenCalledTimes(1);
    expect(mirror.current).toBe('terceiro');
  });

  // triste
  /* Sem desfazer a assinatura, cada tela aberta deixaria um observador vivo atrás de si — e
     com o svelte-query isso é uma consulta que continua buscando sozinha. */
  it('undoes the subscription when the screen goes away', () => {
    const unsubscribe = vi.fn();
    const { view } = mount({
      subscribe: (run: (value: unknown) => void) => {
        run('valor');

        return unsubscribe;
      },
    } as unknown as Readable<unknown>);

    expect(unsubscribe).not.toHaveBeenCalled();

    view.unmount();

    expect(unsubscribe).toHaveBeenCalledTimes(1);
  });

  /* Store que ainda não emitiu nada: o espelho nasce vazio em vez de quebrar. */
  it('starts empty when the store has not emitted yet (edge case)', () => {
    const { mirror } = mount({ subscribe: () => () => {} } as unknown as Readable<unknown>);

    expect(mirror.current).toBeUndefined();
  });
});
