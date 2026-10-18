/** O teclado pode reduzir só a área visível, sem alterar o tamanho do layout no Safari. */
export function observeVisualViewport(node: HTMLElement, onResize?: () => void) {
  const viewport = window.visualViewport;
  function update(): void {
    const height = viewport?.height ?? window.innerHeight;
    const bottom = Math.max(0, window.innerHeight - height - (viewport?.offsetTop ?? 0));
    node.style.setProperty('--visual-viewport-height', `${height}px`);
    node.style.setProperty('--visual-viewport-bottom', `${bottom}px`);
    onResize?.();
  }
  update();
  viewport?.addEventListener('resize', update);
  viewport?.addEventListener('scroll', update);
  window.addEventListener('resize', update);
  return {
    destroy(): void {
      viewport?.removeEventListener('resize', update);
      viewport?.removeEventListener('scroll', update);
      window.removeEventListener('resize', update);
      node.style.removeProperty('--visual-viewport-height');
      node.style.removeProperty('--visual-viewport-bottom');
    },
  };
}
