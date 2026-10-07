import { render, screen } from '@testing-library/svelte';
import { describe, expect, it } from 'vitest';

import BrandMark from './acerola-brand-mark.svelte';

describe('AcerolaBrandMark', () => {
  // feliz
  it('writes the name of the system', () => {
    render(BrandMark);

    expect(screen.getByText('acerola-ticket')).toBeInTheDocument();
  });

  /* `text-base` na paleta deste projeto é COR, e não tamanho — trocar o tamanho do meio por
     ele deixaria a marca quase branca sobre a barra lateral clara (ver o comentário do
     componente). O teste existe para essa troca não voltar sem ninguém ver. */
  it('never sizes the middle size with the token that is a colour', () => {
    render(BrandMark, { props: { ui: { size: 'md' } } });

    const mark = screen.getByText('acerola-ticket');

    expect(mark.className).toContain('text-[1rem]');
    expect(mark.className).not.toContain('text-base');
  });

  it('takes the size the screen asked for', () => {
    render(BrandMark, { props: { ui: { size: 'lg' } } });

    expect(screen.getByText('acerola-ticket').className).toContain('text-xl');
  });

  // triste
  /* Sem `ui` nenhum o componente ainda tem que desenhar: ele é usado assim na barra lateral. */
  it('falls back to the middle size when nothing was asked (edge case)', () => {
    render(BrandMark, { props: {} });

    expect(screen.getByText('acerola-ticket').className).toContain('text-[1rem]');
  });
});
