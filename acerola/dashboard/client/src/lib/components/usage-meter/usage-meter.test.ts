import { render, screen } from '@testing-library/svelte';
import { describe, expect, it } from 'vitest';

import UsageMeter, { usageTone } from './usage-meter.svelte';

describe('usageTone', () => {
  // feliz
  /* Os cortes são os mesmos da régua de saúde (`computer-health.util`): dois lugares medindo
     a mesma coisa com réguas diferentes é como a barra fica amarela numa máquina que a ficha
     chama de crítica. */
  it('calls a machine with room to breathe calm', () => {
    expect(usageTone(0)).toBe('calm');
    expect(usageTone(74)).toBe('calm');
  });

  it('asks for attention from seventy-five on', () => {
    expect(usageTone(75)).toBe('attention');
    expect(usageTone(89)).toBe('attention');
  });

  it('calls it critical from ninety on', () => {
    expect(usageTone(90)).toBe('critical');
    expect(usageTone(100)).toBe('critical');
  });
});

describe('UsageMeter', () => {
  // feliz
  it('writes the label, the percentage and the reading in words', () => {
    render(UsageMeter, {
      props: { data: { label: 'Em uso', percentage: 62, detail: '12,4 GB de 16 GB' } },
    });

    expect(screen.getByText('Em uso')).toBeInTheDocument();
    expect(screen.getByText('12,4 GB de 16 GB')).toBeInTheDocument();
    expect(screen.getByRole('progressbar', { name: 'Em uso' })).toHaveAttribute(
      'aria-valuenow',
      '62',
    );
  });

  // triste
  /* A medida vem do agente, e agente com defeito manda qualquer coisa. Passando de 100, a
     barra estouraria a borda do cartão e invadiria o que está do lado. */
  it('keeps a measure above one hundred inside the bar (edge case)', () => {
    render(UsageMeter, { props: { data: { label: 'Disco', percentage: 140 } } });

    const bar = screen.getByRole('progressbar', { name: 'Disco' });

    expect(bar).toHaveAttribute('aria-valuenow', '100');
    expect(bar.firstElementChild).toHaveStyle({ width: '100%' });
  });

  it('keeps a negative measure from disappearing to the left (edge case)', () => {
    render(UsageMeter, { props: { data: { label: 'Disco', percentage: -20 } } });

    expect(screen.getByRole('progressbar', { name: 'Disco' })).toHaveAttribute(
      'aria-valuenow',
      '0',
    );
  });

  /* Sem a leitura em palavras a linha de baixo não existe — e não vira uma linha vazia
     empurrando o que vem depois. */
  it('writes no detail line when there is no reading in words', () => {
    const { container } = render(UsageMeter, {
      props: { data: { label: 'Em uso', percentage: 10 } },
    });

    expect(container.querySelector('p')).toBeNull();
  });
});
