<script lang="ts" module>
  import {
    softwareProjectStatusLabel,
    type SoftwareProjectStatus,
  } from '@template/shared/domain/software-project.util';
  import { type SoftwareProject } from '@template/shared/schemas/software-project.schema';
  import StatusBadge, {
    type StatusBadgeTone,
  } from '$lib/components/acerola-status-badge/acerola-status-badge.svelte';
  import { type SoftwareProjectListFilter } from '$lib/hooks/use-software-project-list/use-software-project-list.svelte';

  export type AcerolaProjectListViewProps = {
    data: {
      items: SoftwareProject[];
      total: number;
      filter: SoftwareProjectListFilter;
      deleting: SoftwareProject | null;
    };
    state: {
      canEdit?: boolean;
      isLoading: boolean;
      isRefetching?: boolean;
      isEmpty: boolean;
      isFilteredOut: boolean;
      isDeleting: boolean;
      isSyncing: boolean;
      error: string | null;
      deleteError: string | null;
      syncMessage: string | null;
      syncError?: string | null;
    };
    actions: {
      onSearchChange: (search: string) => void;
      onStatusChange: (status: SoftwareProjectStatus | '') => void;
      onClearFilters: () => void;
      onRetry: () => void;
      onRegister: () => void;
      onEdit: (item: SoftwareProject) => void;
      onViewTimeline: (item: SoftwareProject) => void;
      onAskDelete: (item: SoftwareProject) => void;
      onCancelDelete: () => void;
      onConfirmDelete: () => void;
      onSyncGithub: (id: number) => void;
    };
  };

  const STATUS_TONES: Record<string, StatusBadgeTone> = {
    active: 'success',
    maintenance: 'warning',
    deprecated: 'neutral',
  };
</script>

<script lang="ts">
  import ArrowUpRight from '@lucide/svelte/icons/arrow-up-right';
  import Code2 from '@lucide/svelte/icons/code-2';
  import GitPullRequest from '@lucide/svelte/icons/git-pull-request';
  import History from '@lucide/svelte/icons/history';
  import LifeBuoy from '@lucide/svelte/icons/life-buoy';
  import Pencil from '@lucide/svelte/icons/pencil';
  import Plus from '@lucide/svelte/icons/plus';
  import RefreshCw from '@lucide/svelte/icons/refresh-cw';
  import Trash2 from '@lucide/svelte/icons/trash-2';

  import ActionButton from '$lib/components/acerola-action-button/acerola-action-button.svelte';
  import ConfirmDialog from '$lib/components/acerola-confirm-dialog/acerola-confirm-dialog.svelte';
  import EmptyState from '$lib/components/acerola-empty-state/acerola-empty-state.svelte';
  import ErrorState from '$lib/components/acerola-error-state/acerola-error-state.svelte';
  import PageHeader from '$lib/components/acerola-page-header/acerola-page-header.svelte';
  import SelectField from '$lib/components/acerola-select-field/acerola-select-field.svelte';
  import TextField from '$lib/components/acerola-text-field/acerola-text-field.svelte';

  let { data, state, actions }: AcerolaProjectListViewProps = $props();

  const statusFilterOptions = [
    { value: '', label: 'Todas as situações' },
    { value: 'active', label: 'Ativo' },
    { value: 'maintenance', label: 'Manutenção' },
    { value: 'deprecated', label: 'Legado / Descontinuado' },
  ];
</script>

