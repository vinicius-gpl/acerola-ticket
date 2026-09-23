<script lang="ts" module>
  import type { LucideIcon } from '@lucide/svelte';

  /**
   * A tela de uma área do sistema que ainda não foi construída.
   *
   * Ela existe porque a migração do sistema antigo é feita por partes, e sem ela o menu
   * mentiria de duas formas: escondendo áreas que já foram combinadas (dando a impressão de
   * que o sistema é menor do que vai ser) ou mostrando um item que abre uma tela em branco
   * (dando a impressão de que quebrou).
   *
   * Por isso ela NÃO é um "em breve" vazio: lista o que aquela área vai fazer, lido dos
   * requisitos do sistema antigo. Assim a tela informa mesmo antes de funcionar, e quem abre
   * consegue conferir se o que está previsto é o que precisa.
   *
   * Quando a área for construída, esta tela é substituída pela de verdade — este componente
   * não deve sobreviver ao fim da migração.
   */
  export type PendingAreaProps = {
    data: {
      title: string;
      /** Uma linha dizendo para que serve a área. */
      summary: string;
      /** O que ela vai permitir fazer, em frases curtas. */
      features: string[];
      /** O que precisa existir antes dela. Vazio quando nada bloqueia. */
      dependsOn?: string | null;
    };
    ui?: { icon?: LucideIcon };
  };
</script>

<script lang="ts">
  import Construction from '@lucide/svelte/icons/construction';

  import PageHeader from '$lib/components/page-header/page-header.svelte';

  let { data, ui }: PendingAreaProps = $props();

  const Icon = $derived(ui?.icon ?? Construction);
</script>

<div class="mx-auto flex w-full max-w-5xl flex-col gap-5 px-4 pb-10 sm:px-6">
  <PageHeader data={{ title: data.title, description: data.summary }} />

  <section class="border-ink-300 bg-card rounded-lg border border-dashed p-6">
    <div class="flex items-start gap-3">
      <Icon class="text-ink-500 mt-0.5 size-5 shrink-0" aria-hidden="true" />
      <div class="min-w-0">
        <h2 class="text-ink-900 text-[1rem] font-semibold">Esta área ainda não foi construída</h2>
        <p class="text-ink-700 mt-1 text-sm">
          O que está previsto para ela, vindo do sistema antigo:
        </p>

        <ul class="text-ink-700 mt-3 flex flex-col gap-1.5 text-sm">
          {#each data.features as feature (feature)}
            <li class="flex gap-2">
              <span class="bg-ink-300 mt-2 size-1.5 shrink-0 rounded-full" aria-hidden="true"
              ></span>
              <span class="break-words">{feature}</span>
            </li>
          {/each}
        </ul>

        <!-- Dizer o que falta antes evita a pergunta "por que não fizeram esta primeiro?".

             A frase é nominal ("Antes desta área: X") de propósito. Com verbo, a concordância
             quebra conforme a dependência seja uma ou duas — "depende de o Inventário e os
             Chamados estar pronto" não é português. Sem verbo, a mesma frase serve para
             qualquer quantidade. -->
        {#if data.dependsOn}
          <p class="text-ink-500 mt-4 text-sm">
            Antes desta área: <strong class="font-semibold">{data.dependsOn}</strong>.
          </p>
        {/if}
      </div>
    </div>
  </section>
</div>
