<script lang="ts" module>
  import {
    ROLE_CONTEXT_LABELS,
    ROLE_CONTEXTS,
    USER_ROLE_LABELS,
    type DirectoryUser,
    type RoleContext,
    type UserRole,
  } from '@template/shared/schemas/user.schema';
  import { type FormFieldState } from '$lib/types/form-field.type';
  import { type RoleFormField } from '$lib/hooks/use-role-form/use-role-form.svelte';

  export type AcerolaRoleFormDialogProps = {
    data: {
      mode: 'create' | 'edit';
      users?: DirectoryUser[];
      fields: Record<RoleFormField, FormFieldState>;
    };
    state: {
      isOpen: boolean;
      isSubmitting?: boolean;
      isLoadingUsers?: boolean;
      error?: string | null;
    };
    actions: {
      onChange: (field: RoleFormField, value: string) => void;
      onBlur: (field: RoleFormField) => void;
      onSelectUser?: (user: DirectoryUser) => void;
      onClearUser?: () => void;
      onSubmit: () => void;
      onClose: () => void;
    };
  };

  const CONTEXT_DETAILS: Record<RoleContext, { label: string; description: string }> = {
    infra: {
      label: ROLE_CONTEXT_LABELS.infra,
      description: 'Computadores, rede e parque tecnológico.',
    },
    sistema: {
      label: ROLE_CONTEXT_LABELS.sistema,
      description: 'Chamados, permissões e regras gerais.',
    },
    manutencao: {
      label: ROLE_CONTEXT_LABELS.manutencao,
      description: 'Preventivas, corretivas e descarte.',
    },
  };

  const ROLE_DETAILS: { value: UserRole; label: string; description: string }[] = [
    {
      value: 'admin',
      label: USER_ROLE_LABELS.admin,
      description: 'Gestão ampla e controle total do módulo.',
    },
    {
      value: 'manager',
      label: USER_ROLE_LABELS.manager,
      description: 'Gerencia registros e equipe nesta área.',
    },
    {
      value: 'user',
      label: USER_ROLE_LABELS.user,
      description: 'Uso operacional padrão e criação de registros.',
    },
  ];
</script>

<script lang="ts">
  import ActionButton from '$lib/components/action-button/action-button.svelte';
  import ErrorState from '$lib/components/error-state/error-state.svelte';
  import PersonAvatar from '$lib/components/person-avatar/person-avatar.svelte';
  import SubmitButton from '$lib/components/submit-button/submit-button.svelte';
  import Timeline from '$lib/components/timeline/timeline.svelte';
  import TimelineStep from '$lib/components/timeline-step/timeline-step.svelte';
  import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
  } from '$lib/components/acerola-dialog/acerola-dialog';
  import {
    Popover,
    PopoverContent,
    PopoverTrigger,
  } from '$lib/components/acerola-popover/acerola-popover';
  import { cn } from '$lib/utils/cn';

  import Check from '@lucide/svelte/icons/check';
  import ChevronDown from '@lucide/svelte/icons/chevron-down';
  import Info from '@lucide/svelte/icons/info';
  import Layers from '@lucide/svelte/icons/layers';
  import Search from '@lucide/svelte/icons/search';
  import ShieldCheck from '@lucide/svelte/icons/shield-check';
  import User from '@lucide/svelte/icons/user';
  import { staggerIn } from '$lib/motion/motion';

  let { data, state: formState, actions }: AcerolaRoleFormDialogProps = $props();

  const isEdit = $derived(data.mode === 'edit');
  const fields = $derived(data.fields);
  const users = $derived(data.users ?? []);

  let userSearch = $state('');
  let isComboboxOpen = $state(false);
  let listboxEl = $state<HTMLElement | null>(null);

  $effect(() => {
    if (isComboboxOpen && listboxEl) {
      const items = listboxEl.querySelectorAll('[role="option"]');
      if (items.length > 0) {
        staggerIn(items);
      }
    }
  });

  const selectedUser = $derived(
    users.find(
      (u) =>
        u.id === fields.userId.value ||
        (fields.userEmail.value && u.email.toLowerCase() === fields.userEmail.value.toLowerCase()),
    ) ?? null,
  );

  const filteredUsers = $derived(
    userSearch.trim()
      ? users.filter(
          (u) =>
            u.name.toLowerCase().includes(userSearch.toLowerCase()) ||
            u.email.toLowerCase().includes(userSearch.toLowerCase()) ||
            u.id.toLowerCase().includes(userSearch.toLowerCase()),
        )
      : users,
  );

  function handleSelect(user: DirectoryUser): void {
    if (actions.onSelectUser) {
      actions.onSelectUser(user);
    } else {
      actions.onChange('userId', user.id);
      actions.onChange('userEmail', user.email);
    }
  }

  function handleClear(): void {
    if (actions.onClearUser) {
      actions.onClearUser();
    } else {
      actions.onChange('userId', '');
      actions.onChange('userEmail', '');
    }
    userSearch = '';
  }

  function handleSubmit(event: SubmitEvent): void {
    event.preventDefault();
    actions.onSubmit();
  }
