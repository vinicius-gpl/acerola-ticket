import { render, waitFor } from '@testing-library/svelte';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { SoftwareTimelineEvent } from '@template/shared/schemas/software-timeline.schema';
import type { SoftwareScheduleModel } from './use-software-schedule.svelte';
import Harness from './use-software-schedule-harness.test.svelte';

vi.mock('$lib/api/software-schedule.api', () => ({
  softwareScheduleApi: { list: vi.fn(), remove: vi.fn() },
}));
vi.mock('$lib/api/software-timeline.api', () => ({ softwareTimelineApi: { list: vi.fn() } }));
vi.mock('$lib/api/software-projects.api', () => ({ softwareProjectsApi: { list: vi.fn() } }));
const { softwareScheduleApi } = await import('$lib/api/software-schedule.api');
const { softwareTimelineApi } = await import('$lib/api/software-timeline.api');
const { softwareProjectsApi } = await import('$lib/api/software-projects.api');

function activity(id: number): SoftwareTimelineEvent {
  const date = new Date();
  date.setHours(8, id * 5, 0, 0);
  return {
    id,
    projectId: 1,
    projectName: 'Acerola',
    type: 'pr',
    externalId: `#${id}`,
    title: `PR ${id}`,
    description: null,
    url: null,
    author: 'ana',
    status: 'merged',
    eventDate: date.toISOString(),
    createdAt: date.toISOString(),
  };
}

async function mount(): Promise<SoftwareScheduleModel> {
  let model!: SoftwareScheduleModel;
  render(Harness, {
    onReady: (value) => {
      model = value;
    },
  });
  await waitFor(() => expect(model.state.isLoading).toBe(false));
  return model;
}

