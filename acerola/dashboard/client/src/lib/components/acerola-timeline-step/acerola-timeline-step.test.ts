import { render, screen } from '@testing-library/svelte';
import { describe, expect, it } from 'vitest';

import TimelineStepHarness from './acerola-timeline-step-harness.test.svelte';

describe('AcerolaTimelineStep', () => {
  // feliz
  it('shows the title, the explanation and what the step asks for', () => {
    render(TimelineStepHarness, {
      props: { title: 'Quem está pedindo', description: 'Para sabermos com quem falar' },
    });

    expect(screen.getByRole('heading', { name: 'Quem está pedindo' })).toBeInTheDocument();
    expect(screen.getByText('Para sabermos com quem falar')).toBeInTheDocument();
    expect(screen.getByTestId('conteudo')).toBeInTheDocument();
  });

  /* A linha é o "para onde ir depois". Na última etapa ela não existe — e é esse o efeito
     certo: sem ela, a linha do tempo termina em vez de parecer cortada. */
  it('draws the line down to the next step', () => {
    const { container } = render(TimelineStepHarness, { props: { title: 'Primeira' } });

    expect(container.querySelector('[aria-hidden="true"].w-px')).not.toBeNull();
  });

  it('draws no line after the last step', () => {
    const { container } = render(TimelineStepHarness, {
      props: { title: 'Última', isLast: true },
    });

    expect(container.querySelector('[aria-hidden="true"].w-px')).toBeNull();
  });

  it('takes the tone the screen chose for the icon', () => {
    const { container } = render(TimelineStepHarness, {
      props: { title: 'Pronto', tone: 'success' },
    });

    expect(container.innerHTML).toContain('emerald');
  });

  // triste
  /* Sem explicação a linha de baixo não existe — e não vira um parágrafo vazio empurrando o
     conteúdo da etapa para baixo. */
  it('writes no explanation line when there is none', () => {
    const { container } = render(TimelineStepHarness, { props: { title: 'Quem está pedindo' } });

    expect(container.querySelector('p')).toBeNull();
  });

  /* Sem `ui` nenhum a etapa ainda desenha: é assim que ela é usada no meio de um formulário. */
  it('falls back to the neutral tone and keeps the line (edge case)', () => {
    const { container } = render(TimelineStepHarness, { props: { title: 'Primeira' } });

    expect(container.innerHTML).not.toContain('emerald');
    expect(container.querySelector('[aria-hidden="true"].w-px')).not.toBeNull();
  });
});
