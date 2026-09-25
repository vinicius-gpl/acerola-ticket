/**
 * O DESCARTE de um computador: a máquina que saiu de uso, e por quê.
 *
 * Dois tipos, e a diferença é prática, não burocrática: uma máquina **com defeito** ainda
 * rende peça e pode voltar depois de um conserto; uma que virou **lixo** não liga mais e só
 * ocupa espaço. Quem decide a compra do mês precisa saber qual é qual — foi por isso que o
 * sistema antigo separou as duas, e a separação vem junto.
 *
 * **Descartar não apaga nada.** A máquina sai das listas do dia a dia e continua no banco,
 * com o histórico inteiro: manutenções, alertas e peças que ela recebeu. É esse histórico que
 * sustenta "trocar saiu mais barato do que consertar" na conversa do ano que vem.
 */

export const DISPOSAL_TYPES = ['defect', 'scrap'] as const;

export type DisposalType = (typeof DISPOSAL_TYPES)[number];

/** A chave é inglês (o usuário não vê); o rótulo é português (vê). */
export const DISPOSAL_TYPE_LABELS: Record<DisposalType, string> = {
  defect: 'Com defeito',
  scrap: 'Lixo',
};

export function disposalTypeLabel(type: DisposalType): string {
  return DISPOSAL_TYPE_LABELS[type];
}

/** A frase que explica o tipo, para quem nunca viu a tela antes. */
export const DISPOSAL_TYPE_HINTS: Record<DisposalType, string> = {
  defect: 'Ainda rende peça, ou volta depois de um conserto.',
  scrap: 'Não liga mais e não rende peça.',
};

export function disposalTypeHint(type: DisposalType): string {
  return DISPOSAL_TYPE_HINTS[type];
}

export function disposalTypeTone(type: DisposalType): 'warning' | 'neutral' {
  return type === 'defect' ? 'warning' : 'neutral';
}

/**
 * Uma máquina descartada é SÓ LEITURA.
 *
 * Editar apelido, bloquear, gerar token ou registrar manutenção numa máquina que saiu de uso
 * seria mexer no passado: o cadastro dela precisa continuar contando o que era quando saiu.
 * Para voltar a mexer, a máquina volta ao inventário primeiro.
 */
export function isDisposed(computer: { disposedAt: string | null }): boolean {
  return computer.disposedAt !== null;
}
