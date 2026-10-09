<script lang="ts" module>
  import { defineMeta } from '@storybook/addon-svelte-csf';
  import { fn } from 'storybook/test';
  import Gate from './acerola-github-link-gate.svelte';
  const state = { isLoading: false, isConfigured: true, isConnecting: false, error: null };
  const actions = { onConnect: fn(), onRetry: fn(), onLeave: fn() };
  const { Story } = defineMeta({ title: 'System/AcerolaGithubLinkGate', component: Gate });
</script>

<Story name="Required" args={{ state, actions }} />
<Story name="Loading" args={{ state: { ...state, isLoading: true }, actions }} />
<Story name="NotConfigured" args={{ state: { ...state, isConfigured: false }, actions }} />
<Story
  name="Cancelled"
  args={{
    state: { ...state, error: 'A autorização foi cancelada. Vincule sua conta para continuar.' },
    actions,
  }}
/>
