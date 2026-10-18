<script lang="ts">
  import { observeVisualViewport } from '$lib/utils/observe-visual-viewport.util';
  import { cn } from '$lib/utils/cn';
  import XIcon from '@lucide/svelte/icons/x';
  import { Dialog as DialogPrimitive } from 'bits-ui';
  import DialogPortal from '$lib/components/ui/dialog/dialog-portal.svelte';
  import DialogOverlay from '$lib/components/ui/dialog/dialog-overlay.svelte';
  import type { Snippet } from 'svelte';

  /**
   * O MESMO `DialogContent` de sempre, só que no celular ele nasce de baixo, com cantos de
   * cima arredondados e uma alça para arrastar — o bottom sheet que o Material Design usa.
   *
   * É um componente PRÓPRIO, e não uma edição do `ui/dialog` (CONTRIBUTING §5): todo diálogo
   * do sistema troca o `DialogContent` por este aqui, sem mudar mais nada — `Dialog`,
   * `DialogHeader`, `DialogTitle` continuam vindo de `ui/dialog`.
   *
   * No desktop (`sm:` e acima) o modal continua centrado e limitado à altura disponível. A alça só existe
   * visualmente abaixo de `sm`, e é por isso que o gesto de arrastar nunca entra em conflito
   * com a centralização do desktop — não há ponteiro para apertar numa alça de tamanho zero.
   */
  let {
    class: className,
    style: contentStyle,
    showCloseButton = true,
    ref = $bindable(null),
    children,
    ...restProps
  }: DialogPrimitive.ContentProps & { showCloseButton?: boolean; children?: Snippet } = $props();

  let scrollRef: HTMLDivElement | undefined = $state();
  let focusFrame = 0;

  // Só a área interna rola: scrollIntoView também poderia deslocar a página por trás.
  function revealFocusedField(): void {
    cancelAnimationFrame(focusFrame);
    focusFrame = requestAnimationFrame(() => {
      const active = document.activeElement;
      if (!scrollRef || !(active instanceof HTMLElement) || !scrollRef.contains(active)) return;
      const bounds = scrollRef.getBoundingClientRect();
      const field = active.getBoundingClientRect();
      const padding = 12;
      if (field.bottom > bounds.bottom - padding) {
        scrollRef.scrollTop += field.bottom - bounds.bottom + padding;
        return;
      }
      if (field.top < bounds.top + padding) scrollRef.scrollTop += field.top - bounds.top - padding;
    });
  }

  $effect(() => {
    if (!ref) return;
    const observer = observeVisualViewport(ref, revealFocusedField);
    return () => { observer.destroy(); cancelAnimationFrame(focusFrame); };
  });

  let closeRef = $state<HTMLElement | null>(null);
  let dragging = $state(false);
  let dragY = $state(0);
  let startY = 0;

  /** Abaixo disto, arrastar e soltar volta no lugar — não fecha. */
  const DISMISS_THRESHOLD_PX = 96;

  /* `isActive` é o que decide se o estilo inline entra: fora do gesto, ele nem existe, e o
     desktop continua centrado pelas classes `sm:` de sempre — nunca pelo inline. */
  const isActive = $derived(dragging || dragY !== 0);
  const dragStyle = $derived(
    isActive
      ? `transform: translateY(${dragY}px); transition: ${dragging ? 'none' : 'transform 200ms ease-out'};`
      : undefined,
  );

  function onHandlePointerDown(event: PointerEvent): void {
    if (event.button > 0) return;
    dragging = true;
    startY = event.clientY;
    (event.currentTarget as HTMLElement).setPointerCapture(event.pointerId);
  }

  function onHandlePointerMove(event: PointerEvent): void {
    if (!dragging) return;

    dragY = Math.max(0, event.clientY - startY);
  }

  function onHandlePointerUp(): void {
    if (!dragging) return;

    dragging = false;
    if (dragY > DISMISS_THRESHOLD_PX) {
      closeRef?.click();
      dragY = 0;
      return;
    }

    /* Um quadro a mais antes de zerar: é o que dá tempo da transição acima animar a volta,
       em vez de o conteúdo pular direto para o lugar. */
    requestAnimationFrame(() => {
      dragY = 0;
    });
  }
