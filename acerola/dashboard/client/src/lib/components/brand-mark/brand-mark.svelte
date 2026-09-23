<script lang="ts">
  import { cn } from '$lib/utils/cn';

  export type BrandMarkProps = {
    ui?: {
      size?: 'sm' | 'md' | 'lg';
      className?: string;
    };
  };

  /* `text-[1rem]` e não `text-base`: a paleta tem um token de cor chamado `base`, então
     `text-base` vira COR (quase branca) em vez de tamanho — ver `app-shell-nav-entry`. */
  const TEXT_SIZES = { sm: 'text-sm', md: 'text-[1rem]', lg: 'text-xl' } as const;

  let { ui }: BrandMarkProps = $props();
</script>

<span
  class={cn(
    'text-sidebar-foreground shrink-0 font-semibold tracking-tight',
    TEXT_SIZES[ui?.size ?? 'md'],
    ui?.className,
  )}
>
  acerola-ticket
</span>
