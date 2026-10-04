<script lang="ts" module>
  export type AcerolaPersonAvatarProps = {
    name: string;
    /**
     * Hoje ninguém tem foto — não existe tabela de usuário, então não há de onde vir uma. O
     * campo já existe para o dia em que o provedor de auth-forward resolver o nome para uma
     * pessoa de verdade: quem usa `PersonAvatar` não muda, só passa a receber `avatarUrl`.
     */
    avatarUrl?: string | null;
    ui?: { size?: 'sm' | 'md' | 'lg' | 'xl'; className?: string };
  };

  const SIZE_CLASS = {
    sm: 'size-6 text-xs',
    md: 'size-8 text-xs',
    lg: 'size-12 text-sm',
    xl: 'size-16 text-lg',
  } as const;

  /** Duas iniciais bastam; nome comprido no avatar vira borrão ilegível. */
  function initialsOf(name: string): string {
    return name
      .split(' ')
      .filter(Boolean)
      .map((part) => part[0] ?? '')
      .slice(0, 2)
      .join('')
      .toUpperCase();
  }
</script>

<script lang="ts">
  import { Avatar, AvatarFallback, AvatarImage } from '$lib/components/ui/avatar';
  import { cn } from '$lib/utils/cn';

  let { name, avatarUrl, ui }: AcerolaPersonAvatarProps = $props();

  const size = $derived(ui?.size ?? 'sm');
</script>

<Avatar class={cn('relative flex shrink-0 overflow-hidden rounded-full aspect-square', SIZE_CLASS[size], ui?.className)}>
  {#if avatarUrl}
    <AvatarImage src={avatarUrl} alt={name} class="aspect-square size-full object-cover rounded-full" />
  {/if}
  <AvatarFallback
    class={cn(
      'flex size-full items-center justify-center rounded-full aspect-square bg-gradient-to-br from-success to-info font-bold text-primary-foreground select-none',
      SIZE_CLASS[size]
    )}
  >
    {initialsOf(name)}
  </AvatarFallback>
</Avatar>
