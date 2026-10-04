/**
 * O preenchimento no hover (utilidade `hover-fill`, em `lib/theme/tokens.css`).
 *
 * O CSS sabe crescer o círculo; o que ele não sabe é POR ONDE o mouse entrou. Esta action
 * anota o ponto de entrada — e o de saída, para o círculo encolher em direção a ele — em
 * duas variáveis CSS do próprio item. Nada aqui roda a cada quadro: são dois eventos por
 * passagem do mouse.
 */

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

export function fillFromPointer(node: HTMLElement) {
  function place(event: PointerEvent) {
    const box = node.getBoundingClientRect();
    node.style.setProperty('--fill-x', `${event.clientX - box.left}px`);
    node.style.setProperty('--fill-y', `${event.clientY - box.top}px`);
  }

  node.addEventListener('pointerenter', place);
  node.addEventListener('pointerleave', place);

  return {
    destroy() {
      node.removeEventListener('pointerenter', place);
      node.removeEventListener('pointerleave', place);
    },
  };
}
