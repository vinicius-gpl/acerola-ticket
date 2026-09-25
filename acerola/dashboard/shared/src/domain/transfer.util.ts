/**
 * A TRANSFERÊNCIA de uma máquina entre departamentos.
 *
 * Mudar o departamento de um computador é um EVENTO, não a edição de um campo: seis meses
 * depois alguém pergunta "por que esta máquina está no fiscal?", e a resposta é o histórico.
 * O sistema antigo já guardava esse histórico numa tabela própria, e por isso ele sobreviveu.
 */

/** O que fazer com cada periférico que está na máquina que vai sair. */
export const PERIPHERAL_DESTINIES = ['machine', 'station'] as const;

export type PeripheralDestiny = (typeof PERIPHERAL_DESTINIES)[number];

export const PERIPHERAL_DESTINY_LABELS: Record<PeripheralDestiny, string> = {
  machine: 'Vai junto com a máquina',
  station: 'Fica na estação',
};

export function peripheralDestinyLabel(destiny: PeripheralDestiny): string {
  return PERIPHERAL_DESTINY_LABELS[destiny];
}

/**
 * Periférico que FICA precisa dizer em qual máquina fica.
 *
 * Sem o destino, a peça sairia da máquina que foi embora e não entraria em lugar nenhum: o
 * depósito passaria a dizer que ela está guardada na prateleira, e ela está na mesa de alguém.
 */
export function needsDestination(destiny: PeripheralDestiny): boolean {
  return destiny === 'station';
}

/**
 * O nome de uma máquina que voltou para a prateleira.
 *
 * Ela perde o apelido do antigo dono ("Financeiro — mesa 2") porque esse apelido passa a
 * mentir no instante em que ela sai da mesa. O nome do Windows entra junto para distinguir
 * duas máquinas iguais paradas no mesmo canto.
 */
export function reserveDisplayNameOf(machineName: string): string {
  return `Reserva — ${machineName}`;
}

/**
 * Se a transferência muda alguma coisa.
 *
 * Transferir para o mesmo departamento é registrar um evento que não aconteceu — e é assim
 * que um histórico deixa de ser confiável.
 */
export function isRealTransfer(from: string | null, to: string | null): boolean {
  return from !== to;
}
