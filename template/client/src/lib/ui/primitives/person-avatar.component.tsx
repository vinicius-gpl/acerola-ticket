import { Avatar, AvatarFallback, AvatarImage } from '../../vendor/ui/avatar';
import { cn } from '../../utils/cn.util';

export type PersonAvatarProps = {
  name: string;
  /**
   * Hoje ninguém tem foto — não existe tabela de usuário, então não há de onde vir uma. O
   * campo já existe para o dia em que o provedor de auth-forward resolver o nome para uma
   * pessoa de verdade: quem usa `PersonAvatar` não muda, só passa a receber `avatarUrl`.
   */
  avatarUrl?: string | null;
  ui?: { size?: 'sm' | 'md'; className?: string };
};

const SIZE_CLASS = {
  sm: 'size-6 text-[10px]',
  md: 'size-8 text-xs',
} as const;

/**
 * O círculo de avatar sozinho, sem o nome ao lado — separado de `OwnerBadge` porque o
 * seletor de responsável (`OwnerSelectField`) precisa do mesmo círculo ao lado de um texto
 * que já traz a contagem embutida ("Camila (2)"), e não do nome puro que `OwnerBadge` escreve.
 *
 * Sem foto de verdade, o "mock" é iniciais com gradiente — o mesmo que a barra lateral e a
 * tela de perfil já usam para a pessoa logada, para não inventar uma segunda forma de avatar
 * genérico dentro do mesmo sistema.
 */
export function PersonAvatar({ name, avatarUrl, ui }: PersonAvatarProps) {
  const size = ui?.size ?? 'sm';

  return (
    <Avatar className={cn(SIZE_CLASS[size], ui?.className)}>
      {avatarUrl ? <AvatarImage src={avatarUrl} alt="" /> : null}
      <AvatarFallback
        className={cn(
          'bg-gradient-to-br from-emerald-400 to-blue-500 font-bold text-white',
          SIZE_CLASS[size],
        )}
      >
        {initialsOf(name)}
      </AvatarFallback>
    </Avatar>
  );
}

/** Duas iniciais bastam; nome comprido no avatar vira borrão ilegível. */
function initialsOf(name: string): string {
  return name
    .split(' ')
    .map((part) => part[0] ?? '')
    .slice(0, 2)
    .join('')
    .toUpperCase();
}
