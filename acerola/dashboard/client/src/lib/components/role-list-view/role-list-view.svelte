<script lang="ts" module>
  import { type InternalRole } from '@template/shared/schemas/internal-role.schema';
  import {
    ROLE_CONTEXT_LABELS,
    ROLE_CONTEXTS,
    USER_ROLE_LABELS,
    type RoleContext,
    type UserRole,
  } from '@template/shared/schemas/user.schema';
  import { type RolesFilter } from '$lib/hooks/use-roles/use-roles.svelte';

  export type RoleListViewProps = {
    data: {
      roles: InternalRole[];
      total: number;
      filter: RolesFilter;
    };
    state: {
      isLoading: boolean;
      isRefetching?: boolean;
      isEmpty: boolean;
      isFilteredOut: boolean;
      error: string | null;
      isDeleting?: boolean;
      deleteError?: string | null;
    };
    actions: {
      onCreate: () => void;
      onEdit: (role: InternalRole) => void;
      onAskDelete: (role: InternalRole) => void;
      onSearchChange: (search: string) => void;
      onContextChange: (context: RoleContext | '') => void;
      onClearFilters: () => void;
      onRetry: () => void;
    };
  };

  const CONTEXT_FILTER_OPTIONS = [
    { value: '', label: 'Todos os contextos' },
    ...ROLE_CONTEXTS.map((ctx) => ({ value: ctx, label: ROLE_CONTEXT_LABELS[ctx] })),
  ];

  function roleTone(role: UserRole) {
    if (role === 'admin') return 'brand';
    if (role === 'manager') return 'info';
    return 'neutral';
  }

  function contextTone(context: RoleContext) {
    if (context === 'sistema') return 'brand';
    if (context === 'infra') return 'info';
    return 'warning';
  }
</script>

<script lang="ts">
  import Pencil from '@lucide/svelte/icons/pencil';
  import Plus from '@lucide/svelte/icons/plus';
  import ShieldCheck from '@lucide/svelte/icons/shield-check';
  import Trash2 from '@lucide/svelte/icons/trash-2';
  import ActionButton from '$lib/components/action-button/action-button.svelte';
  import EmptyState from '$lib/components/empty-state/empty-state.svelte';
  import ErrorState from '$lib/components/error-state/error-state.svelte';
  import PageHeader from '$lib/components/page-header/page-header.svelte';
  import SelectField from '$lib/components/select-field/select-field.svelte';
  import StatusBadge from '$lib/components/status-badge/status-badge.svelte';
  import TextField from '$lib/components/text-field/text-field.svelte';

  let { data, state, actions }: RoleListViewProps = $props();

  const isFiltered = $derived(Boolean(data.filter.search || data.filter.context));
</script>

