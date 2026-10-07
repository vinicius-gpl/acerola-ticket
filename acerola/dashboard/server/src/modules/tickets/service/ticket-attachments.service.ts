import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  attachmentKindOf,
  refuseAttachment,
  type AttachmentKind,
} from '@template/shared/domain/attachment-catalog.util';
import {
  kindsUsedBy,
  refuseAttachmentRemoval,
} from '@template/shared/domain/attachment-ownership.util';
import { fileNameSchema } from '@template/shared/domain/file-name.util';
import {
  type AttachmentOrigin,
  type TicketAttachment,
} from '@template/shared/schemas/ticket-attachment.schema';

import { type RequestUser } from '../../../lib/auth/request-user.type';
import { type TicketAttachmentRow } from '../../../lib/db/schema/ticket-attachments.schema';
import { decodeUploadedFileName } from '../../../lib/http/uploaded-file-name.util';
import { assertCanAttendTicket, assertCanRead } from '../../../lib/policy/policy-assert.util';
import { StorageService } from '../../../lib/storage/storage.service';
import { TicketAttachmentsRepository } from '../repository/ticket-attachments.repository';
import { TicketsRepository } from '../repository/tickets.repository';

/** A pasta dos anexos dentro do bucket. */
const FOLDER = 'ticket-attachments';

const TICKET_NOT_FOUND = 'Chamado não encontrado.';
const ATTACHMENT_NOT_FOUND = 'Anexo não encontrado.';

/** O arquivo como o Nest o entrega depois do interceptor de upload. */
export type UploadedAttachment = {
  originalname: string;
  mimetype: string;
  size: number;
  buffer: Buffer;
};

/**
 * Os ANEXOS de um chamado: guardar, listar e excluir.
 *
 * As regras de o que cabe (formato, tamanho, quantidade) NÃO moram aqui: elas são do domínio
 * (`attachment-catalog.util`), e é a mesma função que o formulário usa para avisar antes de
 * enviar. Duas listas de regras acabariam discordando, e a divergência apareceria como
 * "escolhi o arquivo e o envio falhou sem dizer por quê".
 *
 * **Quem pode o quê.** Anexar ao ABRIR o chamado não exige identidade — quem está sem
 * impressora não tem conta no painel. Anexar depois, e EXCLUIR, exigem: a consulta pública é
 * por protocolo, e protocolo é sequencial; sem identidade, quem chutasse um número apagaria
 * arquivo de chamado alheio.
 */
@Injectable()
export class TicketAttachmentsService {
  constructor(
    private readonly repository: TicketAttachmentsRepository,
    private readonly tickets: TicketsRepository,
    private readonly storage: StorageService,
  ) {}

  /** Os anexos de um chamado, com os dois endereços prontos. */
  async list(ticketId: number): Promise<TicketAttachment[]> {
    await this.requireTicket(ticketId);

    const rows = await this.repository.listByTicket(ticketId);

    return Promise.all(rows.map((row) => this.toAttachment(row)));
  }

  /** O mesmo, com a guarda de quem está pedindo pelo painel. */
  async listForUser(user: RequestUser, ticketId: number): Promise<TicketAttachment[]> {
    assertCanRead(user.role, 'os chamados');

    return this.list(ticketId);
  }

  /**
   * Guarda os arquivos de um chamado.
   *
   * `author` nulo é o caminho público — o arquivo veio junto com a abertura do chamado, e ali
   * não existe identidade para carimbar.
   *
   * Os arquivos são conferidos TODOS antes de qualquer um subir: aceitar três e recusar o
   * quarto deixaria o chamado num meio-termo que ninguém pediu, e obrigaria quem enviou a
   * descobrir sozinho o que entrou.
   */
  async attach(
    ticketId: number,
    files: readonly UploadedAttachment[],
    author: string | null,
    origin: AttachmentOrigin,
    historyId: number | null = null,
  ): Promise<TicketAttachment[]> {
    if (files.length === 0) return [];

    await this.requireTicket(ticketId);

    const existing = await this.repository.listByTicket(ticketId);
    /* A cota é POR LADO: só conta o que ESTE lado já subiu. Com cota compartilhada, alguém
       que abrisse o chamado com cinco PDFs deixaria o TI sem poder anexar a nota fiscal da
       peça — e o TI não pode apagar os cinco para abrir espaço, porque não são dele.

       E é POR HISTÓRICO: cada lançamento na linha do tempo tem a própria cota. Um chamado
       que dura semanas junta mais de cinco fotos, e contar tudo junto travaria o anexo do
       décimo histórico por causa do que entrou no primeiro. */
    const sameEntry = existing.filter((row) => row.historyId === historyId);
    const kinds: AttachmentKind[] = kindsUsedBy(sameEntry, origin);

    const accepted = files.map((file) => this.accept(file, kinds));

    const saved: TicketAttachment[] = [];
    for (const { file, fileName, kind } of accepted) {
      const stored = await this.storage.upload({
        fileName,
        contentType: file.mimetype,
        content: file.buffer,
        folder: FOLDER,
      });

      const row = await this.repository.insert({
        ticketId,
        historyId,
        kind,
        origin,
        fileName,
        contentType: stored.contentType,
        sizeBytes: stored.sizeBytes,
        storageKey: stored.key,
        createdBy: author,
      });

      saved.push(await this.toAttachment(row));
    }

    return saved;
  }

