import { render } from '@testing-library/svelte';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it } from 'vitest';

import TableViewToggle from './table-view-toggle.svelte';

beforeEach(() => {
  window.localStorage.clear();
});

describe('TableViewToggle', () => {
  // feliz
  it('shows a button with an accessible name for what it will do next', () => {
    const { getByRole } = render(TableViewToggle);

    expect(getByRole('button')).toHaveAccessibleName(/ver sempre em cards/i);
  });

  it('switches to forcing cards when clicked, and back when clicked again', async () => {
    const { getByRole } = render(TableViewToggle);

    await userEvent.click(getByRole('button'));
    expect(getByRole('button')).toHaveAccessibleName(/ver em tabela/i);

    await userEvent.click(getByRole('button'));
    expect(getByRole('button')).toHaveAccessibleName(/ver sempre em cards/i);
  });

  // triste
  it('survives repeated fast clicks without getting stuck', async () => {
    const { getByRole } = render(TableViewToggle);
    const button = getByRole('button');

    await userEvent.click(button);
    await userEvent.click(button);
    await userEvent.click(button);

    expect(button).toHaveAccessibleName(/ver em tabela/i);
  });
});
