import { describe, expect, it } from 'vitest';

import { cn } from './cn';

describe('cn', () => {
  // feliz
  it('keeps the last value when two Tailwind classes collide', () => {
    expect(cn('px-2', 'px-6')).toBe('px-6');
  });

  it('drops falsy values instead of writing "false" in the markup', () => {
    expect(cn('flex', false, undefined, null, 'gap-2')).toBe('flex gap-2');
  });

  /* A régua de medidas (`lib/theme/tokens.css`) só vale se o merge a conhecer: o componente
     baixado traz a altura dele, e a nossa vem depois. */
  it('lets a control step win over the height that came before it', () => {
    expect(cn('h-8', 'control-md')).toBe('control-md');
    expect(cn('h-8 px-2.5', 'control-lg')).toBe('control-lg');
  });

  it('lets an icon control step win over the square that came before it', () => {
    expect(cn('size-8', 'control-icon-lg')).toBe('control-icon-lg');
  });

  // triste
  /* O raio fica FORA do degrau: um controle que precise de outro arredondamento troca só o
     `rounded-*`, sem perder a altura. */
  it('never lets a radius eat the control step', () => {
    expect(cn('control-lg rounded-control', 'rounded-full')).toBe('control-lg rounded-full');
  });

  /* Caminho de ida só: quem escreve uma altura DEPOIS do degrau quer aquela altura. */
  it('keeps a height written after the control step', () => {
    expect(cn('control-md', 'h-12')).toContain('h-12');
  });
});
