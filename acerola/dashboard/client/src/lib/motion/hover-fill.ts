/**
 * O preenchimento no hover (utilidade `hover-fill`, em `lib/theme/tokens.css`).
 *
 * O CSS sabe crescer o círculo; o que ele não sabe é POR ONDE o mouse entrou. Esta action
 * anota o ponto de entrada — e o de saída, para o círculo encolher em direção a ele — em
 * duas variáveis CSS do próprio item. Nada aqui roda a cada quadro: são dois eventos por
 * passagem do mouse.
 */

import { useEffectsModel } from '$lib/hooks/use-effects/use-effects.svelte';

/** Os tons de situação do `StatusBadge`, aqui só para escolher a cor do preenchimento. */
export type FillTone = 'neutral' | 'info' | 'success' | 'warning' | 'danger' | 'brand';

/* O tom SUAVE, e não a cor cheia: o texto do item continua por cima e tem de seguir legível. */
const FILL_COLORS: Record<FillTone, string> = {
  neutral: 'var(--muted)',
  info: 'var(--info-soft)',
  success: 'var(--success-soft)',
  warning: 'var(--warning-soft)',
  danger: 'var(--destructive-soft)',
  brand: 'var(--primary-soft)',
};

export function fillColorOf(tone: FillTone | null | undefined): string {
  return FILL_COLORS[tone ?? 'neutral'] ?? FILL_COLORS.neutral;
}

/** Quanto dura o crescimento do círculo — o mesmo valor do `transition` em `tokens.css`. */
const FILL_DURATION_MS = 450;

export function fillFromPointer(node: HTMLElement) {
  const effects = useEffectsModel();

  function place(event: PointerEvent) {
    const box = node.getBoundingClientRect();
    node.style.setProperty('--fill-x', `${event.clientX - box.left}px`);
    node.style.setProperty('--fill-y', `${event.clientY - box.top}px`);
  }

  /* A entrada é quando a animação começa: é a hora de medir se a máquina a entrega lisa. Se
     não entregar, o nível de efeitos cai para o leve sozinho (`lib/hooks/use-effects`). */
  function enter(event: PointerEvent) {
    place(event);
    effects.actions.onAnimationStart(FILL_DURATION_MS);
  }

  node.addEventListener('pointerenter', enter);
  node.addEventListener('pointerleave', place);

  return {
    destroy() {
      node.removeEventListener('pointerenter', enter);
      node.removeEventListener('pointerleave', place);
    },
  };
}
