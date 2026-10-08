<script lang="ts" module>
  import {
    type KanbanColumn,
    type KanbanColumnId,
  } from '$lib/hooks/use-software-kanban/use-software-kanban.svelte';
  import StatusBadge, {
    type StatusBadgeTone,
  } from '$lib/components/acerola-status-badge/acerola-status-badge.svelte';
  import { type SoftwareProject } from '@template/shared/schemas/software-project.schema';

  export type AcerolaSystemKanbanViewProps = {
    data: {
      columns: KanbanColumn[];
      projects: SoftwareProject[];
      selectedProjectId: number | null;
      totalTickets: number;
      cardColors: Record<number, string>;
    };
    state: {
      isLoading: boolean;
      isRefetching?: boolean;
      isEmpty: boolean;
      isMoving?: boolean;
      error: string | null;
      moveError?: string | null;
    };
    actions: {
      onSelectProject: (projectId: number | null) => void;
      onRetry: () => void;
      onOpenTicket: (ticketId: number) => void;
      onMoveTicket: (ticketId: number, targetColumn: KanbanColumnId) => Promise<void>;
      onSetCardColor: (ticketId: number, color: string) => void;
      onClearMoveError?: () => void;
    };
  };

  const PRIORITY_TONES: Record<string, StatusBadgeTone> = {
    critical: 'danger',
    high: 'warning',
    medium: 'info',
    low: 'neutral',
  };

  const PRIORITY_LABELS: Record<string, string> = {
    critical: 'Crítica',
    high: 'Alta',
    medium: 'Média',
    low: 'Baixa',
  };

  const CARD_TONE_OPTIONS: { tone: StatusBadgeTone; label: string }[] = [
    { tone: 'brand', label: 'Destaque' },
    { tone: 'info', label: 'Info' },
    { tone: 'success', label: 'Aprovado' },
    { tone: 'warning', label: 'Atenção' },
    { tone: 'danger', label: 'Urgente' },
    { tone: 'neutral', label: 'Padrão' },
  ];

  const CARD_SURFACE_STYLES: Record<StatusBadgeTone, string> = {
    brand: 'bg-primary-soft/30 border-primary/40 hover:border-primary/60',
    info: 'bg-info-soft/35 border-info/40 hover:border-info/60',
    success: 'bg-success-soft/35 border-success/40 hover:border-success/60',
    warning: 'bg-warning-soft/35 border-warning/40 hover:border-warning/60',
    danger: 'bg-destructive-soft/35 border-destructive/40 hover:border-destructive/60',
    neutral: 'bg-card border-border hover:border-border/80',
  };
</script>

