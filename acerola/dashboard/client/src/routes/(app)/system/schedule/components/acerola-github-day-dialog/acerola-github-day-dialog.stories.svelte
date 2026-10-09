<script module lang="ts">
  import { defineMeta } from '@storybook/addon-svelte-csf';
  import { fn } from 'storybook/test';
  import GithubDayDialog from './acerola-github-day-dialog.svelte';

  const items = Array.from({ length: 5 }, (_, index) => ({
    id: index + 1,
    projectId: 1,
    projectName: 'Acerola Ticket',
    type: 'pr' as const,
    externalId: `#${index + 42}`,
    title: `Melhora o calendário e a navegação ${index + 1}`,
    description: null,
    url: `https://github.com/example/project/pull/${index + 42}`,
    author: 'ana',
    status: 'merged' as const,
    eventDate: `2026-10-06T${String(index + 12).padStart(2, '0')}:30:00Z`,
    createdAt: '2026-10-06T10:00:00Z',
  }));
  const { Story } = defineMeta({
    title: 'Features/System/AcerolaGithubDayDialog',
    component: GithubDayDialog,
    args: {
      data: { date: '2026-10-06', items, total: 24, page: 1, pageSize: 5 },
      actions: { onClose: fn(), onPageChange: fn() },
    },
  });
</script>

<Story name="ManyPullRequests" />
<Story
  name="Issues"
  args={{
    data: {
      date: '2026-10-06',
      type: 'issue',
      items: items.map((event) => ({ ...event, type: 'issue', status: 'closed' })),
      total: 24,
      page: 1,
      pageSize: 5,
    },
  }}
/>
<Story name="Mobile" parameters={{ viewport: { defaultViewport: 'mobile1' } }} />
<Story
  name="Empty"
  args={{ data: { date: '2026-10-06', items: [], total: 0, page: 1, pageSize: 5 } }}
/>
