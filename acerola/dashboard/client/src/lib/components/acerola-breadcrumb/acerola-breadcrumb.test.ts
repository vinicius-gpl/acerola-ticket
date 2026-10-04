import { render, screen } from '@testing-library/svelte';
import { describe, expect, it } from 'vitest';

import AcerolaBreadcrumb from './acerola-breadcrumb.svelte';

const items = [
  { label: 'Computadores', href: '/computers' },
  { label: 'Estação 12', href: '/computers/12' },
  { label: 'Histórico', href: '/computers/12/history' },
];

describe('AcerolaBreadcrumb', () => {
  // feliz
  it('links every step before the current page', () => {
    render(AcerolaBreadcrumb, { props: { data: { items } } });

    expect(screen.getByRole('navigation', { name: 'Você está em' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Computadores' })).toHaveAttribute(
      'href',
      '/computers',
    );
    expect(screen.getByRole('link', { name: 'Estação 12' })).toHaveAttribute(
      'href',
      '/computers/12',
    );
  });

  /* A página atual não é link, mesmo que venha com endereço: clicar não levaria a lugar nenhum. */
  it('shows the last step as the current page, never as a link', () => {
    render(AcerolaBreadcrumb, { props: { data: { items } } });

    const current = screen.getByText('Histórico');

    expect(current.tagName).not.toBe('A');
    expect(current).not.toHaveAttribute('href');
    expect(current).toHaveAttribute('aria-current', 'page');
  });

  // triste
  it('writes a middle step without address as plain text', () => {
    render(AcerolaBreadcrumb, {
      props: { data: { items: [{ label: 'Peças', href: '/parts' }, { label: 'Memória' }, { label: 'Fim' }] } },
    });

    expect(screen.getByText('Memória')).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'Memória' })).toBeNull();
  });

  it('draws nothing when there are no steps', () => {
    render(AcerolaBreadcrumb, { props: { data: { items: [] } } });

    expect(screen.queryByRole('navigation')).toBeNull();
  });
});
