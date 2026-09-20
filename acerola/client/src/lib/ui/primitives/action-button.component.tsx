import { Loader2, type LucideIcon } from 'lucide-react';
import { tv } from 'tailwind-variants';

import { cn } from '../../utils/cn.util';
import { Button } from '../../vendor/ui/button';

/**
 * O botão do sistema. Toda ação que não é "enviar formulário" passa por aqui.
 *
 * É o exemplo da seção 5 do CONTRIBUTING: o `Button` baixado do shadcn NÃO é editado nem
 * importado pelas telas. Este primitivo o envolve e aplica as NOSSAS variantes com `tv()` — o
 * dia em que o CLI sobrescrever o vendor, nenhuma tela muda.
 *
 * Carregando, ele trava e troca o ícone pelo giro: dois cliques em "Excluir" seriam duas
 * requisições, e a segunda voltaria como "não encontrado" de algo que acabou de dar certo.
 */
const actionButton = tv({
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
    icon?: LucideIcon;
    /** Só o ícone aparece; o rótulo vira `aria-label` e dica. Use com parcimônia. */
    isIconOnly?: boolean;
    className?: string;
  };
  state?: { isLoading?: boolean; isDisabled?: boolean };
  actions?: { onClick?: () => void };
};

export function ActionButton({ data, ui, state, actions }: ActionButtonProps) {
  /* Os padrões são resolvidos em funções à parte, e não aqui: é o que mantém este componente
     legível como composição, em vez de uma lista de `??` antes do JSX. */
  const { isBusy, isDisabled } = resolveState(state);
  const { Icon, label, accessibleName } = resolveContent(data, ui, isBusy);

  return (
    <Button
      type="button"
      size={buttonSize(ui)}
      disabled={isBusy || isDisabled}
      aria-busy={isBusy}
      aria-label={accessibleName}
      title={accessibleName}
      onClick={actions?.onClick}
      className={cn(actionButton({ variant: ui?.variant }), ui?.className)}
    >
      {Icon ? <Icon className={cn(isBusy && 'animate-spin')} aria-hidden="true" /> : null}
      {label}
    </Button>
  );
}

function resolveState(state: ActionButtonProps['state']) {
  return { isBusy: Boolean(state?.isLoading), isDisabled: Boolean(state?.isDisabled) };
}

/** Só ícone: o rótulo sai da tela, mas continua sendo o nome do botão para o leitor de tela. */
function resolveContent(
  data: ActionButtonProps['data'],
  ui: ActionButtonProps['ui'],
  isBusy: boolean,
): { Icon: LucideIcon | undefined; label: string | null; accessibleName: string | undefined } {
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
