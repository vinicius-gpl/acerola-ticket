import { Inbox, type LucideIcon } from 'lucide-react';
import { type ReactNode } from 'react';

import { cn } from '../../utils/cn.util';

/**
 * O que a tela mostra quando NÃO HÁ NADA — e só depois que a consulta terminou.
 *
 * Três regras:
 *  - Diz o que está vazio ("Nenhuma tarefa"), nunca só "Sem dados".
 *  - Diz o PRÓXIMO PASSO (`description`) e, quando houver, oferece o botão (`children`).
 *  - Diferencia "não existe nada" de "o filtro escondeu tudo" — essa é a diferença entre
 *    cadastrar e limpar o filtro, e cabe a quem usa escolher o texto certo.
 *
 * Vazio mostrado DURANTE o carregamento faz a pessoa achar que o cadastro sumiu — e recarregar.
 * Por isso a tela decide `isEmpty` só com a consulta concluída.
 */
export type EmptyStateProps = {
  data: { title: string; description?: string };
  ui?: { icon?: LucideIcon; className?: string };
  /** A ação sugerida, já montada (normalmente um `ActionButton`). */
  children?: ReactNode;
};

export function EmptyState({ data, ui, children }: EmptyStateProps) {
  const Icon = ui?.icon ?? Inbox;

  return (
    <div
      className={cn(
        'border-ink-300 flex flex-col items-center justify-center gap-2 rounded-lg border border-dashed px-6 py-12 text-center',
        ui?.className,
      )}
    >
      <span className="bg-ink-100 text-ink-500 flex size-11 items-center justify-center rounded-full">
        <Icon className="size-5" aria-hidden="true" />
      </span>
      <p className="text-ink-900 text-sm font-semibold">{data.title}</p>
      {data.description ? (
        <p className="text-ink-500 max-w-sm text-sm">{data.description}</p>
      ) : null}
      {children ? <div className="mt-2">{children}</div> : null}
    </div>
  );
}
