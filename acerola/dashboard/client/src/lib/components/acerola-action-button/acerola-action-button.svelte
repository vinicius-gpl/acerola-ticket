<script lang="ts" module>
  import type { LucideIcon } from '@lucide/svelte';
  import { tv } from 'tailwind-variants';

  /**
   * A altura e o raio vêm da RÉGUA DE MEDIDAS (`lib/theme/tokens.css`), e não do componente
   * baixado: ele tem a escala dele (32, 28, 24px), que não é a do projeto. Era esse
   * desencontro que deixava o "Cancelar" mais baixo que o "Salvar" no rodapé do diálogo.
   *
   * O `size` do `Button`, mais abaixo, continua entrando — mas só pelo tamanho do ícone e
   * pelo espaço entre ícone e texto. A altura é nossa.
   */
  export const actionButton = tv({
    base: 'align-middle font-semibold rounded-control shadow-xs transition-all',
    variants: {
      variant: {
        primary: 'bg-primary hover:bg-primary/90 text-primary-foreground',
        secondary: 'border-border bg-card text-foreground hover:bg-accent/50 border',
        ghost: 'text-foreground/80 hover:bg-accent hover:text-foreground bg-transparent shadow-none border border-transparent',
        danger: 'bg-destructive text-destructive-foreground hover:bg-destructive/90',
      },
      size: {
        sm: 'control-sm',
        md: 'control-md',
        lg: 'control-lg',
      },
      /* Botão só de ícone é quadrado: a largura acompanha a altura, e não o ícone dentro. */
      isIconOnly: { true: '', false: '' },
    },
    compoundVariants: [
      { size: 'sm', isIconOnly: true, class: 'control-icon-sm' },
      { size: 'md', isIconOnly: true, class: 'control-icon-md' },
      { size: 'lg', isIconOnly: true, class: 'control-icon-lg' },
    ],
    defaultVariants: { variant: 'primary', size: 'md', isIconOnly: false },
  });

  export type ActionButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger';

  export type ActionButtonSize = 'sm' | 'md' | 'lg';

  export type AcerolaActionButtonProps = {
    data: { label: string; loadingLabel?: string };
    ui?: {
      variant?: ActionButtonVariant;
      /**
       * O degrau da régua de medidas (`lib/theme/tokens.css`).
       *
       * `sm` dentro de uma linha de tabela, `md` (o padrão) para a ação da tela e o rodapé
       * do diálogo, `lg` quando o botão divide fileira com um campo de formulário — ali ele
       * tem que ter a altura do campo, não a dele.
       */
      size?: ActionButtonSize;
      icon?: LucideIcon;
      /** Só o ícone aparece; o rótulo vira `aria-label` e dica. Use com parcimônia. */
      isIconOnly?: boolean;
      className?: string;
    };
    state?: {
      isLoading?: boolean;
      isDisabled?: boolean;
      /** Para botão que liga/desliga ou faz parte de uma escolha: anuncia qual está valendo. */
      isPressed?: boolean;
    };
    actions?: { onClick?: () => void };
  };

  function resolveState(state: AcerolaActionButtonProps['state']) {
    return { isBusy: Boolean(state?.isLoading), isDisabled: Boolean(state?.isDisabled) };
  }

  function resolveContent(
    data: AcerolaActionButtonProps['data'],
    ui: AcerolaActionButtonProps['ui'],
    isBusy: boolean,
  ): { Icon: LucideIcon | undefined; label: string | null; accessibleName: string | undefined } {
    const text = isBusy ? (data.loadingLabel ?? data.label) : data.label;
    const Icon = isBusy ? Loader2 : ui?.icon;
    if (ui?.isIconOnly) return { Icon, label: null, accessibleName: data.label };

    return { Icon, label: text, accessibleName: undefined };
  }

  /** Do componente baixado sobram o tamanho do ícone e o espaço até o texto. */
  const BUTTON_SIZES: Record<ActionButtonSize, 'sm' | 'default' | 'lg'> = {
    sm: 'sm',
    md: 'default',
    lg: 'lg',
  };

  const BUTTON_ICON_SIZES: Record<ActionButtonSize, 'icon-sm' | 'icon' | 'icon-lg'> = {
    sm: 'icon-sm',
    md: 'icon',
    lg: 'icon-lg',
  };

  function buttonSize(
    ui: AcerolaActionButtonProps['ui'],
  ): 'sm' | 'default' | 'lg' | 'icon-sm' | 'icon' | 'icon-lg' {
    const size = ui?.size ?? 'md';
    if (ui?.isIconOnly) return BUTTON_ICON_SIZES[size];

    return BUTTON_SIZES[size];
  }
</script>

<script lang="ts">
  import Loader2 from '@lucide/svelte/icons/loader-2';
  import { cn } from '$lib/utils/cn';
  import { Button } from '$lib/components/ui/button';

  let { data, ui, state, actions }: AcerolaActionButtonProps = $props();

  const { isBusy, isDisabled } = $derived(resolveState(state));
  const { Icon, label, accessibleName } = $derived(resolveContent(data, ui, isBusy));
</script>

<Button
  type="button"
  size={buttonSize(ui)}
  disabled={isBusy || isDisabled}
  aria-busy={isBusy}
  aria-pressed={state?.isPressed}
  aria-label={accessibleName}
  title={accessibleName}
  onclick={actions?.onClick}
  class={cn(
    actionButton({ variant: ui?.variant, size: ui?.size, isIconOnly: ui?.isIconOnly }),
    ui?.className,
  )}
>
  {#if Icon}
    <Icon class={cn(isBusy && 'animate-spin')} aria-hidden="true" />
  {/if}
  {label}
</Button>
