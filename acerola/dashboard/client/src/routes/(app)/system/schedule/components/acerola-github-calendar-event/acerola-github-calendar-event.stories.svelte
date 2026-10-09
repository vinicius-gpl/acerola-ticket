<script module lang="ts">
  import type { ComponentProps } from 'svelte';
  import { defineMeta } from '@storybook/addon-svelte-csf';
  import type { SoftwareTimelineEvent } from '@template/shared/schemas/software-timeline.schema';
  import * as Tooltip from '$lib/components/acerola-tooltip/acerola-tooltip';
  import CalendarEvent from './acerola-github-calendar-event.svelte';
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
  const { Story } = defineMeta({
    title: 'Features/System/AcerolaGithubCalendarEvent',
    component: CalendarEvent,
    args: { event },
    parameters: { layout: 'padded' },
  });
</script>

{#snippet template(args: ComponentProps<typeof CalendarEvent>)}
  <Tooltip.Provider><div class="w-full max-w-xs"><CalendarEvent {...args} /></div></Tooltip.Provider
  >
{/snippet}
<Story name="Default" {template} />
<Story name="Compact" args={{ compact: true }} {template} />
<Story name="TimeGrid" args={{ inTimeGrid: true }} {template} />
<Story
  name="ResolvedIssue"
  args={{ event: { ...event, type: 'issue', status: 'closed' } }}
  {template}
/>
<Story
  name="MissingDetails"
  args={{ event: { ...event, author: null, projectName: null, url: null } }}
  {template}
/>