<script lang="ts">
  import ArrowUpRight from '@lucide/svelte/icons/arrow-up-right';
  import GripVertical from '@lucide/svelte/icons/grip-vertical';
  import Tag from '@lucide/svelte/icons/tag';

  import EmptyState from '$lib/components/acerola-empty-state/acerola-empty-state.svelte';
  import ErrorState from '$lib/components/acerola-error-state/acerola-error-state.svelte';
  import PageHeader from '$lib/components/acerola-page-header/acerola-page-header.svelte';
  import SelectField from '$lib/components/acerola-select-field/acerola-select-field.svelte';

  let { data, state: viewState, actions }: AcerolaSystemKanbanViewProps = $props();

  /* Estado de Drag and Drop */
  let draggedTicketId = $state<number | null>(null);
  let activeDropColumn = $state<KanbanColumnId | null>(null);
  let dragDepth = $state<Record<KanbanColumnId, number>>({
    todo: 0,
    in_progress: 0,
    waiting: 0,
    done: 0,
  });
  let justDragged = $state(false);

  /* Seletor de tom do card */
  let activeColorPickerTicketId = $state<number | null>(null);

  const projectOptions = $derived([
    { value: '', label: 'Todos os sistemas' },
    ...data.projects.map((p) => ({ value: String(p.id), label: p.name })),
  ]);

  function handleDragStart(e: DragEvent, ticketId: number) {
    draggedTicketId = ticketId;
    justDragged = true;
    if (e.dataTransfer) {
      e.dataTransfer.effectAllowed = 'move';
      e.dataTransfer.setData('text/plain', String(ticketId));
    }
  }

  function handleDragEnd() {
    draggedTicketId = null;
    activeDropColumn = null;
    dragDepth = { todo: 0, in_progress: 0, waiting: 0, done: 0 };
    setTimeout(() => {
      justDragged = false;
    }, 150);
  }

  function handleDragEnter(e: DragEvent, colId: KanbanColumnId) {
    e.preventDefault();
    dragDepth[colId] = (dragDepth[colId] || 0) + 1;
    activeDropColumn = colId;
  }

  function handleDragOver(e: DragEvent, colId: KanbanColumnId) {
    e.preventDefault();
    if (e.dataTransfer) {
      e.dataTransfer.dropEffect = 'move';
    }
    activeDropColumn = colId;
  }

  function handleDragLeave(e: DragEvent, colId: KanbanColumnId) {
    e.preventDefault();
    dragDepth[colId] = Math.max(0, (dragDepth[colId] || 1) - 1);
    if (dragDepth[colId] === 0 && activeDropColumn === colId) {
      activeDropColumn = null;
    }
  }

  function handleDrop(e: DragEvent, colId: KanbanColumnId) {
    e.preventDefault();
    const rawId = e.dataTransfer?.getData('text/plain') ?? String(draggedTicketId);
    const id = Number(rawId);
    draggedTicketId = null;
    activeDropColumn = null;
    dragDepth = { todo: 0, in_progress: 0, waiting: 0, done: 0 };
    setTimeout(() => {
      justDragged = false;
    }, 150);

    if (id && !Number.isNaN(id)) {
      void actions.onMoveTicket(id, colId);
    }
  }
</script>

