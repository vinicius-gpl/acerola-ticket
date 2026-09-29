<script module lang="ts">
  import { defineMeta } from '@storybook/addon-svelte-csf';

  import ClipboardCheck from '@lucide/svelte/icons/clipboard-check';
  import ListChecks from '@lucide/svelte/icons/list-checks';
  import UserCog from '@lucide/svelte/icons/user-cog';

  import TimelineStep from '$lib/components/timeline-step/timeline-step.svelte';

  import Timeline from './timeline.svelte';

  const { Story } = defineMeta({
    title: 'Components/Timeline',
    component: Timeline,
  });
</script>

{#snippet threeSteps()}
  <TimelineStep data={{ title: 'Quem está atendendo', icon: UserCog }} ui={{ tone: 'brand' }}>
    <p class="text-xs text-muted-foreground">Campo de exemplo aqui.</p>
  </TimelineStep>
  <TimelineStep data={{ title: 'Situação e urgência', icon: ListChecks }}>
    <p class="text-xs text-muted-foreground">Campo de exemplo aqui.</p>
  </TimelineStep>
  <TimelineStep
    data={{ title: 'O que foi feito', icon: ClipboardCheck }}
    ui={{ isLast: true, tone: 'success' }}
  >
    <p class="text-xs text-muted-foreground">Campo de exemplo aqui.</p>
  </TimelineStep>
{/snippet}

<Story name="Default">
  <div class="w-96 rounded-surface border border-border bg-card p-5">
    <Timeline>{@render threeSteps()}</Timeline>
  </div>
</Story>

<!-- Caso limite: uma etapa só, sem linha para lugar nenhum. -->
<Story name="SingleStep">
  <div class="w-96 rounded-surface border border-border bg-card p-5">
    <Timeline>
      <TimelineStep data={{ title: 'Única etapa', icon: ClipboardCheck }} ui={{ isLast: true }}>
        <p class="text-xs text-muted-foreground">Sem próxima etapa, sem linha descendo.</p>
      </TimelineStep>
    </Timeline>
  </div>
</Story>
