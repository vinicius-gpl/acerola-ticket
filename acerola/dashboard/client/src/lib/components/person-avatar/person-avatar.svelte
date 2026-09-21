<script lang="ts" module>
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

  /** Duas iniciais bastam; nome comprido no avatar vira borrão ilegível. */
  function initialsOf(name: string): string {
    return name
      .split(' ')
      .map((part) => part[0] ?? '')
      .slice(0, 2)
      .join('')
      .toUpperCase();
  }
</script>

<script lang="ts">
  import { Avatar, AvatarFallback, AvatarImage } from '$lib/components/ui/avatar';
  import { cn } from '$lib/utils/cn.util';

  let { name, avatarUrl, ui }: PersonAvatarProps = $props();

  const size = $derived(ui?.size ?? 'sm');
</script>

<Avatar class={cn(SIZE_CLASS[size], ui?.className)}>
  {#if avatarUrl}
    <AvatarImage src={avatarUrl} alt="" />
  {/if}
  <AvatarFallback
    class={cn(
      'bg-gradient-to-br from-emerald-400 to-blue-500 font-bold text-white',
      SIZE_CLASS[size]
    )}
  >
    {initialsOf(name)}
  </AvatarFallback>
</Avatar>
