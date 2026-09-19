import { cn } from '../utils/cn.util';

/**
 * O nome do projeto na barra lateral. Sem imagem de propósito: um template não tem logo até
 * quem usa desenhar uma. Trocar o nome aqui é o único passo — não há arquivo de imagem para
 * substituir. A skill `renomear-projeto` aponta para este arquivo.
 */
export type BrandMarkProps = {
  ui?: {
    size?: 'sm' | 'md' | 'lg';
    className?: string;
  };
};

const TEXT_SIZES = { sm: 'text-sm', md: 'text-base', lg: 'text-xl' } as const;

export function BrandMark({ ui }: BrandMarkProps) {
  return (
    <span
      className={cn(
        'text-sidebar-foreground shrink-0 font-semibold tracking-tight',
        TEXT_SIZES[ui?.size ?? 'md'],
        ui?.className,
      )}
    >
      Template
    </span>
  );
}
