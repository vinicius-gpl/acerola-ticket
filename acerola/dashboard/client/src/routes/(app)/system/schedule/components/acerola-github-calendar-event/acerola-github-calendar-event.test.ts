import { render, screen } from '@testing-library/svelte';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import type { SoftwareTimelineEvent } from '@template/shared/schemas/software-timeline.schema';
import Harness from './acerola-github-calendar-event-harness.test.svelte';
const event: SoftwareTimelineEvent = {
  id: 1,
  projectId: 1,
  projectName: 'Acerola Ticket',
  type: 'pr',
  externalId: '#42',
  title: 'Melhora o calendário',
  description: null,
  url: 'https://github.com/example/project/pull/42',
  author: 'ana',
  status: 'merged',
  eventDate: '2026-10-06T12:00:00Z',
  createdAt: '2026-10-06T12:00:00Z',
};
describe('AcerolaGithubCalendarEvent', () => {
  // feliz
  it('opens the original GitHub event in a separate tab', () => {
    render(Harness, { event });
    const link = screen.getByRole('link', { name: 'Pull Request #42: Melhora o calendário' });
    expect(link).toHaveAttribute('href', event.url);
    expect(link).toHaveAttribute('target', '_blank');
    expect(link).toHaveAttribute('rel', 'noreferrer');
  });
  // feliz
  it('reveals the event status and author on keyboard focus', async () => {
    render(Harness, { event, compact: true });
    await userEvent.tab();
    await screen.findByText('Pull Request #42 · Mergeado');
    const link = screen.getByRole('link');
    expect(link).toHaveFocus();
    const tooltip = document.getElementById(link.getAttribute('aria-describedby') ?? '');
    expect(tooltip).toHaveTextContent('Mergeado');
    expect(tooltip).toHaveTextContent('ana');
  });
  // triste
  it('does not invent a link when the event has no GitHub URL', () => {
    render(Harness, { event: { ...event, url: null } });
    expect(screen.queryByRole('link')).not.toBeInTheDocument();
    expect(screen.getByText(/PR #42 · Melhora o calendário/)).toBeInTheDocument();
  });
});
