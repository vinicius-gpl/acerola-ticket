import { render, screen } from '@testing-library/svelte';
import { describe, expect, it } from 'vitest';

import TimelineHarness from './acerola-timeline-harness.test.svelte';

describe('AcerolaTimeline', () => {
  // feliz
  /* A casca existe para as etapas aparecerem na ORDEM em que acontecem: é isso que troca um
     monte de campo solto por uma narrativa. */
  it('keeps the steps in the order they were given', () => {
    render(TimelineHarness);

    const steps = screen.getAllByTestId('etapa');

    expect(steps).toHaveLength(2);
    expect(steps[0]).toHaveTextContent('Primeira etapa');
    expect(steps[1]).toHaveTextContent('Segunda etapa');
  });

  /* Empilhadas, e nunca lado a lado: uma linha do tempo deitada não se lê. */
  it('stacks the steps in a column', () => {
    const { container } = render(TimelineHarness);

    expect(container.firstElementChild?.className).toContain('flex-col');
  });

  // triste
  /* Sem classe extra a casca continua empilhando: quem chama não é obrigado a passar nada. */
  it('needs no extra class to work (edge case)', () => {
    const { container } = render(TimelineHarness, { props: {} });

    expect(container.firstElementChild?.className).toContain('flex');
    expect(screen.getAllByTestId('etapa')).toHaveLength(2);
  });

  it('takes the extra class the screen asked for', () => {
    const { container } = render(TimelineHarness, { props: { className: 'gap-8' } });

    expect(container.firstElementChild?.className).toContain('gap-8');
  });
});