<div class="mx-auto flex w-full max-w-6xl flex-col gap-6">
  <PageHeader
    data={{
      title: 'Kanban de Sistema',
      description:
        'Acompanhe e movimente chamados e entregas por estágio. Arraste os cards entre as colunas e rotule com selos para priorização.',
    }}
  >
    <div class="flex items-center gap-2">
      <div class="w-64">
        <SelectField
          data={{
            value: data.selectedProjectId ? String(data.selectedProjectId) : '',
            options: projectOptions,
          }}
          ui={{ ariaLabel: 'Filtrar por sistema', placeholder: 'Todos os sistemas' }}
          actions={{
            onChange: (val) => actions.onSelectProject(val ? Number(val) : null),
          }}
        />
      </div>
    </div>
  </PageHeader>

  {#if viewState.moveError}
    <div
      class="flex items-center justify-between gap-3 rounded-box border border-destructive/40 bg-destructive-soft p-3 text-xs text-destructive"
      role="alert"
    >
      <div class="flex items-center gap-2">
        <span class="font-semibold">Aviso do Kanban:</span>
        <span>{viewState.moveError}</span>
      </div>
      {#if actions.onClearMoveError}
        <button
          type="button"
          class="rounded-chip px-2 py-0.5 text-xs font-semibold text-destructive hover:bg-destructive/10"
          onclick={actions.onClearMoveError}
          title="Fechar aviso"
        >
          ✕
        </button>
      {/if}
    </div>
  {/if}

  {#if viewState.isLoading}
    <div class="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {#each [0, 1, 2, 3] as _}
        <div class="h-96 animate-pulse rounded-surface border border-border bg-muted/50"></div>
      {/each}
    </div>
  {:else if viewState.error}
    <ErrorState
      data={{
        title: 'Não foi possível carregar o Kanban',
        message: viewState.error,
      }}
      actions={{ onRetry: actions.onRetry }}
    />
  {:else if viewState.isEmpty}
    <EmptyState
      data={{
        title: 'Nenhum chamado no Kanban',
        description: 'Não há chamados de software registrados no momento.',
      }}
    />
  {:else}
    <!-- 4 Colunas do Kanban com Drag & Drop -->
    <div class="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {#each data.columns as column}
        {@const isDropTarget = activeDropColumn === column.id}
        <div
          class="flex flex-col rounded-surface border p-4 transition-colors {isDropTarget
            ? 'border-primary ring-2 ring-primary/30 bg-primary/5'
            : 'border-border bg-muted/40'}"
          ondragenter={(e) => handleDragEnter(e, column.id)}
          ondragover={(e) => handleDragOver(e, column.id)}
          ondragleave={(e) => handleDragLeave(e, column.id)}
          ondrop={(e) => handleDrop(e, column.id)}
          role="region"
          aria-label={column.title}
        >
          <!-- Cabeçalho da Coluna -->
          <div class="mb-4 flex items-center justify-between">
            <h2 class="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              {column.title}
            </h2>
            <span
              class="grid size-6 place-items-center rounded-full bg-muted text-xs font-medium text-muted-foreground tabular-nums"
            >
              {column.tickets.length}
            </span>
          </div>

          <!-- Cards dos Chamados -->
          <div class="flex flex-1 flex-col gap-3 min-h-32">
            {#if isDropTarget && draggedTicketId !== null}
              <div
                class="grid h-16 place-items-center rounded-box border border-dashed border-primary bg-primary/10 text-xs font-medium text-primary animate-pulse"
              >
                Solte aqui para mover para {column.title}
              </div>
            {/if}

            {#if column.tickets.length === 0 && !isDropTarget}
              <div
                class="grid h-28 place-items-center rounded-box border border-dashed border-border text-xs text-muted-foreground"
              >
                Arraste um card para cá
              </div>
            {:else}
              {#each column.tickets as ticket}
                {@const ticketTone =
                  (data.cardColors[ticket.id] as StatusBadgeTone | undefined) ?? 'neutral'}
                {@const isBeingDragged = draggedTicketId === ticket.id}

                <div
                  role="button"
                  tabindex="0"
                  draggable={!viewState.isMoving}
                  ondragstart={(e) => handleDragStart(e, ticket.id)}
                  ondragend={handleDragEnd}
                  class="group relative flex flex-col gap-2 rounded-box border p-3.5 text-left shadow-xs transition {CARD_SURFACE_STYLES[
                    ticketTone
                  ] ?? CARD_SURFACE_STYLES.neutral} {isBeingDragged
                    ? 'opacity-40 cursor-grabbing'
                    : 'cursor-grab active:cursor-grabbing'}"
                  onclick={(e) => {
                    if (e.target instanceof Element && e.target.closest('[data-card-control]'))
                      return;
                    if (justDragged) return;
                    actions.onOpenTicket(ticket.id);
                  }}
                  onkeydown={(e) => {
                    if (e.target !== e.currentTarget) return;
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      actions.onOpenTicket(ticket.id);
                    }
                  }}
                >
                  <!-- Barra Superior: Drag handle, Protocolo, Selo do Card e Prioridade -->
                  <div class="flex items-center justify-between gap-1 text-xs">
                    <div class="flex items-center gap-1.5">
                      <span
                        class="text-muted-foreground opacity-60 group-hover:opacity-100 transition-opacity"
                        title="Arraste para mover"
                      >
                        <GripVertical class="size-3.5" />
                      </span>
                      <span class="font-mono text-xs font-medium text-muted-foreground">
                        {ticket.protocol}
                      </span>
                    </div>

                    <div class="flex items-center gap-1.5">
                      <!-- Seletor de Selo/Tom do Card -->
                      <div class="relative">
                        <button
                          type="button"
                          class="grid size-6 place-items-center rounded-control border border-border bg-card text-muted-foreground transition hover:text-foreground"
                          title="Atribuir etiqueta ao card"
                          onclick={(e) => {
                            e.stopPropagation();
                            activeColorPickerTicketId =
                              activeColorPickerTicketId === ticket.id ? null : ticket.id;
                          }}
                        >
                          <Tag class="size-3" />
                        </button>

                        {#if activeColorPickerTicketId === ticket.id}
                          <div
                            class="absolute right-0 top-7 z-30 flex flex-col gap-1 rounded-surface border border-border bg-popover p-2 shadow-xl w-36"
                            onclick={(e) => e.stopPropagation()}
                            onkeydown={(e) => {
                              if (e.key === 'Escape') activeColorPickerTicketId = null;
                            }}
                            role="dialog"
                            tabindex="-1"
                          >
                            <span
                              class="px-2 py-1 text-xs font-semibold uppercase tracking-wider text-muted-foreground"
                            >
                              Etiqueta
                            </span>
                            {#each CARD_TONE_OPTIONS as opt}
                              <button
                                type="button"
                                class="flex items-center justify-between rounded-chip px-2 py-1 text-xs text-foreground transition hover:bg-muted"
                                onclick={() => {
                                  actions.onSetCardColor(ticket.id, opt.tone);
                                  activeColorPickerTicketId = null;
                                }}
                              >
                                <span>{opt.label}</span>
                                <StatusBadge
                                  data={{ label: '' }}
                                  ui={{ tone: opt.tone, size: 'sm', className: 'size-2 p-0' }}
                                />
                              </button>
                            {/each}
                          </div>
                        {/if}
                      </div>

                      {#if ticketTone !== 'neutral'}
                        <StatusBadge
                          data={{
                            label: CARD_TONE_OPTIONS.find((o) => o.tone === ticketTone)?.label,
                          }}
                          ui={{ tone: ticketTone, size: 'sm' }}
                        />
                      {/if}

                      <StatusBadge
                        data={{ label: PRIORITY_LABELS[ticket.priority] ?? ticket.priority }}
                        ui={{ tone: PRIORITY_TONES[ticket.priority] ?? 'neutral', size: 'sm' }}
                      />
                    </div>
                  </div>

                  <!-- Descrição resumida -->
                  <p class="line-clamp-2 text-xs font-medium text-foreground leading-snug">
                    {ticket.description}
                  </p>

                  <div data-card-control role="group" aria-label="Movimentação do chamado">
                    <SelectField
                      data={{
                        value: column.id,
                        options: data.columns
                          .filter((target) => target.id === column.id || target.id !== 'todo')
                          .map((target) => ({ value: target.id, label: target.title })),
                      }}
                      ui={{ ariaLabel: `Mover ${ticket.protocol} para` }}
                      state={{ isDisabled: viewState.isMoving }}
                      actions={{
                        onChange: (value) =>
                          void actions.onMoveTicket(ticket.id, value as KanbanColumnId),
                      }}
                    />
                  </div>
                  <!-- Tags: Sistema e GitHub Issue -->
                  <div
                    class="mt-1 flex flex-wrap items-center gap-1.5 border-t border-border/60 pt-2 text-xs"
                  >
                    {#if ticket.projectName}
                      <StatusBadge
                        data={{ label: ticket.projectName }}
                        ui={{ tone: 'brand', size: 'sm' }}
                      />
                    {/if}

                    {#if ticket.githubIssueUrl && ticket.githubIssueNumber}
                      <a
                        href={ticket.githubIssueUrl}
                        target="_blank"
                        rel="noreferrer"
                        class="inline-flex items-center gap-0.5 rounded-chip bg-muted px-1.5 py-0.5 font-mono text-xs text-muted-foreground hover:text-foreground hover:underline"
                        onclick={(e) => e.stopPropagation()}
                      >
                        #{ticket.githubIssueNumber}
                        <ArrowUpRight class="size-3" />
                      </a>
                    {/if}

                    <span class="ml-auto text-xs text-muted-foreground">
                      {ticket.requesterName}
                    </span>
                  </div>
                </div>
              {/each}
            {/if}
          </div>
        </div>
      {/each}
    </div>
  {/if}
</div>
