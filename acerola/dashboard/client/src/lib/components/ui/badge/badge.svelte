<script lang="ts" module>
  import { cva, type VariantProps } from 'class-variance-authority';
  import type { HTMLAttributes } from 'svelte/elements';
  import type { Snippet } from 'svelte';

  export const badgeVariants = cva(
    "inline-flex w-fit shrink-0 items-center justify-center gap-1 overflow-hidden rounded-full border border-transparent px-2 py-0.5 text-xs font-medium whitespace-nowrap transition-[color,box-shadow] focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 aria-invalid:border-destructive aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 [&>svg]:pointer-events-none [&>svg]:size-3",
    {
      variants: {
        variant: {
          default: "bg-primary text-primary-foreground [a&]:hover:bg-primary/90",
          secondary:
            "bg-secondary text-secondary-foreground [a&]:hover:bg-secondary/90",
          destructive:
            "bg-destructive text-white focus-visible:ring-destructive/20 dark:bg-destructive/60 dark:focus-visible:ring-destructive/40 [a&]:hover:bg-destructive/90",
          outline:
            "border-border text-foreground [a&]:hover:bg-accent [a&]:hover:text-accent-foreground",
          ghost: "[a&]:hover:bg-accent [a&]:hover:text-accent-foreground",
          link: "text-primary underline-offset-4 [a&]:hover:underline",
        },
      },
      defaultVariants: {
        variant: "default",
      },
    }
  );

  export type BadgeVariant = VariantProps<typeof badgeVariants>['variant'];
  export type BadgeProps = HTMLAttributes<HTMLSpanElement> & {
    variant?: BadgeVariant;
    ref?: HTMLSpanElement | null;
    children?: Snippet;
  };
</script>

<script lang="ts">
  import { cn } from '$lib/utils/cn';

  let {
    class: className,
    variant = "default",
    ref = $bindable(null),
    children,
    ...restProps
  }: BadgeProps = $props();
</script>

<span
  bind:this={ref}
  data-slot="badge"
  data-variant={variant}
  class={cn(badgeVariants({ variant }), className)}
  {...restProps}
>
  {@render children?.()}
</span>
