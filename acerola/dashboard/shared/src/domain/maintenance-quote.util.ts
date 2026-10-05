/**
 * OS ORÇAMENTOS DA MANUTENÇÃO: o que foi cotado com empresas de fora.
 *
 * Não é a tela de Orçamento da Infraestrutura, que SUGERE quanto reservar para trocar
 * máquina. Aqui nada é sugerido: é a gaveta onde ficam guardados os orçamentos que a
 * Manutenção pediu — o conserto do ar-condicionado, as cadeiras novas, a dedetização — com o
 * documento que a empresa mandou e o que foi decidido sobre ele.
 *
 * A chave é inglês (o usuário não vê) e o rótulo é português (vê) — CONTRIBUTING §1.
 */

export const QUOTE_KINDS = ['product', 'service', 'other'] as const;

export type QuoteKind = (typeof QUOTE_KINDS)[number];

export const QUOTE_KIND_LABELS: Record<QuoteKind, string> = {
  product: 'Produto',
  service: 'Serviço',
  other: 'Outro',
};

export function quoteKindLabel(kind: QuoteKind): string {
  return QUOTE_KIND_LABELS[kind];
}

export function quoteKindOptions(): { value: QuoteKind; label: string }[] {
  return QUOTE_KINDS.map((value) => ({ value, label: QUOTE_KIND_LABELS[value] }));
}

/** O que foi decidido. Todo orçamento nasce aguardando: guardar não é aprovar. */
export const QUOTE_STATUSES = ['pending', 'approved', 'rejected'] as const;

export type QuoteStatus = (typeof QUOTE_STATUSES)[number];

export const QUOTE_STATUS_LABELS: Record<QuoteStatus, string> = {
  pending: 'Aguardando',
  approved: 'Aprovado',
  rejected: 'Recusado',
};

export function quoteStatusLabel(status: QuoteStatus): string {
  return QUOTE_STATUS_LABELS[status];
}

export function quoteStatusOptions(): { value: QuoteStatus; label: string }[] {
  return QUOTE_STATUSES.map((value) => ({ value, label: QUOTE_STATUS_LABELS[value] }));
}

export function quoteStatusTone(status: QuoteStatus): 'warning' | 'success' | 'neutral' {
  if (status === 'approved') return 'success';
  if (status === 'rejected') return 'neutral';

  return 'warning';
}

/**
 * O VALOR, de texto para centavos.
 *
 * Dinheiro é guardado em centavos inteiros: `0.1 + 0.2` em ponto flutuante não dá `0.3`, e
 * um orçamento que muda um centavo sozinho é um orçamento em que ninguém confia. Aceita o
 * jeito que as pessoas digitam aqui: "1.234,56", "1234,5", "1234" e "R$ 80".
 *
 * Devolve nulo para o que não é um valor — quem chama decide a frase do erro.
 */
export function parseAmountToCents(text: string): number | null {
  const cleaned = text.replace(/R\$/i, '').replace(/\s/g, '');
  if (!/^\d{1,3}(\.\d{3})*(,\d{1,2})?$|^\d+(,\d{1,2})?$/.test(cleaned)) return null;

  const [whole = '0', decimals = ''] = cleaned.replace(/\./g, '').split(',');

  return Number(whole) * 100 + Number(decimals.padEnd(2, '0'));
}

const MONEY = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });

/** O espaço que não quebra linha, pelo código dele: escrito direto no arquivo, é invisível. */
const NON_BREAKING_SPACE = String.fromCharCode(160);

/** Centavos como a tela mostra: `123456` → "R$ 1.234,56". Com centavos: é valor de documento. */
export function formatCents(cents: number): string {
  /* O `Intl` separa "R$" do número com um espaço que não quebra linha; o espaço comum deixa o
     texto igual ao que a pessoa digitaria — e ao que um teste consegue comparar. */
  return MONEY.format(cents / 100).replaceAll(NON_BREAKING_SPACE, ' ');
}

/** Centavos como o CAMPO do formulário mostra: `123456` → "1.234,56". */
export function centsToAmountText(cents: number): string {
  return formatCents(cents).replace('R$ ', '');
}

const MEGABYTE = 1024 * 1024;

/** O documento que a empresa mandou: quase sempre um PDF, às vezes uma foto do papel. */
export const QUOTE_ATTACHMENT_MIME_TYPES = [
  'application/pdf',
  'image/png',
  'image/jpeg',
  'image/webp',
] as const;

export const QUOTE_ATTACHMENT_MAX_BYTES = 10 * MEGABYTE;

export function quoteAttachmentAccept(): string {
  return QUOTE_ATTACHMENT_MIME_TYPES.join(',');
}

export type QuoteAttachmentRefusal = {
  /** A frase que aparece na tela, dizendo o que fazer — a mesma nos dois lados. */
  message: string;
};

/** Este arquivo serve como documento do orçamento? Nulo quando serve, o motivo quando não. */
export function refuseQuoteAttachment(file: {
  contentType: string;
  sizeBytes: number;
}): QuoteAttachmentRefusal | null {
  const type = file.contentType.trim().toLowerCase();

  if (!(QUOTE_ATTACHMENT_MIME_TYPES as readonly string[]).includes(type)) {
    return { message: 'O documento precisa ser um PDF ou uma imagem (PNG, JPG ou WEBP).' };
  }

  if (file.sizeBytes > QUOTE_ATTACHMENT_MAX_BYTES) {
    return {
      message: `O documento passa de ${Math.round(QUOTE_ATTACHMENT_MAX_BYTES / MEGABYTE)} MB. Envie um arquivo menor.`,
    };
  }

  return null;
}
