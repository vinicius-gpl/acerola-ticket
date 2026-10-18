import {
  BadRequestException,
  ForbiddenException,
  Inject,
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
import { refuseScreenshot } from '@template/shared/domain/screenshot-catalog.util';
import {
  type StagedFile,
  type UploadRequest,
  type UploadTicket,
} from '@template/shared/schemas/staged-file.schema';
import {
  type AttachmentOrigin,
  type TicketAttachment,
} from '@template/shared/schemas/ticket-attachment.schema';

import { type RequestUser } from '../../../lib/auth/request-user.type';
import { type TicketAttachmentRow } from '../../../lib/db/schema/ticket-attachments.schema';
import { assertCanAttendTicket, assertCanRead } from '../../../lib/policy/policy-assert.util';
import { DOWNLOAD_URL_TTL_SECONDS, type FileStorage } from '../../../lib/storage/file-storage.type';
import {
  type MeasuredFile,
  StagedUploadsService,
} from '../../../lib/storage/staged-uploads.service';
import { STORAGE } from '../../../lib/storage/storage.token';
import { TicketAttachmentsRepository } from '../repository/ticket-attachments.repository';
import { TicketsRepository } from '../repository/tickets.repository';

/** A pasta dos anexos dentro do bucket. */
const FOLDER = 'ticket-attachments';

const TICKET_NOT_FOUND = 'Chamado não encontrado.';
const ATTACHMENT_NOT_FOUND = 'Anexo não encontrado.';

/** Um arquivo que passou pelo catálogo, com o grupo dele — pronto para sair da área temporária. */
export type AcceptedAttachment = { file: MeasuredFile; kind: AttachmentKind };

/**
 * Os ANEXOS de um chamado: guardar, listar e excluir.
 *
 * As regras de o que cabe (formato, tamanho, quantidade) NÃO moram aqui: elas são do domínio
 * (`attachment-catalog.util`), e é a mesma função que o formulário usa para avisar antes de
 * enviar. Duas listas de regras acabariam discordando, e a divergência apareceria como
 * "escolhi o arquivo e o envio falhou sem dizer por quê".
 *
 * **Quem pode o quê.** Anexar ao ABRIR o chamado é de quem abre — qualquer pessoa logada.
 * Anexar depois, e EXCLUIR, são do painel: quem abriu acompanha pela consulta, e protocolo é
 * sequencial; um caminho de exclusão aberto a quem pede deixaria quem chutasse um número
 * apagar arquivo de chamado alheio.
 */
@Injectable()
export class TicketAttachmentsService {
  constructor(
    private readonly repository: TicketAttachmentsRepository,
    private readonly tickets: TicketsRepository,
    private readonly staging: StagedUploadsService,
    @Inject(STORAGE) private readonly storage: FileStorage,
  ) {}

  /**
   * O link para enviar um arquivo AO ABRIR o chamado — o print ou um anexo.
   *
   * Qualquer pessoa logada abre chamado, e por isso qualquer uma recebe o link: a identidade já
   * foi exigida pelo guard. O que a tela declarou é conferido aqui só para recusar cedo o que
   * nem adianta enviar; a conferência que vale é a do arquivo enviado, ao gravar.
   */
  async createOpeningUploadTicket(input: UploadRequest): Promise<UploadTicket> {
    const asAttachment = refuseAttachment(input, []);
    if (asAttachment && refuseScreenshot(input))
      throw new BadRequestException(asAttachment.message);

    return this.staging.createUploadTicket(input.fileName);
  }

  /**
   * O link para juntar um arquivo a um chamado JÁ ABERTO — pela aba de anexos ou num histórico.
   *
   * A mesma régua de anexar: atender o chamado. Conferir o chamado ANTES de emitir o link é o que
   * impede alguém de obter espaço de envio para um chamado que não existe.
   */
  async createUploadTicket(
    user: RequestUser,
    ticketId: number,
    input: UploadRequest,
  ): Promise<UploadTicket> {
    assertCanAttendTicket(user.role);

    await this.requireTicket(ticketId);

    const refusal = refuseAttachment(input, []);
    if (refusal) throw new BadRequestException(refusal.message);

    return this.staging.createUploadTicket(input.fileName);
  }

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
   * Guarda os arquivos de um chamado — os que o navegador já enviou para a área temporária.
   *
   * `author` nulo é o arquivo que veio junto com a abertura do chamado.
   *
   * Os arquivos são conferidos TODOS antes de qualquer um sair da área temporária: aceitar três
   * e recusar o quarto deixaria o chamado num meio-termo que ninguém pediu, e obrigaria quem
   * enviou a descobrir sozinho o que entrou.
   */
  async attach(
    ticketId: number,
    files: readonly StagedFile[],
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
    const accepted = await this.accept(files, kindsUsedBy(sameEntry, origin));

    return this.store(ticketId, accepted, { author, origin, historyId });
  }

  /**
   * Confere os arquivos enviados SEM gravar nada — para quem precisa saber se eles servem antes
   * de gravar outra coisa (um histórico, por exemplo).
   *
   * A conferência é do arquivo que está no storage: tamanho e tipo MEDIDOS, não os que a tela
   * declarou ao pedir o link. Um arquivo fora das regras recusa a leva inteira, com o motivo, e
   * a leva sai da área temporária — não tem como virar anexo, e ficar lá só ocuparia espaço.
   */
  async accept(
    files: readonly StagedFile[],
    existingKinds: readonly AttachmentKind[],
  ): Promise<AcceptedAttachment[]> {
    const measured = await Promise.all(files.map((file) => this.staging.inspect(file)));
    /* `kinds` cresce a cada arquivo de propósito: sem isso, mandar três vídeos de uma vez
       passaria pelo teto de dois, porque cada um seria julgado contra o mesmo estado inicial. */
    const kinds = [...existingKinds];
    const accepted: AcceptedAttachment[] = [];

    for (const file of measured) {
      const refusal = refuseAttachment(file, kinds);
      if (refusal) {
        await this.staging.discard(files.map((staged) => staged.storageKey));
        throw new BadRequestException(refusal.message);
      }

      /* O catálogo já disse que serve; aqui só se descobre de qual grupo, para contar a cota. */
      const kind = attachmentKindOf(file.contentType, file.fileName) as AttachmentKind;
      kinds.push(kind);
      accepted.push({ file, kind });
    }

    return accepted;
  }

  /**
   * Tira os arquivos aceitos da área temporária e grava a linha de cada um.
   *
   * A linha só nasce depois de o arquivo estar no lugar definitivo: a ordem inversa produziria
   * anexo que a tela mostra e que não abre. Se a gravação falha depois do movimento, o arquivo
   * sai do bucket para não ficar órfão.
   */
  async store(
    ticketId: number,
    accepted: readonly AcceptedAttachment[],
    options: { author: string | null; origin: AttachmentOrigin; historyId: number | null },
  ): Promise<TicketAttachment[]> {
    const saved: TicketAttachment[] = [];
    for (const { file, kind } of accepted) {
      const storageKey = await this.staging.promote(file, FOLDER);

      const row = await this.repository
        .insert({
          ticketId,
          historyId: options.historyId,
          kind,
          origin: options.origin,
          fileName: file.fileName,
          contentType: file.contentType,
          sizeBytes: file.sizeBytes,
          storageKey,
          createdBy: options.author,
        })
        .catch(async (error: unknown) => {
          await this.staging.discard([storageKey]);
          throw error;
        });

      saved.push(await this.toAttachment(row));
    }

    return saved;
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
    files: readonly StagedFile[],
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
    await this.storage.remove([row.storageKey]);
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
    /* Abrir vai sem nome de download: o navegador mostra o que sabe mostrar (PDF, imagem,
       vídeo), pelo tipo que o storage guardou no envio. */
    const [viewUrl, downloadUrl] = await Promise.all([
      this.storage.downloadUrl(row.storageKey, DOWNLOAD_URL_TTL_SECONDS, null),
      this.storage.downloadUrl(row.storageKey, DOWNLOAD_URL_TTL_SECONDS, row.fileName),
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
