<script lang="ts" module>
  import { tv } from 'tailwind-variants';
  import type { Component } from 'svelte';

  export const actionButton = tv({
    base: 'font-semibold',
    variants: {
      variant: {
        primary: 'bg-brand-blue-800 hover:bg-brand-blue-900 text-white',
        secondary: 'border-input bg-card text-foreground hover:bg-accent border',
        ghost: 'text-ink-700 hover:bg-accent hover:text-accent-foreground bg-transparent shadow-none',
        danger: 'bg-red-600 text-white hover:bg-red-700',
      },
    },
    defaultVariants: { variant: 'primary' },
  });

  export type ActionButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger';

  export type ActionButtonProps = {
    data: { label: string; loadingLabel?: string };
    ui?: {
      variant?: ActionButtonVariant;
      size?: 'sm' | 'md';
      icon?: Component<any>;
      /** Só o ícone aparece; o rótulo vira `aria-label` e dica. Use com parcimônia. */
      isIconOnly?: boolean;
      className?: string;
    };
    state?: { isLoading?: boolean; isDisabled?: boolean };
    actions?: { onClick?: () => void };
  };

  function resolveState(state: ActionButtonProps['state']) {
    return { isBusy: Boolean(state?.isLoading), isDisabled: Boolean(state?.isDisabled) };
  }

  function resolveContent(
    data: ActionButtonProps['data'],
    ui: ActionButtonProps['ui'],
    isBusy: boolean,
  ): { Icon: Component<any> | undefined; label: string | null; accessibleName: string | undefined } {
    const text = isBusy ? (data.loadingLabel ?? data.label) : data.label;
    const Icon = isBusy ? Loader2 : ui?.icon;
    if (ui?.isIconOnly) return { Icon, label: null, accessibleName: data.label };

    return { Icon, label: text, accessibleName: undefined };
  }

  function buttonSize(ui: ActionButtonProps['ui']): 'sm' | 'default' | 'icon-sm' | 'icon' {
    const isSmall = ui?.size === 'sm';
    if (ui?.isIconOnly) return isSmall ? 'icon-sm' : 'icon';

    return isSmall ? 'sm' : 'default';
  }
</script>

<script lang="ts">
  import Loader2 from '@lucide/svelte/icons/loader-2';
  import { cn } from '$lib/utils/cn.util';
  import { Button } from '$lib/vendor/ui/button';

  let { data, ui, state, actions }: ActionButtonProps = $props();

  const { isBusy, isDisabled } = $derived(resolveState(state));
  const { Icon, label, accessibleName } = $derived(resolveContent(data, ui, isBusy));
</script>

<Button
  type="button"
  size={buttonSize(ui)}
  disabled={isBusy || isDisabled}
  aria-busy={isBusy}
  aria-label={accessibleName}
  title={accessibleName}
  onclick={actions?.onClick}
  class={cn(actionButton({ variant: ui?.variant }), ui?.className)}
>
  {#if Icon}
    <Icon class={cn(isBusy && 'animate-spin')} aria-hidden="true" />
  {/if}
  {label}
</Button>
