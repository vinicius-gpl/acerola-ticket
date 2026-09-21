/**
 * Token de injeção da conexão com o banco.
 *
 * Fica num arquivo só dele porque o módulo CONECTA no banco quando é avaliado: se o token
 * morasse lá, qualquer arquivo que apenas o importasse — um service, o teste de um service —
 * abriria uma conexão com a Neon para rodar um teste que nem toca no banco.
 */
export const DB = 'TEMPLATE_DB';
