<script lang="ts" module>
  import {
    ROLE_CONTEXT_LABELS,
    ROLE_CONTEXTS,
    USER_ROLE_LABELS,
    type RoleContext,
    type UserRole,
  } from '@template/shared/schemas/user.schema';
  import { type FormFieldState } from '$lib/types/form-field.type';
  import { type RoleFormField } from '$lib/hooks/use-role-form/use-role-form.svelte';

  export type RoleFormDialogProps = {
    data: {
      mode: 'create' | 'edit';
      fields: Record<RoleFormField, FormFieldState>;
    };
    state: { isOpen: boolean; isSubmitting?: boolean; error?: string | null };
    actions: {
      onChange: (field: RoleFormField, value: string) => void;
      onBlur: (field: RoleFormField) => void;
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
  import SubmitButton from '$lib/components/submit-button/submit-button.svelte';
  import TextField from '$lib/components/text-field/text-field.svelte';
  import Timeline from '$lib/components/timeline/timeline.svelte';
  import TimelineStep from '$lib/components/timeline-step/timeline-step.svelte';
  import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
  } from '$lib/components/ui/dialog';
  import { cn } from '$lib/utils/cn';

  import Check from '@lucide/svelte/icons/check';
  import Info from '@lucide/svelte/icons/info';
  import Layers from '@lucide/svelte/icons/layers';
  import ShieldCheck from '@lucide/svelte/icons/shield-check';
  import User from '@lucide/svelte/icons/user';

  let { data, state, actions }: RoleFormDialogProps = $props();

  const isEdit = $derived(data.mode === 'edit');
  const fields = $derived(data.fields);

  function handleSubmit(event: SubmitEvent): void {
    event.preventDefault();
    actions.onSubmit();
  }
</script>

<Dialog open={state.isOpen} onOpenChange={(open) => !open && actions.onClose()}>
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
      {#if state.error}
        <ErrorState
          data={{ title: 'Não foi possível salvar', message: state.error }}
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
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <TextField
              data={{
                label: 'Identificador / ID da pessoa',
                name: 'userId',
                value: fields.userId.value,
                placeholder: 'Ex: usr_123 ou e-mail',
                isRequired: true,
              }}
              state={{ error: fields.userId.error, isDisabled: isEdit }}
              actions={{
                onChange: (val) => actions.onChange('userId', val),
                onBlur: () => actions.onBlur('userId'),
              }}
            />

            <TextField
              data={{
                label: 'E-mail corporativo (opcional)',
                name: 'userEmail',
                value: fields.userEmail.value,
                placeholder: 'Ex: ana@empresa.com.br',
              }}
              state={{ error: fields.userEmail.error }}
              actions={{
                onChange: (val) => actions.onChange('userEmail', val),
                onBlur: () => actions.onBlur('userEmail'),
              }}
            />
          </div>
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
          state={{ isDisabled: state.isSubmitting }}
          actions={{ onClick: actions.onClose }}
        />
        <SubmitButton
          data={{
            label: isEdit ? 'Salvar alterações' : 'Atribuir cargo',
            loadingLabel: 'Salvando…',
          }}
          state={{ isLoading: state.isSubmitting }}
        />
      </DialogFooter>
    </form>
  </DialogContent>
</Dialog>
