<script lang="ts" module>
  import { type InternalRole } from '@template/shared/schemas/internal-role.schema';
  import {
    ROLE_CONTEXT_LABELS,
    ROLE_CONTEXTS,
    USER_ROLE_LABELS,
    type ContextRoles,
    type RoleContext,
    type UserRole,
  } from '@template/shared/schemas/user.schema';
  import { type OptionPickerOption } from '$lib/components/option-picker/option-picker.svelte';
  import { type StatusBadgeTone } from '$lib/components/status-badge/status-badge.svelte';
  import { type RolesFilter } from '$lib/hooks/use-roles/use-roles.svelte';

  export type RoleListViewProps = {
    data: {
      currentUser?: {
        name: string;
        email: string;
        role: string;
        roles?: Partial<ContextRoles>;
      };
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

  export function roleTone(role: UserRole | string): StatusBadgeTone {
    if (role === 'superadmin' || role === 'Super Admin') return 'success';
    if (role === 'admin' || role === 'Administrador') return 'brand';
    if (role === 'manager' || role === 'Gestor' || role === 'Gerente') return 'info';
    return 'neutral';
  }

  export function contextTone(context: RoleContext): StatusBadgeTone {
    if (context === 'sistema') return 'brand';
    if (context === 'infra') return 'info';
    return 'warning';
  }

  export function contextDescription(context: RoleContext): string {
    if (context === 'sistema') return 'Acesso administrativo geral, equipe e parâmetros';
    if (context === 'infra') return 'Acesso ao inventário de máquinas e telemetria de rede';
    return 'Abertura, acompanhamento e atendimento de chamados';
  }

  const CONTEXT_PICKER_OPTIONS: OptionPickerOption[] = ROLE_CONTEXTS.map((ctx) => ({
    value: ctx,
    label: ROLE_CONTEXT_LABELS[ctx],
    tone: contextTone(ctx),
  }));
</script>

<script lang="ts">
  import Info from '@lucide/svelte/icons/info';
  import Pencil from '@lucide/svelte/icons/pencil';
  import Plus from '@lucide/svelte/icons/plus';
  import SearchX from '@lucide/svelte/icons/search-x';
  import ShieldCheck from '@lucide/svelte/icons/shield-check';
  import Trash2 from '@lucide/svelte/icons/trash-2';

  import ActionButton from '$lib/components/action-button/action-button.svelte';
  import EmptyState from '$lib/components/empty-state/empty-state.svelte';
  import ErrorState from '$lib/components/error-state/error-state.svelte';
  import OptionPicker from '$lib/components/option-picker/option-picker.svelte';
  import PageHeader from '$lib/components/page-header/page-header.svelte';
  import PersonAvatar from '$lib/components/person-avatar/person-avatar.svelte';
  import StatCard from '$lib/components/stat-card/stat-card.svelte';
  import StatCardGrid from '$lib/components/stat-card-grid/stat-card-grid.svelte';
  import StatusBadge from '$lib/components/status-badge/status-badge.svelte';
  import {
    Table,
    TableActions,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
  } from '$lib/components/ui/table';
  import TextField from '$lib/components/text-field/text-field.svelte';

  let { data, state, actions }: RoleListViewProps = $props();

  const isFiltered = $derived(Boolean(data.filter.search || data.filter.context));
  const canManage = $derived(!data.currentUser || data.currentUser.role === 'superadmin');

  function countByContext(ctx: RoleContext): number {
    return data.roles.filter((r) => r.context === ctx).length;
  }
</script>

<div class="mx-auto flex w-full max-w-6xl flex-col gap-6 px-4 pb-12 sm:px-6">
  <!-- 1. Meu Perfil -->
  {#if data.currentUser}
    <div class="rounded-box border border-border bg-card p-6 shadow-xs">
      <div class="flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
        <div class="flex items-center gap-4">
          <div class="relative shrink-0">
            <PersonAvatar
              name={data.currentUser.name}
              ui={{ size: 'xl', className: 'size-16 ring-4 ring-primary/10 shadow-sm' }}
            />
          </div>
          <div class="min-w-0">
            <div class="flex flex-wrap items-center gap-2">
              <h1 class="text-xl font-bold tracking-tight text-foreground truncate">
                {data.currentUser.name}
              </h1>
              <StatusBadge
                data={{
                  label:
                    USER_ROLE_LABELS[data.currentUser.role as UserRole] ?? data.currentUser.role,
                }}
                ui={{ tone: roleTone(data.currentUser.role), size: 'sm' }}
              />
            </div>
            <p class="text-xs font-mono text-muted-foreground mt-0.5 truncate">
              {data.currentUser.email}
            </p>
          </div>
        </div>
      </div>

      <!-- Cargos nos contextos -->
      <div class="mt-5 border-t border-border pt-4">
        <h2 class="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">
          Seus Cargos por Área de Atuação
        </h2>
        <div class="grid grid-cols-1 gap-3 sm:grid-cols-3">
          {#each ROLE_CONTEXTS as ctx (ctx)}
            {@const role = (data.currentUser.roles?.[ctx] ?? data.currentUser.role ?? 'user') as UserRole}
            <div class="flex flex-col justify-between rounded-control border border-border bg-muted/20 p-3.5 transition-colors">
              <div class="flex items-center justify-between gap-2">
                <span class="text-xs font-semibold text-foreground">
                  {ROLE_CONTEXT_LABELS[ctx]}
                </span>
                <StatusBadge
                  data={{ label: USER_ROLE_LABELS[role] }}
                  ui={{ tone: roleTone(role), size: 'sm' }}
                />
              </div>
              <p class="mt-2 text-[11px] text-muted-foreground leading-snug">
                {contextDescription(ctx)}
              </p>
            </div>
          {/each}
        </div>
      </div>
    </div>
  {/if}

  <!-- 2. Cabeçalho de Cargos da Equipe -->
  <PageHeader
    data={{
      title: 'Cargos e Perfis da Equipe',
      description: 'Consulte e atribua cargos internos às pessoas por contexto, desacoplados do mecanismo de autenticação.',
    }}
  >
    {#if canManage}
      <ActionButton
        data={{ label: 'Atribuir cargo' }}
        ui={{ icon: Plus }}
        actions={{ onClick: actions.onCreate }}
      />
    {/if}
  </PageHeader>

  {#if data.currentUser && data.currentUser.role !== 'superadmin'}
    <div
      class="flex items-center gap-2.5 rounded-box border border-border/80 bg-muted/30 p-3 text-xs text-muted-foreground"
    >
      <Info class="size-4 shrink-0 text-primary" aria-hidden="true" />
      <span>
        Modo de visualização da equipe. Apenas o <strong>Super Admin</strong> possui autorização para
        conceder ou alterar cadastros de cargos internos.
      </span>
    </div>
  {/if}

  <!-- 3. Indicadores de Estatísticas (StatCards) -->
  <StatCardGrid>
    <StatCard
      data={{ label: 'Cargos Atribuídos', value: data.roles.length }}
      ui={{ tone: 'brand', icon: ShieldCheck }}
      state={{ isLoading: state.isLoading }}
    />
    <StatCard
      data={{ label: 'Sistema', value: countByContext('sistema') }}
      ui={{ tone: 'brand' }}
      state={{ isLoading: state.isLoading }}
    />
    <StatCard
      data={{ label: 'Infraestrutura', value: countByContext('infra') }}
      ui={{ tone: 'info' }}
      state={{ isLoading: state.isLoading }}
    />
    <StatCard
      data={{ label: 'Manutenção', value: countByContext('manutencao') }}
      ui={{ tone: 'warning' }}
      state={{ isLoading: state.isLoading }}
    />
  </StatCardGrid>

  <!-- 4. Filtros Padronizados -->
  <div class="flex flex-col gap-3">
    <TextField
      data={{
        label: 'Buscar na equipe',
        name: 'search',
        value: data.filter.search,
        placeholder: 'Filtrar por e-mail ou identificador da pessoa…',
      }}
      actions={{ onChange: actions.onSearchChange }}
    />

    <div class="flex flex-wrap items-center justify-between gap-3">
      <OptionPicker
        data={{ value: data.filter.context, options: CONTEXT_PICKER_OPTIONS }}
        ui={{ ariaLabel: 'Filtrar por contexto', allLabel: 'Todos os contextos' }}
        actions={{ onChange: (val) => actions.onContextChange(val as RoleContext | '') }}
      />

      {#if isFiltered}
        <ActionButton
          data={{ label: 'Limpar filtros' }}
          ui={{ variant: 'secondary', size: 'sm' }}
          actions={{ onClick: actions.onClearFilters }}
        />
      {/if}
    </div>
  </div>

  <!-- 5. Tabela / Estados -->
  {#if state.error}
    <ErrorState
      data={{ title: 'Erro ao carregar cargos da equipe', message: state.error }}
      actions={{ onRetry: actions.onRetry }}
    />
  {:else if state.isLoading}
    <p class="text-ink-500 py-10 text-center text-sm">Carregando os cargos da equipe…</p>
  {:else if state.isEmpty}
    <EmptyState
      data={{
        title: 'Nenhum cargo interno atribuído',
        description: 'Atribua cargos para definir permissões específicas em cada área do sistema.',
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
        title: 'Nenhum cargo com esses filtros',
        description: 'Tente alterar os termos da busca ou limpar os filtros.',
      }}
      ui={{ icon: SearchX }}
    >
      <ActionButton
        data={{ label: 'Limpar filtros' }}
        ui={{ variant: 'secondary' }}
        actions={{ onClick: actions.onClearFilters }}
      />
    </EmptyState>
  {:else}
    <div class="overflow-x-auto rounded-box border border-border bg-card shadow-xs">
      <Table class="min-w-[760px]">
        <TableHeader>
          <TableRow>
            <TableHead class="min-w-[260px]">Pessoa</TableHead>
            <TableHead class="min-w-[140px]">Contexto / Área</TableHead>
            <TableHead class="min-w-[140px]">Cargo Interno</TableHead>
            <TableHead class="min-w-[160px]">Criado por</TableHead>
            {#if canManage}
              <TableHead class="min-w-[100px] text-right"><span class="sr-only">Ações</span></TableHead>
            {/if}
          </TableRow>
        </TableHeader>
        <TableBody>
          {#each data.roles as item (item.id)}
            <TableRow>
              <TableCell class="max-w-[280px]">
                <div class="flex items-center gap-3">
                  <PersonAvatar name={item.userEmail || item.userId} ui={{ size: 'md' }} />
                  <div class="min-w-0">
                    <span class="block font-medium text-foreground truncate">
                      {item.userEmail || item.userId}
                    </span>
                    {#if item.userEmail && item.userId !== item.userEmail}
                      <span class="block text-xs font-mono text-muted-foreground truncate">
                        {item.userId}
                      </span>
                    {/if}
                  </div>
                </div>
              </TableCell>
              <TableCell>
                <StatusBadge
                  data={{ label: ROLE_CONTEXT_LABELS[item.context] }}
                  ui={{ tone: contextTone(item.context), size: 'sm' }}
                />
              </TableCell>
              <TableCell>
                <StatusBadge
                  data={{ label: USER_ROLE_LABELS[item.role] }}
                  ui={{ tone: roleTone(item.role), size: 'sm' }}
                />
              </TableCell>
              <TableCell class="text-xs text-muted-foreground font-mono">
                {item.createdBy || '—'}
              </TableCell>
              {#if canManage}
                <TableCell class="text-right">
                  <TableActions>
                    <ActionButton
                      data={{ label: 'Editar' }}
                      ui={{ icon: Pencil, variant: 'ghost', size: 'sm' }}
                      actions={{ onClick: () => actions.onEdit(item) }}
                    />
                    <ActionButton
                      data={{ label: 'Excluir' }}
                      ui={{
                        icon: Trash2,
                        variant: 'ghost',
                        size: 'sm',
                        className: 'text-destructive hover:text-destructive',
                      }}
                      actions={{ onClick: () => actions.onAskDelete(item) }}
                    />
                  </TableActions>
                </TableCell>
              {/if}
            </TableRow>
          {/each}
        </TableBody>
      </Table>
    </div>
  {/if}
</div>
