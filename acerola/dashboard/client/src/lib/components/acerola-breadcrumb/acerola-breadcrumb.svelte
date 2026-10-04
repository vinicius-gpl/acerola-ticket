<script lang="ts" module>
  /**
   * A trilha de onde a pessoa está: "Computadores › Estação 12 › Histórico". Envolve o
   * `ui/breadcrumb` do shadcn.
   *
   * O ÚLTIMO item é sempre a página atual, e por isso nunca é link — clicar nele não levaria a
   * lugar nenhum. Os de antes são link quando têm `href`; sem `href`, viram texto.
   */
  export type BreadcrumbEntry = { label: string; href?: string };

  export type AcerolaBreadcrumbProps = {
    data: { items: BreadcrumbEntry[] };
    ui?: { className?: string };
  };
</script>

<script lang="ts">
  import {
    Breadcrumb,
    BreadcrumbItem,
    BreadcrumbLink,
    BreadcrumbList,
    BreadcrumbPage,
    BreadcrumbSeparator,
  } from '$lib/components/ui/breadcrumb';

  let { data, ui }: AcerolaBreadcrumbProps = $props();
</script>

<!-- Trilha vazia não é uma trilha: sem itens, nada é desenhado. -->
{#if data.items.length > 0}
  <Breadcrumb aria-label="Você está em" class={ui?.className}>
    <BreadcrumbList class="text-ink-500 text-sm">
      {#each data.items as item, index (index)}
        {@const isLast = index === data.items.length - 1}
        <BreadcrumbItem>
          {#if isLast}
            <BreadcrumbPage class="text-ink-900 font-medium break-words">{item.label}</BreadcrumbPage>
          {:else if item.href}
            <BreadcrumbLink href={item.href} class="hover:text-ink-900 break-words">
              {item.label}
            </BreadcrumbLink>
          {:else}
            <span class="break-words">{item.label}</span>
          {/if}
        </BreadcrumbItem>

        {#if !isLast}
          <BreadcrumbSeparator />
        {/if}
      {/each}
    </BreadcrumbList>
  </Breadcrumb>
{/if}
