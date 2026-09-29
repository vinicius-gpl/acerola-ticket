<script module lang="ts">
  import { defineMeta } from '@storybook/addon-svelte-csf';
  import type { ComponentProps } from 'svelte';

  import ClipboardCheck from '@lucide/svelte/icons/clipboard-check';
  import UserCog from '@lucide/svelte/icons/user-cog';

  import Timeline from '$lib/components/timeline/timeline.svelte';

  import TimelineStep from './timeline-step.svelte';

  const { Story } = defineMeta({
    title: 'Components/TimelineStep',
    component: TimelineStep,
  });
</script>

{#snippet exampleField()}
  <p class="text-xs text-muted-foreground">Campo de exemplo aqui.</p>
{/snippet}

{#snippet inTimeline(args: ComponentProps<typeof TimelineStep>)}
  <div class="w-96 rounded-surface border border-border bg-card p-5">
    <Timeline><TimelineStep {...args} /></Timeline>
  </div>
{/snippet}

<Story
  name="Default"
  args={{
    data: { title: 'Quem está atendendo', icon: UserCog },
    children: exampleField,
  }}
  template={inTimeline}
/>

<Story
  name="WithDescriptionAndTone"
  args={{
    data: {
      title: 'Situação e urgência',
      description: 'Isso aparece pra quem abriu o chamado.',
      icon: ClipboardCheck,
    },
    ui: { tone: 'success' },
    children: exampleField,
  }}
  template={inTimeline}
/>

<!-- Caso limite: última etapa não desenha linha para uma próxima que não existe. -->
<Story
  name="LastStep"
  args={{
    data: { title: 'O que foi feito', icon: ClipboardCheck },
    ui: { isLast: true, tone: 'brand' },
    children: exampleField,
  }}
  template={inTimeline}
/>