<div class="space-y-6">
  <PageHeader
    data={{
      title: 'Cargos Internos',
      description: 'Defina os cargos de cada pessoa por contexto (Infraestrutura, Sistema e Manutenção), desacoplados do mecanismo de autenticação.',
    }}
  >
    <ActionButton
      data={{ label: 'Atribuir cargo' }}
      ui={{ icon: Plus }}
      actions={{ onClick: actions.onCreate }}
    />
  </PageHeader>

  <!-- Filtros -->
  <div class="flex flex-col gap-3 sm:flex-row sm:items-end">
    <div class="w-full sm:w-72">
      <TextField
        data={{
          label: 'Buscar',
          name: 'search',
          value: data.filter.search,
          placeholder: 'Buscar por ID ou e-mail…',
        }}
        actions={{ onChange: actions.onSearchChange }}
      />
    </div>

    <div class="w-full sm:w-56">
      <SelectField
        data={{ value: data.filter.context, options: CONTEXT_FILTER_OPTIONS }}
        ui={{ ariaLabel: 'Filtrar por contexto' }}
        actions={{ onChange: (val) => actions.onContextChange(val as RoleContext | '') }}
      />
    </div>

    {#if isFiltered}
      <ActionButton
        data={{ label: 'Limpar filtros' }}
        ui={{ variant: 'ghost', size: 'md' }}
        actions={{ onClick: actions.onClearFilters }}
      />
    {/if}
  </div>

  <!-- Conteúdo -->
  {#if state.isLoading}
    <div class="space-y-2">
      {#each [1, 2, 3] as idx (idx)}
        <div class="h-16 animate-pulse rounded-box bg-gray-100 dark:bg-gray-800"></div>
      {/each}
    </div>
  {:else if state.error}
    <ErrorState
      data={{ title: 'Erro ao carregar cargos', message: state.error }}
      actions={{ onRetry: actions.onRetry }}
    />
  {:else if state.isEmpty}
    <EmptyState
      data={{
        title: 'Nenhum cargo interno atribuído',
        description: 'Atribua cargos às pessoas para definir suas permissões por área.',
      }}
      ui={{ icon: ShieldCheck }}
    >
      <ActionButton
        data={{ label: 'Atribuir primeiro cargo' }}
        ui={{ icon: Plus }}
        actions={{ onClick: actions.onCreate }}
      />
    </EmptyState>
  {:else if state.isFilteredOut}
    <EmptyState
      data={{
        title: 'Nenhum cargo encontrado',
        description: 'Tente alterar os termos da busca ou limpar o filtro.',
      }}
    >
      <ActionButton
        data={{ label: 'Limpar filtros' }}
        ui={{ variant: 'secondary' }}
        actions={{ onClick: actions.onClearFilters }}
      />
    </EmptyState>
  {:else}
    <div class="overflow-x-auto rounded-box border border-border bg-card">
      <table class="w-full text-left text-sm">
        <thead class="border-b border-border bg-muted/50 text-xs font-semibold uppercase text-muted-foreground">
          <tr>
            <th class="px-4 py-3">Identificador / E-mail</th>
            <th class="px-4 py-3">Contexto</th>
            <th class="px-4 py-3">Cargo Interno</th>
            <th class="px-4 py-3">Criado por</th>
            <th class="px-4 py-3 text-right">Ações</th>
          </tr>
        </thead>
        <tbody class="divide-y divide-border">
          {#each data.roles as item (item.id)}
            <tr class="hover:bg-muted/30 transition-colors">
              <td class="px-4 py-3 font-medium text-foreground">
                <div>{item.userEmail || item.userId}</div>
                {#if item.userEmail && item.userId !== item.userEmail}
                  <div class="text-xs text-muted-foreground font-mono">{item.userId}</div>
                {/if}
              </td>
              <td class="px-4 py-3">
                <StatusBadge
                  data={{ label: ROLE_CONTEXT_LABELS[item.context] }}
                  ui={{ tone: contextTone(item.context), size: 'sm' }}
                />
              </td>
              <td class="px-4 py-3">
                <StatusBadge
                  data={{ label: USER_ROLE_LABELS[item.role] }}
                  ui={{ tone: roleTone(item.role), size: 'sm' }}
                />
              </td>
              <td class="px-4 py-3 text-xs text-muted-foreground">
                {item.createdBy || '—'}
              </td>
              <td class="px-4 py-3 text-right">
                <div class="flex items-center justify-end gap-1">
                  <ActionButton
                    data={{ label: 'Editar' }}
                    ui={{ icon: Pencil, variant: 'ghost', size: 'sm' }}
                    actions={{ onClick: () => actions.onEdit(item) }}
                  />
                  <ActionButton
                    data={{ label: 'Excluir' }}
                    ui={{ icon: Trash2, variant: 'ghost', size: 'sm', className: 'text-destructive hover:text-destructive' }}
                    actions={{ onClick: () => actions.onAskDelete(item) }}
                  />
                </div>
              </td>
            </tr>
          {/each}
        </tbody>
      </table>
    </div>
  {/if}
</div>