</script>

<DialogPortal>
  <DialogOverlay />
  <DialogPrimitive.Content
    bind:ref
    data-slot="dialog-content"
    style={[contentStyle, dragStyle].filter(Boolean).join(';')}
    class={cn(
      /* Celular: nasce de baixo, cantos de cima arredondados — o bottom sheet. */
      'fixed inset-x-0 bottom-0 z-50 flex max-h-[calc(var(--visual-viewport-height,100dvh)-1rem)] w-full flex-col rounded-t-3xl border-t border-border bg-card px-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-2 shadow-2xl outline-none data-[state=closed]:animate-out data-[state=closed]:slide-out-to-bottom data-[state=open]:animate-in data-[state=open]:slide-in-from-bottom',
      /* Desktop: volta a ser o modal centrado — as mesmas classes do `DialogContent` base. */
      'sm:top-[50%] sm:bottom-auto sm:left-[50%] sm:max-h-[calc(100dvh-3rem)] sm:w-full sm:max-w-[calc(100%-2rem)] sm:translate-x-[-50%] sm:translate-y-[-50%] sm:rounded-surface sm:border sm:p-6 sm:duration-200 sm:data-[state=closed]:fade-out-0 sm:data-[state=closed]:zoom-out-95 sm:data-[state=closed]:slide-out-to-bottom-0 sm:data-[state=open]:fade-in-0 sm:data-[state=open]:zoom-in-95 sm:data-[state=open]:slide-in-from-bottom-0 sm:max-w-lg',
      className,
      'max-sm:inset-x-0 max-sm:top-auto max-sm:bottom-[var(--visual-viewport-bottom,0px)] max-sm:w-full max-sm:max-w-none max-sm:translate-x-0 max-sm:translate-y-0 max-sm:overflow-hidden',
    )}
    {...restProps}
  >
    <!-- A alça: só no celular, e por onde se arrasta para fechar — a "língua" visual do
         Material para um bottom sheet. -->
    <div
      class="-mt-1 mb-1 flex shrink-0 cursor-grab active:cursor-grabbing touch-none justify-center py-3 sm:hidden"
      data-testid="drag-handle"
      aria-hidden="true"
      onpointerdown={onHandlePointerDown}
      onpointermove={onHandlePointerMove}
      onpointerup={onHandlePointerUp}
      onpointercancel={() => { dragging = false; dragY = 0; }}
    >
      <span class="h-1.5 w-10 rounded-full bg-muted-foreground/30"></span>
    </div>

    <!-- Rola como um bloco só, cabeçalho e rodapé inclusos — igual ao bottom sheet nativo.
         A altura dinâmica também mantém os campos acessíveis com o teclado aberto. -->
    <div
      bind:this={scrollRef}
      data-slot="dialog-scroll-area"
      onfocusin={revealFocusedField}
      class="flex min-h-0 min-w-0 flex-1 flex-col gap-5 overflow-x-hidden overflow-y-auto overscroll-contain p-2 scroll-p-3 [scrollbar-gutter:stable]"
    >
      {@render children?.()}
    </div>

    <!-- Sem botão visível, o gatilho continua existindo (é nele que o arrastar clica
         sozinho), mas sai do foco e da leitura de tela — do contrário sobraria um botão
         "Fechar" fantasma no tab, sem nada visível que explique o que é. -->
    <DialogPrimitive.Close
      bind:ref={closeRef}
      data-slot="dialog-close"
      aria-label="Fechar diálogo"
      tabindex={showCloseButton ? 0 : -1}
      aria-hidden={showCloseButton ? undefined : true}
      class={showCloseButton
        ? 'absolute top-4 right-4 rounded-chip opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:ring-2 focus:ring-ring focus:ring-offset-2 focus:outline-hidden disabled:pointer-events-none data-[state=open]:bg-accent data-[state=open]:text-muted-foreground [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*=\'size-\'])]:size-4 cursor-pointer'
        : 'sr-only'}
    >
      {#if showCloseButton}
        <XIcon />
      {/if}
      <span class="sr-only">Fechar</span>
    </DialogPrimitive.Close>
  </DialogPrimitive.Content>
</DialogPortal>
