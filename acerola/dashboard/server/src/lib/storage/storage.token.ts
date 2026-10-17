/**
 * Tokens de injeção do storage.
 *
 * Ficam num arquivo só deles pelo mesmo motivo do `db.token.ts`: o módulo constrói o cliente
 * quando é avaliado, e um service que apenas importasse o token acabaria construindo uma
 * conexão com a Cloudflare para rodar um teste que nem toca em arquivo.
 */

/** O contrato `FileStorage` — é por ele que os services guardam e entregam arquivos. */
export const STORAGE = 'TEMPLATE_STORAGE';

/** O cliente S3 cru, para quem lê o manifesto do agente com prazo e teto de tamanho próprios. */
export const OBJECT_STORAGE = 'TEMPLATE_OBJECT_STORAGE';
