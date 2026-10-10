import { render, screen } from '@testing-library/svelte';
import { describe, expect, it } from 'vitest';

import BrandMark from './acerola-brand-mark.svelte';

describe('AcerolaBrandMark', () => {
  // feliz
  it('draws the logo of the system', () => {
    render(BrandMark);

    expect(screen.getByRole('img', { name: 'acerola-ticket' })).toHaveAttribute(
      'src',
      '/favicon.svg',
    );
  });

  /* A marca é só a logo: o nome fica no texto alternativo, nunca escrito na tela. */
  it('never writes the name next to the logo', () => {
    render(BrandMark);

    expect(screen.queryByText('acerola-ticket')).not.toBeInTheDocument();
  });

  it('takes the size the screen asked for', () => {
    render(BrandMark, { props: { ui: { size: 'lg' } } });

    expect(screen.getByRole('img', { name: 'acerola-ticket' }).className).toContain('size-20');
  });

  // triste
  /* Sem `ui` nenhum o componente ainda tem que desenhar: ele é usado assim nas stories. */
  it('falls back to the middle size when nothing was asked (edge case)', () => {
    render(BrandMark, { props: {} });

    expect(screen.getByRole('img', { name: 'acerola-ticket' }).className).toContain('size-12');
  });
});
