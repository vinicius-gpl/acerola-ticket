<script lang="ts">
  import { cn } from '../utils/cn.util';

  export type BrandMarkProps = {
    ui?: {
      size?: 'sm' | 'md' | 'lg';
      className?: string;
    };
  };

  const TEXT_SIZES = { sm: 'text-sm', md: 'text-base', lg: 'text-xl' } as const;

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
