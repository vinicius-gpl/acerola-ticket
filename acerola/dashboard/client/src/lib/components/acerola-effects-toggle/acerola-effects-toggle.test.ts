import { render, screen } from '@testing-library/svelte';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it } from 'vitest';

import { useEffectsModel } from '$lib/hooks/use-effects/use-effects.svelte';

import EffectsToggle from './acerola-effects-toggle.svelte';

/* A preferência mora num `$state` de escopo de módulo, compartilhado entre os testes: cada um
   começa com ela no modo completo. */
beforeEach(() => {
  const effects = useEffectsModel();
  if (effects.level === 'lite') effects.actions.onToggle();
});

describe('AcerolaEffectsToggle', () => {
  // feliz
  it('names the mode in use and where the click leads', () => {
    render(EffectsToggle);

    expect(screen.getByRole('button')).toHaveAccessibleName(
      'Efeitos visuais completos — mudar para o modo leve',
    );
  });

  it('switches to the light mode and back, telling the page each time', async () => {
    render(EffectsToggle);

    await userEvent.click(screen.getByRole('button'));
    expect(screen.getByRole('button')).toHaveAccessibleName(
      'Efeitos visuais leves — mudar para o modo completo',
    );
    expect(document.documentElement.getAttribute('data-effects')).toBe('lite');

    await userEvent.click(screen.getByRole('button'));
    expect(document.documentElement.getAttribute('data-effects')).toBe('full');
  });

  // triste
  it('survives repeated fast clicks without getting stuck', async () => {
    render(EffectsToggle);
    const button = screen.getByRole('button');

    await userEvent.click(button);
    await userEvent.click(button);
    await userEvent.click(button);

    expect(button).toHaveAccessibleName('Efeitos visuais leves — mudar para o modo completo');
  });
});
