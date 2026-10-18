<script lang="ts">
  import { useSidebar } from '$lib/components/ui/sidebar/context.svelte';

  const sidebar = useSidebar();
  let startX: number | null = null;
  let startY = 0;
  let isRailGesture = false;
  let didDrag = false;

  function onPointerDown(event: PointerEvent): void {
    if (event.button !== 0 || !(event.target instanceof Element)) return;
    isRailGesture = !!event.target.closest('[data-sidebar="rail"]');
    if (!isRailGesture && !event.target.closest('[data-mobile="true"]')) return;
    startX = event.clientX;
    startY = event.clientY;
    didDrag = false;
    if (isRailGesture) (event.target as HTMLElement).setPointerCapture(event.pointerId);
  }

  function onPointerMove(event: PointerEvent): void {
    if (startX === null) return;
    const distance = event.clientX - startX;
    if (Math.abs(event.clientY - startY) > Math.abs(distance)) return;
    if (Math.abs(distance) < 48) return;
    didDrag = true;
    startX = null;
    if (sidebar.isMobile) {
      if (distance < 0) sidebar.setOpenMobile(false);
      return;
    }
    sidebar.setOpen(distance > 0);
  }
</script>

<svelte:window
  onpointerdown={onPointerDown}
  onpointermove={onPointerMove}
  onpointerup={() => { startX = null; }}
  onpointercancel={() => { startX = null; didDrag = false; }}
  onclick={(event) => {
    if (!(event.target instanceof Element)) return;
    if (event.target.closest('[data-mobile="true"] a[href]')) sidebar.setOpenMobile(false);
  }}
/>

<button
  type="button"
  data-sidebar="rail"
  aria-label={sidebar.open ? 'Recolher menu' : 'Expandir menu'}
  class="absolute inset-y-0 -right-2 z-20 hidden w-4 touch-none cursor-grab active:cursor-grabbing after:absolute after:inset-y-3 after:left-1/2 after:w-0.5 hover:after:bg-sidebar-border md:block"
  onclick={() => { if (!didDrag) sidebar.toggle(); didDrag = false; }}
></button>
