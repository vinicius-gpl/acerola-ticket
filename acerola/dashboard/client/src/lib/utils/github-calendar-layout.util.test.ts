import { describe, expect, it } from 'vitest';
import type { SoftwareTimelineEvent } from '@template/shared/schemas/software-timeline.schema';
import { githubHourGroups, overlapsGithubCard } from './github-calendar-layout.util';

function pr(id: number, hour: number, minute: number): SoftwareTimelineEvent {
  const date = new Date(2026, 9, 9, hour, minute);
  return {
    id,
    projectId: 1,
    type: 'pr',
    externalId: `#${id}`,
    title: `PR ${id}`,
    description: null,
    url: null,
    author: null,
    status: 'merged',
    eventDate: date.toISOString(),
    createdAt: date.toISOString(),
  };
}

describe('GitHub hourly calendar placement', () => {
  it('only shares a column when an appointment overlaps the PR card', () => {
    const appointment = { startTime: '14:00', endTime: '15:00' } as Parameters<
      typeof overlapsGithubCard
    >[0];
    expect(overlapsGithubCard(appointment, 56)).toBe(false);
    expect(overlapsGithubCard(appointment, 350)).toBe(true);
    expect(overlapsGithubCard(appointment, 420)).toBe(false);
  });
  it('positions PRs at their precise local time, including the final minute', () => {
    expect(
      githubHourGroups([pr(3, 17, 59), pr(2, 13, 15), pr(1, 8, 0)]).map((group) => group.top),
    ).toEqual([0, 294, 559]);
  });
  it('groups nearby PRs without losing their original timestamps', () => {
    const first = pr(1, 13, 15);
    const second = pr(2, 13, 17);
    const groups = githubHourGroups([second, first, pr(3, 14, 30)]);
    expect(groups).toHaveLength(2);
    expect(groups[0]?.events).toEqual([first, second]);
    expect(groups[1]?.top).toBe(364);
  });
  it('keeps PRs outside the visible hours out of the time grid', () => {
    expect(githubHourGroups([pr(1, 7, 59), pr(2, 18, 0)])).toEqual([]);
  });
  it('positions issues and groups mixed activity without losing either item', () => {
    const issue = { ...pr(1, 9, 0), type: 'issue' as const };
    const pullRequest = pr(2, 9, 1);
    expect(githubHourGroups([pullRequest, issue])).toEqual([
      { top: 56, events: [issue, pullRequest] },
    ]);
  });
});
