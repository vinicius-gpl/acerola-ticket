import gsap from 'gsap';

/**
 * As constantes de movimento do sistema, num lugar só.
 *
 * Duração e curva são identidade, do mesmo jeito que cor e tipografia: quando cada tela
 * escolhe a sua, a mesma transição fica de um jeito na lista e de outro no painel, e o
 * sistema passa a parecer montado por pessoas diferentes — que é o que ele não deve parecer.
 *
 * Os valores são curtos de propósito. Animação em ferramenta de trabalho serve para explicar
 * o que mudou de lugar, não para ser apreciada: acima de ~350ms ela vira espera, e uma
 * pessoa que abre esta tela quarenta vezes por dia sente cada uma delas.
 */
export const DURATION = {
  /** Reação a um clique — abrir, fechar, marcar. */
  fast: 0.18,
  /** Entrada de conteúdo. */
  base: 0.32,
  /** Números que sobem. Mais longo porque o olho precisa acompanhar a contagem. */
  count: 0.7,
} as const;

export const EASE = {
  /** Sai rápido e freia — a curva de algo que chega e para. */
  out: 'power2.out',
  /** Para o que abre e fecha; dá peso ao movimento sem exagero. */
  inOut: 'power2.inOut',
} as const;

/**
 * A PESSOA MANDA MAIS QUE O DESIGN.
 *
 * Quem liga "reduzir movimento" no sistema operacional costuma fazê-lo por enjoo,
 * enxaqueca ou vertigem — não por preferência estética. Aqui isso não vira "animação mais
 * curta": vira nenhuma. Toda função deste arquivo respeita esta checagem, e por isso ela
 * mora aqui e não em cada componente, onde alguém esqueceria.
 */
export function prefersReducedMotion(): boolean {
  if (typeof window === 'undefined' || !window.matchMedia) return false;

  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

/** Entrada padrão: sobe alguns pixels enquanto aparece. */
export function fadeInUp(targets: gsap.TweenTarget, options: { delay?: number } = {}): void {
  if (prefersReducedMotion()) return;

  gsap.from(targets, {
    opacity: 0,
    y: 12,
    duration: DURATION.base,
    ease: EASE.out,
    delay: options.delay ?? 0,
  });
}

/**
 * Entrada em cascata, para listas e grupos de cartões.
 *
 * `stagger` pequeno de propósito: o atraso existe para dar ordem de leitura, não para fazer
 * a última linha chegar meio segundo depois da primeira.
 */
export function staggerIn(targets: gsap.TweenTarget, options: { delay?: number } = {}): void {
  if (prefersReducedMotion()) return;

  gsap.from(targets, {
    opacity: 0,
    y: 10,
    duration: DURATION.base,
    ease: EASE.out,
    stagger: 0.05,
    delay: options.delay ?? 0,
  });
}

/**
 * Item que ACABOU de virar o ativo — um pulso rápido, não um efeito chamativo.
 *
 * `fromTo` (não `from`): parte de um valor conhecido (`0.7`) e sempre TERMINA em `1`, escrito
 * explicitamente. Só `from` deixaria o estado final por conta da última leitura do CSS — e
 * clicar duas vezes seguidas no mesmo item, cortando a animação no meio, arriscava travar o
 * ícone menor que o normal para sempre.
 */
export function popIn(targets: gsap.TweenTarget, options: { delay?: number } = {}): void {
  if (prefersReducedMotion()) return;

  gsap.fromTo(
    targets,
    { scale: 0.7 },
    { scale: 1, duration: DURATION.fast, ease: EASE.out, delay: options.delay ?? 0 },
  );
}

/**
 * O FUNDO de "isto é o item ativo agora" — nasce com um fade, não troca seca de cor.
 *
 * `color` chega resolvido (não `"var(--token)"` cru): o motor de cor do GSAP não sabe
 * interpolar uma variável CSS — sem valor de verdade pra partir, ele só troca no talo no
 * fim da animação, e o fade vira o mesmo corte seco que essa função existe pra tirar.
 * `clearProps` no fim devolve o controle pra classe do Tailwind (`data-[active=true]:bg-*`),
 * pra um hover ou uma troca de tema logo depois não ficar preso no valor fixo desta tween.
 */
export function highlightIn(
  target: Element | null,
  options: { color?: string; delay?: number } = {},
): void {
  if (!target) return;

  const color =
    options.color ??
    getComputedStyle(document.documentElement).getPropertyValue('--sidebar-accent').trim();

  if (prefersReducedMotion()) return;

  gsap.fromTo(
    target,
    { backgroundColor: 'transparent' },
    {
      backgroundColor: color,
      duration: DURATION.fast,
      ease: EASE.out,
      delay: options.delay ?? 0,
      clearProps: 'backgroundColor',
    },
  );
}

/**
 * Número que sobe até o valor.
 *
 * O valor final é escrito no elemento ANTES de animar, e de novo no fim: se a animação for
 * cortada no meio — troca de rota, movimento reduzido, aba em segundo plano — o que fica na
 * tela é o número certo, nunca um valor parcial. Painel que mostra "13" quando são 23 é pior
 * que painel sem animação nenhuma.
 */
export function countTo(element: HTMLElement | null, value: number): void {
  if (!element) return;

  if (prefersReducedMotion()) {
    element.textContent = String(value);

    return;
  }

  const counter = { current: 0 };
  gsap.to(counter, {
    current: value,
    duration: DURATION.count,
    ease: EASE.out,
    onUpdate: () => {
      element.textContent = String(Math.round(counter.current));
    },
    onComplete: () => {
      element.textContent = String(value);
    },
  });
}