  /**
   * Confere os arquivos SEM guardar nada — para quem precisa saber se eles servem antes de
   * gravar outra coisa (um histórico, por exemplo). Um arquivo fora das regras recusa aqui,
   * com o mesmo motivo que `attach` daria.
   */
  assertAcceptable(files: readonly UploadedAttachment[]): void {
    const kinds: AttachmentKind[] = [];

    for (const file of files) this.accept(file, kinds);
  }

  /**
   * Anexar pelo PAINEL, durante o atendimento. Exige identidade.
   *
   * O que entra por aqui é a DEVOLUTIVA do TI — a nota fiscal da peça, a foto do antes e do
   * depois — e fica do lado dele: quem abriu o chamado vê e baixa, mas não apaga, do mesmo
   * jeito que o TI não apaga o que a pessoa mandou.
   */
  async attachAsUser(
    user: RequestUser,
    ticketId: number,
    files: readonly UploadedAttachment[],
  ): Promise<TicketAttachment[]> {
    /* A mesma régua de atender: juntar a nota fiscal da peça ao chamado é parte do
       atendimento, não um cadastro à parte com permissão própria. */
    assertCanAttendTicket(user.role);

    return this.attach(ticketId, files, user.email, 'support');
  }

  /**
   * Exclui um anexo — do banco e do bucket.
   *
   * O cadastro sai primeiro. Se a remoção no R2 falhar, sobra um arquivo pago que ninguém
   * alcança; na ordem inversa, sobraria uma linha apontando para um arquivo que não existe, e
   * a tela mostraria um anexo que dá erro ao abrir. O primeiro problema é de custo, o segundo
   * é de confiança.
   */
  async remove(user: RequestUser, ticketId: number, attachmentId: number): Promise<void> {
    assertCanAttendTicket(user.role);

    await this.requireTicket(ticketId);

    const row = await this.repository.findInTicket(ticketId, attachmentId);
    if (!row) throw new NotFoundException(ATTACHMENT_NOT_FOUND);

    /**
     * O TI NÃO APAGA O ARQUIVO DE QUEM ABRIU O CHAMADO.
     *
     * A tela já esconde o botão, mas esconder botão é conveniência — a recusa que vale é
     * esta. A regra existe porque apagar o print de alguém e depois dizer "não recebi print
     * nenhum" é uma história que o sistema não pode deixar acontecer, nem por engano.
     */
    const refusal = refuseAttachmentRemoval(row.origin, 'support');
    if (refusal) throw new ForbiddenException(refusal);

    await this.repository.remove(row.id);
    await this.storage.remove(row.storageKey);
  }

  /**
   * Confere um arquivo contra o catálogo, contando o que já entrou nesta mesma leva.
   *
   * O `kinds` é mutado de propósito: sem isso, mandar três vídeos de uma vez passaria pelo
   * teto de dois, porque cada um seria julgado contra o mesmo estado inicial.
   */
  private accept(file: UploadedAttachment, kinds: AttachmentKind[]) {
    /* O nome chega com os acentos embaralhados (ver `decodeUploadedFileName`): é o nome
       corrigido que se valida, se guarda e se mostra. */
    const parsed = fileNameSchema.safeParse(decodeUploadedFileName(file.originalname));
    if (!parsed.success) {
      throw new BadRequestException(parsed.error.issues[0]?.message ?? 'Nome de arquivo inválido.');
    }

    const fileName = parsed.data;
    const refusal = refuseAttachment(
      { contentType: file.mimetype, fileName, sizeBytes: file.size },
      kinds,
    );
    if (refusal) throw new BadRequestException(refusal.message);

    /* O catálogo já disse que serve; aqui só se descobre de qual grupo, para contar a cota. */
    const kind = attachmentKindOf(file.mimetype, fileName) as AttachmentKind;
    kinds.push(kind);

    return { file, fileName, kind };
  }

  private async requireTicket(ticketId: number): Promise<void> {
    const ticket = await this.tickets.findById(ticketId);
    if (!ticket) throw new NotFoundException(TICKET_NOT_FOUND);
  }

  /**
   * A linha do banco virando anexo de tela, com os dois endereços assinados.
   *
   * Os links são gerados a cada leitura e valem poucos minutos: endereço fixo vazado viraria
   * acesso permanente ao arquivo, e é o mesmo cuidado que o print do chamado já tinha.
   */
  private async toAttachment(row: TicketAttachmentRow): Promise<TicketAttachment> {
    const [viewUrl, downloadUrl] = await Promise.all([
      this.storage.createDownloadUrl(row.storageKey, { as: 'inline', fileName: row.fileName }),
      this.storage.createDownloadUrl(row.storageKey, { as: 'attachment', fileName: row.fileName }),
    ]);

    return {
      id: row.id,
      ticketId: row.ticketId,
      historyId: row.historyId,
      kind: row.kind,
      fileName: row.fileName,
      contentType: row.contentType,
      sizeBytes: row.sizeBytes,
      viewUrl,
      downloadUrl,
      origin: row.origin,
      createdAt: row.createdAt.toISOString(),
      createdBy: row.createdBy,
    };
  }
}
