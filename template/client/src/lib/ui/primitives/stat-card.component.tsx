import { type LucideIcon } from 'lucide-react';
import { type ReactNode } from 'react';

import { cn } from '../../utils/cn.util';
import { Skeleton } from '../../vendor/ui/skeleton';

/**
 * Um número grande com o que ele significa embaixo.
 *
 * Sem `ui.icon`: a barra colorida fica na ESQUERDA, e não no fundo do cartão. Fundo inteiro
 * tingido compete com o número — e o número é a única coisa que a pessoa veio ler. A cor aqui
 * serve para agrupar com o olho, não para chamar atenção.
 *
 * Com `ui.icon`: o quadrado de ícone SUBSTITUI a barra — as duas juntas seriam duas pistas de
 * cor dizendo a mesma coisa. Cor sólida, sem gradiente nem brilho no canto: o ícone é
 * identidade da categoria, não um efeito para chamar atenção sozinho.
 *
 * `hint` existe para o número que exclui algo — "exclui 1.067 arquivados", escrito miúdo
 * embaixo do total. Um número que exclui algo precisa dizer o que excluiu, ou vira dois
 * painéis discordando sobre a mesma base.
 *
 * `bg-ink-100/50` (e não `bg-white`/`bg-card`) É DE PROPÓSITO: num painel, agrupe vários
 * `StatCard` dentro de um `Card` com ESSA MESMA COR de fundo. A cor repetida é o que faz o
 * olho ler "um bloco só, dividido em quatro números" em vez de "caixa dentro de caixa".
 */
export type StatCardTone = 'brand' | 'neutral' | 'success' | 'warning' | 'danger' | 'info';

export type StatCardProps = {
  data: {
    label: string;
    value: number | string;
    hint?: string | null;
  };
  ui?: {
    tone?: StatCardTone;
    size?: 'md' | 'lg';
    className?: string;
    icon?: LucideIcon;
  };
  state?: { isLoading?: boolean };
};

const TONE_BAR: Record<StatCardTone, string> = {
  brand: 'bg-brand-blue-700',
  neutral: 'bg-ink-300',
  success: 'bg-emerald-500',
  warning: 'bg-amber-500',
  danger: 'bg-rose-500',
  info: 'bg-sky-500',
};

const TONE_VALUE: Record<StatCardTone, string> = {
  brand: 'text-brand-blue-800',
  neutral: 'text-ink-900',
  success: 'text-emerald-600',
  warning: 'text-amber-600',
  danger: 'text-rose-600',
  info: 'text-sky-600',
};

/** Cor SÓLIDA do quadrado do ícone — nunca a mesma pastel do texto, senão o ícone some nela. */
const TONE_ICON: Record<StatCardTone, string> = {
  brand: 'bg-brand-blue-800 text-white',
  neutral: 'bg-ink-700 text-white',
  success: 'bg-emerald-600 text-white',
  warning: 'bg-amber-600 text-white',
  danger: 'bg-rose-600 text-white',
  info: 'bg-sky-600 text-white',
};

/** Quadrado de ícone OU barra lateral — nunca os dois, então a decisão fica isolada aqui. */
function StatCardAccent({ tone, icon: Icon }: { tone: StatCardTone; icon?: LucideIcon }) {
  if (Icon) {
    return (
      <span
        className={cn('mb-3 flex size-9 items-center justify-center rounded-lg', TONE_ICON[tone])}
      >
        <Icon size={16} aria-hidden="true" />
      </span>
    );
  }

  return (
    <span aria-hidden="true" className={cn('absolute inset-y-0 left-0 w-1', TONE_BAR[tone])} />
  );
}

export function StatCard({ data, ui, state }: StatCardProps) {
  const tone = ui?.tone ?? 'neutral';

  return (
    <div
      className={cn(
        'border-ink-300 bg-ink-100/50 relative overflow-hidden rounded-lg border py-4 pr-4 pl-5',
        ui?.className,
      )}
    >
      <StatCardAccent tone={tone} icon={ui?.icon} />

      <p className="text-ink-500 text-[11px] font-semibold tracking-wider uppercase">
        {data.label}
      </p>

      {state?.isLoading ? (
        <Skeleton className="mt-1 h-8 w-20" />
      ) : (
        <p
          className={cn(
            'mt-0.5 font-bold tabular-nums',
            ui?.size === 'lg' ? 'text-4xl' : 'text-2xl',
            TONE_VALUE[tone],
          )}
        >
          {data.value}
        </p>
      )}

      {data.hint ? <p className="text-ink-500 mt-1 text-[11px]">{data.hint}</p> : null}
    </div>
  );
}

/**
 * A grade dos cartões. Existe como componente para que a quantidade de colunas seja uma
 * decisão só — quatro telas escolhendo a própria grade é como elas deixam de parecer o
 * mesmo sistema.
 */
export function StatCardGrid({
  children,
  ui,
}: {
  children: ReactNode;
  ui?: { className?: string };
}) {
  return (
    <div className={cn('grid gap-3 sm:grid-cols-2 lg:grid-cols-4', ui?.className)}>{children}</div>
  );
}
