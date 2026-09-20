import { type ReactNode } from 'react';

import { cn } from '../../utils/cn.util';

/**
 * O topo de toda tela: título, uma linha dizendo o que a tela é, e as ações principais.
 *
 * Existe como componente para que TODA tela comece igual. Cada tela escolhendo o próprio
 * tamanho de título e o próprio lugar do botão é como o sistema passa a parecer montado por
 * pessoas diferentes.
 *
 * `h1` de propósito: é o título da página para o leitor de tela. Uma tela, um `h1`.
 */
export type PageHeaderProps = {
  data: { title: string; description?: string };
  ui?: { className?: string };
  /** As ações da tela, já montadas (normalmente `ActionButton`). Ficam à direita. */
  children?: ReactNode;
};

export function PageHeader({ data, ui, children }: PageHeaderProps) {
  return (
    <header
      className={cn(
        'flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between',
        ui?.className,
      )}
    >
      <div className="min-w-0">
        <h1 className="text-ink-900 text-xl font-bold">{data.title}</h1>
        {data.description ? (
          <p className="text-ink-500 mt-0.5 text-sm">{data.description}</p>
        ) : null}
      </div>
      {children ? <div className="flex shrink-0 flex-wrap gap-2">{children}</div> : null}
    </header>
  );
}
