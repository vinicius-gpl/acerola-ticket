import { render, screen } from '@testing-library/svelte';
import { afterEach, describe, expect, it, vi } from 'vitest';

import PersonAvatar from './person-avatar.svelte';

/**
 * O `Avatar` do Radix / Bits-UI decide se a imagem carregou lendo `image.complete` /
 * `image.naturalWidth` logo depois de atribuir `image.src` — num `new Image()` próprio, fora
 * da árvore do DOM. Sem este stub, o jsdom nunca marca a imagem como completa e a foto fica
 * presa nas iniciais para sempre, mesmo com `avatarUrl` preenchido.
 */
class InstantLoadImage {
  complete = false;
  naturalWidth = 0;

  addEventListener(type: string, listener: any) {
    if (type === 'load') listener();
  }
  removeEventListener() {}

  set src(_value: string) {
    this.complete = true;
    this.naturalWidth = 1;
  }
}

describe('PersonAvatar', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  // feliz
  it('mostra as iniciais quando não há foto', () => {
    render(PersonAvatar, { props: { name: 'Rafael Camargo' } });

    expect(screen.getByText('RC')).toBeInTheDocument();
  });

  // feliz
  it('usa a foto quando avatarUrl vem preenchido', async () => {
    vi.stubGlobal('Image', InstantLoadImage);

    const { container } = render(PersonAvatar, {
      props: { name: 'Camila', avatarUrl: 'https://example.com/camila.jpg' },
    });

    const image = await vi.waitUntil(() => container.querySelector('[data-slot="avatar-image"]'));
    expect(image).toHaveAttribute('src', 'https://example.com/camila.jpg');
  });

  /* Duas iniciais bastam; nome com vários sobrenomes não pode virar mais que isso. */
  it('corta as iniciais em duas letras mesmo com nome composto', () => {
    render(PersonAvatar, {
      props: { name: 'Maria Fernanda Albuquerque Nascimento' },
    });

    expect(screen.getByText('MF')).toBeInTheDocument();
  });

  // triste
  it('nome de uma palavra só gera uma iniciais só', () => {
    render(PersonAvatar, { props: { name: 'Bia' } });

    expect(screen.getByText('B')).toBeInTheDocument();
  });
});
