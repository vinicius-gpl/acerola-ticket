import { describe, expect, it } from 'vitest';

import { fillColorOf, fillFromPointer, type FillTone } from './hover-fill';

/** Um item de 200×100 pousado em (50, 20) na janela. */
function makeNode() {
  const node = document.createElement('div');
  node.getBoundingClientRect = () =>
    ({ left: 50, top: 20, width: 200, height: 100, right: 250, bottom: 120 }) as DOMRect;

  return node;
}

function pointer(type: string, clientX: number, clientY: number) {
  return new MouseEvent(type, { clientX, clientY }) as PointerEvent;
}

describe('fillColorOf', () => {
  // feliz
  it('picks the soft color of each status tone', () => {
    expect(fillColorOf('danger')).toBe('var(--destructive-soft)');
    expect(fillColorOf('warning')).toBe('var(--warning-soft)');
    expect(fillColorOf('success')).toBe('var(--success-soft)');
  });

  // triste
  it('falls back to the neutral color when there is no tone or it is unknown', () => {
    expect(fillColorOf(undefined)).toBe('var(--muted)');
    expect(fillColorOf(null)).toBe('var(--muted)');
    expect(fillColorOf('inexistente' as FillTone)).toBe('var(--muted)');
  });
});

describe('fillFromPointer', () => {
  // feliz
  it('writes where the pointer came in, relative to the item', () => {
    const node = makeNode();
    fillFromPointer(node);

    node.dispatchEvent(pointer('pointerenter', 60, 70));

    expect(node.style.getPropertyValue('--fill-x')).toBe('10px');
    expect(node.style.getPropertyValue('--fill-y')).toBe('50px');
  });

  it('moves the point to where the pointer left, so the fill shrinks toward it', () => {
    const node = makeNode();
    fillFromPointer(node);

    node.dispatchEvent(pointer('pointerenter', 60, 70));
    node.dispatchEvent(pointer('pointerleave', 250, 30));

    expect(node.style.getPropertyValue('--fill-x')).toBe('200px');
    expect(node.style.getPropertyValue('--fill-y')).toBe('10px');
  });

  /* Entrando perto do canto de cima à esquerda de um item de 200×100, o canto mais longe é o
     de baixo à direita: 190 para o lado, 50 para baixo. */
  it('writes how far the fill has to grow to reach the farthest corner', () => {
    const node = makeNode();
    fillFromPointer(node);

    node.dispatchEvent(pointer('pointerenter', 60, 70));

    expect(node.style.getPropertyValue('--fill-reach')).toBe(`${Math.ceil(Math.hypot(190, 50))}px`);
  });

  // triste
  it('stops following the pointer after it is destroyed', () => {
    const node = makeNode();
    fillFromPointer(node).destroy();

    node.dispatchEvent(pointer('pointerenter', 60, 70));

    expect(node.style.getPropertyValue('--fill-x')).toBe('');
  });
});
