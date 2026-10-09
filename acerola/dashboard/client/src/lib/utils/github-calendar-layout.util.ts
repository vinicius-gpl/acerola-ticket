import type { SoftwareTimelineEvent } from '@template/shared/schemas/software-timeline.schema';
import type { SoftwareScheduleEvent } from '@template/shared/schemas/software-schedule.schema';

export const GITHUB_HOUR_CARD_HEIGHT = 52;

export function overlapsGithubCard(event: SoftwareScheduleEvent, top: number): boolean {
  const [startHour, startMinute] = event.startTime.split(':').map(Number);
  const [endHour, endMinute] = event.endTime.split(':').map(Number);
  const start = (((startHour ?? 0) * 60 + (startMinute ?? 0) - 480) * 56) / 60;
  const end = (((endHour ?? 0) * 60 + (endMinute ?? 0) - 480) * 56) / 60;
  return start < top + GITHUB_HOUR_CARD_HEIGHT && end > top;
}

export function isWithinScheduleHours(event: SoftwareTimelineEvent): boolean {
  const hour = new Date(event.eventDate).getHours();
  return hour >= 8 && hour < 18;
}

/** Nearby GitHub events share a card at the first event's time, avoiding overlapping titles. */
export function githubHourGroups(events: SoftwareTimelineEvent[]) {
  const groups: { top: number; events: SoftwareTimelineEvent[] }[] = [];
  const prs = events
    .filter(isWithinScheduleHours)
    .sort((a, b) => Date.parse(a.eventDate) - Date.parse(b.eventDate) || a.id - b.id);
  for (const event of prs) {
    const date = new Date(event.eventDate);
    const top = Math.round((((date.getHours() - 8) * 60 + date.getMinutes()) * 56) / 60);
    const previous = groups.at(-1);
    if (previous && top - previous.top < GITHUB_HOUR_CARD_HEIGHT + 4) previous.events.push(event);
    else groups.push({ top, events: [event] });
  }
  return groups;
}
