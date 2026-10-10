import { type ReportFormat } from '@template/shared/schemas/report.schema';

/**
 * O mesmo vocabulário de cor do `StatusBadge` da tela — um chamado urgente é vermelho no
 * painel e vermelho no documento, nunca duas paletas diferentes contando a mesma coisa.
 */
export type DocumentTone = 'neutral' | 'info' | 'success' | 'warning' | 'danger' | 'brand';

/** Um texto com a cor da situação — o selo de "Urgente", de "Resolvido". */
export type DocumentBadge = { text: string; tone: DocumentTone };

/** Um par "rótulo: valor" — "Quem abriu: Bia Costa". */
export type DocumentField = { label: string; value: string };

/** Uma célula de tabela. Com `tone`, o valor sai pintado com a cor da situação. */
export type DocumentCell = { text: string; tone?: DocumentTone | null };

/**
 * Um acontecimento datado — um passo da linha do tempo de um chamado. Cada parte é opcional
 * para o desenho, mas a ordem é sempre a mesma: selo, quem e quando, detalhe, texto, anexos.
 */
export type DocumentEntry = {
  badge: DocumentBadge;
  /** Quem fez e quando, já num texto só: "Ana Lima · 01/03/2026 09:30". */
  caption: string;
  /** O que este passo tem de particular, numa linha pequena. */
  details: string;
  body: string;
  /** Nomes dos anexos, quando há. */
  note?: string;
};

/**
 * Os BLOCOS de que um documento é feito. Quem monta o documento só escolhe os blocos e a
 * ordem; como cada um aparece no PDF, no Word e no Excel é decisão do gerador daquele formato.
 */
export type DocumentBlock =
  | { kind: 'heading'; text: string }
  | { kind: 'paragraph'; text: string }
  | { kind: 'badges'; items: DocumentBadge[] }
  | { kind: 'fields'; items: DocumentField[] }
  | { kind: 'entries'; items: DocumentEntry[]; emptyText: string }
  | {
      kind: 'table';
      headers: string[];
      rows: DocumentCell[][];
      /**
       * A coluna que identifica a linha (protocolo, nome da máquina). No Excel e no PDF ela é
       * só mais uma coluna; no Word ela vira o título de cada ficha.
       */
      titleColumnIndex?: number;
      emptyText: string;
    };

/**
 * O que torna um documento CONFERÍVEL: o endereço que confirma que ele saiu do sistema. No
 * PDF vira um QR code com o link; nos outros formatos, o link por extenso.
 */
export type DocumentVerification = {
  /** O link completo — é ele que vai clicável dentro do arquivo. */
  url: string;
  /** O link curto, que cabe num QR code legível e pode ser digitado à mão. */
  displayUrl: string;
  /** As linhas ao lado do QR code: versão, quem emitiu, código. */
  lines: string[];
};

/**
 * A DEFINIÇÃO ÚNICA de um documento: o que ele diz, sem nada de como é desenhado. A mesma
 * definição entra nos três geradores (PDF, Word e Excel) — é ela a fonte única, não a
 * ferramenta.
 */
export type DocumentDefinition = {
  title: string;
  /** A linha embaixo do título — normalmente "N registros · gerado em ...". */
  subtitle?: string;
  /** O que identifica este documento no rodapé de cada página (protocolo, nome do relatório). */
  reference: string;
  /** Deitado para listas com muitas colunas; em pé para documento de leitura. */
  orientation: 'portrait' | 'landscape';
  blocks: DocumentBlock[];
  verification?: DocumentVerification;
  /**
   * A data gravada dentro do arquivo. Quem precisa do MESMO arquivo byte a byte para a mesma
   * entrada (a ordem de serviço) informa a data da emissão; sem ela, vale a hora da geração.
   */
  createdAt?: Date;
};

export type DocumentFormat = ReportFormat;

/** O arquivo pronto para baixar. */
export type BuiltDocument = {
  buffer: Buffer;
  fileName: string;
  contentType: string;
};
