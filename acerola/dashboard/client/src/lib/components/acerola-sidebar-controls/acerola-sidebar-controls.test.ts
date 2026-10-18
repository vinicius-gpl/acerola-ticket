import { fireEvent, render, screen } from '@testing-library/svelte';
import userEvent from '@testing-library/user-event';
import { createRawSnippet } from 'svelte';
import { expect, it } from 'vitest';

import AppShell from '$lib/components/acerola-app-shell/acerola-app-shell.svelte';

// O controle depende do contexto real da sidebar; a casca também expõe o resultado do gesto.
function renderShell(props: { initialSidebarOpen: boolean }) {
  return render(AppShell, {
    props: {
      ...props,
      children: createRawSnippet(() => ({ render: () => '<p>Conteúdo da tela</p>' })),
    },
  });
}

// feliz: o controle da borda aceita o mesmo clique único do botão do cabeçalho.
it('collapses and expands the sidebar with a single rail click', async () => {
  renderShell({ initialSidebarOpen: true });
  await userEvent.click(screen.getByRole('button', { name: 'Recolher menu' }));
  expect(document.querySelector('[data-slot="sidebar"]')).toHaveAttribute('data-state', 'collapsed');
  await userEvent.click(screen.getByRole('button', { name: 'Expandir menu' }));
  expect(document.querySelector('[data-slot="sidebar"]')).toHaveAttribute('data-state', 'expanded');
});

// feliz: arrastar precisa definir o estado, sem o clique seguinte inverter o resultado.
it('collapses by dragging the rail and ignores the following click', async () => {
  renderShell({ initialSidebarOpen: true });
  const rail = screen.getByRole('button', { name: 'Recolher menu' });
  await fireEvent(rail, new MouseEvent('pointerdown', { bubbles: true, clientX: 200 }));
  await fireEvent(rail, new MouseEvent('pointermove', { bubbles: true, clientX: 100 }));
  await fireEvent(rail, new MouseEvent('pointerup', { bubbles: true, clientX: 100 }));
  await fireEvent.click(rail);
  expect(document.querySelector('[data-slot="sidebar"]')).toHaveAttribute('data-state', 'collapsed');
});

// triste: rolar na vertical não deve recolher o menu.
it('ignores vertical movement on the rail', async () => {
  renderShell({ initialSidebarOpen: true });
  const rail = screen.getByRole('button', { name: 'Recolher menu' });
  await fireEvent(rail, new MouseEvent('pointerdown', { bubbles: true, clientX: 200, clientY: 0 }));
  await fireEvent(rail, new MouseEvent('pointermove', { bubbles: true, clientX: 140, clientY: 120 }));
  await fireEvent(rail, new MouseEvent('pointercancel', { bubbles: true }));
  expect(document.querySelector('[data-slot="sidebar"]')).toHaveAttribute('data-state', 'expanded');
});
