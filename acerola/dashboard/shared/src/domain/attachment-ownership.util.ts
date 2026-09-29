import { type AttachmentKind } from './attachment-catalog.util';
import { type AttachmentOrigin } from '../schemas/ticket-attachment.schema';

/**
 * DE QUEM É CADA ARQUIVO DE UM CHAMADO, e o que cada lado pode fazer com o do outro.
 *
 * Um chamado tem dois conjuntos de arquivos que convivem e não se misturam: a PROVA de quem
 * pediu socorro, mandada ao abrir, e a DEVOLUTIVA do TI, juntada durante o atendimento.
 *
 * A regra é uma frase: **cada lado mexe no que é dele**. O TI vê e baixa o que a pessoa
 * mandou, e não apaga; a pessoa vê e baixa o que o TI juntou, e não apaga. Não é burocracia:
 * apagar o print de alguém e depois dizer "não recebi print nenhum" é uma história que o
 * sistema não pode deixar acontecer, nem por engano de clique.
 */

/** O texto que a tela e a API mostram quando alguém tenta apagar o arquivo do outro lado. */
const REQUESTER_FILE_IS_NOT_YOURS =
  'Este arquivo foi enviado por quem abriu o chamado. Você pode abrir e baixar, mas não apagar — só quem enviou é dono do que enviou.';

const SUPPORT_FILE_IS_NOT_YOURS =
  'Este arquivo foi anexado pelo TI durante o atendimento. Você pode abrir e baixar, mas não apagar.';

/** Quem está pedindo para apagar. */
export type AttachmentActor = AttachmentOrigin;

/**
 * Pode apagar? Só se o arquivo for do seu lado.
 *
 * Exportada e pura para ter teste próprio, e usada NOS DOIS LADOS: a tela esconde o botão com
 * ela, e a API recusa com ela. Uma régua só — esconder o botão é conveniência, e a recusa do
 * servidor é a que vale.
 */
export function canRemoveAttachment(origin: AttachmentOrigin, actor: AttachmentActor): boolean {
  return origin === actor;
}

/**
 * O motivo da recusa, ou nulo quando pode.
 *
 * Devolve a FRASE, e não um código: quem lê a mensagem é a pessoa que clicou, e ela precisa
 * entender por que o botão recusou sem ter de perguntar a alguém.
 */
export function refuseAttachmentRemoval(
  origin: AttachmentOrigin,
  actor: AttachmentActor,
): string | null {
  if (canRemoveAttachment(origin, actor)) return null;

  return origin === 'requester' ? REQUESTER_FILE_IS_NOT_YOURS : SUPPORT_FILE_IS_NOT_YOURS;
}

/**
 * Os arquivos de UM LADO só, separados dos do outro.
 *
 * Existe para a cota ser POR LADO. Com uma cota compartilhada, alguém que abrisse o chamado
 * com cinco PDFs deixaria o TI sem poder anexar a nota fiscal da peça — e o TI não pode
 * apagar os cinco para abrir espaço, porque não são dele. Cada lado tem o próprio teto, e
 * nenhum dos dois consegue travar o outro.
 */
export function onlyFrom<T extends { origin: AttachmentOrigin }>(
  attachments: readonly T[],
  origin: AttachmentOrigin,
): T[] {
  return attachments.filter((attachment) => attachment.origin === origin);
}

/** Os formatos já usados por um lado — é o que a régua do catálogo conta para a cota. */
export function kindsUsedBy(
  attachments: readonly { origin: AttachmentOrigin; kind: AttachmentKind }[],
  origin: AttachmentOrigin,
): AttachmentKind[] {
  return onlyFrom(attachments, origin).map((attachment) => attachment.kind);
}
