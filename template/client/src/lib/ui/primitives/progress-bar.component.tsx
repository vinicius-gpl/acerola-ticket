import { cn } from '../../utils/cn.util';

export type ProgressBarProps = {
  data: { percentage: number; done: number; total: number };
  ui?: {
    showCount?: boolean;
    /** O que está sendo contado, no plural, para o leitor de tela: "tarefas", "etapas". */
    itemLabel?: string;
    /** O texto quando não há nada a cumprir. */
    emptyLabel?: string;
    className?: string;
  };
};

type ProgressTone = 'emerald' | 'yellow' | 'orange' | 'red';

const TONE_CLASSES: Record<ProgressTone, string> = {
  emerald: 'bg-emerald-500',
  yellow: 'bg-yellow-500',
  orange: 'bg-orange-500',
  red: 'bg-red-500',
};

/** Cada faixa tem um tom, e é por ele que a lista é lida de relance. */
function progressTone(percentage: number): ProgressTone {
  if (percentage >= 100) return 'emerald';
  if (percentage >= 70) return 'yellow';
  if (percentage >= 40) return 'orange';

  return 'red';
}

export function ProgressBar({ data, ui }: ProgressBarProps) {
  /* Nada a cumprir NÃO é 0%. Uma barra vermelha zerada acusaria atraso onde não há — e
     seria ruído em toda a lista. */
  if (data.total === 0) {
    return (
      <span className={cn('text-ink-500 text-xs', ui?.className)}>
        {ui?.emptyLabel ?? 'Nada a cumprir'}
      </span>
    );
  }

  const percentage = Math.min(100, Math.max(0, data.percentage));

  return (
    <div className={cn('flex items-center gap-2', ui?.className)}>
      <div
        className="bg-ink-100 h-2 w-full overflow-hidden rounded-full"
        role="progressbar"
        aria-valuenow={percentage}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={`Concluído: ${data.done} de ${data.total} ${ui?.itemLabel ?? 'itens'}`}
      >
        <div
          className={cn(
            'h-full rounded-full transition-[width]',
            TONE_CLASSES[progressTone(percentage)],
          )}
          style={{ width: `${percentage}%` }}
        />
      </div>
      <span className="text-ink-700 w-14 shrink-0 text-right text-xs tabular-nums">
        {ui?.showCount ? `${data.done}/${data.total}` : `${percentage}%`}
      </span>
    </div>
  );
}
