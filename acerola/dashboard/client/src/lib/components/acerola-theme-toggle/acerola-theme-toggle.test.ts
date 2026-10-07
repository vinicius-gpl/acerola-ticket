import { render } from '@testing-library/svelte';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it } from 'vitest';

import ThemeToggle from './acerola-theme-toggle.svelte';

beforeEach(() => {
  window.localStorage.clear();
});

describe('AcerolaThemeToggle', () => {
  // feliz
  it('shows a button with an accessible name for the theme it can switch to', () => {
    const { getByRole } = render(ThemeToggle);

    expect(getByRole('button')).toHaveAccessibleName(/tema/i);
  });

  it('flips the theme on the page when clicked', async () => {
    const { getByRole } = render(ThemeToggle);
    const button = getByRole('button');

    const before = document.documentElement.getAttribute('data-theme');
    await userEvent.click(button);

    expect(document.documentElement.getAttribute('data-theme')).not.toBe(before);
  });

  // triste
  it('survives repeated fast clicks without getting stuck', async () => {
    const { getByRole } = render(ThemeToggle);
    const button = getByRole('button');

    const start = document.documentElement.getAttribute('data-theme');
    await userEvent.click(button);
    await userEvent.click(button);
    await userEvent.click(button);

    expect(document.documentElement.getAttribute('data-theme')).not.toBe(start);
  });
});