describe('daily GitHub PRs', () => {
  it('filters appointments by project while author and type only affect GitHub activity', async () => {
    const date = new Date().toLocaleDateString('sv-SE');
    const appointment = {
      id: 1,
      title: 'Deploy',
      date,
      startTime: '10:00',
      endTime: '11:00',
      category: 'deploy' as const,
      color: 'green' as const,
      note: null,
      projectId: 1,
      projectName: 'Acerola',
      createdAt: new Date().toISOString(),
    };
    vi.mocked(softwareScheduleApi.list).mockResolvedValue([
      appointment,
      { ...appointment, id: 2, projectId: 2, projectName: 'Outro' },
    ]);
    const model = await mount();
    model.actions.onProjectFilterChange('1');
    model.actions.onAuthorFilterChange('ana');
    model.actions.onTypeFilterChange('issue');
    expect(model.data.events.map((event) => event.id)).toEqual([1]);
    expect(
      model.data.days.find((day) => day.dateString === date)?.events.map((event) => event.id),
    ).toEqual([1]);
    model.actions.onClearFilters();
    expect(model.data.events).toHaveLength(2);
  });

  it('filters by author without removing available choices', async () => {
    const model = await mount();
    model.actions.onAuthorFilterChange('autor-sem-atividade');
    expect(model.data.githubEvents).toHaveLength(0);
    expect(model.data.filters.authorOptions).toContainEqual({ value: 'ana', label: 'ana' });
    expect(model.data.filters.authorOptions).toContainEqual({
      value: 'autor-sem-atividade',
      label: 'autor-sem-atividade',
    });
  });
  it('combines author, type and project filters across counts, days and the daily dialog', async () => {
    const model = await mount();
    const today = new Date().toLocaleDateString('sv-SE');
    model.actions.onAuthorFilterChange('ana');
    model.actions.onTypeFilterChange('issue');
    model.actions.onProjectFilterChange('1');
    expect(
      model.data.githubEvents.every(
        (event) => event.type === 'issue' && event.author === 'ana' && event.projectId === 1,
      ),
    ).toBe(true);
    expect(model.data.githubEvents).toHaveLength(1);
    expect(model.data.mergedPullRequests).toBe(0);
    model.actions.onOpenGithubDay(today, 'all');
    expect(model.data.githubDay?.items.map((event) => event.id)).toEqual([13]);
    model.actions.onClearFilters();
    expect(model.data.githubDay?.total).toBe(13);
    expect(model.data.filters.isActive).toBe(false);
  });

  it('keeps filter options available when there are no matching activities', async () => {
    const model = await mount();
    model.actions.onProjectFilterChange('999');
    expect(model.data.githubEvents).toHaveLength(0);
    expect(model.data.days.every((day) => !day.githubEvents?.length)).toBe(true);
    expect(model.data.filters.authorOptions).toContainEqual({ value: 'ana', label: 'ana' });
    expect(model.data.filters.projectOptions).toContainEqual({ value: '1', label: 'Acerola' });
    model.actions.onClearFilters();
    expect(model.data.githubEvents.length).toBeGreaterThan(0);
  });
  it('opens issues separately and includes both types for a mixed hourly group', async () => {
    const model = await mount();
    const today = new Date().toLocaleDateString('sv-SE');
    model.actions.onOpenGithubDay(today, 'issue');
    expect(model.data.githubDay?.type).toBe('issue');
    expect(model.data.githubDay?.items.map((event) => event.id)).toEqual([13]);
    model.actions.onOpenGithubDay(today, 'all');
    expect(model.data.githubDay?.total).toBe(13);
    model.actions.onGithubDayPageChange(3);
    expect(model.data.githubDay?.items.map((event) => event.id)).toEqual([11, 12, 13]);
    model.actions.onOpenGithubDay(today);
    expect(model.data.githubDay?.type).toBe('pr');
    expect(model.data.githubDay?.total).toBe(12);
    expect(model.data.githubDay?.page).toBe(1);
  });
  beforeEach(() => {
    vi.mocked(softwareScheduleApi.list).mockResolvedValue([]);
    vi.mocked(softwareProjectsApi.list).mockResolvedValue({
      items: [],
      total: 0,
      page: 1,
      pageSize: 100,
    });
    const prs = Array.from({ length: 12 }, (_, index) => activity(index + 1));
    const otherDay = activity(14);
    const previousDate = new Date(otherDay.eventDate);
    previousDate.setDate(previousDate.getDate() - 1);
    otherDay.eventDate = previousDate.toISOString();
    const items = [...prs.reverse(), { ...activity(13), type: 'issue' as const }, otherDay];
    vi.mocked(softwareTimelineApi.list).mockResolvedValue({
      items,
      total: items.length,
      page: 1,
      pageSize: 200,
    });
  });

  it('keeps every PR of the local day in timestamp order across pages', async () => {
    const model = await mount();
    model.actions.onViewModeChange('day');
    const today = model.data.days[0]!.dateString;
    model.actions.onOpenGithubDay(today);
    await waitFor(() => expect(model.data.githubDay?.total).toBe(12));
    expect(model.data.githubDay?.items.map((event) => event.id)).toEqual([1, 2, 3, 4, 5]);
    model.actions.onGithubDayPageChange(2);
    expect(model.data.githubDay?.items.map((event) => event.id)).toEqual([6, 7, 8, 9, 10]);
    model.actions.onGithubDayPageChange(3);
    expect(model.data.githubDay?.items.map((event) => event.id)).toEqual([11, 12]);
  });

  it('starts at page one when reopening a day and clears the selection when closed', async () => {
    const model = await mount();
    const today = new Date().toLocaleDateString('sv-SE');
    model.actions.onOpenGithubDay(today);
    model.actions.onGithubDayPageChange(3);
    model.actions.onCloseGithubDay();
    expect(model.data.githubDay).toBeNull();
    model.actions.onOpenGithubDay(today);
    expect(model.data.githubDay?.page).toBe(1);
    expect(model.data.githubDay?.items[0]?.id).toBe(1);
  });
});