<div class="mx-auto flex w-full max-w-6xl flex-col gap-6">
  <PageHeader
    data={{
      title: 'Sistemas e Projetos',
      description:
        'Cadastre os softwares da empresa, acompanhe Pull Requests e vincule chamados de suporte.',
    }}
  >
    {#if state.canEdit !== false}
      <ActionButton
        data={{ label: 'Novo Sistema' }}
        ui={{ variant: 'primary', icon: Plus }}
        actions={{ onClick: actions.onRegister }}
      />
    {/if}
  </PageHeader>

  {#if state.syncMessage}
    <div
      class="rounded-box border border-success/40 bg-success-soft p-4 text-xs font-medium text-success"
    >
      {state.syncMessage}
    </div>
  {/if}

  {#if state.syncError}
    <p
      role="alert"
      class="rounded-box border border-destructive/40 bg-destructive-soft p-4 text-xs text-destructive"
    >
      {state.syncError}
    </p>
  {/if}

  <!-- Filtros -->
  <div class="flex flex-wrap items-center justify-between gap-4">
    <div class="w-full max-w-sm">
      <TextField
        data={{
          label: 'Buscar',
          name: 'search',
          value: data.filter.search,
          placeholder: 'Buscar por nome ou repositório…',
        }}
        actions={{ onChange: actions.onSearchChange }}
      />
    </div>

    <div class="w-56">
      <SelectField
        data={{
          value: data.filter.status,
          options: statusFilterOptions,
        }}
        ui={{ ariaLabel: 'Filtrar por situação', placeholder: 'Todas as situações' }}
        actions={{
          onChange: (val) => actions.onStatusChange(val as SoftwareProjectStatus | ''),
        }}
      />
    </div>
  </div>

  {#if state.isLoading}
    <div class="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {#each [0, 1, 2] as _}
        <div class="h-56 animate-pulse rounded-surface border border-border bg-muted/50"></div>
      {/each}
    </div>
  {:else if state.error}
    <ErrorState
      data={{
        title: 'Não foi possível carregar os sistemas',
        message: state.error,
      }}
      actions={{ onRetry: actions.onRetry }}
    />
  {:else if state.isEmpty}
    <EmptyState
      data={{
        title: 'Nenhum sistema cadastrado',
        description:
          state.canEdit === false
            ? 'Aguarde um administrador cadastrar os sistemas da equipe.'
            : 'Cadastre seu primeiro sistema para acompanhar Pull Requests e chamados.',
      }}
    >
      {#if state.canEdit !== false}
        <ActionButton
          data={{ label: 'Cadastrar Sistema' }}
          ui={{ variant: 'primary', icon: Plus }}
          actions={{ onClick: actions.onRegister }}
        />
      {/if}
    </EmptyState>
  {:else if state.isFilteredOut}
    <EmptyState
      data={{
        title: 'Nenhum sistema encontrado',
        description: 'Nenhum resultado corresponde aos filtros aplicados.',
      }}
    >
      <ActionButton
        data={{ label: 'Limpar Filtros' }}
        ui={{ variant: 'secondary' }}
        actions={{ onClick: actions.onClearFilters }}
      />
    </EmptyState>
  {:else}
    <!-- Grid de Projetos -->
    <div class="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {#each data.items as project}
        <div
          class="flex flex-col justify-between rounded-surface border border-border bg-card p-5 shadow-xs transition hover:border-border/80"
        >
          <div>
            <!-- Topo: Nome, Tag e Status -->
            <div class="flex items-start justify-between gap-2">
              <h3 class="text-sm font-semibold text-foreground">
                {project.name}
              </h3>
              <StatusBadge
                data={{ label: softwareProjectStatusLabel(project.status) }}
                ui={{ tone: STATUS_TONES[project.status] ?? 'neutral', size: 'sm' }}
              />
            </div>

            <!-- Descrição -->
            <p class="mt-2 line-clamp-2 text-xs text-muted-foreground">
              {project.description || 'Sem descrição cadastrada.'}
            </p>

            <!-- Link do Repositório GitHub -->
            <div class="mt-3">
              <a
                href={project.repositoryUrl.startsWith('http')
                  ? project.repositoryUrl
                  : `https://github.com/${project.repositoryUrl}`}
                target="_blank"
                rel="noreferrer"
                class="inline-flex items-center gap-1.5 rounded-control bg-muted px-2.5 py-1 text-xs font-mono text-foreground hover:bg-muted/80"
              >
                <Code2 class="size-3.5 text-muted-foreground" />
                <span class="truncate max-w-[200px]"
                  >{project.githubRepoOwner
                    ? `${project.githubRepoOwner}/${project.githubRepoName}`
                    : project.repositoryUrl}</span
                >
                <ArrowUpRight class="size-3 text-muted-foreground" />
              </a>
            </div>

            <!-- Métricas: Chamados e PRs -->
            <div class="mt-4 grid grid-cols-2 gap-2 border-t border-border/60 pt-3 text-xs">
              <div class="flex items-center gap-2">
                <LifeBuoy class="size-3.5 text-primary" />
                <span class="text-muted-foreground">
                  <strong class="text-foreground">{project.openTicketsCount}</strong> chamados
                </span>
              </div>
              <div class="flex items-center gap-2">
                <GitPullRequest class="size-3.5 text-primary" />
                <span class="text-muted-foreground">
                  <strong class="text-foreground">{project.pullRequestsCount}</strong> PRs
                </span>
              </div>
            </div>
          </div>

          <!-- Ações do Card -->
          <div class="mt-4 flex items-center justify-between border-t border-border/60 pt-3">
            <div class="flex items-center gap-1">
              <button
                type="button"
                class="flex items-center gap-1 rounded-control border border-border px-2.5 py-1 text-xs font-medium text-foreground hover:bg-muted"
                onclick={() => actions.onViewTimeline(project)}
                title="Ver histórico de PRs e timeline"
              >
                <History class="size-3" />
                Timeline
              </button>

              {#if state.canEdit !== false}
                <button
                  type="button"
                  class="flex items-center gap-1 rounded-control border border-border px-2.5 py-1 text-xs font-medium text-foreground hover:bg-muted"
                  disabled={state.isSyncing}
                  onclick={() => actions.onSyncGithub(project.id)}
                  title="Sincronizar Pull Requests com o GitHub"
                >
                  <RefreshCw class="size-3 {state.isSyncing ? 'animate-spin' : ''}" />
                  Sincronizar
                </button>
              {/if}
            </div>

            {#if state.canEdit !== false}
              <div class="flex items-center gap-1">
                <button
                  type="button"
                  class="p-1 text-muted-foreground hover:text-foreground"
                  onclick={() => actions.onEdit(project)}
                  title="Editar"
                >
                  <Pencil class="size-3.5" />
                </button>
                <button
                  type="button"
                  class="p-1 text-muted-foreground hover:text-destructive"
                  onclick={() => actions.onAskDelete(project)}
                  title="Excluir"
                >
                  <Trash2 class="size-3.5" />
                </button>
              </div>
            {/if}
          </div>
        </div>
      {/each}
    </div>
  {/if}

  <!-- Confirmação de Exclusão -->
  {#if data.deleting}
    <ConfirmDialog
      data={{
        title: 'Excluir sistema',
        description: `Tem certeza que deseja excluir "${data.deleting.name}"? Todos os eventos da timeline serão excluídos.`,
        confirmLabel: 'Excluir',
      }}
      ui={{ tone: 'danger' }}
      state={{
        isOpen: true,
        isConfirming: state.isDeleting,
        error: state.deleteError,
      }}
      actions={{
        onConfirm: actions.onConfirmDelete,
        onCancel: actions.onCancelDelete,
      }}
    />
  {/if}
</div>