</script>

<Dialog open={formState.isOpen} onOpenChange={(open) => !open && actions.onClose()}>
  <DialogContent class="max-w-lg sm:max-w-xl">
    <DialogHeader class="gap-1.5">
      <div class="flex items-center gap-2.5">
        <span
          class="flex size-7 shrink-0 items-center justify-center rounded-chip bg-primary/10 text-primary"
        >
          <ShieldCheck class="size-4" aria-hidden="true" />
        </span>
        <DialogTitle class="text-lg font-semibold tracking-tight">
          {isEdit ? 'Alterar cargo interno' : 'Atribuir cargo interno'}
        </DialogTitle>
      </div>
      <DialogDescription class="text-xs text-muted-foreground">
        {isEdit
          ? 'Atualize o nível de acesso e o papel atribuído a esta pessoa.'
          : 'Defina a área do sistema e o nível de autoridade concedido.'}
      </DialogDescription>
    </DialogHeader>

    <form novalidate onsubmit={handleSubmit} class="flex flex-col gap-4">
      {#if formState.error}
        <ErrorState
          data={{ title: 'Não foi possível salvar', message: formState.error }}
          ui={{ variant: 'inline' }}
        />
      {/if}

      <Timeline ui={{ className: 'pt-2' }}>
        <!-- Etapa 1: Identificação -->
        <TimelineStep
          data={{
            title: 'Identificação da pessoa',
            description: 'A conta que receberá a atribuição de cargo.',
            icon: User,
          }}
          ui={{ tone: 'brand' }}
        >
          {#if isEdit}
            <div
              class="flex items-center justify-between gap-3 rounded-surface border border-border/80 bg-muted/20 p-3.5"
            >
              <div class="flex items-center gap-3 min-w-0">
                <PersonAvatar
                  name={selectedUser?.name || fields.userEmail.value || fields.userId.value}
                  avatarUrl={selectedUser?.image}
                  ui={{ size: 'lg' }}
                />
                <div class="min-w-0">
                  <div class="flex items-center gap-2">
                    <span class="font-semibold text-sm text-foreground truncate">
                      {selectedUser?.name || fields.userEmail.value || fields.userId.value}
                    </span>
                    <span
                      class="text-[10px] font-medium text-muted-foreground bg-muted px-1.5 py-0.5 rounded border border-border/60"
                    >
                      Pessoa existente
                    </span>
                  </div>
                  {#if fields.userEmail.value}
                    <span class="block text-xs text-muted-foreground truncate">
                      {fields.userEmail.value}
                    </span>
                  {/if}
                  <span class="block text-[11px] font-mono text-muted-foreground/80 truncate">
                    ID: {fields.userId.value}
                  </span>
                </div>
              </div>
            </div>
          {:else}
            <div class="flex flex-col gap-2 w-full">
              <div class="flex items-center gap-2 w-full">
                <div class="flex-1 min-w-0 relative w-full">
                  <Popover bind:open={isComboboxOpen}>
                    <PopoverTrigger
                      disabled={formState.isLoadingUsers}
                      style="width: 100%;"
                      class={cn(
                        'control-lg rounded-control',
                        'flex w-full cursor-pointer items-center justify-between gap-3 border border-border/70 bg-card text-left transition-colors hover:bg-muted/40 disabled:cursor-not-allowed disabled:opacity-60',
                        'w-full',
                        fields.userId.value ? 'p-2.5 min-h-10 h-auto' : 'px-3 text-muted-foreground',
                      )}
                      aria-label={fields.userId.value ? 'Alterar pessoa selecionada' : 'Selecionar pessoa da lista'}
                    >
                      {#if selectedUser || fields.userId.value}
                        <div class="flex items-center gap-2.5 min-w-0">
                          <PersonAvatar
                            name={selectedUser?.name || fields.userEmail.value || fields.userId.value}
                            avatarUrl={selectedUser?.image}
                            ui={{ size: 'md' }}
                          />
                          <div class="min-w-0">
                            <div class="flex items-center gap-2">
                              <span class="block text-xs font-semibold text-foreground truncate">
                                {selectedUser?.name || fields.userEmail.value || fields.userId.value}
                              </span>
                              <span
                                class="text-[10px] font-medium text-primary bg-primary/10 px-1.5 py-0.5 rounded border border-primary/20 shrink-0"
                              >
                                Selecionada
                              </span>
                            </div>
                            {#if fields.userEmail.value}
                              <span class="block text-[11px] text-muted-foreground truncate">
                                {fields.userEmail.value}
                              </span>
                            {/if}
                          </div>
                        </div>
                        <div class="flex items-center gap-2 shrink-0">
                          {#if selectedUser?.role}
                            <span
                              class="hidden sm:inline-block text-[10px] font-medium text-muted-foreground bg-muted px-1.5 py-0.5 rounded border border-border/60"
                            >
                              {USER_ROLE_LABELS[selectedUser.role as UserRole] ?? selectedUser.role}
                            </span>
                          {/if}
                          <ChevronDown
                            class={cn(
                              'size-4 text-muted-foreground transition-transform duration-200',
                              isComboboxOpen && 'rotate-180 text-primary',
                            )}
                            aria-hidden="true"
                          />
                        </div>
                      {:else}
                        <div class="flex items-center gap-2 truncate">
                          <User class="size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
                          <span class="text-xs">
                            {formState.isLoadingUsers
                              ? 'Carregando lista de pessoas…'
                              : 'Selecione uma pessoa da lista…'}
                          </span>
                        </div>
                        <ChevronDown
                          class={cn(
                            'size-4 shrink-0 text-muted-foreground transition-transform duration-200',
                            isComboboxOpen && 'rotate-180 text-primary',
                          )}
                          aria-hidden="true"
                        />
                      {/if}
                    </PopoverTrigger>

                    <!-- A LARGURA DO BALÃO É AMARRADA À DO GATILHO, entre um piso e um teto.
                         --bits-popover-anchor-width é a largura do campo de entrada medido pelo
                         componente: o combobox mantém largura igual à do input. -->
                    <PopoverContent
                      matchAnchorWidth
                      class="min-w-(--bits-popover-anchor-width) max-w-(--bits-popover-anchor-width) w-(--bits-popover-anchor-width) p-0"
                      align="start"
                      sideOffset={4}
                    >
                      <div class="relative border-b border-border/70 p-2 sm:p-2.5 w-full">
                        <Search
                          class="pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-muted-foreground"
                          aria-hidden="true"
                        />
                        <input
                          type="search"
                          name="directory_user_search_filter"
                          bind:value={userSearch}
                          placeholder="Buscar colaborador por nome ou e-mail…"
                          autocomplete="off"
                          autocorrect="off"
                          autocapitalize="off"
                          spellcheck={false}
                          data-bwignore="true"
                          data-1p-ignore="true"
                          data-lpignore="true"
                          data-form-type="other"
                          class="control-lg rounded-control w-full border border-border/60 bg-muted/30 pr-3 pl-9.5 text-xs text-foreground outline-none focus:border-primary"
                          style="width: 100%;"
                        />
                      </div>

                      <div
                        bind:this={listboxEl}
                        class="max-h-60 overflow-x-hidden overflow-y-auto divide-y divide-border/40 p-1 w-full"
                        role="listbox"
                        aria-label="Lista de colaboradores"
                      >
                        {#if formState.isLoadingUsers}
                          <p class="py-4 text-center text-xs text-muted-foreground">
                            Carregando lista de pessoas…
                          </p>
                        {:else if filteredUsers.length === 0}
                          <div class="p-4 text-center">
                            <p class="text-xs text-muted-foreground">
                              {userSearch.trim()
                                ? 'Nenhuma pessoa encontrada com esse termo.'
                                : 'Nenhuma pessoa disponível no diretório.'}
                            </p>
                          </div>
                        {:else}
                          {#each filteredUsers as user (user.id)}
                            {@const isSelected = fields.userId.value === user.id}
                            <button
                              type="button"
                              role="option"
                              aria-selected={isSelected}
                              onclick={() => {
                                handleSelect(user);
                                isComboboxOpen = false;
                              }}
                              class={cn(
                                'flex w-full cursor-pointer items-center justify-between gap-3 rounded-control p-2 text-left transition-colors',
                                isSelected ? 'bg-primary/10' : 'hover:bg-muted/60',
                              )}
                            >
                              <div class="flex items-center gap-2.5 min-w-0">
                                <PersonAvatar
                                  name={user.name}
                                  avatarUrl={user.image}
                                  ui={{ size: 'md' }}
                                />
                                <div class="min-w-0">
                                  <div class="flex items-center gap-1.5">
                                    <span
                                      class={cn(
                                        'block text-xs font-semibold truncate',
                                        isSelected ? 'text-primary' : 'text-foreground',
                                      )}
                                    >
                                      {user.name}
                                    </span>
                                    {#if isSelected}
                                      <Check class="size-3 text-primary shrink-0" aria-hidden="true" />
                                    {/if}
                                  </div>
                                  <span class="block text-[11px] text-muted-foreground truncate">
                                    {user.email}
                                  </span>
                                </div>
                              </div>
                              {#if user.role}
                                <span
                                  class="shrink-0 text-[10px] font-medium text-muted-foreground bg-muted px-1.5 py-0.5 rounded border border-border/60"
                                >
                                  {USER_ROLE_LABELS[user.role as UserRole] ?? user.role}
                                </span>
                              {/if}
                            </button>
                          {/each}
                        {/if}
                      </div>
                    </PopoverContent>
                  </Popover>
                </div>

                {#if fields.userId.value}
                  <ActionButton
                    data={{ label: 'Trocar pessoa' }}
                    ui={{ variant: 'ghost', size: 'sm' }}
                    actions={{ onClick: handleClear }}
                  />
                {/if}
              </div>

              {#if fields.userId.error}
                <p class="text-xs text-destructive">{fields.userId.error}</p>
              {/if}
            </div>
          {/if}
        </TimelineStep>

        <!-- Etapa 2: Área / Contexto -->
        <TimelineStep
          data={{
            title: 'Área do sistema (contexto)',
            description: 'Em qual setor ou módulo o cargo terá efeito.',
            icon: Layers,
          }}
          ui={{ tone: 'neutral' }}
        >
          <div class="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
            {#each ROLE_CONTEXTS as ctx (ctx)}
              {@const isSelected = fields.context.value === ctx}
              <button
                type="button"
                disabled={isEdit}
                onclick={() => actions.onChange('context', ctx)}
                class={cn(
                  'flex flex-col items-start gap-1 p-3 rounded-surface border text-left transition-all',
                  isSelected
                    ? 'border-primary bg-primary/5 ring-1 ring-primary'
                    : 'border-border/80 bg-card hover:bg-neutral-50 dark:hover:bg-neutral-900',
                  isEdit && 'opacity-60 cursor-not-allowed',
                )}
              >
                <div class="flex w-full items-center justify-between">
                  <span class="text-xs font-semibold text-foreground">
                    {CONTEXT_DETAILS[ctx].label}
                  </span>
                  {#if isSelected}
                    <Check class="size-3.5 text-primary" aria-hidden="true" />
                  {/if}
                </div>
                <span class="text-[11px] text-muted-foreground leading-tight">
                  {CONTEXT_DETAILS[ctx].description}
                </span>
              </button>
            {/each}
          </div>
        </TimelineStep>

        <!-- Etapa 3: Nível de Autoridade (Cargo) -->
        <TimelineStep
          data={{
            title: 'Nível de autoridade (cargo)',
            description: 'O que essa pessoa pode operar dentro desta área.',
            icon: ShieldCheck,
          }}
          ui={{ isLast: true, tone: 'success' }}
        >
          <div class="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
            {#each ROLE_DETAILS as r (r.value)}
              {@const isSelected = fields.role.value === r.value}
              <button
                type="button"
                onclick={() => actions.onChange('role', r.value)}
                class={cn(
                  'flex flex-col items-start gap-1 p-3 rounded-surface border text-left transition-all',
                  isSelected
                    ? 'border-primary bg-primary/5 ring-1 ring-primary'
                    : 'border-border/80 bg-card hover:bg-neutral-50 dark:hover:bg-neutral-900',
                )}
              >
                <div class="flex w-full items-center justify-between">
                  <span class="text-xs font-semibold text-foreground">{r.label}</span>
                  {#if isSelected}
                    <Check class="size-3.5 text-primary" aria-hidden="true" />
                  {/if}
                </div>
                <span class="text-[11px] text-muted-foreground leading-tight">{r.description}</span>
              </button>
            {/each}
          </div>

          <div
            class="flex items-center gap-2 rounded-box border border-border/60 bg-muted/30 p-2.5 text-xs text-muted-foreground"
          >
            <Info class="size-4 shrink-0 text-primary" aria-hidden="true" />
            <span>
              O cargo <strong>Super Admin</strong> é reservado e só pode ser concedido via comando de
              terminal no servidor (<code class="font-mono text-[11px] bg-background px-1 py-0.5 rounded border border-border">npm run user:promote</code>).
            </span>
          </div>
        </TimelineStep>
      </Timeline>

      <DialogFooter class="mt-4 flex justify-end gap-2 border-t border-border/80 pt-4">
        <ActionButton
          data={{ label: 'Cancelar' }}
          ui={{ variant: 'secondary' }}
          state={{ isDisabled: formState.isSubmitting }}
          actions={{ onClick: actions.onClose }}
        />
        <SubmitButton
          data={{
            label: isEdit ? 'Salvar alterações' : 'Atribuir cargo',
            loadingLabel: 'Salvando…',
          }}
          state={{ isLoading: formState.isSubmitting }}
        />
      </DialogFooter>
    </form>
  </DialogContent>
</Dialog>
