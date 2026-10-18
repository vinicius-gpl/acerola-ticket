<script module lang="ts">
  import { defineMeta } from '@storybook/addon-svelte-csf';
  import type { ComponentProps } from 'svelte';
  import { fn } from 'storybook/test';
  import AgentDownloadView from './acerola-agent-download-view.svelte';
  const { Story } = defineMeta({
    title: 'Features/Agent/AcerolaAgentDownloadView',
    component: AgentDownloadView,
  });
  const releases = [
    { version: '1.3.0', publishedAt: '2026-10-17T12:00:00.000Z', sizeBytes: 46_000_000, isLts: false },
    { version: '1.2.3', publishedAt: '2026-10-16T12:00:00.000Z', sizeBytes: 45_000_000, isLts: true },
    { version: '1.1.0', publishedAt: '2026-09-30T12:00:00.000Z', sizeBytes: 44_000_000, isLts: false },
  ];
  const data = {
    release: { version: '1.2.3', publishedAt: '2026-10-16T12:00:00.000Z', sizeBytes: 45_000_000 },
    releases,
  };
  const state = {
    isLoading: false,
    error: null,
    downloadError: null,
    downloading: null,
    isLoadingReleases: false,
    releasesError: null,
    downloadingVersion: null,
  };
  const actions = {
    onRetry: fn(),
    onDownload: fn(),
    onDownloadVersion: fn(),
    onDownloadInstallerScript: fn(),
  };
</script>

<Story name="Default" args={{ data, state, actions }} />
<Story
  name="Loading"
  args={{ data: { release: null, releases: [] }, state: { ...state, isLoading: true }, actions }}
/>
<Story name="Empty" args={{ data: { release: null, releases: [] }, state, actions }} />
<Story
  name="LoadFailed"
  args={{
    data: { release: null, releases: [] },
    state: { ...state, error: 'Não consegui consultar a versão. Tente novamente em instantes.' },
    actions,
  }}
/>
<Story name="PreparingDownload" args={{ data, state: { ...state, downloading: 'msi' }, actions }} />
<Story
  name="DownloadFailed"
  args={{
    data,
    state: {
      ...state,
      downloadError: 'A versão disponível mudou. Atualize a página antes de baixar os arquivos.',
    },
    actions,
  }}
/>
<Story name="Narrow" args={{ data, state, actions }}>
  {#snippet template(args: ComponentProps<typeof AgentDownloadView>)}
    <div class="w-full max-w-sm"><AgentDownloadView {...args} /></div>
  {/snippet}
</Story>

<!-- Nenhuma LTS promovida ainda, mas as versões publicadas já baixam pela lista. -->
<Story name="NoLtsButReleases" args={{ data: { release: null, releases }, state, actions }} />
<Story
  name="PreparingOlderVersion"
  args={{
    data,
    state: { ...state, downloadingVersion: { version: '1.1.0', kind: 'msi' } },
    actions,
  }}
/>
<Story
  name="ReleasesFailed"
  args={{ data: { ...data, releases: [] }, state: { ...state, releasesError: 'R2 fora do ar.' }, actions }}
/>
