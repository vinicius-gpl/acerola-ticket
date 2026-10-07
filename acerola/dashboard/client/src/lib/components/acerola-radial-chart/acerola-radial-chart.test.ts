import { render, screen } from '@testing-library/svelte';
import { describe, expect, it } from 'vitest';

import RadialChart, { fractionOf } from './acerola-radial-chart.svelte';

describe('fractionOf', () => {
  // feliz
  it('answers how much of the ceiling was filled', () => {
    expect(fractionOf(25, 100)).toBe(0.25);
  });

  // triste
  /* Teto zero viraria divisão por zero, e o arco sairia `NaN` — um desenho que some da tela
     sem dizer por quê. */
  it('answers zero when there is no ceiling (edge case)', () => {
    expect(fractionOf(4, 0)).toBe(0);
  });

  /* Acima do teto o arco daria mais de uma volta, e o medidor mentiria dizendo "quase lá". */
  it('never goes past a full turn (edge case)', () => {
    expect(fractionOf(140, 100)).toBe(1);
  });

  it('never goes below empty (edge case)', () => {
    expect(fractionOf(-3, 100)).toBe(0);
  });
});

describe('AcerolaRadialChart', () => {
  // feliz
  /* O número vem sempre escrito: o arco é o reforço, nunca a única informação. */
  it('writes the number and what is being measured', () => {
    render(RadialChart, {
      props: { data: { value: 84, max: 96, label: 'Máquinas de pé', hint: 'de 96 cadastradas' } },
    });

    expect(screen.getByText('84')).toBeInTheDocument();
    expect(screen.getByText('Máquinas de pé')).toBeInTheDocument();
    expect(screen.getByText('de 96 cadastradas')).toBeInTheDocument();
    expect(screen.getByRole('img', { name: 'Máquinas de pé: 84 de 96' })).toBeInTheDocument();
  });

  it('shows the number the screen wrote when there is one', () => {
    render(RadialChart, { props: { data: { value: 72, label: 'Resolvidos', display: '72%' } } });

    expect(screen.getByText('72%')).toBeInTheDocument();
  });

  // triste
  it('shows neither the arc nor the number while loading (edge case)', () => {
    render(RadialChart, {
      props: { data: { value: 0, label: 'Máquinas de pé' }, state: { isLoading: true } },
    });

    expect(screen.queryByRole('img')).not.toBeInTheDocument();
    expect(screen.queryByText('Máquinas de pé')).not.toBeInTheDocument();
  });
});
