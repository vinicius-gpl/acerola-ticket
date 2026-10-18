import { afterEach, expect, it, vi } from 'vitest';
import { observeVisualViewport } from './observe-visual-viewport.util';

afterEach(() => { vi.restoreAllMocks(); vi.unstubAllGlobals(); });

// feliz: o teclado e o deslocamento da área visível alteram a posição e a altura do sheet.
it('tracks keyboard height and visual viewport offset', () => {
  const viewport = Object.assign(new EventTarget(), { height: 500, offsetTop: 20 });
  vi.stubGlobal('visualViewport', viewport);
  vi.stubGlobal('innerHeight', 800);
  const node = document.createElement('div');
  const onResize = vi.fn();
  const observer = observeVisualViewport(node, onResize);
  expect(node.style.getPropertyValue('--visual-viewport-height')).toBe('500px');
  expect(node.style.getPropertyValue('--visual-viewport-bottom')).toBe('280px');
  viewport.height = 400;
  viewport.dispatchEvent(new Event('resize'));
  expect(node.style.getPropertyValue('--visual-viewport-bottom')).toBe('380px');
  viewport.offsetTop = 100;
  viewport.dispatchEvent(new Event('scroll'));
  expect(node.style.getPropertyValue('--visual-viewport-bottom')).toBe('300px');
  observer.destroy();
  onResize.mockClear();
  viewport.dispatchEvent(new Event('resize'));
  window.dispatchEvent(new Event('resize'));
  expect(onResize).not.toHaveBeenCalled();
  expect(node.style.getPropertyValue('--visual-viewport-height')).toBe('');
});

// triste: browsers sem VisualViewport continuam usando a janela sem deslocamento negativo.
it('falls back to the layout viewport when VisualViewport is unavailable', () => {
  vi.stubGlobal('visualViewport', null);
  const node = document.createElement('div');
  const observer = observeVisualViewport(node);
  expect(node.style.getPropertyValue('--visual-viewport-height')).toBe(`${window.innerHeight}px`);
  expect(node.style.getPropertyValue('--visual-viewport-bottom')).toBe('0px');
  observer.destroy();
});
